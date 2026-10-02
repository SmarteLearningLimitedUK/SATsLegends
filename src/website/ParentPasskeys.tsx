import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { passkeyAuthEnabled, supabase } from './services/supabase';

type Passkey = { id: string; friendly_name?: string; created_at: string };

export default function ParentPasskeys() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window;

  useEffect(() => {
    if (!passkeyAuthEnabled || !supabase) return;
    let alive = true;
    void supabase.auth.passkey.list().then(({ data, error: listError }) => {
      if (!alive) return;
      if (listError) setError('Passkeys are unavailable right now. Please try again later.');
      else setPasskeys(data ?? []);
    });
    return () => { alive = false; };
  }, []);

  if (!passkeyAuthEnabled) return null;

  async function addPasskey() {
    if (!supabase || busy || !supported) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await supabase.auth.registerPasskey();
      if (result.error) throw result.error;
      const list = await supabase.auth.passkey.list();
      if (list.error) throw list.error;
      setPasskeys(list.data ?? []);
      setMessage('Passkey added. You can use it the next time you log in.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add a passkey. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="family-panel family-passkey-panel" aria-labelledby="family-passkeys-title">
    <KeyRound size={28} aria-hidden="true" />
    <div><p className="website-eyebrow">Your account security</p><h2 id="family-passkeys-title">Sign in with a passkey.</h2>
      <p>Use your device’s face, fingerprint or screen lock to access your parent account.</p>
      {passkeys.length > 0 && <ul aria-label="Your passkeys">{passkeys.map(passkey => <li key={passkey.id}>{passkey.friendly_name || 'Passkey'} · Added {new Date(passkey.created_at).toLocaleDateString('en-GB')}</li>)}</ul>}
      {!supported && <p className="family-small">Passkeys need a supported browser on a secure connection.</p>}
      {message && <p className="family-notice" role="status">{message}</p>}
      {error && <p className="family-error" role="alert">{error}</p>}
      <button type="button" className="website-button website-button-outline" disabled={!supported || busy} onClick={() => void addPasskey()}>{busy ? 'Setting up…' : 'Add a passkey'}</button>
    </div>
  </section>;
}
