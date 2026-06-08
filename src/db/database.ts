import Dexie, { type EntityTable } from 'dexie';

import type { LineItem, OutboxEntry, Product, ShoppingTrip, Store, SyncMeta } from '@/db/schema';
import { newId, nowIso } from '@/db/schema';

type LegacyProduct = {
  id?: number;
  barcode: string;
  name: string;
  defaultUnitPrice: number | null;
  category: string | null;
  lastUsedAt: string | null;
  imageBlob: Blob | null;
};

type LegacyTrip = {
  id?: number;
  date: string;
  storeName: string | null;
  notes: string | null;
  status?: string;
  receiptTotal?: number | null;
};

type LegacyLineItem = {
  id?: number;
  tripId: number;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  productId: number | null;
  confirmed?: boolean;
};

type LegacyBackup = {
  key: string;
  products: LegacyProduct[];
  trips: LegacyTrip[];
  lineItems: LegacyLineItem[];
};

type LegacyMigrationTx = {
  table: (name: string) => {
    get: (key: string) => Promise<LegacyBackup | undefined>;
    put: (value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
};

async function migrateLegacyBackupToUuidStores(tx: LegacyMigrationTx): Promise<void> {
  const backup = await tx.table('legacy_backup').get('v3');
  if (!backup) return;

  const timestamp = nowIso();
  const productIdMap = new Map<number, string>();
  const tripIdMap = new Map<number, string>();

  for (const product of backup.products) {
    const id = newId();
    if (product.id != null) {
      productIdMap.set(product.id, id);
    }
    await tx.table('products').put({
      id,
      barcode: product.barcode,
      name: product.name,
      defaultUnitPrice: product.defaultUnitPrice,
      category: product.category,
      lastUsedAt: product.lastUsedAt,
      imagePath: null,
      imageBlob: product.imageBlob ?? null,
      updatedAt: timestamp,
      syncedAt: null,
    });
  }

  for (const trip of backup.trips) {
    const id = newId();
    if (trip.id != null) {
      tripIdMap.set(trip.id, id);
    }
    await tx.table('shoppingTrips').put({
      id,
      date: trip.date,
      storeName: trip.storeName,
      notes: trip.notes,
      status: (trip.status as ShoppingTrip['status']) ?? 'complete',
      receiptTotal: trip.receiptTotal ?? null,
      updatedAt: timestamp,
      syncedAt: null,
    });
  }

  for (const item of backup.lineItems) {
    const tripId = tripIdMap.get(item.tripId);
    if (!tripId) continue;

    await tx.table('lineItems').put({
      id: newId(),
      tripId,
      productName: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productId: item.productId != null ? (productIdMap.get(item.productId) ?? null) : null,
      preferredStoreId: null,
      purchasedStoreId: null,
      confirmed: item.confirmed ?? true,
      updatedAt: timestamp,
      syncedAt: null,
    });
  }

  await tx.table('sync_meta').put({ key: 'legacyPendingUpload', value: 'true' });
  await tx.table('legacy_backup').delete('v3');
}

class GroceryDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>;
  stores!: EntityTable<Store, 'id'>;
  shoppingTrips!: EntityTable<ShoppingTrip, 'id'>;
  lineItems!: EntityTable<LineItem, 'id'>;
  sync_outbox!: EntityTable<OutboxEntry, 'localId'>;
  sync_meta!: EntityTable<SyncMeta, 'key'>;
  legacy_backup!: EntityTable<LegacyBackup, 'key'>;

  constructor() {
    super('GroceryTracker');

    this.version(1).stores({
      products: '++id, &barcode, lastUsedAt',
      shoppingTrips: '++id, date',
      lineItems: '++id, tripId, [tripId+productName]',
    });

    this.version(2)
      .stores({
        products: '++id, &barcode, lastUsedAt',
        shoppingTrips: '++id, date',
        lineItems: '++id, tripId, [tripId+productName]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('products')
          .toCollection()
          .modify((product: LegacyProduct) => {
            if (product.imageBlob === undefined) {
              product.imageBlob = null;
            }
          });
      });

    this.version(3)
      .stores({
        products: '++id, &barcode, lastUsedAt',
        shoppingTrips: '++id, date, status',
        lineItems: '++id, tripId, [tripId+productName]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('shoppingTrips')
          .toCollection()
          .modify((trip: LegacyTrip) => {
            if (trip.status === undefined) {
              trip.status = 'complete';
            }
            if (trip.receiptTotal === undefined) {
              trip.receiptTotal = null;
            }
          });

        await tx
          .table('lineItems')
          .toCollection()
          .modify((item: LegacyLineItem) => {
            if (item.confirmed === undefined) {
              item.confirmed = true;
            }
          });
      });

    this.version(4)
      .stores({
        products: '++id, &barcode, lastUsedAt',
        shoppingTrips: '++id, date, status',
        lineItems: '++id, tripId, [tripId+productName]',
        legacy_backup: 'key',
      })
      .upgrade(async (tx) => {
        const products = await tx.table('products').toArray();
        const trips = await tx.table('shoppingTrips').toArray();
        const lineItems = await tx.table('lineItems').toArray();

        if (products.length > 0 || trips.length > 0 || lineItems.length > 0) {
          await tx.table('legacy_backup').put({
            key: 'v3',
            products,
            trips,
            lineItems,
          });
        }
      });

    // Dexie cannot change ++id to string id in one step — drop old stores first.
    this.version(5).stores({
      products: null,
      shoppingTrips: null,
      lineItems: null,
      sync_outbox: '++localId, createdAt, entityId',
      sync_meta: 'key',
      legacy_backup: 'key',
    });

    this.version(6)
      .stores({
        products: 'id, &barcode, lastUsedAt, updatedAt',
        shoppingTrips: 'id, date, status, updatedAt',
        lineItems: 'id, tripId, [tripId+productName], updatedAt',
        sync_outbox: '++localId, createdAt, entityId',
        sync_meta: 'key',
        legacy_backup: 'key',
      })
      .upgrade(async (tx) => {
        await migrateLegacyBackupToUuidStores(tx);
      });

    this.version(7)
      .stores({
        products: 'id, &barcode, lastUsedAt, updatedAt',
        stores: 'id, &name, updatedAt',
        shoppingTrips: 'id, date, status, updatedAt',
        lineItems: 'id, tripId, preferredStoreId, purchasedStoreId, [tripId+productName], updatedAt',
        sync_outbox: '++localId, createdAt, entityId',
        sync_meta: 'key',
        legacy_backup: 'key',
      })
      .upgrade(async (tx) => {
        await tx
          .table('lineItems')
          .toCollection()
          .modify((item: LineItem) => {
            if (item.preferredStoreId === undefined) {
              item.preferredStoreId = null;
            }
            if (item.purchasedStoreId === undefined) {
              item.purchasedStoreId = null;
            }
          });
      });
  }
}

export const db = new GroceryDatabase();

function isUpgradeError(error: unknown): boolean {
  if (error instanceof Dexie.UpgradeError) return true;
  if (error instanceof Error) {
    return error.name === 'UpgradeError' || error.message.includes('primary key');
  }
  return false;
}

export async function openDatabase(): Promise<void> {
  if (db.isOpen()) return;

  try {
    await db.open();
  } catch (error) {
    if (!isUpgradeError(error)) {
      throw error;
    }

    await db.delete();
    await db.open();
  }
}
