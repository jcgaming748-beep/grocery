import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import EditLineItemModal from '@/components/EditLineItemModal';
import LineItemRow from '@/components/LineItemRow';
import { deleteLineItem, listLineItemsForTrip, updateLineItem } from '@/db/repositories/lineItems';
import { updateProductPrice } from '@/db/repositories/products';
import { deleteTrip, getTrip } from '@/db/repositories/trips';
import type { LineItem, ShoppingTrip } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripId = Number(id);
  const [trip, setTrip] = useState<(ShoppingTrip & { id: number }) | null>(null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);
  const [editingItem, setEditingItem] = useState<(LineItem & { id: number }) | null>(null);

  const refresh = useCallback(async () => {
    const t = await getTrip(tripId);
    if (t) {
      setTrip(t);
      setItems(await listLineItemsForTrip(tripId));
    }
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDeleteItem(item: LineItem & { id: number }) {
    if (!window.confirm(`Remove ${item.productName} from this trip?`)) return;

    await deleteLineItem(item.id);
    await refresh();
  }

  async function handleSaveItem(
    item: LineItem & { id: number },
    updates: { quantity: number; unitPrice: number },
  ) {
    await updateLineItem(item.id, updates);

    if (item.productId != null) {
      await updateProductPrice(item.productId, updates.unitPrice);
    }

    setEditingItem(null);
    await refresh();
  }

  async function handleDeleteTrip() {
    if (!trip) return;

    const label = new Date(trip.date).toLocaleString();
    if (!window.confirm(`Delete this entire trip from ${label}?`)) return;

    await deleteTrip(trip.id);
    navigate('/');
  }

  if (!trip) {
    return (
      <div className="page">
        <p>Trip not found.</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + lineItemTotal(item), 0);

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Trips
        </Link>
        <h1>Trip details</h1>
      </header>

      <p className="trip-date">{new Date(trip.date).toLocaleString()}</p>
      {trip.storeName ? <p>{trip.storeName}</p> : null}
      {trip.notes ? <p className="hint">{trip.notes}</p> : null}

      <section className="item-list">
        {items.length === 0 ? (
          <p className="empty">No items on this trip.</p>
        ) : (
          items.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              onPress={() => setEditingItem(item)}
              onDelete={() => handleDeleteItem(item)}
            />
          ))
        )}
      </section>

      <footer className="trip-footer">
        <span>Total</span>
        <span className="trip-total-amount">${subtotal.toFixed(2)}</span>
      </footer>

      <button type="button" className="btn-danger btn-block trip-delete-button" onClick={handleDeleteTrip}>
        Delete trip
      </button>

      {editingItem ? (
        <EditLineItemModal
          item={editingItem}
          onSave={(updates) => handleSaveItem(editingItem, updates)}
          onDelete={async () => {
            await deleteLineItem(editingItem.id);
            setEditingItem(null);
            await refresh();
          }}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  );
}
