export type Product = {
  id?: number;
  barcode: string;
  name: string;
  defaultUnitPrice: number | null;
  category: string | null;
  lastUsedAt: string | null;
};

export type ShoppingTrip = {
  id?: number;
  date: string;
  storeName: string | null;
  notes: string | null;
};

export type LineItem = {
  id?: number;
  tripId: number;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  productId: number | null;
};

export type TripWithTotal = ShoppingTrip & {
  id: number;
  subtotal: number;
  itemCount: number;
};

export function lineItemTotal(item: Pick<LineItem, 'quantity' | 'unitPrice'>): number {
  return item.quantity * item.unitPrice;
}
