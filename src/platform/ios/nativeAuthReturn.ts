import { IS_IOS_APP } from '../nativeApp';

export function accountReturnUrl(path: string): string {
  if (!IS_IOS_APP) return new URL(path, window.location.origin).href;
  // Email links open the hosted account pages. A capacitor://localhost link
  // cannot be opened from Mail. Parents then return to the app and sign in.
  const configured = import.meta.env.VITE_IOS_AUTH_ORIGIN;
  let url: URL;
  try { url = new URL(configured || ''); } catch { throw new Error('The account email return address has not been configured for this app yet.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The account email return address must use HTTPS.');
  return new URL(path, url.origin).href;
}
