import { useEffect, useState } from 'react';

import { getProduct } from '@/db/repositories/products';
import { blobToObjectUrl } from '@/services/imageCompression';
import type { LineItem } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';

type Props = {
  item: LineItem;
  onToggleConfirm: () => void;
  onEdit: () => void;
};

export default function ReviewLineItemRow({ item, onToggleConfirm, onEdit }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage() {
      if (!item.productId) return;

      const product = await getProduct(item.productId);
      if (cancelled || !product?.imageBlob) return;

      objectUrl = blobToObjectUrl(product.imageBlob);
      if (!cancelled) setImageUrl(objectUrl);
    }

    loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.productId]);

  return (
    <div className={`review-line-item${item.confirmed ? ' review-line-item-confirmed' : ''}`}>
      <button type="button" className="review-line-main" onClick={onToggleConfirm}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="line-item-thumb" />
        ) : (
          <div className="line-item-thumb line-item-thumb-placeholder" />
        )}
        <div className="line-item-details">
          <div className="line-item-name">{item.productName}</div>
          <div className="line-item-meta">
            {item.quantity} × ${item.unitPrice.toFixed(2)}
          </div>
        </div>
        <div className="review-line-right">
          <div className="line-item-total">${lineItemTotal(item).toFixed(2)}</div>
          {item.confirmed ? <span className="review-check">✓</span> : null}
        </div>
      </button>
      <button type="button" className="btn-icon-edit" aria-label="Edit item" onClick={onEdit}>
        ✎
      </button>
    </div>
  );
}
