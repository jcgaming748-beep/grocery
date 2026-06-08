import { db } from '@/db/database';
import type { LineItem, Product, ShoppingTrip, Store, SyncEntity, SyncOperation } from '@/db/schema';
import { nowIso } from '@/db/schema';
import { lineItemToRemote, productToRemote, storeToRemote, tripToRemote } from '@/sync/mappers';

function entityPayload(
  entity: SyncEntity,
  record: Product | Store | ShoppingTrip | LineItem,
  userId: string,
): Record<string, unknown> {
  switch (entity) {
    case 'products':
      return productToRemote(record as Product, userId);
    case 'stores':
      return storeToRemote(record as Store, userId);
    case 'shopping_trips':
      return tripToRemote(record as ShoppingTrip, userId);
    case 'line_items':
      return lineItemToRemote(record as LineItem, userId);
  }
}

export async function enqueueSync(input: {
  entity: SyncEntity;
  operation: SyncOperation;
  record: Product | Store | ShoppingTrip | LineItem;
  userId: string;
  pendingImageUpload?: boolean;
}): Promise<void> {
  const existing = await db.sync_outbox
    .filter((row) => row.entity === input.entity && row.entityId === input.record.id)
    .first();

  const payload =
    input.operation === 'delete'
      ? { id: input.record.id }
      : entityPayload(input.entity, input.record, input.userId);

  if (existing?.localId != null) {
    await db.sync_outbox.update(existing.localId, {
      operation: input.operation,
      payload,
      createdAt: nowIso(),
      pendingImageUpload: input.pendingImageUpload ?? existing.pendingImageUpload,
    });
    return;
  }

  await db.sync_outbox.add({
    entityId: input.record.id,
    entity: input.entity,
    operation: input.operation,
    payload,
    createdAt: nowIso(),
    retryCount: 0,
    pendingImageUpload: input.pendingImageUpload ?? false,
  });
}

export async function listOutboxEntries() {
  return db.sync_outbox.orderBy('createdAt').toArray();
}

export async function removeOutboxEntry(localId: number): Promise<void> {
  await db.sync_outbox.delete(localId);
}

export async function incrementOutboxRetry(localId: number): Promise<void> {
  const entry = await db.sync_outbox.get(localId);
  if (entry) {
    await db.sync_outbox.update(localId, { retryCount: entry.retryCount + 1 });
  }
}

export async function clearOutbox(): Promise<void> {
  await db.sync_outbox.clear();
}
