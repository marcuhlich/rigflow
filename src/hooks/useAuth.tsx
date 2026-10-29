import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import posthog from "posthog-js";
import { ANALYTICS_CONSENT_KEY } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    // Auth-State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (!active) return;
        receivedAuthEvent = true;
        setSession(session);
        // Keep the same User object when only the token was refreshed → fewer re-renders/refetches
        setUser(prev => {
          const next = session?.user ?? null;
          if (prev && next && prev.id === next.id && prev.updated_at === next.updated_at
            && JSON.stringify(prev.user_metadata) === JSON.stringify(next.user_metadata)) {
            return prev;
          }
          return next;
        });
        setLoading(false);
      }
    );

    // Initial Session Check
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) logger.error('useAuth', 'getSession failed', error);
        // Don't overwrite a newer state delivered by onAuthStateChange
        if (!active || receivedAuthEvent) return;
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch(error => logger.error('useAuth', 'getSession threw', error))
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });

    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    // Wichtig für PWAs: löscht auch IndexedDB Sessions
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) logger.error('useAuth', 'signOut failed', error);

    // Lokalen State leeren (auch wenn der Server-Logout fehlschlug)
    setUser(null);
    setSession(null);
    // Keine Daten des alten Kontos im Speicher behalten
    queryClient.clear();

    // Mini-Fallback für PWAs: nach dem Logout sicherstellen, dass Session leer ist
    try {
      await supabase.auth.getSession();
    } catch (err) {
      logger.warn('useAuth', 'getSession after signOut failed', err);
    }
    const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (consent === 'true') {
      posthog.capture("user_logged_out");
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, session, loading, signUp, signIn, signOut }),
    [user, session, loading, signUp, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
