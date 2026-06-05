import { db } from '@/db/database';
import {
  computeTripDisplayTotal,
  sumConfirmedLineItems,
  sumLineItems,
  type ShoppingTrip,
  type TripStatus,
  type TripWithTotal,
} from '@/db/schema';
import { newId, nowIso } from '@/db/schema';
import { syncRecord } from '@/sync/syncAfterWrite';

type TripRecord = ShoppingTrip;

async function getTripItems(tripId: string) {
  return db.lineItems.where('tripId').equals(tripId).toArray();
}

export async function createPlanningTrip(): Promise<TripRecord> {
  const existing = await getActiveTripByStatus('planning');
  if (existing) return existing;

  const timestamp = nowIso();
  const trip: TripRecord = {
    id: newId(),
    date: timestamp,
    storeName: null,
    notes: null,
    status: 'planning',
    receiptTotal: null,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.shoppingTrips.put(trip);
  await syncRecord('shopping_trips', trip);
  return trip;
}

export async function createTrip(input: {
  storeName?: string | null;
  notes?: string | null;
  status?: TripStatus;
} = {}): Promise<TripRecord> {
  const timestamp = nowIso();
  const trip: TripRecord = {
    id: newId(),
    date: timestamp,
    storeName: input.storeName ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'shopping',
    receiptTotal: null,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.shoppingTrips.put(trip);
  await syncRecord('shopping_trips', trip);
  return trip;
}

export async function getTrip(id: string): Promise<TripRecord | undefined> {
  return db.shoppingTrips.get(id);
}

export async function getActiveTripByStatus(status: TripStatus): Promise<TripRecord | undefined> {
  return db.shoppingTrips.where('status').equals(status).first();
}

export async function startShopping(tripId: string): Promise<void> {
  const shopping = await getActiveTripByStatus('shopping');
  if (shopping && shopping.id !== tripId) {
    throw new Error('Another shopping trip is already active.');
  }

  const timestamp = nowIso();
  await db.shoppingTrips.update(tripId, { status: 'shopping', updatedAt: timestamp });
  const trip = await db.shoppingTrips.get(tripId);
  if (trip) {
    await syncRecord('shopping_trips', trip);
  }
}

export async function acceptReceiptTotal(tripId: string, total: number): Promise<void> {
  const timestamp = nowIso();
  await db.shoppingTrips.update(tripId, {
    receiptTotal: total,
    status: 'pending_review',
    updatedAt: timestamp,
  });
  const trip = await db.shoppingTrips.get(tripId);
  if (trip) {
    await syncRecord('shopping_trips', trip);
  }
}

export async function completeTrip(tripId: string): Promise<void> {
  const timestamp = nowIso();
  await db.shoppingTrips.update(tripId, { status: 'complete', updatedAt: timestamp });
  const trip = await db.shoppingTrips.get(tripId);
  if (trip) {
    await syncRecord('shopping_trips', trip);
  }
}

export async function listTripsWithTotals(): Promise<TripWithTotal[]> {
  const trips = await db.shoppingTrips.orderBy('date').reverse().toArray();

  return Promise.all(
    trips.map(async (trip) => {
      const items = await getTripItems(trip.id);
      const subtotal = computeTripDisplayTotal(trip, items);

      return {
        ...trip,
        subtotal,
        itemCount: items.length,
      };
    }),
  );
}

export async function getSpendingSummary(): Promise<{ weekTotal: number; monthTotal: number }> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const trips = await db.shoppingTrips.toArray();

  let weekTotal = 0;
  let monthTotal = 0;

  for (const trip of trips) {
    const date = new Date(trip.date);
    const items = await getTripItems(trip.id);
    const amount = computeTripDisplayTotal(trip, items);

    if (date >= weekStart) weekTotal += amount;
    if (date >= monthStart) monthTotal += amount;
  }

  return { weekTotal, monthTotal };
}

export async function deleteTrip(id: string): Promise<void> {
  const trip = await db.shoppingTrips.get(id);
  const items = await getTripItems(id);

  await db.lineItems.where('tripId').equals(id).delete();
  await db.shoppingTrips.delete(id);

  for (const item of items) {
    await syncRecord('line_items', item, { delete: true });
  }
  if (trip) {
    await syncRecord('shopping_trips', trip, { delete: true });
  }
}

export { sumLineItems, sumConfirmedLineItems, computeTripDisplayTotal };
