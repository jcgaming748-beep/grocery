import type { LineItem } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';
import { useProductThumbnail } from '@/hooks/useProductThumbnail';

type Props = {
  item: LineItem;
  onPress?: () => void;
  onDelete?: () => void;
};

export default function LineItemRow({ item, onPress, onDelete }: Props) {
  const imageUrl = useProductThumbnail(item.productId);
  const isZeroPrice = item.unitPrice === 0;

  const main = (
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

  return (
    <div className="line-item-row">
      {onPress ? (
        <button type="button" className="line-item-main line-item-row-button" onClick={onPress}>
          {main}
        </button>
      ) : (
        <div className="line-item-main">{main}</div>
      )}
      {onDelete ? (
        <button
          type="button"
          className="btn-icon-delete"
          aria-label={`Delete ${item.productName}`}
          onClick={onDelete}>
          ×
        </button>
      ) : null}
    </div>
  );
}
