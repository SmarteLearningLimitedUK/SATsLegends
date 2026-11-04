import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { nativeAuth, nativeAuthConfigured } from './nativeAuth';

type Identity = { session: Session | null; loading: boolean; configured: boolean; error: string; signOut: () => Promise<void> };
const Context = createContext<Identity | null>(null);
export function useNativeIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing native identity provider.');
  return value;
}
export default function NativeIdentity({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [loading, setLoading] = useState(nativeAuthConfigured), [error, setError] = useState('');
  useEffect(() => {
    if (!nativeAuth) return;
    let active = true, authEvent = false;
    const { data: { subscription } } = nativeAuth.auth.onAuthStateChange((_event, next) => {
      authEvent = true;
      if (active) { setSession(next); setLoading(false); setError(''); }
    });
    nativeAuth.auth.getSession().then(({ data, error: failure }) => {
      if (!active || authEvent) return;
      setSession(data.session); setLoading(false);
      if (failure) setError('Unable to restore your sign-in. Please sign in again.');
    }).catch(() => { if (active) { setLoading(false); setError('Unable to restore your sign-in. Please sign in again.'); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function signOut() {
    const result = await nativeAuth?.auth.signOut({ scope: 'local' });
    if (result?.error) throw new Error('Unable to sign out. Please try again.');
  }
  return <Context.Provider value={{ session, loading, configured: nativeAuthConfigured, error, signOut }}>{children}</Context.Provider>;
}
