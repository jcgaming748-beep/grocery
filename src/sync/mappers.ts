import type { LineItem, Product, ShoppingTrip, Store } from '@/db/schema';
import type { RemoteLineItem, RemoteProduct, RemoteShoppingTrip, RemoteStore } from '@/lib/supabaseTypes';

export function productToRemote(product: Product, userId: string) {
  return {
    id: product.id,
    user_id: userId,
    barcode: product.barcode,
    name: product.name,
    default_unit_price: product.defaultUnitPrice,
    category: product.category,
    last_used_at: product.lastUsedAt,
    image_path: product.imagePath,
    updated_at: product.updatedAt,
  };
}

export function storeToRemote(store: Store, userId: string) {
  return {
    id: store.id,
    user_id: userId,
    name: store.name,
    updated_at: store.updatedAt,
  };
}

export function tripToRemote(trip: ShoppingTrip, userId: string) {
  return {
    id: trip.id,
    user_id: userId,
    date: trip.date,
    store_name: trip.storeName,
    notes: trip.notes,
    status: trip.status,
    receipt_total: trip.receiptTotal,
    updated_at: trip.updatedAt,
  };
}

export function lineItemToRemote(item: LineItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    trip_id: item.tripId,
    product_name: item.productName,
    barcode: item.barcode,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    product_id: item.productId,
    preferred_store_id: item.preferredStoreId,
    purchased_store_id: item.purchasedStoreId,
    confirmed: item.confirmed,
    updated_at: item.updatedAt,
  };
}

export function remoteToProduct(remote: RemoteProduct): Product {
  return {
    id: remote.id,
    barcode: remote.barcode,
    name: remote.name,
    defaultUnitPrice: remote.default_unit_price,
    category: remote.category,
    lastUsedAt: remote.last_used_at,
    imagePath: remote.image_path,
    imageBlob: null,
    updatedAt: remote.updated_at,
    syncedAt: remote.updated_at,
  };
}

export function remoteToStore(remote: RemoteStore): Store {
  return {
    id: remote.id,
    name: remote.name,
    updatedAt: remote.updated_at,
    syncedAt: remote.updated_at,
  };
}

export function remoteToTrip(remote: RemoteShoppingTrip): ShoppingTrip {
  return {
    id: remote.id,
    date: remote.date,
    storeName: remote.store_name,
    notes: remote.notes,
    status: remote.status as ShoppingTrip['status'],
    receiptTotal: remote.receipt_total,
    updatedAt: remote.updated_at,
    syncedAt: remote.updated_at,
  };
}

export function remoteToLineItem(remote: RemoteLineItem): LineItem {
  return {
    id: remote.id,
    tripId: remote.trip_id,
    productName: remote.product_name,
    barcode: remote.barcode,
    quantity: Number(remote.quantity),
    unitPrice: Number(remote.unit_price),
    productId: remote.product_id,
    preferredStoreId: remote.preferred_store_id,
    purchasedStoreId: remote.purchased_store_id,
    confirmed: remote.confirmed,
    updatedAt: remote.updated_at,
    syncedAt: remote.updated_at,
  };
}
