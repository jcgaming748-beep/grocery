import { useEffect, useState } from 'react';

import { flushSyncNow, getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/sync/syncEngine';

const LABELS: Record<SyncStatus, string> = {
  idle: 'Sync',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
};

export default function SyncStatusBadge() {
  const [{ status, error }, setState] = useState(getSyncStatus());

  useEffect(() => subscribeSyncStatus((nextStatus, nextError) => {
    setState({ status: nextStatus, error: nextError });
  }), []);

  return (
    <div className="sync-status">
      <span className={`sync-badge sync-badge-${status}`}>{LABELS[status]}</span>
      {status === 'error' && error ? (
        <p className="sync-error-detail">{error}</p>
      ) : null}
      {status === 'error' ? (
        <button type="button" className="btn-link sync-retry" onClick={() => void flushSyncNow()}>
          Retry sync
        </button>
      ) : null}
    </div>
  );
}
