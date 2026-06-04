import { useState } from 'react';

import BarcodeScanner from '@/components/BarcodeScanner';
import EditLineItemModal from '@/components/EditLineItemModal';
import LineItemRow from '@/components/LineItemRow';
import ProductPhotoInput from '@/components/ProductPhotoInput';
import ScanConfirmModal from '@/components/ScanConfirmModal';
import TextCommandInput from '@/components/TextCommandInput';
import { useActiveTrip } from '@/hooks/useActiveTrip';
import type { LineItem, PendingScan } from '@/db/schema';

export default function ShopPage() {
  const {
    items,
    subtotal,
    statusMessage,
    clearStatusMessage,
    handleBarcodeScan,
    confirmScanAdd,
    saveManualProduct,
    updateLineItemDetails,
    removeLineItem,
    handleTextCommand,
    addManualItem,
    startNewTrip,
  } = useActiveTrip();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualImageBlob, setManualImageBlob] = useState<Blob | null>(null);
  const [manualPreviewUrl, setManualPreviewUrl] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<(LineItem & { id: number }) | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  async function onScan(barcode: string) {
    const result = await handleBarcodeScan(barcode);

    if ('needsManualEntry' in result) {
      setManualBarcode(result.barcode);
      setManualName('');
      setManualPrice('');
      setManualQty('1');
      setManualImageBlob(null);
      setManualPreviewUrl(null);
      setScannerOpen(false);
      return;
    }

    setPendingScan(result);
    setScannerOpen(false);
  }

  async function submitManualProduct() {
    if (!manualBarcode || !manualName.trim()) return;

    const parsedPrice = parseFloat(manualPrice);
    const parsedQty = parseFloat(manualQty);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;

    await saveManualProduct({
      barcode: manualBarcode,
      name: manualName.trim(),
      unitPrice: parsedPrice,
      quantity: parsedQty,
      imageBlob: manualImageBlob,
    });

    setManualBarcode(null);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
    setManualImageBlob(null);
    if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl);
    setManualPreviewUrl(null);
  }

  async function submitManualItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;

    await addManualItem({
      name: itemName.trim(),
      quantity: parseFloat(itemQty) || 1,
      unitPrice: parseFloat(itemPrice) || 0,
    });

    setItemName('');
    setItemQty('1');
    setItemPrice('');
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Shopping</h1>
      </header>

      <div className="trip-total-banner">
        <span className="trip-total-label">Trip total</span>
        <span className="trip-total-amount">${subtotal.toFixed(2)}</span>
      </div>

      {statusMessage ? (
        <button type="button" className="status-banner" onClick={clearStatusMessage}>
          {statusMessage}
        </button>
      ) : null}

      <div className="action-row">
        <button type="button" className="btn-primary" onClick={() => setScannerOpen(true)}>
          Scan barcode
        </button>
        <button type="button" className="btn-secondary" onClick={startNewTrip}>
          New trip
        </button>
      </div>

      <TextCommandInput onSubmit={handleTextCommand} />

      <form className="manual-form" onSubmit={submitManualItem}>
        <h2 className="section-title">Manual add</h2>
        <input
          className="input"
          placeholder="Product name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
        <div className="manual-form-row">
          <input
            className="input"
            placeholder="Qty"
            inputMode="decimal"
            value={itemQty}
            onChange={(e) => setItemQty(e.target.value)}
          />
          <input
            className="input"
            placeholder="Price"
            inputMode="decimal"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            Add
          </button>
        </div>
      </form>

      <section className="item-list">
        {items.length === 0 ? (
          <p className="empty">Scan or add your first item.</p>
        ) : (
          items.map((item) => (
            <LineItemRow key={item.id} item={item} onPress={() => setEditingItem(item)} />
          ))
        )}
      </section>

      {scannerOpen ? (
        <div className="modal-overlay">
          <BarcodeScanner onScan={onScan} onClose={() => setScannerOpen(false)} />
        </div>
      ) : null}

      {pendingScan ? (
        <ScanConfirmModal
          productName={pendingScan.productName}
          barcode={pendingScan.barcode}
          defaultUnitPrice={pendingScan.defaultUnitPrice}
          existingImageBlob={pendingScan.imageBlob}
          onConfirm={async ({ quantity, unitPrice, imageBlob, imageChanged }) => {
            await confirmScanAdd({
              barcode: pendingScan.barcode,
              productName: pendingScan.productName,
              category: pendingScan.category,
              quantity,
              unitPrice,
              imageBlob,
              imageChanged,
            });
            setPendingScan(null);
          }}
          onClose={() => setPendingScan(null)}
        />
      ) : null}

      {manualBarcode ? (
        <div className="modal-overlay modal-overlay-dim">
          <div className="modal-card">
            <h2>Unknown product</h2>
            <p className="hint">Barcode: {manualBarcode}</p>
            <label className="field-label" htmlFor="manual-name">
              Product name
            </label>
            <input
              id="manual-name"
              className="input"
              placeholder="Product name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <label className="field-label" htmlFor="manual-qty">
              Quantity
            </label>
            <input
              id="manual-qty"
              className="input"
              inputMode="decimal"
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
            />
            <label className="field-label" htmlFor="manual-price">
              Unit price
            </label>
            <input
              id="manual-price"
              className="input"
              placeholder="Price"
              inputMode="decimal"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
            />
            <ProductPhotoInput
              previewUrl={manualPreviewUrl}
              onImageSelected={async (blob) => {
                if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl);
                setManualImageBlob(blob);
                setManualPreviewUrl(URL.createObjectURL(blob));
              }}
              onClear={() => {
                if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl);
                setManualImageBlob(null);
                setManualPreviewUrl(null);
              }}
            />
            <button type="button" className="btn-primary btn-block" onClick={submitManualProduct}>
              Save & add
            </button>
            <button type="button" className="btn-link" onClick={() => setManualBarcode(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <EditLineItemModal
          item={editingItem}
          onSave={async (updates) => {
            await updateLineItemDetails(editingItem.id, updates, editingItem.productId);
            setEditingItem(null);
          }}
          onDelete={async () => {
            await removeLineItem(editingItem.id);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  );
}
