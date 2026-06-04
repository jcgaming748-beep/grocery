import { db } from '@/db/database';
import type { Product } from '@/db/schema';

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products.where('barcode').equals(barcode).first();
}

export async function upsertProduct(input: {
  barcode: string;
  name: string;
  defaultUnitPrice?: number | null;
  category?: string | null;
}): Promise<Product> {
  const now = new Date().toISOString();
  const existing = await getProductByBarcode(input.barcode);

  if (existing?.id != null) {
    await db.products.update(existing.id, {
      name: input.name,
      defaultUnitPrice: input.defaultUnitPrice ?? existing.defaultUnitPrice,
      category: input.category ?? existing.category,
      lastUsedAt: now,
    });
    return (await db.products.get(existing.id))!;
  }

  return db.products.add({
    barcode: input.barcode,
    name: input.name,
    defaultUnitPrice: input.defaultUnitPrice ?? null,
    category: input.category ?? null,
    lastUsedAt: now,
  }).then((id) => db.products.get(id).then((p) => p!));
}
