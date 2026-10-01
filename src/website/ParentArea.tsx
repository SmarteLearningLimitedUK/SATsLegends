import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gamepad2, Mail, RefreshCw, Star } from 'lucide-react';
import { hasMathariaAccess, useFamily } from './FamilyAccount';
import { billingRequest, openBilling, supabase } from './services/supabase';
import { buildParentReport } from '../systems/progression/reporting';
import { createDefaultPlayer } from '../app/usePlayerProgression';
import type { PlayerData } from '../types';

export function PrivateParentPage({ children }: { children: ReactNode }) {
  const family = useFamily();
  const location = useLocation();
  if (family.loading || (family.session && family.dataLoading && !family.settings)) return <main id="website-main" className="website-container family-main"><p role="status">Loading your family account…</p></main>;
  if (!family.configured) return <main id="website-main" className="website-container family-main"><h1>Your family’s next chapter.</h1><p>Parent accounts are not available yet. Please check back soon.</p><Link className="website-button website-button-gold" to="/subscriptions">Explore subscriptions</Link></main>;
  if (!family.session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (family.error) return <main id="website-main" className="website-container family-main"><h1>Let’s try again.</h1><p role="alert">{family.error}</p><button className="website-button website-button-gold" onClick={() => void family.refresh()}>Reload account</button></main>;
  return children;
}

export default function ParentArea() {
  return <PrivateParentPage><ParentDashboard /></PrivateParentPage>;
}
function ParentDashboard() {
  const family = useFamily();
  const [query] = useSearchParams();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pendingReportValue, setPendingReportValue] = useState<boolean | null>(null);
  const active = hasMathariaAccess(family.subscriptions, family.complimentary);
  const subscription = family.subscriptions.find(s => s.product_code === 'matharia' && ['active', 'trialing'].includes(s.status));
  const complimentary = family.complimentary.find(grant => grant.product_code === 'matharia'
    && !grant.revoked_at && new Date(grant.valid_until).getTime() > Date.now());
  useEffect(() => {
    if (query.get('checkout') !== 'success' || active) return;
    let attempts = 0;
    const timer = window.setInterval(() => { if (++attempts > 10) window.clearInterval(timer); else void family.refresh(); }, 3000);
    return () => window.clearInterval(timer);
  }, [query, active, family.refresh]);
  async function action(name: string, task: () => Promise<void>) {
    setBusy(name); setError('');
    try { await task(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nickname = String(new FormData(event.currentTarget).get('nickname') ?? '').trim();
    await action('child', async () => {
      const result = await supabase!.rpc('create_child_profile', { child_nickname: nickname });
      if (result.error) throw new Error(result.error.message);
      await family.refresh();
    });
  }
  return <main id="website-main" className="website-container family-main">
    <div className="website-resource-heading"><p className="website-eyebrow">Your parent account</p><h1>Welcome to the adventure.</h1><p>Matharia, your little legend, and every step of their progress.</p></div>
    {error && <p className="family-error" role="alert">{error}</p>}
    {query.get('checkout') === 'success' && !active && <p className="family-notice" role="status">We’re waiting for payment confirmation. Access appears once Stripe confirms your subscription. <button onClick={() => void family.refresh()}>Check again</button></p>}
    <div className="family-dashboard-grid">
      <section className="family-panel"><p className="website-eyebrow"><Gamepad2 size={15} /> One child. Their own journey.</p><h2>Your little legend</h2>
        {!family.children.length ? <form className="family-form" onSubmit={addChild}><label>Child’s nickname<input name="nickname" required minLength={2} maxLength={24} placeholder="Choose an adventure name" autoComplete="off" /></label><p className="family-small">Use a nickname. Your child doesn’t need an email address.</p><button className="website-button website-button-gold" disabled={Boolean(busy)}>{busy === 'child' ? 'Adding profile…' : 'Create child profile'}<ArrowRight size={17} /></button></form>
          : family.children.map(child => <div className="family-child" key={child.id}><h3>{child.nickname}</h3><p>SATs Legends Matharia</p><div className="family-actions">{active ? <Link onClick={() => family.selectChild(child.id)} className="website-button website-button-gold" to="/play"><Gamepad2 size={18} /> Play Matharia</Link> : <Link className="website-button website-button-gold" to="/subscriptions">Choose a subscription</Link>}<Link className="website-button website-button-outline" to={`/parent/progress/${child.id}`}>View progress <ArrowRight size={17} /></Link></div></div>)}
      </section>
      <section className="family-panel"><p className="website-eyebrow">Your subscription</p><h2>{active ? 'Your adventure is active.' : 'Choose your next chapter.'}</h2>
        {active && subscription ? <p>{subscription.interval === 'month' ? 'Monthly · £4.99' : 'Yearly · £49.99'} · One child profile<br />{subscription.cancel_at_period_end ? 'Access ends' : 'Next renewal'} {new Date(subscription.current_period_end).toLocaleDateString('en-GB')}.</p>
          : complimentary ? <p>Complimentary Matharia access · One child profile<br />Access ends {new Date(complimentary.valid_until).toLocaleDateString('en-GB')}. There is no charge or automatic renewal.</p>
          : <p>Monthly access for £4.99 or a whole year for £49.99. English adventures are coming later.</p>}
        {family.subscriptions.length ? <button className="website-button website-button-outline" disabled={Boolean(busy)} onClick={() => void action('billing', async () => openBilling((await billingRequest({ action: 'portal' })).url))}>{busy === 'billing' ? 'Opening…' : 'Manage subscription'}</button>
          : !complimentary && <Link className="website-button website-button-gold" to="/subscriptions">See subscriptions <ArrowRight size={17} /></Link>}
        {family.subscriptions.length > 0 && <p className="family-small">Manage payments, download invoices or cancel renewal through secure Stripe billing.</p>}
      </section>
    </div>
    <section className="family-panel family-email-panel"><Mail size={30} /><div><p className="website-eyebrow">Progress, straight to you</p><h2>Two little updates. Every week.</h2><p>Sunday at 3 pm and Wednesday at 4 pm, UK time, sent to <strong>{family.session?.user.email}</strong>. Each email links to your child’s private, up-to-date progress page.</p><label className="family-checkbox"><input type="checkbox" checked={pendingReportValue ?? family.settings?.report_emails ?? false} disabled={Boolean(busy) || !family.settings} onChange={event => {
        const enabled = event.target.checked;
        setPendingReportValue(enabled);
        void action('reports', async () => {
          const result = await supabase!.from('parent_settings').update({ report_emails: enabled }).eq('parent_id', family.session!.user.id).select('parent_id').single();
          if (result.error) throw new Error('Unable to update report emails. Please try again.');
          await family.refresh();
        }).finally(() => setPendingReportValue(null));
      }} />Send me progress reports</label><p className="family-small">Switch emails off whenever you like. Your progress dashboard remains available.</p></div></section>
  </main>;
}

export function ChildProgressPage() {
  return <PrivateParentPage><ChildProgress /></PrivateParentPage>;
}
function ChildProgress() {
  const { childId } = useParams();
  const family = useFamily();
  const child = family.children.find(profile => profile.id === childId);
  const [saved, setSaved] = useState<{ player: PlayerData; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setSaved(null); setLoading(true); setError('');
    if (!child) { setLoading(false); return; }
    let alive = true;
    supabase!.from('child_progress').select('player,updated_at').eq('child_id', child.id).eq('product_code', 'matharia').maybeSingle().then(result => {
      if (!alive) return;
      if (result.error) setError('Unable to load progress. Please try again.');
      else if (result.data) setSaved({ player: createDefaultPlayer(result.data.player), updated_at: result.data.updated_at });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [child?.id, refresh]);
  if (!child) return <main className="website-container family-main" id="website-main"><h1>Profile not found.</h1><p>This report is only available to the parent who owns the profile.</p><Link to="/parent">Back to your account</Link></main>;
  const report = saved ? buildParentReport(saved.player) : null;
  return <main className="website-container family-main" id="website-main">
    <Link className="website-text-link" to="/parent">← Your parent account</Link>
    <div className="website-resource-heading"><p className="website-eyebrow"><Star size={16} /> SATs Legends Matharia</p><h1>{child.nickname}’s progress</h1><p>Every adventure adds up. Here’s the latest saved picture.</p></div>
    <button className="website-button website-button-outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />{loading ? 'Loading…' : 'Refresh progress'}</button>
    {error && <p className="family-error" role="alert">{error}</p>}
    {!loading && !error && !saved && <section className="family-panel"><h2>A fresh adventure awaits.</h2><p>Progress will appear here after your child plays and saves their first Matharia adventure.</p></section>}
    {saved && report && <><p className="family-small">Last saved {new Date(saved.updated_at).toLocaleString('en-GB')}. Figures cover all recorded play.</p><div className="family-stats">
      {[[saved.player.level, 'Explorer level'], [saved.player.telemetry?.sessionsPlayed ?? 0, 'Sessions played'], [`${report.overallAccuracy}%`, 'Answer accuracy'], [saved.player.stats.totalStars, 'Stars earned']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div><div className="family-dashboard-grid"><section className="family-panel"><p className="website-eyebrow">Growing confidence</p><h2>Strongest topics</h2><p>{report.excelling.length ? report.excelling.join(' · ') : 'Play a few more challenges to discover strengths.'}</p><h3>Next practice</h3><p>{report.needsPractice.length ? report.needsPractice.join(' · ') : 'More answers will help reveal where to focus next.'}</p></section><section className="family-panel"><p className="website-eyebrow">The adventure so far</p><h2>{report.favoriteGame?.label || 'Discovering new favourites'}</h2><p>{report.favoriteGame ? `${report.favoriteGame.sessions} sessions in their most-played challenge.` : 'Their favourite challenge will appear as they explore.'}</p><h3>Time spent learning</h3><p>{Math.round((saved.player.telemetry?.totalPlayTimeSec ?? 0) / 60)} minutes recorded across their adventures.</p></section></div></>}
  </main>;
}
