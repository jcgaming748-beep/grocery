import { db } from '@/db/database';
import type { Product } from '@/db/schema';
import { nowIso } from '@/db/schema';
import { PRODUCT_IMAGES_BUCKET, requireSupabase } from '@/lib/supabase';

export function productImagePath(userId: string, productId: string): string {
  return `${userId}/${productId}.jpg`;
}

export async function uploadProductImageIfNeeded(product: Product, userId: string): Promise<void> {
  if (!product.imageBlob) return;

  const client = requireSupabase();
  const path = productImagePath(userId, product.id);

  const { error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, product.imageBlob, { upsert: true, contentType: 'image/jpeg' });

  if (error) throw error;

  const updatedAt = nowIso();
  await db.products.update(product.id, {
    imagePath: path,
    updatedAt,
    syncedAt: updatedAt,
  });

  await client
    .from('products')
    .update({ image_path: path, updated_at: updatedAt })
    .eq('id', product.id);
}

export async function downloadProductImageIfNeeded(productId: string): Promise<void> {
  const product = await db.products.get(productId);
  if (!product || product.imageBlob || !product.imagePath) return;

  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .download(product.imagePath);

  if (error || !data) return;

  await db.products.update(productId, { imageBlob: data });
}
