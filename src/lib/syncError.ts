export function formatSyncError(err: unknown): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint]
      .filter((part) => typeof part === 'string' && part.length > 0) as string[];
    if (parts.length > 0) {
      return parts.join(' — ');
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Sync failed';
}
