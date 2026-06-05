import { db } from '@/db/database';
import type { Product } from '@/db/schema';
import { newId, nowIso } from '@/db/schema';
import { syncRecord } from '@/sync/syncAfterWrite';

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products.where('barcode').equals(barcode).first();
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function upsertProduct(input: {
  barcode: string;
  name: string;
  defaultUnitPrice?: number | null;
  category?: string | null;
  imageBlob?: Blob | null;
}): Promise<Product> {
  const timestamp = nowIso();
  const existing = await getProductByBarcode(input.barcode);
  const pendingImageUpload = input.imageBlob !== undefined && input.imageBlob !== null;

  if (existing) {
    const patch: Partial<Product> = {
      name: input.name,
      defaultUnitPrice: input.defaultUnitPrice ?? existing.defaultUnitPrice,
      category: input.category ?? existing.category,
      lastUsedAt: timestamp,
      updatedAt: timestamp,
    };

    if (input.imageBlob !== undefined) {
      patch.imageBlob = input.imageBlob;
    }

    await db.products.update(existing.id, patch);
    const updated = (await db.products.get(existing.id))!;
    await syncRecord('products', updated, { pendingImageUpload });
    return updated;
  }

  const product: Product = {
    id: newId(),
    barcode: input.barcode,
    name: input.name,
    defaultUnitPrice: input.defaultUnitPrice ?? null,
    category: input.category ?? null,
    lastUsedAt: timestamp,
    imagePath: null,
    imageBlob: input.imageBlob ?? null,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.products.put(product);
  await syncRecord('products', product, { pendingImageUpload });
  return product;
}

export async function updateProductPrice(id: string, defaultUnitPrice: number): Promise<void> {
  const timestamp = nowIso();
  await db.products.update(id, { defaultUnitPrice, updatedAt: timestamp });
  const product = await db.products.get(id);
  if (product) {
    await syncRecord('products', product);
  }
}

export async function updateProductImage(id: string, imageBlob: Blob | null): Promise<void> {
  const timestamp = nowIso();
  await db.products.update(id, { imageBlob, updatedAt: timestamp });
  const product = await db.products.get(id);
  if (product) {
    await syncRecord('products', product, { pendingImageUpload: imageBlob != null });
  }
}

export async function searchProductsByName(query: string, limit = 8): Promise<Product[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return listRecentProducts(limit);

  const products = await db.products.orderBy('lastUsedAt').reverse().toArray();

  return products
    .filter((product) => product.name.toLowerCase().includes(normalized))
    .slice(0, limit);
}

export async function listRecentProducts(limit = 8): Promise<Product[]> {
  const products = await db.products.orderBy('lastUsedAt').reverse().toArray();
  return products.filter((p) => p.lastUsedAt != null).slice(0, limit);
}
