import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { NATIVE_AUTH_KEY } from './nativeStorage';
export { NATIVE_AUTH_KEY } from './nativeStorage';

// The identity service is shared with the website; sessions and all game data
// belong to this app. No website billing/profile client is imported here.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
export const nativeAuthConfigured = Boolean(url && key);
// Preserve an installed app's identity during this upgrade. Native WebView
// storage is isolated from website storage; previews never import web sessions.
if (Capacitor.isNativePlatform() && url) {
  try {
    const previous = localStorage.getItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`);
    if (previous && !localStorage.getItem(NATIVE_AUTH_KEY)) {
      JSON.parse(previous);
      localStorage.setItem(NATIVE_AUTH_KEY, previous);
    }
    // Once migrated, the obsolete native session must not reappear on sign-out.
    localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`);
  } catch { /* Damaged or unavailable storage must not stop free practice. */ }
}
export const nativeAuth = nativeAuthConfigured ? createClient(url!, key!, {
  auth: { storageKey: NATIVE_AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null;
