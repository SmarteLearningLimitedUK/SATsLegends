import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useFamily } from './FamilyAccount';
import { adminSupportRequest } from './services/supabase';
import './admin.css';

type Action = 'grant' | 'revoke' | 'reset' | 'suspend' | 'reactivate';
type PaidPlan = { product_code: string; status: string; interval: string; current_period_end: string; cancel_at_period_end?: boolean };
type FreeGrant = { product_code: string; valid_until: string; revoked_at: string | null };
type Account = {
  id: string; email: string | null; createdAt: string; confirmed: boolean; nickname: string | null;
  subscription: Omit<PaidPlan, 'product_code'> | null;
  complimentary: Omit<FreeGrant, 'product_code'> | null;
  subscriptions?: PaidPlan[]; complimentaryAccess?: FreeGrant[]; deletionRequestedAt?: string | null;
  reports: { report_emails: boolean; next_report_at: string } | null;
  lastSaved: string | null; suspension: { reason: string; suspended_at: string } | null;
};
type ReportHealth = {
  latestRun: { started_at: string; finished_at: string | null; claimed: number; sent: number; failed: number; error: string | null } | null;
  failedDeliveries: number; overdueDeliveries: number; schedulerStale: boolean;
};
type Listing = { accounts: Account[]; total: number; truncated: boolean; page: number; reportHealth?: ReportHealth; pendingDeletionRequests?: number };
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-GB') : '—';
const labels: Record<Action, string> = {
  grant: 'Grant one year free Matharia', revoke: 'Revoke free Matharia access', reset: 'Send password reset',
  suspend: 'Suspend account', reactivate: 'Reactivate account',
};

export default function AdminDashboard() {
  const family = useFamily();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
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
    adminSupportRequest({ q: search, page, pendingDeletion: pendingOnly }).then((result: Listing) => {
      if (alive) setListing(result);
    }).catch(caught => { if (alive) setError(caught instanceof Error ? caught.message : 'Unable to load accounts.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [family.isAdmin, search, pendingOnly, page, revision]);
  if (family.loading || family.dataLoading) return <main id="website-main" className="website-container family-main"><p role="status">Checking admin access…</p></main>;
  if (!family.session) return <Navigate to="/login?next=/admin" replace />;
  if (!family.isAdmin) return <main id="website-main" className="website-container family-main"><h1>Admin access required.</h1><p>This area is only available to authorised SATs Legends staff.</p><Link className="website-text-link" to="/parent">Your parent account</Link></main>;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setPendingOnly(false); setSearch(searchInput.trim());
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
  const reportHealth = listing?.reportHealth;
  const reportNeedsAttention = !reportHealth || reportHealth.schedulerStale || reportHealth.failedDeliveries > 0
    || reportHealth.overdueDeliveries > 0 || Boolean(reportHealth.latestRun?.error) || Boolean(reportHealth.latestRun?.failed);
  return <main id="website-main" className="website-container family-main admin-main">
    <div className="website-resource-heading"><p className="website-eyebrow"><ShieldCheck size={17} /> Staff only</p><h1>SATs Legends admin</h1><p>Find parent accounts, check access and reports, and record support actions.</p></div>
    <p className="family-small">Account actions are logged with your reason. Paid charges and cancellations stay in Stripe. Password reset emails need the project’s email service configured.</p>
    {error && <p className="family-error" role="alert">{error}</p>}
    {notice && <p className="family-notice" role="status">{notice}</p>}
    {listing && <section className="family-panel admin-report-health" aria-labelledby="admin-report-health-title"><div className="admin-report-health-heading"><h2 id="admin-report-health-title">Parent report delivery</h2><strong className={reportNeedsAttention ? 'admin-status admin-status-alert' : 'admin-status'}>{reportNeedsAttention ? 'Needs attention' : 'On track'}</strong></div>
      {reportHealth ? <><p>Latest run: {date(reportHealth.latestRun?.started_at)} · {reportHealth.latestRun?.sent ?? 0} sent · {reportHealth.latestRun?.failed ?? 0} failed.</p>
        {reportNeedsAttention && <p className="family-error" role="alert">{reportHealth.schedulerStale && 'The report scheduler has not run recently. '}{reportHealth.overdueDeliveries > 0 && `${reportHealth.overdueDeliveries} report deliveries are overdue. `}{reportHealth.failedDeliveries > 0 && `${reportHealth.failedDeliveries} deliveries failed. `}{Boolean(reportHealth.latestRun?.failed) && `Latest run reported ${reportHealth.latestRun?.failed} failures. `}{reportHealth.latestRun?.error && `Latest error: ${reportHealth.latestRun.error}`}</p>}</>
        : <p className="family-error" role="alert">Report delivery monitoring is unavailable. Deploy the latest admin support function and check the report schedule.</p>}
    </section>}
    {listing && <section className="family-panel admin-deletion-summary" aria-labelledby="admin-deletion-title"><div><h2 id="admin-deletion-title">Account deletion requests</h2><p>{listing.pendingDeletionRequests === undefined ? 'Request monitoring is unavailable until the latest admin support function is deployed.' : `${listing.pendingDeletionRequests} pending request${listing.pendingDeletionRequests === 1 ? '' : 's'} across all accounts.`}</p></div><button className="website-button website-button-outline" type="button" aria-pressed={pendingOnly} onClick={() => { setPage(1); setSearch(''); setSearchInput(''); setPendingOnly(value => !value); }}>{pendingOnly ? 'Show all accounts' : 'Review requests'}</button></section>}
    <form className="admin-search" onSubmit={submitSearch}><label htmlFor="admin-search-input">Search parent email or ID</label><div><input id="admin-search-input" value={searchInput} maxLength={100} onChange={event => setSearchInput(event.target.value)} placeholder="parent@example.com" /><button className="website-button website-button-gold" type="submit"><Search size={17} /> Search</button><button className="website-button website-button-outline" type="button" onClick={() => setRevision(value => value + 1)} aria-label="Refresh accounts"><RefreshCw size={17} /> Refresh</button></div></form>
    <p className="admin-count">{loading ? 'Loading accounts…' : `${listing?.accounts.length ?? 0} shown · ${listing?.total ?? 0} total accounts`}{listing?.truncated && ' · Search limited to the first 2,000 accounts'}</p>
    <div className="admin-accounts">{listing?.accounts.map(account => {
      const subscriptions = account.subscriptions ?? (account.subscription ? [{ ...account.subscription, product_code: 'matharia' }] : []);
      const complimentaryAccess = account.complimentaryAccess ?? (account.complimentary ? [{ ...account.complimentary, product_code: 'matharia' }] : []);
      const paid = subscriptions.some(plan => ['active', 'trialing'].includes(plan.status)
        && new Date(plan.current_period_end).getTime() > Date.now());
      const activeGrants = complimentaryAccess.filter(grant => !grant.revoked_at
        && new Date(grant.valid_until).getTime() > Date.now());
      const free = activeGrants.length > 0;
      const mathariaGrant = activeGrants.some(grant => grant.product_code === 'matharia');
      return <section className="family-panel admin-account" key={account.id}>
        <div className="admin-account-heading"><div><h2>{account.email || 'No email address'}</h2><p>{account.id}</p></div><strong className={account.suspension ? 'admin-status admin-status-alert' : 'admin-status'}>{account.suspension ? 'Suspended' : paid ? 'Paid plan' : free ? 'Complimentary grant' : 'No active access'}</strong></div>
        <div className="admin-account-facts"><p><strong>Email:</strong> {account.confirmed ? 'Verified' : 'Unverified'}</p><p><strong>Joined:</strong> {date(account.createdAt)}</p><p><strong>Child:</strong> {account.nickname || 'None yet'}</p><p><strong>Progress saved:</strong> {date(account.lastSaved)}</p><p><strong>Paid plans:</strong> {subscriptions.length ? subscriptions.map(plan => `${plan.product_code} · ${plan.status} · ${plan.interval} · to ${date(plan.current_period_end)}`).join('; ') : 'None'}</p><p><strong>Free grants:</strong> {activeGrants.length ? activeGrants.map(grant => `${grant.product_code} · until ${date(grant.valid_until)}`).join('; ') : 'None'}</p><p><strong>Reports:</strong> {account.reports ? account.reports.report_emails ? `On · next ${date(account.reports.next_report_at)}` : 'Off' : 'Unavailable'}</p>{account.deletionRequestedAt && <p><strong>Account deletion requested:</strong> {date(account.deletionRequestedAt)} · Review billing before any deletion.</p>}{account.suspension && <p><strong>Suspension reason:</strong> {account.suspension.reason}</p>}</div>
        <label className="admin-reason">Reason for action<input value={reason[account.id] || ''} maxLength={300} onChange={event => setReason(current => ({ ...current, [account.id]: event.target.value }))} placeholder="Required for audit log" /></label>
        <div className="admin-actions">
          {!mathariaGrant && <button disabled={Boolean(busy)} onClick={() => void run(account, 'grant')}>Grant one year free Matharia</button>}
          {mathariaGrant && <button disabled={Boolean(busy)} onClick={() => void run(account, 'revoke')}>Revoke free Matharia access</button>}
          <button disabled={Boolean(busy) || !account.email} onClick={() => void run(account, 'reset')}>Send password reset</button>
          {account.suspension ? <button disabled={Boolean(busy)} onClick={() => void run(account, 'reactivate')}>Reactivate</button>
            : <button disabled={Boolean(busy) || account.id === family.session?.user.id} onClick={() => void run(account, 'suspend')}>Suspend</button>}
        </div>
      </section>;
    })}</div>
    {!loading && listing?.accounts.length === 0 && <p>{pendingOnly ? 'No pending deletion requests found.' : 'No matching accounts found.'}</p>}
    {!search && listing && listing.total > page * 50 && <button className="website-button website-button-outline admin-next" onClick={() => setPage(value => value + 1)}>Next 50 accounts <ArrowRight size={17} /></button>}
    {!search && page > 1 && <button className="website-button website-button-outline admin-next" onClick={() => setPage(value => value - 1)}>Previous 50 accounts</button>}
  </main>;
}
