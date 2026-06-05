import { useEffect, useState } from 'react';

import { usePlanningList } from '@/hooks/usePlanningList';
import { useShoppingTrip } from '@/hooks/useShoppingTrip';
import { subscribeSyncStatus, type SyncStatus } from '@/sync/syncEngine';

export function useSyncStatus(): { status: SyncStatus; error: string | null } {
  const [state, setState] = useState({ status: 'idle' as SyncStatus, error: null as string | null });

  useEffect(() => subscribeSyncStatus((status, error) => {
    setState({ status, error });
  }), []);

  return state;
}

export function useRefreshOnSync(refresh: () => void | Promise<void>) {
  useEffect(() => subscribeSyncStatus((status) => {
    if (status === 'synced') {
      void refresh();
    }
  }), [refresh]);
}

export function useDataRefreshOnSync() {
  const planning = usePlanningList();
  const shopping = useShoppingTrip();

  useEffect(() => subscribeSyncStatus((status) => {
    if (status === 'synced') {
      void planning.loadPlanningTrip();
      void shopping.loadShoppingTrip();
    }
  }), [planning, shopping]);
}
