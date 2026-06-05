import { db } from '@/db/database';
import type { LineItem } from '@/db/schema';
import { newId, nowIso } from '@/db/schema';
import { getProduct } from '@/db/repositories/products';
import { catalogNameMatchesLine } from '@/services/scanLineMatch';
import { syncRecord } from '@/sync/syncAfterWrite';

async function repairCatalogLinkIfMismatch(item: LineItem): Promise<LineItem> {
  if (!item.productId) return item;

  const product = await getProduct(item.productId);
  if (product && catalogNameMatchesLine(item.productName, product.name)) {
    return item;
  }

  const timestamp = nowIso();
  const patch = { productId: null, barcode: null, updatedAt: timestamp };
  await db.lineItems.update(item.id, patch);
  const updated = { ...item, ...patch };
  await syncRecord('line_items', updated);
  return updated;
}

export async function listLineItemsForTrip(tripId: string): Promise<LineItem[]> {
  const items = await db.lineItems.where('tripId').equals(tripId).sortBy('updatedAt');
  return Promise.all(items.map(repairCatalogLinkIfMismatch));
}

export async function addLineItem(input: {
  tripId: string;
  productName: string;
  barcode?: string | null;
  quantity?: number;
  unitPrice?: number;
  productId?: string | null;
  confirmed?: boolean;
}): Promise<LineItem> {
  const timestamp = nowIso();
  const item: LineItem = {
    id: newId(),
    tripId: input.tripId,
    productName: input.productName,
    barcode: input.barcode ?? null,
    quantity: input.quantity ?? 1,
    unitPrice: input.unitPrice ?? 0,
    productId: input.productId ?? null,
    confirmed: input.confirmed ?? false,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.lineItems.put(item);
  await syncRecord('line_items', item);
  return item;
}

export async function updateLineItemQuantity(id: string, quantity: number): Promise<void> {
  const timestamp = nowIso();
  await db.lineItems.update(id, { quantity, updatedAt: timestamp });
  const item = await db.lineItems.get(id);
  if (item) {
    await syncRecord('line_items', item);
  }
}

export async function updateLineItem(
  id: string,
  updates: {
    quantity?: number;
    unitPrice?: number;
    confirmed?: boolean;
    productId?: string | null;
    barcode?: string | null;
    productName?: string;
  },
): Promise<void> {
  const timestamp = nowIso();
  await db.lineItems.update(id, { ...updates, updatedAt: timestamp });
  const item = await db.lineItems.get(id);
  if (item) {
    await syncRecord('line_items', item);
  }
}

export async function toggleLineItemConfirmed(id: string): Promise<boolean> {
  const item = await db.lineItems.get(id);
  if (!item) return false;

  const confirmed = !item.confirmed;
  const timestamp = nowIso();
  await db.lineItems.update(id, { confirmed, updatedAt: timestamp });
  const updated = (await db.lineItems.get(id))!;
  await syncRecord('line_items', updated);
  return confirmed;
}

export async function setLineItemConfirmed(id: string, confirmed: boolean): Promise<void> {
  const timestamp = nowIso();
  await db.lineItems.update(id, { confirmed, updatedAt: timestamp });
  const item = await db.lineItems.get(id);
  if (item) {
    await syncRecord('line_items', item);
  }
}

export async function deleteLineItem(id: string): Promise<void> {
  const item = await db.lineItems.get(id);
  if (!item) return;

  await db.lineItems.delete(id);
  await syncRecord('line_items', item, { delete: true });
}

export async function getTripSubtotal(tripId: string): Promise<number> {
  const items = await db.lineItems.where('tripId').equals(tripId).toArray();
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
