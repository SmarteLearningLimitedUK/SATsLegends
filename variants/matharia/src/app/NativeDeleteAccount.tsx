import { useState, useRef, type FormEvent } from 'react';
import { nativeAuth } from './nativeAuth';
import { useNativeIdentity } from './NativeIdentity';
import { authorizeAppleDeletion, manageSubscriptions, nativeServicesAvailable } from './nativeServices';
import { clearNativeDeviceProgress } from './nativeStorage';

export default function NativeDeleteAccount({ onBack }: { onBack: () => void }) {
  const { session } = useNativeIdentity();
  const apple = Boolean(session?.user.identities?.some(identity => identity.provider === 'apple') || session?.user.app_metadata.providers?.includes('apple'));
  const [confirmation, setConfirmation] = useState(''), [accepted, setAccepted] = useState(false), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const locked = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || !accepted || confirmation !== 'DELETE' || !nativeAuth || !session) return;
    locked.current = true; setBusy(true); setError('');
    try {
      let appleAuthorizationCode: string | undefined;
      if (apple) {
        const credential = await authorizeAppleDeletion();
        appleAuthorizationCode = credential.authorizationCode;
        if (!appleAuthorizationCode) throw new Error('Apple did not return deletion authorisation. Please try again.');
      } else {
        const result = await nativeAuth.auth.signInWithPassword({ email: session.user.email!, password });
        setPassword('');
        if (result.error || result.data.user?.id !== session.user.id) throw new Error('Your password could not be verified. Please try again.');
      }
      const result = await nativeAuth.functions.invoke('native-account-delete', { body: { action: 'delete', confirmation, ...(appleAuthorizationCode ? { appleAuthorizationCode } : {}) } });
      if (result.error) {
        let message = 'Unable to delete your account. Please try again.';
        try { const data = await result.error.context?.json(); if (typeof data?.error === 'string') message = data.error; } catch { /* Keep transport details private. */ }
        throw new Error(message);
      }
      if (result.data?.deleted !== true) throw new Error('Deletion could not be confirmed. Your local progress has been kept.');
      await nativeAuth.auth.signOut({ scope: 'local' }).catch(() => {});
      clearNativeDeviceProgress();
      window.location.replace('/play');
    } catch (caught) {
      if ((caught as { code?: string })?.code !== 'CANCELLED') setError(caught instanceof Error ? caught.message : 'Unable to delete your account. Please try again.');
    } finally { locked.current = false; setBusy(false); }
  }
  return <form className="native-form native-delete-account" onSubmit={event => void submit(event)}>
    <p>This permanently deletes your shared sign-in account and its associated server data, including website profiles and progress. These credentials will stop working in both the app and website.</p>
    <p>Your Matharia progress on this device will also be removed. This cannot be undone.</p>
    <p>Deleting your account does not cancel an Apple or website subscription. Cancel renewals with the provider that bills you. You can delete your account immediately without waiting for a subscription to end.</p>
    {nativeServicesAvailable() && <button className="native-secondary" type="button" disabled={busy} onClick={() => void manageSubscriptions().catch(() => setError('Unable to open Apple subscription settings.'))}>Manage App Store subscriptions</button>}
    <label className="native-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy}/>I understand this deletes the shared account for both products.</label>
    {!apple && <label>Confirm your password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={128} disabled={busy}/></label>}
    {apple && <p>Apple will ask you to authorise this deletion. Use the Apple Account linked to this sign-in.</p>}
    <label>Type DELETE to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6} disabled={busy}/></label>
    {error && <p role="alert" className="native-error">{error}</p>}
    <button className="native-primary native-danger" type="submit" disabled={busy || !accepted || confirmation !== 'DELETE' || (!apple && !password)}>{busy ? 'Deleting account…' : 'Permanently delete account'}</button>
    <button className="native-secondary" type="button" disabled={busy} onClick={onBack}>Keep my account</button>
  </form>;
}
