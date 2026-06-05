import { db } from '@/db/database';
import type { OutboxEntry, SyncEntity } from '@/db/schema';
import { PRODUCT_IMAGES_BUCKET, requireSupabase } from '@/lib/supabase';
import {
  ensureAuthenticatedSession,
  formatSyncError,
  refreshOutboxPayload,
} from '@/lib/syncError';
import type { RemoteLineItem, RemoteProduct, RemoteShoppingTrip } from '@/lib/supabaseTypes';
import { uploadProductImageIfNeeded } from '@/sync/imageSync';
import { incrementOutboxRetry, listOutboxEntries, removeOutboxEntry } from '@/sync/outbox';

const UPSERT_ORDER: Record<SyncEntity, number> = {
  products: 0,
  shopping_trips: 1,
  line_items: 2,
};

function sortOutboxEntries(entries: OutboxEntry[]): OutboxEntry[] {
  const upserts = entries
    .filter((entry) => entry.operation === 'upsert')
    .sort((a, b) => UPSERT_ORDER[a.entity] - UPSERT_ORDER[b.entity]);
  const deletes = entries
    .filter((entry) => entry.operation === 'delete')
    .sort((a, b) => UPSERT_ORDER[b.entity] - UPSERT_ORDER[a.entity]);

  return [...upserts, ...deletes];
}

function wrapSyncError(entity: SyncEntity, entityId: string, error: unknown): Error {
  const detail = formatSyncError(error);
  return new Error(`${entity} ${entityId.slice(0, 8)}…: ${detail}`);
}

export async function pushChanges(userId: string): Promise<void> {
  const client = requireSupabase();
  await ensureAuthenticatedSession(userId);

  const entries = sortOutboxEntries(await listOutboxEntries());

  for (const entry of entries) {
    try {
      if (entry.operation === 'delete') {
        const { error } = await client.from(entry.entity).delete().eq('id', entry.entityId);
        if (error) throw wrapSyncError(entry.entity, entry.entityId, error);
        await removeOutboxEntry(entry.localId!);
        continue;
      }

      const payload =
        (await refreshOutboxPayload(entry.entity, entry.entityId, userId)) ?? entry.payload;

      const { error } = await client.from(entry.entity).upsert(payload, { onConflict: 'id' });
      if (error) throw wrapSyncError(entry.entity, entry.entityId, error);

      if (entry.entity === 'products' && entry.pendingImageUpload) {
        const product = await db.products.get(entry.entityId);
        if (product?.imageBlob) {
          try {
            await uploadProductImageIfNeeded(product, userId);
          } catch (imageError) {
            console.warn('Product photo upload failed (will retry later):', imageError);
          }
        }
      }

      const syncedAt = new Date().toISOString();
      if (entry.entity === 'products') {
        await db.products.update(entry.entityId, { syncedAt });
      } else if (entry.entity === 'shopping_trips') {
        await db.shoppingTrips.update(entry.entityId, { syncedAt });
      } else if (entry.entity === 'line_items') {
        await db.lineItems.update(entry.entityId, { syncedAt });
      }

      await removeOutboxEntry(entry.localId!);
    } catch (error) {
      await incrementOutboxRetry(entry.localId!);
      throw error;
    }
  }
}

export async function cloudHasAnyData(userId: string): Promise<boolean> {
  const client = requireSupabase();

  const [products, trips] = await Promise.all([
    client.from('products').select('id').eq('user_id', userId).limit(1),
    client.from('shopping_trips').select('id').eq('user_id', userId).limit(1),
  ]);

  if (products.error) throw new Error(formatSyncError(products.error));
  if (trips.error) throw new Error(formatSyncError(trips.error));

  return (products.data?.length ?? 0) > 0 || (trips.data?.length ?? 0) > 0;
}

export async function bulkUploadAll(userId: string): Promise<void> {
  const client = requireSupabase();
  await ensureAuthenticatedSession(userId);

  const [products, trips, lineItems] = await Promise.all([
    db.products.toArray(),
    db.shoppingTrips.toArray(),
    db.lineItems.toArray(),
  ]);

  if (products.length > 0) {
    const rows: RemoteProduct[] = products.map((product) => ({
      id: product.id,
      user_id: userId,
      barcode: product.barcode,
      name: product.name,
      default_unit_price: product.defaultUnitPrice,
      category: product.category,
      last_used_at: product.lastUsedAt,
      image_path: product.imagePath,
      updated_at: product.updatedAt,
    }));
    const { error } = await client.from('products').upsert(rows, { onConflict: 'id' });
    if (error) throw error;

    for (const product of products) {
      if (product.imageBlob && !product.imagePath) {
        try {
          await uploadProductImageIfNeeded(product, userId);
        } catch (imageError) {
          console.warn('Product photo upload failed during backup:', imageError);
        }
      }
    }
  }

  if (trips.length > 0) {
    const rows: RemoteShoppingTrip[] = trips.map((trip) => ({
      id: trip.id,
      user_id: userId,
      date: trip.date,
      store_name: trip.storeName,
      notes: trip.notes,
      status: trip.status,
      receipt_total: trip.receiptTotal,
      updated_at: trip.updatedAt,
    }));
    const { error } = await client.from('shopping_trips').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  if (lineItems.length > 0) {
    const rows: RemoteLineItem[] = lineItems.map((item) => ({
      id: item.id,
      user_id: userId,
      trip_id: item.tripId,
      product_name: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product_id: item.productId,
      confirmed: item.confirmed,
      updated_at: item.updatedAt,
    }));
    const { error } = await client.from('line_items').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  const syncedAt = new Date().toISOString();
  await db.transaction('rw', db.products, db.shoppingTrips, db.lineItems, async () => {
    for (const product of products) {
      await db.products.update(product.id, { syncedAt });
    }
    for (const trip of trips) {
      await db.shoppingTrips.update(trip.id, { syncedAt });
    }
    for (const item of lineItems) {
      await db.lineItems.update(item.id, { syncedAt });
    }
  });
}

export async function deleteRemoteProductImage(imagePath: string): Promise<void> {
  const client = requireSupabase();
  await client.storage.from(PRODUCT_IMAGES_BUCKET).remove([imagePath]);
}
