import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    {isMinigame ? null : <WebsiteReturn screen={gameScreen} hasGameDock={hasGameDock} />}
  </>;
}

function WebsiteReturn({ screen, hasGameDock }: { screen: string; hasGameDock: boolean }) {
  const [mapDock, setMapDock] = useState<HTMLElement | null>(null);
  const [narrowLandscape, setNarrowLandscape] = useState(() => window.matchMedia('(max-width: 699px) and (orientation: landscape)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 699px) and (orientation: landscape)');
    const update = () => setNarrowLandscape(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (screen !== 'world_map') return;
    const findDock = () => {
      const nextDock = document.querySelector<HTMLElement>('.legend-map-dock > div');
      setMapDock(current => current === nextDock ? current : nextDock);
    };
    findDock();
    const observer = new MutationObserver(findDock);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [screen]);

  if (screen === 'world_map' && mapDock && !narrowLandscape) {
    return createPortal(<Link className="legend-map-dock-button website-map-dock-return" to="/" aria-label="Return to SATs Legends website"><ArrowLeft className="legend-map-dock-icon" /><span>Website</span></Link>, mapDock);
  }
  return <Link className={`website-return${screen === 'world_map' && !narrowLandscape ? ' website-return-map-dock' : hasGameDock ? ' website-return-beside-dock' : ''}`} to="/" aria-label="Return to SATs Legends website"><ArrowLeft size={16} /><span>Website</span></Link>;
}
