import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import EditLineItemModal from '@/components/EditLineItemModal';
import ReviewLineItemRow from '@/components/ReviewLineItemRow';
import { useTripReview } from '@/hooks/useTripReview';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripId = Number(id);

  const {
    trip,
    items,
    confirmedTotal,
    receiptTotal,
    difference,
    statusMessage,
    clearStatusMessage,
    toggleConfirmed,
    updateLineItemDetails,
    removeLineItem,
    addManualItem,
    markComplete,
  } = useTripReview(tripId);

  const [editingItem, setEditingItem] = useState<(typeof items)[number] | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  if (!trip) {
    return (
      <div className="page">
        <p>Trip not found.</p>
        <Link to="/">Back home</Link>
      </div>
    );
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

  const confirmedCount = items.filter((item) => item.confirmed).length;

  return (
    <div className="page page-with-footer">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Trips
        </Link>
        <h1>Review receipt</h1>
      </header>

      <p className="trip-date">{new Date(trip.date).toLocaleString()}</p>

      {statusMessage ? (
        <button type="button" className="status-banner" onClick={clearStatusMessage}>
          {statusMessage}
        </button>
      ) : null}

      <div className="review-summary">
        <div className="review-summary-row">
          <span>Receipt total</span>
          <span>${(receiptTotal ?? 0).toFixed(2)}</span>
        </div>
        <div className="review-summary-row">
          <span>Confirmed ({confirmedCount}/{items.length})</span>
          <span>${confirmedTotal.toFixed(2)}</span>
        </div>
        {difference != null ? (
          <div className={`review-summary-row${difference !== 0 ? ' review-summary-warning' : ''}`}>
            <span>Difference</span>
            <span>${difference.toFixed(2)}</span>
          </div>
        ) : null}
      </div>

      <p className="hint">Tap each item to confirm it matches the receipt.</p>

      <section className="item-list">
        {items.length === 0 ? (
          <p className="empty">No items on this trip. Add missing receipt lines below.</p>
        ) : (
          items.map((item) => (
            <ReviewLineItemRow
              key={item.id}
              item={item}
              onToggleConfirm={() => toggleConfirmed(item.id)}
              onEdit={() => setEditingItem(item)}
            />
          ))
        )}
      </section>

      <form className="manual-form" onSubmit={submitManualItem}>
        <h2 className="section-title">Add missing item</h2>
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

      <footer className="sticky-footer">
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={async () => {
            await markComplete();
            navigate('/');
          }}>
          Mark trip complete
        </button>
      </footer>

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
