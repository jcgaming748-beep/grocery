import { useEffect, useState } from 'react';

import { getProduct } from '@/db/repositories/products';
import { catalogNameMatchesLine } from '@/services/scanLineMatch';
import { blobToObjectUrl } from '@/services/imageCompression';

export function useProductThumbnail(productId: string | null, lineName: string): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    setImageUrl(null);

    async function load() {
      if (!productId) return;

      const product = await getProduct(productId);
      if (cancelled) return;

      if (!product?.imageBlob || !catalogNameMatchesLine(lineName, product.name)) {
        setImageUrl(null);
        return;
      }

      objectUrl = blobToObjectUrl(product.imageBlob);
      if (!cancelled) {
        setImageUrl(objectUrl);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [productId, lineName]);

  return imageUrl;
}
