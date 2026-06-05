import { db } from '@/db/database';
import type { LineItem, Product, ShoppingTrip, SyncEntity } from '@/db/schema';
import { requireSupabase } from '@/lib/supabase';
import { lineItemToRemote, productToRemote, tripToRemote } from '@/sync/mappers';

function friendlyDbError(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('primary key') || lower.includes('upgradeerror')) {
    return 'Local database upgrade failed. Close the app, reopen it once — your data will reload from the cloud.';
  }
  if (
    lower.includes('schema cache') ||
    lower.includes('does not exist') ||
    lower.includes('could not find the table')
  ) {
    return 'Database tables are missing. In Supabase SQL Editor, run supabase/migrations/001_initial.sql';
  }
  if (lower.includes('row-level security') || lower.includes('violates row-level security')) {
    return 'Permission denied (RLS). Sign out, sign in again, then retry sync.';
  }
  if (lower.includes('bucket not found') || lower.includes('product-images')) {
    return 'Photo storage not set up. Run supabase/migrations/002_storage.sql in Supabase SQL Editor.';
  }
  if (lower.includes('foreign key')) {
    return 'Sync order conflict. Tap Retry sync — if it persists, sign out and sign in again.';
  }
  return null;
}

export function formatSyncError(err: unknown): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : '';
    const friendly = message ? friendlyDbError(message) : null;
    if (friendly) return friendly;

    const code = typeof record.code === 'string' ? record.code : null;
    const parts = [code, record.message, record.details, record.hint]
      .filter((part) => typeof part === 'string' && part.length > 0) as string[];
    if (parts.length > 0) {
      return parts.join(' — ');
    }
  }

  if (err instanceof Error) {
    const friendly = friendlyDbError(err.message);
    if (friendly) return friendly;
    return err.message;
  }

  return 'Sync failed';
}

export async function ensureAuthenticatedSession(userId: string): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error('Session expired. Sign out and sign in again.');
  }
  if (data.session.user.id !== userId) {
    throw new Error('Session mismatch. Sign out and sign in again.');
  }
}

async function getLocalRecord(
  entity: SyncEntity,
  id: string,
): Promise<Product | ShoppingTrip | LineItem | undefined> {
  switch (entity) {
    case 'products':
      return db.products.get(id);
    case 'shopping_trips':
      return db.shoppingTrips.get(id);
    case 'line_items':
      return db.lineItems.get(id);
  }
}

export function buildRemotePayload(
  entity: SyncEntity,
  record: Product | ShoppingTrip | LineItem,
  userId: string,
): Record<string, unknown> {
  switch (entity) {
    case 'products':
      return productToRemote(record as Product, userId);
    case 'shopping_trips':
      return tripToRemote(record as ShoppingTrip, userId);
    case 'line_items':
      return lineItemToRemote(record as LineItem, userId);
  }
}

export async function refreshOutboxPayload(
  entity: SyncEntity,
  entityId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const record = await getLocalRecord(entity, entityId);
  if (!record) return null;
  return buildRemotePayload(entity, record, userId);
}

export async function verifyDatabaseReachable(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('shopping_trips').select('id').limit(1);
  if (error) {
    throw new Error(formatSyncError(error));
  }
}
