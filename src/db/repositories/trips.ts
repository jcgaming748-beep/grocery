import { db } from '@/db/database';
import type { ShoppingTrip, TripWithTotal } from '@/db/schema';

export async function createTrip(input: {
  storeName?: string | null;
  notes?: string | null;
} = {}): Promise<ShoppingTrip & { id: number }> {
  const id = await db.shoppingTrips.add({
    date: new Date().toISOString(),
    storeName: input.storeName ?? null,
    notes: input.notes ?? null,
  });

  return (await db.shoppingTrips.get(id)) as ShoppingTrip & { id: number };
}

export async function getTrip(id: number): Promise<(ShoppingTrip & { id: number }) | undefined> {
  const trip = await db.shoppingTrips.get(id);
  if (!trip || trip.id == null) return undefined;
  return trip as ShoppingTrip & { id: number };
}

export async function listTripsWithTotals(): Promise<TripWithTotal[]> {
  const trips = await db.shoppingTrips.orderBy('date').reverse().toArray();

  return Promise.all(
    trips.map(async (trip) => {
      const items = await db.lineItems.where('tripId').equals(trip.id!).toArray();
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
  const tripMap = new Map(trips.map((t) => [t.id!, t.date]));
  const items = await db.lineItems.toArray();

  let weekTotal = 0;
  let monthTotal = 0;

  for (const item of items) {
    const tripDate = tripMap.get(item.tripId);
    if (!tripDate) continue;

    const total = item.quantity * item.unitPrice;
    const date = new Date(tripDate);

    if (date >= weekStart) weekTotal += total;
    if (date >= monthStart) monthTotal += total;
  }

  return { weekTotal, monthTotal };
}
