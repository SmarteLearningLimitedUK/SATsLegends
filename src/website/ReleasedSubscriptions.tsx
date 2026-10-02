import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Gamepad2, Mail } from 'lucide-react';
import { hasGameAccess, useFamily } from './FamilyAccount';
import { billingRequest, openBilling } from './services/supabase';

type Product = 'matharia' | 'english' | 'bundle';
type Interval = 'month' | 'year';
type Plan = { product: Product; interval: Interval; available: boolean; amount: number; currency: string };

const products: Record<Product, { title: string; subtitle: string; features: string[]; prices: Record<Interval, number> }> = {
  matharia: {
    title: 'Matharia', subtitle: 'The maths adventure', prices: { month: 499, year: 4999 },
    features: ['Matharia maths adventures', 'One child profile', 'Saved progress across devices', 'Private parent dashboard'],
  },
  english: {
    title: 'Lexcoria', subtitle: 'The English adventure', prices: { month: 499, year: 4999 },
    features: ['Reading, grammar, punctuation and spelling games', 'Practice SATs papers', 'One child profile', 'Saved progress across devices'],
  },
  bundle: {
    title: 'Both adventures', subtitle: 'Matharia + Lexcoria', prices: { month: 849, year: 10999 },
    features: ['Complete Matharia and Lexcoria access', 'One child profile across both games', 'Separate saved progress for each game', 'Private parent dashboard'],
  },
};

const formatPounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

export default function ReleasedSubscriptions() {
  const family = useFamily();
  const [query] = useSearchParams();
  const requested = query.get('product');
  const [selected, setSelected] = useState<Product>(requested === 'english' || requested === 'bundle' ? requested : 'matharia');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paypalReady, setPaypalReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (requested === 'matharia' || requested === 'english' || requested === 'bundle') setSelected(requested);
  }, [requested]);
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

  const activeMatharia = hasGameAccess('matharia', family.subscriptions, family.complimentary);
  const activeEnglish = hasGameAccess('english', family.subscriptions, family.complimentary);
  const hasBundle = family.subscriptions.some(subscription => subscription.product_code === 'bundle'
    && ['active', 'trialing'].includes(subscription.status) && new Date(subscription.current_period_end).getTime() > Date.now())
    || family.complimentary.some(grant => grant.product_code === 'bundle' && !grant.revoked_at && new Date(grant.valid_until).getTime() > Date.now());
  const covered = selected === 'bundle' ? hasBundle : selected === 'matharia' ? activeMatharia : activeEnglish;
  const switchingToBundle = selected === 'bundle' && !covered && (activeMatharia || activeEnglish);

  async function checkout(interval: Interval) {
    const key = `${selected}:${interval}`;
    setBusy(key); setError('');
    try { openBilling((await billingRequest({ action: 'checkout', product: selected, interval })).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open checkout.'); setBusy(''); }
  }
  async function manage() {
    setBusy('portal'); setError('');
    try { openBilling((await billingRequest({ action: 'portal' })).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open billing.'); setBusy(''); }
  }

  return <main id="website-main" className="website-container family-main">
    <div className="website-resource-heading"><p className="website-eyebrow"><Gamepad2 size={16} /> SATs Legends subscriptions</p><h1>Choose your adventure.<br /><span>Grow every skill.</span></h1><p>One child profile, browser play and progress you can follow.</p></div>
    {query.get('checkout') === 'cancelled' && <p className="family-notice" role="status">Checkout was cancelled. Choose a plan whenever you’re ready.</p>}
    {error && <p className="family-error" role="alert">{error}</p>}
    {!family.configured && <p className="family-notice">Secure subscriptions are being connected. Plans cannot be purchased yet.</p>}
    <div className="family-product-tabs" role="group" aria-label="Choose a game">
      {(['matharia', 'english', 'bundle'] as const).map(product => <button key={product} type="button" className={selected === product ? 'is-active' : ''} aria-pressed={selected === product} onClick={() => setSelected(product)}>{product === 'english' ? <BookOpen size={18} /> : <Gamepad2 size={18} />}{products[product].title}</button>)}
    </div>
    <p className="family-product-intro">{products[selected].subtitle} · {selected === 'bundle' ? 'both games' : 'one game'} · one child profile</p>
    <div className="family-plans">{(['month', 'year'] as const).map(interval => {
      const amount = products[selected].prices[interval];
      const verified = plans.find(plan => plan.product === selected && plan.interval === interval);
      const available = verified?.available === true && verified.amount === amount && verified.currency === 'gbp';
      const key = `${selected}:${interval}`;
      return <section className={`family-plan ${interval === 'year' && selected !== 'bundle' ? 'family-plan-year' : ''}`} key={key}>
        <p className="website-eyebrow">{interval === 'year' ? 'Annual billing' : 'Monthly billing'}</p>
        <h2>{products[selected].title} {interval === 'year' ? 'yearly' : 'monthly'}</h2>
        <p className="family-price">{formatPounds(amount)} <span>per {interval}</span></p>
        <p>{interval === 'year' && selected !== 'bundle' ? 'Save £9.89 compared with twelve monthly payments.' : interval === 'year' ? 'One payment for the full year.' : 'Pay monthly and cancel renewal any time.'}</p>
        <ul>{products[selected].features.map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
        {covered ? <Link className="website-button website-button-gold" to="/parent">Go to your account <ArrowRight size={17} /></Link>
          : switchingToBundle ? <button className="website-button website-button-gold" disabled={Boolean(busy)} onClick={() => void manage()}>{busy === 'portal' ? 'Opening billing…' : 'Manage existing plan'}<ArrowRight size={17} /></button>
            : family.session ? <button className="website-button website-button-gold" disabled={Boolean(busy) || !available} onClick={() => void checkout(interval)}>{busy === key ? 'Opening checkout…' : available ? 'Choose this plan' : 'Checkout not ready'}<ArrowRight size={17} /></button>
              : <Link className="website-button website-button-gold" to={`/signup?next=${encodeURIComponent(`/subscriptions?product=${selected}`)}`}>Create parent account <ArrowRight size={17} /></Link>}
        <p className="family-small">{switchingToBundle ? 'Change your existing subscription before starting a combined plan so you are not billed twice.' : `Renews automatically at ${formatPounds(amount)} per ${interval}. Cancel renewal in your parent account; access continues until the end of the paid period.`}</p>
      </section>;
    })}</div>
    <p className="family-payment-note"><strong>{paypalReady ? 'Card or PayPal at secure checkout.' : 'Secure card checkout.'}</strong> Payment details are handled by the payment provider and are not stored in the game.</p>
    <p className="family-small"><Mail size={15} /> Progress emails can be switched off in your parent account.</p>
  </main>;
}
