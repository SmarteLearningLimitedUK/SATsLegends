import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Gamepad2, Mail } from 'lucide-react';
import { hasMathariaAccess, useFamily } from './FamilyAccount';
import { billingRequest, openBilling } from './services/supabase';
import { englishReleased } from './englishRelease';
import ReleasedSubscriptions from './ReleasedSubscriptions';

type Interval = 'month' | 'year';
type Plan = { product: string; interval: Interval; available: boolean; amount: number; currency: string };

const prices: Record<Interval, number> = { month: 499, year: 4999 };
const features = ['Matharia maths challenges', 'One child profile', 'Saved progress across devices', 'Parent dashboard with strengths and topics to revisit', 'Optional progress emails', 'Calm Grove pause activities'];
const formatPounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

export default function Subscriptions() {
  return englishReleased ? <ReleasedSubscriptions /> : <MathariaSubscriptions />;
}

function MathariaSubscriptions() {
  const family = useFamily();
  const [query] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paypalReady, setPaypalReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const mathariaActive = hasMathariaAccess(family.subscriptions, family.complimentary);
  const otherPaidPlan = family.subscriptions.some(subscription => subscription.product_code !== 'matharia'
    && ['active', 'trialing'].includes(subscription.status)
    && new Date(subscription.current_period_end).getTime() > Date.now());

  useEffect(() => {
    if (!family.configured) return;
    let alive = true;
    billingRequest().then(data => {
      if (!alive) return;
      setPlans(data.plans);
      setPaypalReady(data.paymentMethods?.includes('paypal') === true);
    }).catch(() => { if (alive) setError('Checkout availability could not be checked. Please try again later.'); });
    return () => { alive = false; };
  }, [family.configured]);

  async function checkout(interval: Interval) {
    setBusy(interval); setError('');
    try { openBilling((await billingRequest({ action: 'checkout', product: 'matharia', interval })).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open checkout.'); setBusy(''); }
  }
  async function manage() {
    setBusy('portal'); setError('');
    try { openBilling((await billingRequest({ action: 'portal' })).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open billing.'); setBusy(''); }
  }

  return <main id="website-main" className="website-container family-main">
    <div className="website-resource-heading"><p className="website-eyebrow"><Gamepad2 size={16} /> SATs Legends subscriptions</p><h1>Maths practice for them.<br /><span>Clear progress for you.</span></h1><p>Choose monthly flexibility or a year of Matharia. Both plans include game challenges, saved progress and a private parent dashboard for one child.</p></div>
    {query.get('checkout') === 'cancelled' && <p className="family-notice" role="status">Checkout was cancelled. Choose a plan whenever you’re ready.</p>}
    {(query.get('product') === 'english' || query.get('product') === 'bundle') && <p className="family-notice" role="status">Lexcoria is in development. English and combined plans are not on sale yet; the subscriptions below cover Matharia only.</p>}
    {error && <p className="family-error" role="alert">{error}</p>}
    {!family.configured && <p className="family-notice">Secure subscriptions are being connected. Plans cannot be purchased yet.</p>}
    <p className="family-product-intro">Matharia · The maths adventure · one child profile</p>
    <div className="family-plans">{(['month', 'year'] as const).map(interval => {
      const amount = prices[interval];
      const verified = plans.find(plan => plan.product === 'matharia' && plan.interval === interval);
      const available = verified?.available === true && verified.amount === amount && verified.currency === 'gbp';
      return <section className={`family-plan ${interval === 'year' ? 'family-plan-year' : ''}`} key={interval}>
        <p className="website-eyebrow">{interval === 'year' ? 'A year of practice' : 'Start with monthly access'}</p>
        <h2>Matharia {interval === 'year' ? 'yearly' : 'monthly'}</h2>
        <p className="family-price">{formatPounds(amount)} <span>per {interval}</span></p>
        <p>{interval === 'year' ? '£49.99 billed yearly. Save £9.89 compared with twelve monthly payments.' : '£4.99 billed monthly. Cancel renewal any time in your parent account.'}</p>
        <ul>{features.map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
        {mathariaActive ? <Link className="website-button website-button-gold" to="/parent">Go to your account <ArrowRight size={17} /></Link>
          : otherPaidPlan ? <button className="website-button website-button-gold" disabled={Boolean(busy)} onClick={() => void manage()}>{busy === 'portal' ? 'Opening billing…' : 'Manage existing plan'}<ArrowRight size={17} /></button>
            : family.session ? <button className="website-button website-button-gold" disabled={Boolean(busy) || !available} onClick={() => void checkout(interval)}>{busy === interval ? 'Opening checkout…' : available ? 'Choose this plan' : 'Checkout not ready'}<ArrowRight size={17} /></button>
              : <Link className="website-button website-button-gold" to="/signup?next=/subscriptions">Create parent account <ArrowRight size={17} /></Link>}
        <p className="family-small">{otherPaidPlan && !mathariaActive ? 'Manage your existing subscription before choosing another plan so you are not billed twice.' : `Renews automatically at ${formatPounds(amount)} per ${interval}. Cancel renewal in your parent account; access continues until the end of the paid period.`}</p>
      </section>;
    })}</div>
    <p className="family-product-intro">Getting started is simple: create your parent account, add your child’s nickname and choose a plan. Matharia plays in the browser on phones, tablets and desktop computers.</p>
    <p className="family-payment-note"><strong>{paypalReady ? 'Card or PayPal at secure checkout.' : 'Secure card checkout.'}</strong> Payment details are handled by the payment provider and are not stored in the game.</p>
    <p className="family-small"><Mail size={15} /> Choose whether to receive progress emails. Your private dashboard stays available when emails are off.</p>
  </main>;
}
