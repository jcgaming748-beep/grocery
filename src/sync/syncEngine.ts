import { isSupabaseConfigured } from '@/lib/supabase';
import { pullChanges } from '@/sync/pullChanges';
import { pushChanges } from '@/sync/pushChanges';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

type SyncListener = (status: SyncStatus, error: string | null) => void;

let currentUserId: string | null = null;
let status: SyncStatus = 'idle';
let lastError: string | null = null;
let syncInFlight: Promise<void> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<SyncListener>();

function setStatus(next: SyncStatus, error: string | null = null) {
  status = next;
  lastError = error;
  for (const listener of listeners) {
    listener(status, lastError);
  }
}

export function getSyncStatus(): { status: SyncStatus; error: string | null } {
  return { status, error: lastError };
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(status, lastError);
  return () => listeners.delete(listener);
}

export function setSyncUserId(userId: string | null) {
  currentUserId = userId;
  if (!userId) {
    stopSyncEngine();
    setStatus('idle');
  }
}

async function runSync(): Promise<void> {
  if (!currentUserId || !isSupabaseConfigured || !navigator.onLine) {
    setStatus('offline');
    return;
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    setStatus('syncing');
    try {
      await pushChanges(currentUserId!);
      await pullChanges(currentUserId!);
      setStatus(navigator.onLine ? 'synced' : 'offline');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setStatus('error', message);
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

export function requestSync(): void {
  if (!currentUserId) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void runSync();
  }, 500);
}

export function flushSyncNow(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  return runSync();
}

export function startSyncEngine(userId: string): void {
  currentUserId = userId;
  stopSyncEngine();

  const onOnline = () => {
    setStatus('syncing');
    void runSync();
  };
  const onOffline = () => setStatus('offline');
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      requestSync();
    }
  };
  const onFocus = () => requestSync();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);

  intervalId = setInterval(() => {
    if (navigator.onLine) {
      requestSync();
    }
  }, 30_000);

  (startSyncEngine as { cleanup?: () => void }).cleanup = () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
  };

  if (!navigator.onLine) {
    setStatus('offline');
  } else {
    void runSync();
  }
}

export function stopSyncEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const cleanup = (startSyncEngine as { cleanup?: () => void }).cleanup;
  cleanup?.();
  (startSyncEngine as { cleanup?: () => void }).cleanup = undefined;
}
