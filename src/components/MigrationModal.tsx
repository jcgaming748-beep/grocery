import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

export default function MigrationModal() {
  const { migrationCheck, runMigration } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!migrationCheck || migrationCheck.action !== 'upload_local') {
    return null;
  }

  async function handleUpload() {
    setBusy(true);
    setError(null);
    try {
      await runMigration();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay modal-overlay-dim">
      <div className="modal-card">
        <h2>Back up to the cloud?</h2>
        <p className="hint">
          {migrationCheck.reason === 'legacy'
            ? 'Your existing grocery data (including product photos) is only on this device. Upload it to keep it safe.'
            : 'You have local data that is not on the server yet. Upload it to keep it safe.'}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="button" className="btn-primary btn-block" disabled={busy} onClick={handleUpload}>
          {busy ? 'Uploading…' : 'Back up now'}
        </button>
      </div>
    </div>
  );
}
