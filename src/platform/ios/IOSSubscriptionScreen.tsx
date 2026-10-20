import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasMathariaAccess, useFamily } from '../../website/FamilyAccount';
import { appleStore, appleSubscriptionRequest, APPLE_PRODUCTS, confirmAppleTransactions, nativeAppleStoreAvailable, type AppleProduct } from './appleSubscriptions';
import './apple-subscriptions.css';

export function legalHttpsUrl(value: string | undefined): string | null {
  try { const url = new URL(value || ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export default function AppleSubscriptions() {
  const family = useFamily();
  const [products, setProducts] = useState<AppleProduct[]>([]);
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
  const privacy = legalHttpsUrl(import.meta.env.VITE_IOS_PRIVACY_URL);
  const terms = legalHttpsUrl(import.meta.env.VITE_IOS_TERMS_URL);
  const native = nativeAppleStoreAvailable();
  const active = hasMathariaAccess(family.subscriptions, family.complimentary);
  useEffect(() => {
    let alive = true; setReady(false); setLoading(true); setError('');
    if (!native || !family.session) { setLoading(false); return; }
    Promise.all([appleStore.products(), appleSubscriptionRequest()]).then(([store, server]) => {
      if (!alive) return;
      setProducts(store.products.filter(p => APPLE_PRODUCTS.some(id => id === p.id)));
      setReady(server.ready);
    }).catch(() => { if (alive) setError('Subscriptions could not be loaded. Please check your connection and try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [native, family.session?.user.id]);
  async function action(name: string, task: () => Promise<void>) {
    if (busy) return; setBusy(name); setError(''); setMessage('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  return <main id="website-main" className="apple-subscriptions website-container family-main">
    <p className="website-eyebrow">For parents · Matharia</p><h1>A little practice.<br />A bigger adventure.</h1>
    <p>37 maths games, SATs practice papers and saved progress for one child. Choose an Apple subscription to unlock Matharia.</p>
    {active && <p className="family-notice" role="status">Your family already has Matharia access. <Link to="/parent">Continue to your parent account</Link>.</p>}
    {!family.session && <p className="family-notice">A parent account keeps your child’s progress safe. <Link to="/login?next=/subscriptions">Sign in</Link> or <Link to="/signup?next=/subscriptions">create a parent account</Link> before choosing a plan.</p>}
    {loading && <p role="status">Loading Apple subscription options…</p>}
    {!native && <p className="family-notice">Apple subscriptions are available in the installed iPhone app. This browser preview cannot make purchases.</p>}
    {native && family.session && !loading && (!ready || !products.length || !privacy || !terms) && <p className="family-notice">Apple subscriptions are being prepared. Purchases are not available in this build yet.</p>}
    <div className="apple-plan-list">{products.map(product => <section key={product.id} aria-label={`${product.period === 'month' ? 'Monthly' : 'Yearly'} Matharia subscription`}>
      <h2>{product.period === 'month' ? 'Monthly adventures' : 'A year of adventures'}</h2>
      <p className="apple-plan-price">{product.price}<span> / {product.period}</span></p>
      <p>Matharia access · One child profile · Parent progress dashboard</p>
      <button type="button" className="website-button website-button-gold" disabled={active || !ready || !privacy || !terms || Boolean(busy)} onClick={() => void action(product.id, async () => {
        if (!family.session) throw new Error('Please sign in first.');
        const result = await appleStore.purchase({ productId: product.id, appAccountToken: family.session.user.id });
        if (result.status === 'cancelled') { setMessage('Purchase cancelled. You have not started a subscription.'); return; }
        if (result.status === 'pending') { setMessage('Waiting for Apple approval. Access will update after the purchase is approved.'); return; }
        await confirmAppleTransactions(result.transactionIds); await family.refresh(); setMessage('Your Apple purchase has been confirmed. Continue from your parent account.');
      })}>{busy === product.id ? 'Confirming…' : 'Subscribe with Apple'}</button>
    </section>)}</div>
    <div className="apple-subscription-actions">
      <button type="button" className="website-button website-button-outline" disabled={!native || !family.session || Boolean(busy)} onClick={() => void action('restore', async () => {
        const result = await appleStore.restore(); await confirmAppleTransactions(result.transactionIds); await family.refresh();
        setMessage(result.transactionIds.length ? 'Purchases restored and checked. Continue from your parent account.' : 'No current Apple purchases were found. Use the Apple account and parent account used for the original purchase.');
      })}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</button>
      <button type="button" className="website-button website-button-outline" disabled={!native || Boolean(busy)} onClick={() => void action('manage', () => appleStore.manage())}>Manage Apple subscription</button>
    </div>
    {message && <p className="family-notice" role="status">{message}</p>}{error && <p className="family-error" role="alert">{error}</p>}
    <p className="family-small">Payment is charged to your Apple account when you confirm. Subscriptions renew automatically unless cancelled in Apple subscription settings before renewal. The price and billing period are shown by Apple before purchase. Restore purchases uses the original Apple and parent accounts.</p>
    <p className="family-small">{privacy && <a href={privacy} target="_blank" rel="noreferrer">Privacy policy</a>}{privacy && terms && ' · '}{terms && <a href={terms} target="_blank" rel="noreferrer">Terms of use</a>}</p>
  </main>;
}
