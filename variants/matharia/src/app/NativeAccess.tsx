import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNativeIdentity } from './NativeIdentity';
import { nativeServicesAvailable, purchasePlan, readStore, restorePurchases, watchStore, type StoreAccess, type StorePlan } from './nativeServices';
import { TESTFLIGHT_ALL_GAMES } from '../testingFlags';

type Access = {
  fullAccess: boolean; checking: boolean; storeError: string; plans: StorePlan[]; storeConfigured: boolean;
  refreshStore: () => Promise<void>; purchase: (id: string) => Promise<'purchased' | 'pending' | 'cancelled'>;
  restore: () => Promise<boolean>; openUpgrade: () => void; openAccount: () => void;
};
const Context = createContext<Access | null>(null);
export function useNativeAccess() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing native access provider.');
  return value;
}
const inactive: StoreAccess = { active: false, expiresAt: null, configured: false };

export function NativeAccessProvider({ children, openUpgrade, openAccount }: { children: ReactNode; openUpgrade: () => void; openAccount: () => void }) {
  const identity = useNativeIdentity();
  const [store, setStore] = useState<StoreAccess>(inactive);
  const [plans, setPlans] = useState<StorePlan[]>([]);
  const [checking, setChecking] = useState(nativeServicesAvailable);
  const [storeError, setStoreError] = useState('');
  const inFlight = useRef<Promise<void> | null>(null);
  const refreshStore = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const request = (async () => {
      setChecking(true);
      try { const next = await readStore(); setStore(next); setPlans(next.plans); setStoreError(''); }
      catch { setStoreError('Unable to check App Store access. Connect to the internet and try again.'); }
      finally { setChecking(false); inFlight.current = null; }
    })();
    inFlight.current = request;
    return request;
  }, []);
  useEffect(() => {
    void refreshStore();
    if (!nativeServicesAvailable()) return;
    let alive = true;
    const listener = watchStore(next => { if (alive) setStore(next); });
    const refresh = () => { void refreshStore(); };
    window.addEventListener('legends:account-refresh', refresh);
    window.addEventListener('online', refresh);
    return () => { alive = false; void listener.then(handle => handle.remove()).catch(() => {}); window.removeEventListener('legends:account-refresh', refresh); window.removeEventListener('online', refresh); };
  }, [refreshStore]);
  useEffect(() => {
    if (!store.active || !store.expiresAt) return;
    // Expired access cannot survive a long-running app or an offline session.
    const expire = () => { if (store.expiresAt! <= Date.now()) { setStore(previous => ({ ...previous, active: false })); void refreshStore(); } };
    const timer = window.setInterval(expire, 1000);
    expire();
    return () => window.clearInterval(timer);
  }, [store.active, store.expiresAt, refreshStore]);
  const purchase = useCallback(async (id: string) => {
    const result = await purchasePlan(id, identity.session?.user.id);
    setStore(result);
    return result.outcome;
  }, [identity.session?.user.id]);
  const restore = useCallback(async () => {
    const result = await restorePurchases(); setStore(result); return result.active;
  }, []);
  const fullAccess = TESTFLIGHT_ALL_GAMES || (store.active && (!store.expiresAt || store.expiresAt > Date.now()));
  const value = useMemo(() => ({ fullAccess, checking, storeError, plans, storeConfigured: store.configured, refreshStore, purchase, restore, openUpgrade, openAccount }),
    [fullAccess, checking, storeError, plans, store.configured, refreshStore, purchase, restore, openUpgrade, openAccount]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
