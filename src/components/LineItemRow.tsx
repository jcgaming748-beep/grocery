import type { LineItem } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';

type Props = {
  item: LineItem & { id: number };
};

export default function LineItemRow({ item }: Props) {
  return (
    <div className="line-item-row">
      <div className="line-item-details">
        <div className="line-item-name">{item.productName}</div>
        <div className="line-item-meta">
          {item.quantity} × ${item.unitPrice.toFixed(2)}
        </div>
      </div>
      <div className="line-item-total">${lineItemTotal(item).toFixed(2)}</div>
    </div>
  );
}
