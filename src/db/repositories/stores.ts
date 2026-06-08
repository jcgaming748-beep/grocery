import { db } from '@/db/database';
import type { Store } from '@/db/schema';
import { newId, nowIso } from '@/db/schema';
import { FAREWAY_STORE_NAME } from '@/constants/stores';
import { syncRecord } from '@/sync/syncAfterWrite';

export async function listStores(): Promise<Store[]> {
  const stores = await db.stores.orderBy('name').toArray();
  return stores.sort((a, b) => {
    if (a.name === FAREWAY_STORE_NAME) return -1;
    if (b.name === FAREWAY_STORE_NAME) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getStore(id: string): Promise<Store | undefined> {
  return db.stores.get(id);
}

export async function getStoreByName(name: string): Promise<Store | undefined> {
  return db.stores.where('name').equals(name).first();
}

export async function ensureStoreByName(name: string): Promise<Store> {
  const existing = await getStoreByName(name);
  if (existing) return existing;

  const timestamp = nowIso();
  const store: Store = {
    id: newId(),
    name,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.stores.put(store);
  await syncRecord('stores', store);
  return store;
}

export async function addStore(name: string): Promise<Store> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Store name is required.');
  }

  const existing = await getStoreByName(trimmed);
  if (existing) return existing;

  const timestamp = nowIso();
  const store: Store = {
    id: newId(),
    name: trimmed,
    updatedAt: timestamp,
    syncedAt: null,
  };

  await db.stores.put(store);
  await syncRecord('stores', store);
  return store;
}

export async function getDefaultStore(): Promise<Store | undefined> {
  const fareway = await getStoreByName(FAREWAY_STORE_NAME);
  if (fareway) return fareway;
  return db.stores.orderBy('name').first();
}

export async function buildStoreNameMap(): Promise<Map<string, string>> {
  const stores = await listStores();
  return new Map(stores.map((store) => [store.id, store.name]));
}

export async function deleteStore(id: string): Promise<void> {
  const store = await db.stores.get(id);
  if (!store) return;

  await db.stores.delete(id);
  await syncRecord('stores', store, { delete: true });
}
