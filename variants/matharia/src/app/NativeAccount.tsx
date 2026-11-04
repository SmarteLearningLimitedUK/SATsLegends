import { useRef, useState, type FormEvent } from 'react';
import { Check, UserRound } from 'lucide-react';
import { useNativeIdentity } from './NativeIdentity';
import { nativeAuth } from './nativeAuth';
import NativeDeleteAccount from './NativeDeleteAccount';
import NativeDialog, { AppleMark } from './NativeDialog';
import { nativeServicesAvailable, signInWithApple, manageSubscriptions } from './nativeServices';
import { useNativeAccess } from './NativeAccess';
import { TESTFLIGHT_ALL_GAMES } from '../testingFlags';

export default function NativeAccount({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  const identity = useNativeIdentity(), access = useNativeAccess();
  const [deleting, setDeleting] = useState(false);
  const [consent, setConsent] = useState(false), [emailLogin, setEmailLogin] = useState(false);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function action(key: string, callback: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(key); setError(''); setMessage('');
    try { await callback(); }
    catch (caught) { if ((caught as { code?: string })?.code !== 'CANCELLED') setError(caught instanceof Error ? caught.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(''); }
  }
  function emailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    void action('email', async () => {
      if (!nativeAuth) throw new Error('Parent accounts are currently unavailable.');
      const result = await nativeAuth.auth.signInWithPassword({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
      if (result.error) throw new Error('Unable to sign in. Check your email and password.');
      form.reset();
    });
  }
  return <NativeDialog kind="account" titleId="native-account-title" onClose={onClose}>
    <p className="native-kicker"><UserRound size={16}/>For parents & guardians</p>
    <h1 id="native-account-title">{identity.session ? deleting ? 'Delete your account.' : 'Your parent account.' : <>A little help for<br/><span>your next legend.</span></>}</h1>
    {identity.session ? deleting ? <NativeDeleteAccount onBack={() => setDeleting(false)}/> : <>
      <p className="native-dialog-intro">You’re signed in{identity.session.user.email ? ` as ${identity.session.user.email}` : ''}.</p>
      <p className="native-access-state"><Check size={18}/>{TESTFLIGHT_ALL_GAMES ? 'TestFlight: all games open' : access.fullAccess ? 'Full access is active' : 'Three free practice games'}</p>
      <p className="native-small native-account-description">Use these credentials in either product. App Store purchases unlock this app. Game progress stays on this device and is separate from website progress.</p>
      {!access.fullAccess && <button className="native-primary" type="button" onClick={onUpgrade}>Explore full access</button>}
      <button className="native-secondary" type="button" onClick={onClose}>Return to adventure</button>
      {nativeServicesAvailable() && <button className="native-account-link" type="button" disabled={Boolean(busy)} onClick={() => void action('manage', manageSubscriptions)}>Manage App Store subscriptions</button>}
      <button className="native-account-link" type="button" disabled={Boolean(busy)} onClick={() => void action('out', identity.signOut)}>Sign out</button>
      <button className="native-account-link native-danger-link" type="button" disabled={Boolean(busy)} onClick={() => setDeleting(true)}>Delete account</button>
    </> : <>
      <p className="native-dialog-intro">Create or open your parent account with Apple.</p>
      <label className="native-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={Boolean(busy)}/>I’m the parent or guardian creating or accessing this account.</label>
      <button className="native-apple" type="button" disabled={Boolean(busy) || !consent || !identity.configured || !nativeServicesAvailable()} onClick={() => void action('apple', signInWithApple)}><AppleMark/>{busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}</button>
      {!nativeServicesAvailable() && <p className="native-small">Apple sign-in is available in the iPhone and iPad app.</p>}
      {!identity.configured && <p className="native-notice" role="status">Parent accounts are currently unavailable. You can still play free practice.</p>}
      <p className="native-small">Signing in creates your account. Full access is a separate purchase.</p>
      <button className="native-account-link" type="button" aria-expanded={emailLogin} onClick={() => setEmailLogin(value => !value)}>Already have an email account?</button>
      {emailLogin && <form onSubmit={emailSubmit} className="native-form"><label>Parent email<input name="email" type="email" required autoComplete="email" maxLength={254} disabled={Boolean(busy) || !identity.configured}/></label><label>Password<input name="password" type="password" required autoComplete="current-password" maxLength={128} disabled={Boolean(busy) || !identity.configured}/></label><button className="native-secondary" disabled={Boolean(busy) || !identity.configured}>{busy === 'email' ? 'Signing in…' : 'Sign in'}</button></form>}
      <button className="native-account-link" type="button" onClick={onClose}>Keep practising free</button>
    </>}
    <p className="native-small native-legal"><a href="https://satslegends.com/privacy" target="_blank" rel="noreferrer">Privacy</a><span>·</span><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms of use</a></p>
    {message && <p role="status" className="native-notice">{message}</p>}{error && <p className="native-error" role="alert">{error}</p>}
  </NativeDialog>;
}
