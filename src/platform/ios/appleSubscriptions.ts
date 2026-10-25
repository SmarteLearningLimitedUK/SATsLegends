import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { supabase } from '../../website/services/supabase';

export const APPLE_PRODUCTS = [
  'com.smartelearning.satslegends.matharia.monthly',
  'com.smartelearning.satslegends.matharia.annual',
] as const;
export interface AppleProduct { id: string; name: string; price: string; description: string; period: 'month' | 'year' }
interface Transactions { transactionIds: string[] }
export interface LegendsStoreBridge {
  products(): Promise<{ products: AppleProduct[] }>;
  purchase(options: { productId: string; appAccountToken: string }): Promise<Transactions & { status: 'purchased' | 'pending' | 'cancelled' }>;
  entitlements(): Promise<Transactions>;
  restore(): Promise<Transactions>;
  finish(options: Transactions): Promise<void>;
  manage(): Promise<void>;
  addListener(event: 'transactionsChanged', listener: () => void): Promise<PluginListenerHandle>;
}
export const appleStore = registerPlugin<LegendsStoreBridge>('LegendsStore');
export const nativeAppleStoreAvailable = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export async function appleSubscriptionRequest(transactionIds?: string[]): Promise<{ ready: boolean }> {
  if (!supabase) throw new Error('Parent accounts are not configured yet.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to your parent account.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apple-subscriptions`, {
    method: transactionIds ? 'POST' : 'GET',
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}`,
      ...(transactionIds ? { 'Content-Type': 'application/json' } : {}) },
    ...(transactionIds ? { body: JSON.stringify({ transactionIds }) } : {}), signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The subscription could not be confirmed. Restore purchases to retry.');
  return body;
}
export async function confirmAppleTransactions(ids: string[], store: LegendsStoreBridge = appleStore,
  confirm: (ids: string[]) => Promise<unknown> = appleSubscriptionRequest) {
  // A native success is not an account entitlement. Finish only after the
  // authenticated backend has checked Apple and persisted its answer.
  await confirm(ids);
  if (ids.length) await store.finish({ transactionIds: ids });
}
export async function syncAppleSubscriptions() {
  if (!nativeAppleStoreAvailable()) return;
  const { transactionIds } = await appleStore.entitlements();
  await confirmAppleTransactions(transactionIds);
}
