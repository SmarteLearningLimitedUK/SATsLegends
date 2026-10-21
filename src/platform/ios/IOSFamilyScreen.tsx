import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { hasMathariaAccess, useFamily } from '../../website/FamilyAccount';
import { supabase } from '../../website/services/supabase';
import IOSAccountLayout from './IOSAccountLayout';

export default function IOSFamilyScreen() {
  const family = useFamily(), navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false), [message, setMessage] = useState('');
  if (family.loading || (family.session && !family.settings && !family.error)) return <IOSAccountLayout title="Opening your account…"><p role="status">Loading your learners and saved progress.</p></IOSAccountLayout>;
  if (!family.session) return <Navigate to="/login?next=/parent" replace />;
  const active = hasMathariaAccess(family.subscriptions, family.complimentary);
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await task(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nickname = String(new FormData(event.currentTarget).get('nickname') || '').trim();
    await action(async () => {
      const result = await supabase!.rpc('create_child_profile', { child_nickname: nickname });
      if (result.error) throw new Error('Unable to create this learner. Please try again.');
      await family.refresh();
    });
  }
  return <IOSAccountLayout title="Who’s playing?">
    <p>Your learners and progress are shared with your SATs Legends account.</p>
    {(error || family.error) && <p role="alert">{error || family.error}</p>}
    {message && <p role="status">{message}</p>}
    {family.error ? <button type="button" disabled={busy} onClick={() => void action(family.refresh)}>Reload account</button> : <>
      {!active ? <><p>Matharia access is needed to begin.</p><Link className="ios-primary" to="/subscriptions">View Matharia access</Link></> :
        family.children.length ? <div className="ios-learner-list">{family.children.map(child => <button key={child.id} type="button" onClick={() => { family.selectChild(child.id); navigate('/play'); }}><span className="ios-learner-initial" aria-hidden="true">{child.nickname.slice(0, 1)}</span><span>{child.nickname}<small>Continue adventure →</small></span></button>)}</div> :
          <form onSubmit={addChild}><label>Learner nickname<input name="nickname" required maxLength={24} autoComplete="off" disabled={busy} /></label><button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create learner'}</button></form>}
    </>}
    <nav className="ios-account-links" aria-label="Account"><Link to="/subscriptions">Matharia access</Link><button type="button" disabled={busy} onClick={() => void action(async () => { await family.signOut(); navigate('/login', { replace: true }); })}>Sign out</button></nav>
    <details className="ios-parent-settings"><summary>Parent settings</summary>
      <p>{family.session.user.email}</p>
      <label className="family-checkbox"><input type="checkbox" checked={family.settings?.report_emails ?? false} disabled={busy || !family.settings} onChange={event => {
        const enabled = event.target.checked;
        void action(async () => {
          const result = await supabase!.from('parent_settings').update({ report_emails: enabled }).eq('parent_id', family.session!.user.id).select('parent_id').single();
          if (result.error) throw new Error('Unable to update progress emails. Please try again.');
          await family.refresh();
        });
      }} />Email me progress reports</label>
      {deleting ? <><p>Send an account deletion request for support to review? This does not immediately delete your account or cancel a subscription.</p><button disabled={busy} onClick={() => void action(async () => {
        const result = await supabase!.rpc('request_account_deletion');
        if (result.error) throw new Error('Unable to send your request. Please try again.');
        setDeleting(false); setMessage('Your account deletion request has been sent for review. Manage any subscription renewal separately.');
      })}>Send deletion request</button><button disabled={busy} onClick={() => setDeleting(false)}>Keep my account</button></> : <button type="button" disabled={busy} onClick={() => setDeleting(true)}>Request account deletion</button>}
    </details>
  </IOSAccountLayout>;
}
