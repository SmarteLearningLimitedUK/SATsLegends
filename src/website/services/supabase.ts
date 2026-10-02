import { createClient } from '@supabase/supabase-js';
export { safeReturnPath } from './returnPath';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const accountsConfigured = Boolean(url && key && /^https?:\/\//.test(url));
export const googleAuthEnabled = accountsConfigured && import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true';
export const appleAuthEnabled = accountsConfigured && import.meta.env.VITE_APPLE_AUTH_ENABLED === 'true';
export const passkeyAuthEnabled = accountsConfigured && import.meta.env.VITE_PASSKEY_AUTH_ENABLED === 'true';
export const supabase = accountsConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, experimental: { passkey: true } },
}) : null;

export async function billingRequest(body?: { action: 'checkout'; product: 'matharia' | 'english' | 'bundle'; interval: 'month' | 'year' } | { action: 'portal' }) {
  if (!supabase) throw new Error('Accounts and subscriptions are not available yet.');
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${url}/functions/v1/billing`, {
    method: body ? 'POST' : 'GET', headers: {
      apikey: key!, ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to open billing. Please try again.');
  return data;
}
export function openBilling(url: string) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(target.hostname)) throw new Error('Unexpected billing address.');
  window.location.assign(target.href);
}
export async function adminSupportRequest(query?: { q?: string; page?: number; pendingDeletion?: boolean }, action?: { action: 'grant' | 'revoke' | 'reset' | 'suspend' | 'reactivate'; targetId: string; reason: string }) {
  if (!supabase) throw new Error('Accounts are not available yet.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in again.');
  const params = new URLSearchParams();
  if (query?.q) params.set('q', query.q);
  if (query?.page) params.set('page', String(query.page));
  if (query?.pendingDeletion) params.set('pendingDeletion', 'true');
  const response = await fetch(`${url}/functions/v1/admin-support${params.size ? `?${params}` : ''}`, {
    method: action ? 'POST' : 'GET',
    headers: { apikey: key!, Authorization: `Bearer ${session.access_token}`,
      ...(action ? { 'Content-Type': 'application/json' } : {}) },
    ...(action ? { body: JSON.stringify(action) } : {}), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Admin request failed. Please try again.');
  return data;
}
