import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import LineItemRow from '@/components/LineItemRow';
import { listLineItemsForTrip } from '@/db/repositories/lineItems';
import { getTrip } from '@/db/repositories/trips';
import type { LineItem, ShoppingTrip } from '@/db/schema';
import { lineItemTotal } from '@/db/schema';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const [trip, setTrip] = useState<(ShoppingTrip & { id: number }) | null>(null);
  const [items, setItems] = useState<(LineItem & { id: number })[]>([]);

  useEffect(() => {
    async function load() {
      const t = await getTrip(tripId);
      if (t) {
        setTrip(t);
        setItems(await listLineItemsForTrip(tripId));
      }
    }
    load();
  }, [tripId]);

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
          items.map((item) => <LineItemRow key={item.id} item={item} />)
        )}
      </section>

      <footer className="trip-footer">
        <span>Total</span>
        <span className="trip-total-amount">${subtotal.toFixed(2)}</span>
      </footer>
    </div>
  );
}
