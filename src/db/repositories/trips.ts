import { db } from '@/db/database';
import {
  computeTripDisplayTotal,
  sumConfirmedLineItems,
  sumLineItems,
  type ShoppingTrip,
  type TripStatus,
  type TripWithTotal,
} from '@/db/schema';

type TripRecord = ShoppingTrip & { id: number };

async function getTripItems(tripId: number) {
  return db.lineItems.where('tripId').equals(tripId).toArray();
}

export async function createPlanningTrip(): Promise<TripRecord> {
  const existing = await getActiveTripByStatus('planning');
  if (existing) return existing;

  const id = await db.shoppingTrips.add({
    date: new Date().toISOString(),
    storeName: null,
    notes: null,
    status: 'planning',
    receiptTotal: null,
  });

  return (await db.shoppingTrips.get(id)) as TripRecord;
}

export async function createTrip(input: {
  storeName?: string | null;
  notes?: string | null;
  status?: TripStatus;
} = {}): Promise<TripRecord> {
  const id = await db.shoppingTrips.add({
    date: new Date().toISOString(),
    storeName: input.storeName ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'shopping',
    receiptTotal: null,
  });

  return (await db.shoppingTrips.get(id)) as TripRecord;
}

export async function getTrip(id: number): Promise<TripRecord | undefined> {
  const trip = await db.shoppingTrips.get(id);
  if (!trip || trip.id == null) return undefined;
  return trip as TripRecord;
}

export async function getActiveTripByStatus(status: TripStatus): Promise<TripRecord | undefined> {
  const trip = await db.shoppingTrips.where('status').equals(status).first();
  if (!trip || trip.id == null) return undefined;
  return trip as TripRecord;
}

export async function startShopping(tripId: number): Promise<void> {
  const shopping = await getActiveTripByStatus('shopping');
  if (shopping && shopping.id !== tripId) {
    throw new Error('Another shopping trip is already active.');
  }

  await db.shoppingTrips.update(tripId, { status: 'shopping' });
}

export async function acceptReceiptTotal(tripId: number, total: number): Promise<void> {
  await db.shoppingTrips.update(tripId, {
    receiptTotal: total,
    status: 'pending_review',
  });
}

export async function completeTrip(tripId: number): Promise<void> {
  await db.shoppingTrips.update(tripId, { status: 'complete' });
}

export async function listTripsWithTotals(): Promise<TripWithTotal[]> {
  const trips = await db.shoppingTrips.orderBy('date').reverse().toArray();

  return Promise.all(
    trips.map(async (trip) => {
      const items = await getTripItems(trip.id!);
      const subtotal = computeTripDisplayTotal(trip, items);

      return {
        ...trip,
        id: trip.id!,
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
    if (trip.id == null) continue;

    const date = new Date(trip.date);
    const items = await getTripItems(trip.id);
    const amount = computeTripDisplayTotal(trip, items);

    if (date >= weekStart) weekTotal += amount;
    if (date >= monthStart) monthTotal += amount;
  }

  return { weekTotal, monthTotal };
}

export async function deleteTrip(id: number): Promise<void> {
  await db.lineItems.where('tripId').equals(id).delete();
  await db.shoppingTrips.delete(id);
}

export { sumLineItems, sumConfirmedLineItems, computeTripDisplayTotal };
