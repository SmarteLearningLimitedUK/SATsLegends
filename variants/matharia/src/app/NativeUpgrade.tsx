import { useRef, useState } from 'react';
import { Check, LockKeyhole, RotateCcw } from 'lucide-react';
import { useNativeIdentity } from './NativeIdentity';
import { useNativeAccess } from './NativeAccess';
import { nativeServicesAvailable } from './nativeServices';
import NativeDialog from './NativeDialog';

export default function NativeUpgrade({ onClose, onAccount }: { onClose: () => void; onAccount: () => void }) {
  const access = useNativeAccess(), identity = useNativeIdentity();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const plan = access.plans.find(item => item.id === selected) ?? access.plans[0];
  async function act(kind: 'buy' | 'restore') {
    if (locked.current) return;
    locked.current = true; setBusy(kind); setError(''); setMessage('');
    try {
      if (kind === 'restore') {
        if (await access.restore()) { onClose(); return; }
        setMessage('No active App Store purchase was found for this Apple Account. Your free practice is still available.');
      } else if (plan) {
        const result = await access.purchase(plan.id);
        if (result === 'purchased') { onClose(); return; }
        if (result === 'pending') setMessage('Your purchase is waiting for approval. Access will unlock when Apple confirms it.');
        if (result === 'cancelled') setMessage('Purchase cancelled. You can keep playing the free practice games.');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to contact the App Store. Please try again.'); }
    finally { locked.current = false; setBusy(''); }
  }
  return <NativeDialog kind="upgrade" titleId="native-upgrade-title" onClose={onClose}>
    <p className="native-kicker"><LockKeyhole size={16}/>The full adventure</p>
    <h1 id="native-upgrade-title">Unlock every<br/><span>island of Matharia.</span></h1>
    <p className="native-dialog-intro">Keep the adventure going with full access.</p>
    <ul className="native-benefits"><li><Check/>All maths games and levels</li><li><Check/>Every island and practice challenge</li><li><Check/>Keep your progress as you learn</li></ul>
    {access.checking ? <p className="native-notice" role="status">Checking the App Store…</p> : plan ? <>
      <div className="native-plans" role="group" aria-label="Choose a subscription">{access.plans.map(item => <button key={item.id} type="button" aria-pressed={item.id === plan.id} disabled={Boolean(busy)} onClick={() => setSelected(item.id)}><span>{item.name}</span><strong>{item.price}<small> / {item.periodCount > 1 ? `${item.periodCount} ` : ''}{item.period}</small></strong></button>)}</div>
      <button className="native-primary" type="button" disabled={Boolean(busy)} onClick={() => void act('buy')}>{busy === 'buy' ? 'Waiting for Apple…' : `Upgrade · ${plan.price}`}</button>
      <p className="native-small">Payment is charged to your Apple Account. Subscriptions renew automatically unless cancelled at least 24 hours before renewal. Manage or cancel in your App Store account settings.</p>
    </> : <div className="native-notice" role="status"><p>{access.storeError || 'Subscriptions are currently unavailable. Your three free practice games are ready to play.'}</p><button type="button" onClick={() => void access.refreshStore()}>Check again</button></div>}
    {message && <p className="native-notice" role="status">{message}</p>}{error && <p className="native-error" role="alert">{error}</p>}
    <button className="native-account-link" type="button" onClick={onAccount} disabled={Boolean(busy)}>{identity.session ? 'Your parent account' : 'Continue with Apple or sign in'}</button>
    <div className="native-upgrade-footer"><button type="button" disabled={Boolean(busy) || !nativeServicesAvailable()} onClick={() => void act('restore')}><RotateCcw size={14}/>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</button><button type="button" onClick={onClose}>Keep practising free</button></div>
    <p className="native-small native-legal"><a href="https://satslegends.com/privacy" target="_blank" rel="noreferrer">Privacy</a><span>·</span><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms of use</a></p>
  </NativeDialog>;
}
