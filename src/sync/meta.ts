import { db } from '@/db/database';

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.sync_meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.sync_meta.put({ key, value });
}

export async function getLastPullAt(): Promise<string> {
  return (await getMeta('lastPullAt')) ?? '1970-01-01T00:00:00.000Z';
}

export async function setLastPullAt(iso: string): Promise<void> {
  await setMeta('lastPullAt', iso);
}

export async function isCloudMigrationComplete(): Promise<boolean> {
  return (await getMeta('cloudMigrationComplete')) === 'true';
}

export async function setCloudMigrationComplete(): Promise<void> {
  await setMeta('cloudMigrationComplete', 'true');
  await setMeta('legacyPendingUpload', 'false');
}

export async function hasLegacyPendingUpload(): Promise<boolean> {
  return (await getMeta('legacyPendingUpload')) === 'true';
}
