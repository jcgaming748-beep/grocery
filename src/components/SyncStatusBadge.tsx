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
  const [{ status }, setState] = useState(getSyncStatus());

  useEffect(() => subscribeSyncStatus((nextStatus) => {
    setState({ status: nextStatus, error: null });
  }), []);

  return <span className={`sync-badge sync-badge-${status}`}>{LABELS[status]}</span>;
}
