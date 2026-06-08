import { db } from '@/db/database';
import { nowIso } from '@/db/schema';
import {
  FAREWAY_BACKFILL_META_KEY,
  FAREWAY_STORE_NAME,
  PURCHASED_TRIP_STATUSES,
} from '@/constants/stores';
import { ensureStoreByName } from '@/db/repositories/stores';
import { updateLineItem } from '@/db/repositories/lineItems';
import { updateTripStoreName } from '@/db/repositories/trips';
import { syncRecord } from '@/sync/syncAfterWrite';

async function dedupeFarewayStores(): Promise<void> {
  const fareways = await db.stores.where('name').equals(FAREWAY_STORE_NAME).toArray();
  if (fareways.length <= 1) return;

  const canonical = fareways.sort((a, b) => {
    if (a.syncedAt && !b.syncedAt) return -1;
    if (!a.syncedAt && b.syncedAt) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];

  for (const duplicate of fareways) {
    if (duplicate.id === canonical.id) continue;

    const items = await db.lineItems
      .filter(
        (item) =>
          item.preferredStoreId === duplicate.id || item.purchasedStoreId === duplicate.id,
      )
      .toArray();

    for (const item of items) {
      await updateLineItem(item.id, {
        preferredStoreId:
          item.preferredStoreId === duplicate.id ? canonical.id : item.preferredStoreId,
        purchasedStoreId:
          item.purchasedStoreId === duplicate.id ? canonical.id : item.purchasedStoreId,
      });
    }

    await db.stores.delete(duplicate.id);
    await syncRecord('stores', duplicate, { delete: true });
  }
}

export async function backfillFarewayIfNeeded(): Promise<boolean> {
  const done = await db.sync_meta.get(FAREWAY_BACKFILL_META_KEY);
  if (done?.value === 'true') {
    await dedupeFarewayStores();
    return false;
  }

  await dedupeFarewayStores();
  const fareway = await ensureStoreByName(FAREWAY_STORE_NAME);
  const timestamp = nowIso();

  const trips = await db.shoppingTrips.toArray();
  for (const trip of trips) {
    if (!PURCHASED_TRIP_STATUSES.includes(trip.status)) continue;

    if (!trip.storeName) {
      await updateTripStoreName(trip.id, FAREWAY_STORE_NAME);
    }

    const items = await db.lineItems.where('tripId').equals(trip.id).toArray();
    for (const item of items) {
      if (!item.purchasedStoreId) {
        await updateLineItem(item.id, { purchasedStoreId: fareway.id });
      }
    }
  }

  await db.sync_meta.put({ key: FAREWAY_BACKFILL_META_KEY, value: 'true' });
  await db.sync_meta.put({ key: 'farewayBackfillAt', value: timestamp });
  return true;
}
