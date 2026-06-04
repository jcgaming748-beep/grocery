import { useEffect, useState } from 'react';

import { getProduct } from '@/db/repositories/products';
import { blobToObjectUrl } from '@/services/imageCompression';
import type { LineItem } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';

type Props = {
  item: LineItem & { id: number };
  onPress?: () => void;
};

export default function LineItemRow({ item, onPress }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isZeroPrice = item.unitPrice === 0;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage() {
      if (!item.productId) return;

      const product = await getProduct(item.productId);
      if (cancelled || !product?.imageBlob) return;

      objectUrl = blobToObjectUrl(product.imageBlob);
      if (!cancelled) {
        setImageUrl(objectUrl);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.productId]);

  const content = (
    <>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="line-item-thumb" />
      ) : (
        <div className="line-item-thumb line-item-thumb-placeholder" />
      )}
      <div className="line-item-details">
        <div className="line-item-name">{item.productName}</div>
        <div className={`line-item-meta${isZeroPrice ? ' line-item-meta-warning' : ''}`}>
          {item.quantity} × ${item.unitPrice.toFixed(2)}
          {isZeroPrice ? ' · set price' : ''}
        </div>
      </div>
      <div className={`line-item-total${isZeroPrice ? ' line-item-total-warning' : ''}`}>
        ${lineItemTotal(item).toFixed(2)}
      </div>
    </>
  );

  if (onPress) {
    return (
      <button type="button" className="line-item-row line-item-row-button" onClick={onPress}>
        {content}
      </button>
    );
  }

  return <div className="line-item-row">{content}</div>;
}
