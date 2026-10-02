import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Gem, X } from 'lucide-react';
import barratt from '../assets/characters/mobile/Barratt/barratt_happy.png';
import { useFamily } from './FamilyAccount';
import { safeReturnPath, supabase } from './services/supabase';

export default function ParentAccount({ mode }: { mode: 'signup' | 'login' | 'forgot' | 'reset' }) {
  const family = useFamily();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const next = safeReturnPath(query.get('next'));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const messageRef = useRef<HTMLParagraphElement>(null);
  const signup = mode === 'signup';
  useEffect(() => { setMessage(''); setError(''); setShowPassword(false); }, [mode]);
  useEffect(() => {
    if (mode !== 'forgot' || !message) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !messageRef.current?.contains(event.target)) setMessage('');
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMessage('');
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [message, mode]);
  if (family.session && (mode === 'signup' || mode === 'login') && !family.recovery) return <Navigate to={next} replace />;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    setBusy(true); setError(''); setMessage('');
    try {
      if (signup) {
        const result = await supabase.auth.signUp({ email, password, options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { report_emails: data.get('reports') === 'on' },
        } });
        if (result.error) throw result.error;
        form.reset();
        if (result.data.session) navigate(next, { replace: true });
        else setMessage('Check your email to confirm your parent account, then log in to choose your subscription.');
      } else if (mode === 'forgot') {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        form.reset();
        form.querySelector<HTMLInputElement>('input[name="email"]')?.blur();
        setMessage('If an account exists for this email, a password reset link is on its way.');
      } else if (mode === 'reset') {
        if (!family.session || !family.recovery) throw new Error('Open the password reset link in your email first.');
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        await family.signOut(); navigate('/login?reset=success', { replace: true });
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error('Unable to log in. Check your email and password, and confirm your email if you have just signed up.');
        form.reset(); navigate(next, { replace: true });
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  const title = signup ? 'Your family’s adventure starts here.' : mode === 'forgot' ? 'Reset your password.' : mode === 'reset' ? 'Choose a new password.' : 'Welcome back.';
  return <main className="website-account-main website-container" id="website-main">
    <section className="website-account-world"><p className="website-eyebrow"><Gem size={17} /> SATs Legends Matharia</p><h1>Big adventures.<br /><span>Little legends.</span></h1><p>One child. A world of maths adventures.<br /> Progress you can follow, every step of the way.</p><img src={barratt} alt="Barratt is ready for an adventure" /><span className="website-account-caption">A brighter next chapter.</span></section>
    <section className="website-account-form-wrap">
      <p className="website-eyebrow">Parent & guardian accounts</p><h2>{title}</h2><p>{signup ? 'Create your parent account, add your child’s nickname, then choose monthly or yearly access.' : 'Your child’s adventures and progress, in one place.'}</p>
      {!family.configured && <p className="family-notice" role="status">Parent accounts and purchases are not available yet. Please check back soon.</p>}
      {message && <p ref={messageRef} className={`family-notice${mode === 'forgot' ? ' family-notice-dismissible' : ''}`} role="status">{message}{mode === 'forgot' && <button className="family-notice-dismiss" type="button" aria-label="Dismiss password reset message" onClick={() => setMessage('')}><X size={18} /></button>}</p>}
      {query.get('reset') === 'success' && <p className="family-notice" role="status">Your password has been updated. Please log in.</p>}
      {error && <p className="family-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        {mode !== 'reset' && <label>Parent email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} disabled={!family.configured || busy} /></label>}
        {mode !== 'forgot' && <label>Password<span className="website-password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={signup || mode === 'reset' ? 'new-password' : 'current-password'} placeholder={signup || mode === 'reset' ? 'At least 10 characters' : 'Your password'} minLength={mode === 'login' ? 1 : 10} maxLength={128} required disabled={!family.configured || busy} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></span></label>}
        {signup && <><label className="family-checkbox"><input type="checkbox" required disabled={!family.configured || busy} />I’m the child’s parent or guardian and I’m creating my own account.</label><label className="family-checkbox"><input type="checkbox" name="reports" defaultChecked disabled={!family.configured || busy} />Email me my child’s progress on Sundays at 3 pm and Wednesdays at 4 pm, UK time. I can turn these emails off in my account.</label></>}
        <button className="website-button website-button-gold" type="submit" disabled={!family.configured || busy}>{busy ? 'Please wait…' : signup ? 'Create parent account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Log in'}<ArrowRight size={19} /></button>
      </form>
      {mode === 'login' && <Link className="website-text-link" to="/forgot-password">Forgot password?</Link>}
      <p className="website-account-switch">{signup ? 'Already have an account?' : 'New to SATs Legends?'} <Link to={`${signup ? '/login' : '/signup'}?next=${encodeURIComponent(next)}`}>{signup ? 'Log in' : 'Sign up'}</Link></p>
      <Link to="/subscriptions" className="website-account-guest">See Matharia subscriptions <ArrowRight size={16} /></Link>
    </section>
  </main>;
}

export function AuthCallback() {
  const family = useFamily();
  const [query] = useSearchParams();
  if (family.loading) return <main className="website-container family-main" id="website-main"><h1>Confirming your account…</h1></main>;
  if (family.recovery) return <Navigate to="/reset-password" replace />;
  if (family.session) return <Navigate to={safeReturnPath(query.get('next'))} replace />;
  return <main className="website-container family-main" id="website-main"><h1>Continue your adventure.</h1><p>Your email link has been processed. Log in to continue, or request a new link if it has expired.</p><Link className="website-button website-button-gold" to={`/login?next=${encodeURIComponent(safeReturnPath(query.get('next')))}`}>Log in</Link></main>;
}
