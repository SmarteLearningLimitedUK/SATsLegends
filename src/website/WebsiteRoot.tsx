import { lazy, Suspense, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import Website from './Website';
import FamilyAccount from './FamilyAccount';
import './website.css';
import './website-premium.css';
import './website-adventure.css';
import './website-logo-theme.css';
import './family.css';
import './parents.css';

const Game = lazy(() => import('../App'));
const GameGate = lazy(() => import('./GameGate'));
const websiteRoutes = new Set(['/', '/revision', '/videos', '/signup', '/login', '/subscriptions', '/for-parents', '/forgot-password', '/reset-password', '/auth/callback', '/admin']);

export default function WebsiteRoot() {
  return <FamilyAccount><WebsiteContent /></FamilyAccount>;
}

function WebsiteContent() {
  const { pathname } = useLocation();
  const isWebsite = websiteRoutes.has(pathname.replace(/\/+$/, '') || '/') || pathname.startsWith('/parent');

  useLayoutEffect(() => {
    document.body.classList.toggle('legends-website-body', isWebsite);
    if (isWebsite) {
      document.body.style.removeProperty('touch-action');
      document.body.style.removeProperty('overscroll-behavior-y');
      window.scrollTo(0, 0);
    }
    return () => document.body.classList.remove('legends-website-body');
  }, [isWebsite, pathname]);

  if (isWebsite) return <Website />;

  return <>
    <Suspense fallback={<div className="website-game-loading"><LoaderCircle className="website-spinner" /><p>Opening your adventure…</p></div>}><GameGate>
      <Game />
    </GameGate></Suspense>
    <Link className="website-return" to="/" aria-label="Return to SATs Legends website"><ArrowLeft size={16} /><span>Website</span></Link>
  </>;
}
