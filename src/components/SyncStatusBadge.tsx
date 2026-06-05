import { useEffect, useState } from 'react';

import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/sync/syncEngine';

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
    <span
      className={`sync-badge sync-badge-${status}`}
      title={error ?? undefined}>
      {LABELS[status]}
    </span>
  );
}
