import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SpendingSummaryCard from '@/components/SpendingSummaryCard';
import { getSpendingSummary, listTripsWithTotals, createTrip } from '@/db/repositories/trips';
import type { TripWithTotal } from '@/db/schema';

export default function HomePage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripWithTotal[]>([]);
  const [summary, setSummary] = useState({ weekTotal: 0, monthTotal: 0 });

  useEffect(() => {
    async function load() {
      setTrips(await listTripsWithTotals());
      setSummary(await getSpendingSummary());
    }
    load();
  }, []);

  async function handleNewTrip() {
    await createTrip();
    navigate('/shop');
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Grocery Tracker</h1>
      </header>

      <SpendingSummaryCard weekTotal={summary.weekTotal} monthTotal={summary.monthTotal} />

      <button type="button" className="btn-primary btn-block" onClick={handleNewTrip}>
        Start new trip
      </button>

      <h2 className="section-title">Past trips</h2>

      {trips.length === 0 ? (
        <p className="empty">No trips yet. Start shopping!</p>
      ) : (
        <ul className="trip-list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link to={`/trip/${trip.id}`} className="trip-row">
                <div>
                  <div className="trip-date">{new Date(trip.date).toLocaleString()}</div>
                  <div className="trip-meta">
                    {trip.itemCount} items{trip.storeName ? ` · ${trip.storeName}` : ''}
                  </div>
                </div>
                <div className="trip-total">${trip.subtotal.toFixed(2)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
