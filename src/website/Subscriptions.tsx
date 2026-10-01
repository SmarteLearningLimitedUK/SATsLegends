import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, BookOpen, Gamepad2, Mail } from 'lucide-react';
import { hasMathariaAccess, useFamily } from './FamilyAccount';
import { billingRequest, openBilling } from './services/supabase';

export default function Subscriptions() {
  const family = useFamily();
  const [query] = useSearchParams();
  const [ready, setReady] = useState<string[]>([]);
  const [paypalReady, setPaypalReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!family.configured) return;
    let alive = true;
    billingRequest().then(data => { if (alive) { setReady(data.plans.filter((p: { available: boolean }) => p.available).map((p: { interval: string }) => p.interval)); setPaypalReady(data.paymentMethods?.includes('paypal') === true); } })
      .catch(() => { if (alive) setError('Subscriptions are not available to purchase yet.'); });
    return () => { alive = false; };
  }, [family.configured]);
  async function checkout(interval: 'month' | 'year') {
    setBusy(interval); setError('');
    try { openBilling((await billingRequest({ action: 'checkout', interval })).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open checkout.'); setBusy(''); }
  }
  return <main id="website-main" className="website-container family-main">
    <div className="website-resource-heading"><p className="website-eyebrow"><Gamepad2 size={16} /> SATs Legends Matharia</p><h1>A world of adventure.<br /><span>A brighter maths journey.</span></h1><p>Browser play, one child profile and progress you can follow.</p></div>
    {query.get('checkout') === 'cancelled' && <p className="family-notice" role="status">Checkout was cancelled. You can choose a plan whenever you’re ready.</p>}
    {error && <p className="family-error" role="alert">{error}</p>}
    {!family.configured && <p className="family-notice">Subscriptions are coming soon. Parent accounts and secure checkout are being connected.</p>}
    <div className="family-plans">{([
      { interval: 'month', name: 'Monthly adventure', amount: '£4.99', period: 'per month', detail: 'A little adventure, every month.' },
      { interval: 'year', name: 'A year of legends', amount: '£49.99', period: 'per year', detail: 'Save £9.89 compared with 12 monthly payments.' },
    ] as const).map(plan => <section className={`family-plan ${plan.interval === 'year' ? 'family-plan-year' : ''}`} key={plan.interval}>
      <p className="website-eyebrow">{plan.interval === 'year' ? 'Best value' : 'Start your journey'}</p><h2>{plan.name}</h2><p className="family-price">{plan.amount} <span>{plan.period}</span></p><p>{plan.detail}</p>
      <ul>{['One child player profile', 'Matharia maths adventures in your browser', 'Saved progress across devices', 'Private parent progress dashboard', 'Sunday and Wednesday progress emails'].map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
      {hasMathariaAccess(family.subscriptions, family.complimentary) ? <Link className="website-button website-button-gold" to="/parent">Go to your account <ArrowRight size={17} /></Link>
        : family.session ? <button className="website-button website-button-gold" disabled={Boolean(busy) || !ready.includes(plan.interval)} onClick={() => void checkout(plan.interval)}>{busy === plan.interval ? 'Opening checkout…' : `Choose ${plan.interval === 'month' ? 'monthly' : 'yearly'}`}<ArrowRight size={17} /></button>
          : <Link className="website-button website-button-gold" to="/signup?next=/subscriptions">Create parent account <ArrowRight size={17} /></Link>}
      <p className="family-small">Renews automatically at {plan.amount} {plan.period}. Cancel renewal in your parent account; access continues until the end of your paid period.</p>
    </section>)}</div>
    <p className="family-payment-note"><strong>{paypalReady ? 'Card or PayPal. Your choice.' : ready.length ? 'Pay by card at secure checkout.' : 'Card and PayPal checkout is being prepared.'}</strong> {paypalReady ? 'Choose your payment method at secure checkout for either plan.' : 'PayPal will be offered when account activation is complete.'} Payment details are handled by the payment provider and are not stored in the game.</p>
    <Link className="website-text-link family-parent-link" to="/for-parents">How Matharia supports revision and wellbeing <ArrowRight size={17} /></Link>
    <section className="family-coming-soon"><BookOpen size={32} /><div><p className="website-eyebrow">The next chapter</p><h2>An English adventure is on its way.</h2><p>In development. These subscriptions cover Matharia only. English access and pricing will be announced when it’s ready.</p></div><span>Coming soon</span></section>
    <p className="family-small"><Mail size={15} /> Reports arrive on Sundays at 3 pm and Wednesdays at 4 pm, UK time. You can switch them off and view saved progress at any time.</p>
  </main>;
}
