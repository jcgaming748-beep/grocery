import { db } from '@/db/database';
import { bulkUploadAll, cloudHasAnyData } from '@/sync/pushChanges';
import { pullAll } from '@/sync/pullChanges';
import {
  hasLegacyPendingUpload,
  isCloudMigrationComplete,
  setCloudMigrationComplete,
} from '@/sync/meta';
import { clearOutbox } from '@/sync/outbox';

export type MigrationCheckResult =
  | { action: 'none' }
  | { action: 'upload_local'; reason: 'legacy' | 'local_data' }
  | { action: 'pull_remote' };

export async function checkMigrationNeeded(userId: string): Promise<MigrationCheckResult> {
  if (await isCloudMigrationComplete()) {
    return { action: 'none' };
  }

  const cloudHasData = await cloudHasAnyData(userId);
  const [productCount, tripCount] = await Promise.all([
    db.products.count(),
    db.shoppingTrips.count(),
  ]);
  const localHasData = productCount > 0 || tripCount > 0;

  if (localHasData && !cloudHasData) {
    if (await hasLegacyPendingUpload()) {
      return { action: 'upload_local', reason: 'legacy' };
    }
    return { action: 'upload_local', reason: 'local_data' };
  }

  if (cloudHasData && !localHasData) {
    return { action: 'pull_remote' };
  }

  if (cloudHasData && localHasData) {
    await setCloudMigrationComplete();
    return { action: 'none' };
  }

  await setCloudMigrationComplete();
  return { action: 'none' };
}

export async function migrateLocalToCloud(userId: string): Promise<void> {
  await bulkUploadAll(userId);
  await clearOutbox();
  await setCloudMigrationComplete();
}

export async function migrateRemoteToLocal(userId: string): Promise<void> {
  await pullAll(userId);
  await setCloudMigrationComplete();
}
