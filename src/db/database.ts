import Dexie, { type EntityTable } from 'dexie';

import type { LineItem, Product, ShoppingTrip } from '@/db/schema';

class GroceryDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>;
  shoppingTrips!: EntityTable<ShoppingTrip, 'id'>;
  lineItems!: EntityTable<LineItem, 'id'>;

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
          .modify((product: Product) => {
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
          .modify((trip: ShoppingTrip) => {
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
          .modify((item: LineItem) => {
            if (item.confirmed === undefined) {
              item.confirmed = true;
            }
          });
      });
  }
}

export const db = new GroceryDatabase();
