import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { accountsConfigured, supabase } from './services/supabase';

export type ChildProfile = { id: string; parent_id: string; nickname: string };
export type Subscription = { id: string; product_code: string; status: string; interval: 'month' | 'year'; current_period_end: string; cancel_at_period_end: boolean };
type Settings = { report_emails: boolean; next_report_at: string };
type Family = {
  configured: boolean; session: Session | null; loading: boolean; dataLoading: boolean; error: string;
  children: ChildProfile[]; subscriptions: Subscription[]; settings: Settings | null;
  selectedChild: ChildProfile | null; selectChild: (id: string) => void;
  refresh: () => Promise<void>; signOut: () => Promise<void>; recovery: boolean;
};
const FamilyContext = createContext<Family | null>(null);
export function useFamily() {
  const family = useContext(FamilyContext);
  if (!family) throw new Error('Missing family account provider');
  return family;
}
export const hasMathariaAccess = (subscriptions: Subscription[]) => subscriptions.some(s => s.product_code === 'matharia'
  && ['active', 'trialing'].includes(s.status) && new Date(s.current_period_end).getTime() > Date.now());

export default function FamilyAccount({ children: content }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(accountsConfigured);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [recovery, setRecovery] = useState(false);
  const generation = useRef(0);
  const parentId = session?.user.id;
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (!next) { setRecovery(false); setChildren([]); setSubscriptions([]); setSettings(null); setSelectedId(''); generation.current++; }
      setSession(next); setLoading(false);
    });
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError) setError('Unable to restore your session. Please log in again.');
      setSession(data.session); setLoading(false);
    });
    return () => { alive = false; subscription.unsubscribe(); generation.current++; };
  }, []);
  const refresh = useCallback(async () => {
    if (!supabase || !parentId) return;
    const request = ++generation.current;
    setDataLoading(true); setError('');
    try {
      const [profiles, billing, preferences] = await Promise.all([
        supabase.from('child_profiles').select('id,parent_id,nickname').order('created_at'),
        supabase.from('subscriptions').select('id,product_code,status,interval,current_period_end,cancel_at_period_end'),
        supabase.from('parent_settings').select('report_emails,next_report_at').single(),
      ]);
      if (profiles.error || billing.error || preferences.error) throw new Error('Unable to load your family account. Please try again.');
      if (request !== generation.current) return;
      setChildren(profiles.data); setSubscriptions(billing.data); setSettings(preferences.data);
    } catch (caught) { if (request === generation.current) setError(caught instanceof Error ? caught.message : 'Account unavailable.'); }
    finally { if (request === generation.current) setDataLoading(false); }
  }, [parentId]);
  useEffect(() => {
    setChildren([]); setSubscriptions([]); setSettings(null); setSelectedId('');
    if (parentId) { setSelectedId(sessionStorage.getItem(`legends-child:${parentId}`) || ''); void refresh(); }
    return () => { generation.current++; };
  }, [parentId, refresh]);
  const selectChild = useCallback((id: string) => {
    if (!parentId || !children.some(child => child.id === id)) return;
    setSelectedId(id); sessionStorage.setItem(`legends-child:${parentId}`, id);
  }, [parentId, children]);
  useEffect(() => { if (children.length === 1 && children[0].id !== selectedId) selectChild(children[0].id); }, [children, selectedId, selectChild]);
  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw new Error('Unable to log out. Please try again.');
  }
  return <FamilyContext.Provider value={{ configured: accountsConfigured, session, loading, dataLoading, error, children,
    subscriptions, settings, selectedChild: children.find(child => child.id === selectedId) ?? null,
    selectChild, refresh, signOut, recovery }}>{content}</FamilyContext.Provider>;
}
