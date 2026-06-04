import { useState } from 'react';

import BarcodeScanner from '@/components/BarcodeScanner';
import LineItemRow from '@/components/LineItemRow';
import TextCommandInput from '@/components/TextCommandInput';
import { useActiveTrip } from '@/hooks/useActiveTrip';

export default function ShopPage() {
  const {
    items,
    subtotal,
    statusMessage,
    clearStatusMessage,
    handleBarcodeScan,
    saveManualProduct,
    handleTextCommand,
    addManualItem,
    startNewTrip,
  } = useActiveTrip();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  async function onScan(barcode: string) {
    const result = await handleBarcodeScan(barcode);

    if (result.needsManualEntry) {
      setManualBarcode(result.barcode);
      setManualName('');
      setManualPrice('');
      setScannerOpen(false);
    }
  }

  async function submitManualProduct() {
    if (!manualBarcode || !manualName.trim()) return;

    await saveManualProduct({
      barcode: manualBarcode,
      name: manualName.trim(),
      unitPrice: parseFloat(manualPrice) || 0,
    });

    setManualBarcode(null);
    setManualName('');
    setManualPrice('');
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
          items.map((item) => <LineItemRow key={item.id} item={item} />)
        )}
      </section>

      {scannerOpen ? (
        <div className="modal-overlay">
          <BarcodeScanner onScan={onScan} onClose={() => setScannerOpen(false)} />
        </div>
      ) : null}

      {manualBarcode ? (
        <div className="modal-overlay modal-overlay-dim">
          <div className="modal-card">
            <h2>Unknown product</h2>
            <p className="hint">Barcode: {manualBarcode}</p>
            <input
              className="input"
              placeholder="Product name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Price"
              inputMode="decimal"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
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
    </div>
  );
}
