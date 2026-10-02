import { lazy, Suspense, useLayoutEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { parseRoute } from '../app/routeConfig';
import Website from './Website';
import FamilyAccount from './FamilyAccount';
import { englishPlayable } from './englishRelease';
import './website.css';
import './website-premium.css';
import './website-adventure.css';
import './website-logo-theme.css';
import './family.css';
import './english.css';
import './parents.css';
import './website-hero-action.css';

const Game = lazy(() => import('../App'));
const GameGate = lazy(() => import('./GameGate'));
const websiteRoutes = new Set(['/', '/english', '/revision', '/videos', '/signup', '/login', '/subscriptions', '/for-parents', '/forgot-password', '/reset-password', '/auth/callback', '/admin']);

export default function WebsiteRoot() {
  return <FamilyAccount><WebsiteContent /></FamilyAccount>;
}

function WebsiteContent() {
  const { pathname } = useLocation();
  const isEnglishAssetRoute = pathname.startsWith('/english/');
  const isWebsite = websiteRoutes.has(pathname.replace(/\/+$/, '') || '/') || pathname.startsWith('/parent') || isEnglishAssetRoute;
  const gameScreen = parseRoute(pathname).screen;
  const isMinigame = gameScreen === 'gameplay';
  const hasGameDock = !['splash', 'avatar_selection', 'profile_setup'].includes(gameScreen);

  useLayoutEffect(() => {
    document.body.classList.toggle('legends-website-body', isWebsite);
    if (isWebsite) {
      document.body.style.removeProperty('touch-action');
      document.body.style.removeProperty('overscroll-behavior-y');
      window.scrollTo(0, 0);
    }
    return () => document.body.classList.remove('legends-website-body');
  }, [isWebsite, pathname]);

  if (isEnglishAssetRoute) return englishPlayable
    ? <main id="website-main" className="website-container family-main"><h1>Lexcoria files are not in this deployment.</h1><p>Please contact SATs Legends support.</p><Link to="/english">Back to Lexcoria</Link></main>
    : <Navigate to="/english" replace />;
  if (isWebsite) return <Website />;

  return <>
    <Suspense fallback={<div className="website-game-loading"><LoaderCircle className="website-spinner" /><p>Opening your adventure…</p></div>}><GameGate>
      <Game />
    </GameGate></Suspense>
    {isMinigame ? null : <Link className={`website-return${hasGameDock ? ' website-return-above-dock' : ''}`} to="/" aria-label="Return to SATs Legends website"><ArrowLeft size={16} /><span>Website</span></Link>}
  </>;
}
