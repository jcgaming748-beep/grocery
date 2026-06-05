let activeUserId: string | null = null;

export function setSyncUserId(userId: string | null): void {
  activeUserId = userId;
}

export function getSyncUserId(): string | null {
  return activeUserId;
}

export function requireSyncUserId(): string {
  if (!activeUserId) {
    throw new Error('Not signed in');
  }
  return activeUserId;
}
