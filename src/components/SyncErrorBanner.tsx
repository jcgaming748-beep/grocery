import { useEffect, useState } from 'react';

import { flushSyncNow, getSyncStatus, subscribeSyncStatus } from '@/sync/syncEngine';

export default function SyncErrorBanner() {
  const [{ status, error }, setState] = useState(getSyncStatus());

  useEffect(() => subscribeSyncStatus((nextStatus, nextError) => {
    setState({ status: nextStatus, error: nextError });
  }), []);

  if (status !== 'error' || !error) {
    return null;
  }

  return (
    <div className="sync-error-banner">
      <p className="sync-error-banner-text">{error}</p>
      <button type="button" className="btn-secondary sync-error-banner-btn" onClick={() => void flushSyncNow()}>
        Retry sync
      </button>
    </div>
  );
}
