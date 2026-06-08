import { useCallback, useEffect, useState } from 'react';

import {
  addStore,
  buildStoreNameMap,
  getDefaultStore,
  listStores,
} from '@/db/repositories/stores';
import type { Store } from '@/db/schema';
import { useRefreshOnSync } from '@/hooks/useSyncStatus';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeNames, setStoreNames] = useState<Map<string, string>>(new Map());
  const [defaultStore, setDefaultStore] = useState<Store | null>(null);

  const refresh = useCallback(async () => {
    const [listed, names, fallback] = await Promise.all([
      listStores(),
      buildStoreNameMap(),
      getDefaultStore(),
    ]);
    setStores(listed);
    setStoreNames(names);
    setDefaultStore(fallback ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRefreshOnSync(refresh);

  const createStore = useCallback(
    async (name: string) => {
      const store = await addStore(name);
      await refresh();
      return store;
    },
    [refresh],
  );

  return {
    stores,
    storeNames,
    defaultStore,
    refresh,
    createStore,
  };
}
