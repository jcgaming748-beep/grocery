import { db } from '@/db/database';
import type { LineItem } from '@/db/schema';

export async function listLineItemsForTrip(tripId: number): Promise<(LineItem & { id: number })[]> {
  const items = await db.lineItems.where('tripId').equals(tripId).sortBy('id');
  return items as (LineItem & { id: number })[];
}

export async function addLineItem(input: {
  tripId: number;
  productName: string;
  barcode?: string | null;
  quantity?: number;
  unitPrice?: number;
  productId?: number | null;
  confirmed?: boolean;
}): Promise<LineItem & { id: number }> {
  const id = await db.lineItems.add({
    tripId: input.tripId,
    productName: input.productName,
    barcode: input.barcode ?? null,
    quantity: input.quantity ?? 1,
    unitPrice: input.unitPrice ?? 0,
    productId: input.productId ?? null,
    confirmed: input.confirmed ?? false,
  });

  return (await db.lineItems.get(id)) as LineItem & { id: number };
}

export async function updateLineItemQuantity(id: number, quantity: number): Promise<void> {
  await db.lineItems.update(id, { quantity });
}

export async function updateLineItem(
  id: number,
  updates: {
    quantity?: number;
    unitPrice?: number;
    confirmed?: boolean;
    productId?: number | null;
    barcode?: string | null;
  },
): Promise<void> {
  await db.lineItems.update(id, updates);
}

export async function toggleLineItemConfirmed(id: number): Promise<boolean> {
  const item = await db.lineItems.get(id);
  if (!item) return false;

  const confirmed = !item.confirmed;
  await db.lineItems.update(id, { confirmed });
  return confirmed;
}

export async function setLineItemConfirmed(id: number, confirmed: boolean): Promise<void> {
  await db.lineItems.update(id, { confirmed });
}

export async function deleteLineItem(id: number): Promise<void> {
  await db.lineItems.delete(id);
}

export async function getTripSubtotal(tripId: number): Promise<number> {
  const items = await db.lineItems.where('tripId').equals(tripId).toArray();
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
