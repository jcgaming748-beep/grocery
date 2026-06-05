export type EntityId = string;

export type Product = {
  id: EntityId;
  barcode: string;
  name: string;
  defaultUnitPrice: number | null;
  category: string | null;
  lastUsedAt: string | null;
  imagePath: string | null;
  imageBlob: Blob | null;
  updatedAt: string;
  syncedAt: string | null;
};

export type PendingScan = {
  barcode: string;
  productName: string;
  productId: EntityId | null;
  category: string | null;
  defaultUnitPrice: number | null;
  imageBlob: Blob | null;
};

export type TripStatus = 'planning' | 'shopping' | 'pending_review' | 'complete';

export type ShoppingTrip = {
  id: EntityId;
  date: string;
  storeName: string | null;
  notes: string | null;
  status: TripStatus;
  receiptTotal: number | null;
  updatedAt: string;
  syncedAt: string | null;
};

export type LineItem = {
  id: EntityId;
  tripId: EntityId;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  productId: EntityId | null;
  confirmed: boolean;
  updatedAt: string;
  syncedAt: string | null;
};

export type TripWithTotal = ShoppingTrip & {
  subtotal: number;
  itemCount: number;
};

export type SyncEntity = 'products' | 'shopping_trips' | 'line_items';

export type SyncOperation = 'upsert' | 'delete';

export type OutboxEntry = {
  localId?: number;
  entityId: EntityId;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  pendingImageUpload: boolean;
};

export type SyncMeta = {
  key: string;
  value: string;
};

export function newId(): EntityId {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function lineItemTotal(item: Pick<LineItem, 'quantity' | 'unitPrice'>): number {
  return item.quantity * item.unitPrice;
}

export function sumLineItems(items: Pick<LineItem, 'quantity' | 'unitPrice'>[]): number {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0);
}

export function sumConfirmedLineItems(
  items: Pick<LineItem, 'quantity' | 'unitPrice' | 'confirmed'>[],
): number {
  return items
    .filter((item) => item.confirmed)
    .reduce((sum, item) => sum + lineItemTotal(item), 0);
}

export function computeTripDisplayTotal(
  trip: Pick<ShoppingTrip, 'status' | 'receiptTotal'>,
  items: Pick<LineItem, 'quantity' | 'unitPrice' | 'confirmed'>[],
): number {
  const lineSum = sumLineItems(items);

  switch (trip.status) {
    case 'planning':
    case 'shopping':
      return lineSum;
    case 'pending_review':
      return trip.receiptTotal ?? lineSum;
    case 'complete':
      return lineSum;
    default:
      return lineSum;
  }
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planning: 'Planning',
  shopping: 'Shopping',
  pending_review: 'Needs review',
  complete: 'Complete',
};
