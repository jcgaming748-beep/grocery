import { useEffect, useState } from 'react';

import { blobToObjectUrl } from '@/services/imageCompression';
import ProductPhotoInput from '@/components/ProductPhotoInput';

type Props = {
  productName: string;
  barcode: string;
  defaultUnitPrice: number | null;
  existingImageBlob: Blob | null;
  onConfirm: (input: {
    quantity: number;
    unitPrice: number;
    imageBlob: Blob | null;
    imageChanged: boolean;
  }) => void;
  onClose: () => void;
};

export default function ScanConfirmModal({
  productName,
  barcode,
  defaultUnitPrice,
  existingImageBlob,
  onConfirm,
  onClose,
}: Props) {
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState(
    defaultUnitPrice != null && defaultUnitPrice > 0 ? String(defaultUnitPrice) : '',
  );
  const [imageBlob, setImageBlob] = useState<Blob | null>(existingImageBlob);
  const [imageChanged, setImageChanged] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = blobToObjectUrl(imageBlob);
    setPreviewUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageBlob]);

  function handleConfirm() {
    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(unitPrice);

    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    onConfirm({
      quantity: parsedQty,
      unitPrice: parsedPrice,
      imageBlob,
      imageChanged,
    });
  }

  return (
    <div className="modal-overlay modal-overlay-dim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Add to trip</h2>
        <p className="modal-product-name">{productName}</p>
        <p className="hint">Barcode: {barcode}</p>

        <label className="field-label" htmlFor="confirm-qty">
          Quantity
        </label>
        <input
          id="confirm-qty"
          className="input"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <label className="field-label" htmlFor="confirm-price">
          Unit price
        </label>
        <input
          id="confirm-price"
          className="input"
          inputMode="decimal"
          placeholder="0.00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          autoFocus
        />

        <ProductPhotoInput
          previewUrl={previewUrl}
          onImageSelected={(blob) => {
            setImageBlob(blob);
            setImageChanged(true);
          }}
          onClear={() => {
            setImageBlob(null);
            setImageChanged(true);
          }}
        />

        <button type="button" className="btn-primary btn-block" onClick={handleConfirm}>
          Add to trip
        </button>
        <button type="button" className="btn-link" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
