import { useState } from 'react';

import type { LineItem } from '@/db/schema';

type Props = {
  item: LineItem & { id: number };
  onSave: (updates: { quantity: number; unitPrice: number }) => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function EditLineItemModal({ item, onSave, onDelete, onClose }: Props) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unitPrice, setUnitPrice] = useState(
    item.unitPrice === 0 ? '' : String(item.unitPrice),
  );

  function handleSave() {
    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(unitPrice);

    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    onSave({ quantity: parsedQty, unitPrice: parsedPrice });
  }

  return (
    <div className="modal-overlay modal-overlay-dim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Edit item</h2>
        <p className="modal-product-name">{item.productName}</p>

        <label className="field-label" htmlFor="edit-qty">
          Quantity
        </label>
        <input
          id="edit-qty"
          className="input"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <label className="field-label" htmlFor="edit-price">
          Unit price
        </label>
        <input
          id="edit-price"
          className="input"
          inputMode="decimal"
          placeholder="0.00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
        />

        <button type="button" className="btn-primary btn-block" onClick={handleSave}>
          Save
        </button>
        <button type="button" className="btn-danger btn-block" onClick={onDelete}>
          Remove item
        </button>
        <button type="button" className="btn-link" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
