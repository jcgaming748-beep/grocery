import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import {
  checkMigrationNeeded,
  migrateLocalToCloud,
  migrateRemoteToLocal,
  type MigrationCheckResult,
} from '@/sync/migrateLocalToCloud';
import { setSyncUserId as setSyncContextUserId } from '@/sync/syncContext';
import { flushSyncNow, startSyncEngine, stopSyncEngine } from '@/sync/syncEngine';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  migrationCheck: MigrationCheckResult | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  runMigration: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [migrationCheck, setMigrationCheck] = useState<MigrationCheckResult | null>(null);

  const handleSession = useCallback(async (next: Session | null) => {
    setSession(next);

    if (next?.user) {
      setSyncContextUserId(next.user.id);
      startSyncEngine(next.user.id);

      const check = await checkMigrationNeeded(next.user.id);
      if (check.action === 'upload_local') {
        setMigrationCheck(check);
      } else if (check.action === 'pull_remote') {
        await migrateRemoteToLocal(next.user.id);
        await flushSyncNow();
        setMigrationCheck(null);
      } else {
        await flushSyncNow();
        setMigrationCheck(null);
      }
    } else {
      setSyncContextUserId(null);
      stopSyncEngine();
      setMigrationCheck(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const client = requireSupabase();

    client.auth.getSession().then(({ data }) => {
      void handleSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void handleSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    stopSyncEngine();
    setSyncContextUserId(null);
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  const runMigration = useCallback(async () => {
    if (!session?.user) return;
    await migrateLocalToCloud(session.user.id);
    await flushSyncNow();
    setMigrationCheck(null);
  }, [session?.user]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      migrationCheck,
      signIn,
      signUp,
      signOut,
      runMigration,
    }),
    [session, loading, migrationCheck, signIn, signUp, signOut, runMigration],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
