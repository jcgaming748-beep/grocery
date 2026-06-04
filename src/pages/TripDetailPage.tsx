import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import LineItemRow from '@/components/LineItemRow';
import { listLineItemsForTrip } from '@/db/repositories/lineItems';
import { getTrip } from '@/db/repositories/trips';
import {
  TRIP_STATUS_LABELS,
  computeTripDisplayTotal,
  lineItemTotal,
  type LineItem,
  type ShoppingTrip,
} from '@/db/schema';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const [trip, setTrip] = useState<(ShoppingTrip & { id: number }) | null>(null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);

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

  if (!trip) {
    return (
      <div className="page">
        <p>Trip not found.</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const displayTotal = computeTripDisplayTotal(trip, items);
  const lineSum = items.reduce((sum, item) => sum + lineItemTotal(item), 0);

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Trips
        </Link>
        <h1>Trip details</h1>
      </header>

      <p className="trip-date">{new Date(trip.date).toLocaleString()}</p>
      <span className={`trip-badge trip-badge-${trip.status.replace('_', '-')}`}>
        {TRIP_STATUS_LABELS[trip.status]}
      </span>

      {trip.status === 'pending_review' ? (
        <Link to={`/trip/${trip.id}/review`} className="btn-primary btn-block link-button review-link">
          Review receipt
        </Link>
      ) : null}

      {trip.receiptTotal != null ? (
        <p className="hint">Receipt total: ${trip.receiptTotal.toFixed(2)}</p>
      ) : null}

      {trip.storeName ? <p>{trip.storeName}</p> : null}
      {trip.notes ? <p className="hint">{trip.notes}</p> : null}

      <section className="item-list">
        {items.length === 0 ? (
          <p className="empty">No items on this trip.</p>
        ) : (
          items.map((item) => <LineItemRow key={item.id} item={item} />)
        )}
      </section>

      <footer className="trip-footer">
        <span>{trip.receiptTotal != null && trip.status === 'pending_review' ? 'Receipt total' : 'Total'}</span>
        <span className="trip-total-amount">${displayTotal.toFixed(2)}</span>
      </footer>

      {trip.receiptTotal != null && trip.status !== 'planning' && trip.status !== 'shopping' ? (
        <p className="hint">Line items sum: ${lineSum.toFixed(2)}</p>
      ) : null}
    </div>
  );
}
