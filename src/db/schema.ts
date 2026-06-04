export type Product = {
  id?: number;
  barcode: string;
  name: string;
  defaultUnitPrice: number | null;
  category: string | null;
  lastUsedAt: string | null;
  imageBlob: Blob | null;
};

export type PendingScan = {
  barcode: string;
  productName: string;
  productId: number | null;
  category: string | null;
  defaultUnitPrice: number | null;
  imageBlob: Blob | null;
};

export type TripStatus = 'planning' | 'shopping' | 'pending_review' | 'complete';

export type ShoppingTrip = {
  id?: number;
  date: string;
  storeName: string | null;
  notes: string | null;
  status: TripStatus;
  receiptTotal: number | null;
};

export type LineItem = {
  id?: number;
  tripId: number;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  productId: number | null;
  confirmed: boolean;
};

export type TripWithTotal = ShoppingTrip & {
  id: number;
  subtotal: number;
  itemCount: number;
};

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
