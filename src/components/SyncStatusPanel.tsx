import { useEffect, useState } from 'react';

import { flushSyncNow, getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/sync/syncEngine';

const LABELS: Record<SyncStatus, string> = {
  idle: 'Sync',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
};

export default function SyncStatusPanel() {
  const [{ status, error }, setState] = useState(getSyncStatus());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => subscribeSyncStatus((nextStatus, nextError) => {
    setState({ status: nextStatus, error: nextError });
  }), []);

  async function handleRetry() {
    setRetrying(true);
    try {
      await flushSyncNow();
    } finally {
      setRetrying(false);
    }
  }

  if (status === 'error') {
    return (
      <div className="sync-panel sync-panel-error">
        <div className="sync-panel-body">
          <strong className="sync-panel-title">Cloud sync failed</strong>
          <p className="sync-panel-message">
            {error ?? 'Something went wrong while syncing. Check Supabase setup, then retry.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary sync-panel-btn"
          disabled={retrying}
          onClick={() => void handleRetry()}>
          {retrying ? 'Retrying…' : 'Retry sync'}
        </button>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="sync-panel sync-panel-offline">
        <span className="sync-panel-chip">{LABELS.offline}</span>
        <span className="sync-panel-hint">Changes saved locally until you’re back online.</span>
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="sync-panel sync-panel-syncing">
        <span className="sync-panel-chip">{LABELS.syncing}</span>
      </div>
    );
  }

  return null;
}
