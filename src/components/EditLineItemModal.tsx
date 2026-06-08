import { useState } from 'react';

import StorePicker from '@/components/StorePicker';
import type { LineItem, Store } from '@/db/schema';

type Props = {
  item: LineItem;
  stores: Store[];
  onSave: (updates: {
    quantity: number;
    unitPrice: number;
    preferredStoreId: string | null;
  }) => void;
  onDelete: () => void;
  onUnlinkCatalog?: () => void;
  onClose: () => void;
};

export default function EditLineItemModal({
  item,
  stores,
  onSave,
  onDelete,
  onUnlinkCatalog,
  onClose,
}: Props) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unitPrice, setUnitPrice] = useState(
    item.unitPrice === 0 ? '' : String(item.unitPrice),
  );
  const [preferredStoreId, setPreferredStoreId] = useState<string | null>(item.preferredStoreId);

  function handleSave() {
    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(unitPrice);

    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    onSave({ quantity: parsedQty, unitPrice: parsedPrice, preferredStoreId });
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

        <StorePicker
          stores={stores}
          value={preferredStoreId}
          onChange={setPreferredStoreId}
          label="Buy at"
          noneLabel="No store assigned"
        />

        <button type="button" className="btn-primary btn-block" onClick={handleSave}>
          Save
        </button>
        {item.productId && onUnlinkCatalog ? (
          <button type="button" className="btn-secondary btn-block" onClick={onUnlinkCatalog}>
            Wrong photo? Unlink from catalog
          </button>
        ) : null}
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
