import { db } from '@/db/database';
import type { Product } from '@/db/schema';

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products.where('barcode').equals(barcode).first();
}

export async function getProduct(id: number): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function upsertProduct(input: {
  barcode: string;
  name: string;
  defaultUnitPrice?: number | null;
  category?: string | null;
  imageBlob?: Blob | null;
}): Promise<Product> {
  const now = new Date().toISOString();
  const existing = await getProductByBarcode(input.barcode);

  if (existing?.id != null) {
    const patch: Partial<Product> = {
      name: input.name,
      defaultUnitPrice: input.defaultUnitPrice ?? existing.defaultUnitPrice,
      category: input.category ?? existing.category,
      lastUsedAt: now,
    };

    if (input.imageBlob !== undefined) {
      patch.imageBlob = input.imageBlob;
    }

    await db.products.update(existing.id, patch);
    return (await db.products.get(existing.id))!;
  }

  const id = await db.products.add({
    barcode: input.barcode,
    name: input.name,
    defaultUnitPrice: input.defaultUnitPrice ?? null,
    category: input.category ?? null,
    lastUsedAt: now,
    imageBlob: input.imageBlob ?? null,
  });

  return (await db.products.get(id))!;
}

export async function updateProductPrice(id: number, defaultUnitPrice: number): Promise<void> {
  await db.products.update(id, { defaultUnitPrice });
}

export async function updateProductImage(id: number, imageBlob: Blob | null): Promise<void> {
  await db.products.update(id, { imageBlob });
}
