import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const accountsConfigured = Boolean(url && key && /^https?:\/\//.test(url));
export const supabase = accountsConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export async function billingRequest(body?: { action: 'checkout' | 'portal'; interval?: 'month' | 'year' }) {
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
export function safeReturnPath(path: string | null): string {
  return path && /^\/(parent(?:\/progress\/[a-f0-9-]{36})?|subscriptions)$/.test(path) ? path : '/parent';
}
