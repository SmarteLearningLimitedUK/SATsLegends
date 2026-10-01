import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useFamily } from './FamilyAccount';
import { adminSupportRequest } from './services/supabase';
import './admin.css';

type Action = 'grant' | 'revoke' | 'reset' | 'suspend' | 'reactivate';
type Account = {
  id: string; email: string | null; createdAt: string; confirmed: boolean; nickname: string | null;
  subscription: { status: string; interval: string; current_period_end: string } | null;
  complimentary: { valid_until: string; revoked_at: string | null } | null;
  reports: { report_emails: boolean; next_report_at: string } | null;
  lastSaved: string | null; suspension: { reason: string; suspended_at: string } | null;
};
type Listing = { accounts: Account[]; total: number; truncated: boolean; page: number };
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-GB') : '—';
const labels: Record<Action, string> = {
  grant: 'Grant one year free', revoke: 'Revoke free access', reset: 'Send password reset',
  suspend: 'Suspend account', reactivate: 'Reactivate account',
};

export default function AdminDashboard() {
  const family = useFamily();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!family.isAdmin) return;
    let alive = true;
    setLoading(true); setError('');
    adminSupportRequest({ q: search, page }).then((result: Listing) => {
      if (alive) setListing(result);
    }).catch(caught => { if (alive) setError(caught instanceof Error ? caught.message : 'Unable to load accounts.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [family.isAdmin, search, page, revision]);
  if (family.loading || family.dataLoading) return <main id="website-main" className="website-container family-main"><p role="status">Checking admin access…</p></main>;
  if (!family.session) return <Navigate to="/login?next=/admin" replace />;
  if (!family.isAdmin) return <main id="website-main" className="website-container family-main"><h1>Admin access required.</h1><p>This area is only available to authorised SATs Legends staff.</p><Link className="website-text-link" to="/parent">Your parent account</Link></main>;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setSearch(searchInput.trim());
  }
  async function run(account: Account, action: Action) {
    const explanation = (reason[account.id] || '').trim();
    if (explanation.length < 5) { setError('Enter a reason of at least five characters for the audit log.'); return; }
    if (!window.confirm(`${labels[action]} for ${account.email || account.id}?\n\nReason: ${explanation}`)) return;
    setBusy(`${account.id}:${action}`); setError(''); setNotice('');
    try {
      await adminSupportRequest(undefined, { action, targetId: account.id, reason: explanation });
      setNotice(`${labels[action]} completed for ${account.email || account.id}.`);
      setReason(current => ({ ...current, [account.id]: '' }));
      setRevision(value => value + 1);
      if (account.id === family.session?.user.id) await family.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action failed.'); }
    finally { setBusy(''); }
  }
  return <main id="website-main" className="website-container family-main admin-main">
    <div className="website-resource-heading"><p className="website-eyebrow"><ShieldCheck size={17} /> Staff only</p><h1>SATs Legends admin</h1><p>Find parent accounts, check access and reports, and record support actions.</p></div>
    <p className="family-small">Account actions are logged with your reason. Paid charges and cancellations stay in Stripe. Password reset emails need the project’s email service configured.</p>
    {error && <p className="family-error" role="alert">{error}</p>}
    {notice && <p className="family-notice" role="status">{notice}</p>}
    <form className="admin-search" onSubmit={submitSearch}><label htmlFor="admin-search-input">Search parent email or ID</label><div><input id="admin-search-input" value={searchInput} maxLength={100} onChange={event => setSearchInput(event.target.value)} placeholder="parent@example.com" /><button className="website-button website-button-gold" type="submit"><Search size={17} /> Search</button><button className="website-button website-button-outline" type="button" onClick={() => setRevision(value => value + 1)} aria-label="Refresh accounts"><RefreshCw size={17} /> Refresh</button></div></form>
    <p className="admin-count">{loading ? 'Loading accounts…' : `${listing?.accounts.length ?? 0} shown · ${listing?.total ?? 0} total accounts`}{listing?.truncated && ' · Search limited to the first 2,000 accounts'}</p>
    <div className="admin-accounts">{listing?.accounts.map(account => {
      const paid = account.subscription && ['active', 'trialing'].includes(account.subscription.status)
        && new Date(account.subscription.current_period_end).getTime() > Date.now();
      const free = account.complimentary && !account.complimentary.revoked_at
        && new Date(account.complimentary.valid_until).getTime() > Date.now();
      return <section className="family-panel admin-account" key={account.id}>
        <div className="admin-account-heading"><div><h2>{account.email || 'No email address'}</h2><p>{account.id}</p></div><strong className={account.suspension ? 'admin-status admin-status-alert' : 'admin-status'}>{account.suspension ? 'Suspended' : paid ? 'Paid access' : free ? 'Complimentary access' : 'No active access'}</strong></div>
        <div className="admin-account-facts"><p><strong>Email:</strong> {account.confirmed ? 'Verified' : 'Unverified'}</p><p><strong>Joined:</strong> {date(account.createdAt)}</p><p><strong>Child:</strong> {account.nickname || 'None yet'}</p><p><strong>Progress saved:</strong> {date(account.lastSaved)}</p><p><strong>Paid plan:</strong> {account.subscription ? `${account.subscription.status} · ${account.subscription.interval} · to ${date(account.subscription.current_period_end)}` : 'None'}</p><p><strong>Free grant:</strong> {free ? `Until ${date(account.complimentary?.valid_until)}` : 'None'}</p><p><strong>Reports:</strong> {account.reports ? account.reports.report_emails ? `On · next ${date(account.reports.next_report_at)}` : 'Off' : 'Unavailable'}</p>{account.suspension && <p><strong>Suspension reason:</strong> {account.suspension.reason}</p>}</div>
        <label className="admin-reason">Reason for action<input value={reason[account.id] || ''} maxLength={300} onChange={event => setReason(current => ({ ...current, [account.id]: event.target.value }))} placeholder="Required for audit log" /></label>
        <div className="admin-actions">
          {!free && <button disabled={Boolean(busy)} onClick={() => void run(account, 'grant')}>Grant one year free</button>}
          {free && <button disabled={Boolean(busy)} onClick={() => void run(account, 'revoke')}>Revoke free access</button>}
          <button disabled={Boolean(busy) || !account.email} onClick={() => void run(account, 'reset')}>Send password reset</button>
          {account.suspension ? <button disabled={Boolean(busy)} onClick={() => void run(account, 'reactivate')}>Reactivate</button>
            : <button disabled={Boolean(busy) || account.id === family.session?.user.id} onClick={() => void run(account, 'suspend')}>Suspend</button>}
        </div>
      </section>;
    })}</div>
    {!loading && listing?.accounts.length === 0 && <p>No matching accounts found.</p>}
    {!search && listing && listing.total > page * 50 && <button className="website-button website-button-outline admin-next" onClick={() => setPage(value => value + 1)}>Next 50 accounts <ArrowRight size={17} /></button>}
    {!search && page > 1 && <button className="website-button website-button-outline admin-next" onClick={() => setPage(value => value - 1)}>Previous 50 accounts</button>}
  </main>;
}
