import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SpendingSummaryCard from '@/components/SpendingSummaryCard';
import {
  createPlanningTrip,
  deleteTrip,
  getSpendingSummary,
  listTripsWithTotals,
} from '@/db/repositories/trips';
import { TRIP_STATUS_LABELS, type TripStatus, type TripWithTotal } from '@/db/schema';

function statusClass(status: TripStatus): string {
  return `trip-badge trip-badge-${status.replace('_', '-')}`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripWithTotal[]>([]);
  const [summary, setSummary] = useState({ weekTotal: 0, monthTotal: 0 });

  const refresh = useCallback(async () => {
    setTrips(await listTripsWithTotals());
    setSummary(await getSpendingSummary());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleNewList() {
    await createPlanningTrip();
    navigate('/list');
  }

  async function handleDeleteTrip(trip: TripWithTotal) {
    const label = new Date(trip.date).toLocaleString();
    if (!window.confirm(`Delete trip from ${label}? This removes all ${trip.itemCount} items.`)) {
      return;
    }

    await deleteTrip(trip.id);
    await refresh();
  }

  function tripLink(trip: TripWithTotal): string {
    if (trip.status === 'pending_review') return `/trip/${trip.id}/review`;
    return `/trip/${trip.id}`;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Grocery Tracker</h1>
      </header>

      <SpendingSummaryCard weekTotal={summary.weekTotal} monthTotal={summary.monthTotal} />

      <button type="button" className="btn-primary btn-block" onClick={handleNewList}>
        New grocery list
      </button>

      <h2 className="section-title">Trips</h2>

      {trips.length === 0 ? (
        <p className="empty">No trips yet. Start a grocery list!</p>
      ) : (
        <ul className="trip-list">
          {trips.map((trip) => (
            <li key={trip.id} className="trip-list-item">
              <Link to={tripLink(trip)} className="trip-row">
                <div>
                  <div className="trip-date-row">
                    <span className="trip-date">{new Date(trip.date).toLocaleString()}</span>
                    <span className={statusClass(trip.status)}>{TRIP_STATUS_LABELS[trip.status]}</span>
                  </div>
                  <div className="trip-meta">
                    {trip.itemCount} items{trip.storeName ? ` · ${trip.storeName}` : ''}
                    {trip.status === 'pending_review' ? ' · Tap to review' : ''}
                  </div>
                </div>
                <div className="trip-total">${trip.subtotal.toFixed(2)}</div>
              </Link>
              <button
                type="button"
                className="btn-icon-delete"
                aria-label="Delete trip"
                onClick={() => handleDeleteTrip(trip)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
