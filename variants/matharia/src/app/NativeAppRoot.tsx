import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import NativeIdentity from './NativeIdentity';
import { ISLANDS } from '../../../../src/constants';
import { parseRoute } from '../../../../src/app/routeConfig';
import { resolveIslandLevel } from '../../../../src/systems/content/gameDifficulty';
import GameLoadBoundary from '../../../../src/components/GameLoadBoundary';
import { NativeAccessProvider, useNativeAccess } from './NativeAccess';
import { canAccessLevel, FREE_PRACTICE_LEVELS } from './accessPolicy';
import NativeWelcome from './NativeWelcome';
import NativeUpgrade from './NativeUpgrade';
import NativeAccount from './NativeAccount';
import NativeParentGate from './NativeParentGate';

const Game = lazy(() => import('../../../../src/App'));
type Overlay = 'upgrade' | 'account' | 'parent-gate' | null;

export default function NativeAppRoot() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [parentDestination,setParentDestination]=useState<'upgrade'|'account'>('account');
  const openUpgrade = useCallback(() => {setParentDestination('upgrade');setOverlay('parent-gate');}, []);
  const openAccount = useCallback(() => {setParentDestination('account');setOverlay('parent-gate');}, []);
  return <NativeIdentity><NativeAccessProvider openUpgrade={openUpgrade} openAccount={openAccount}>
    <div className="matharia-native-root"><NativeRoutes/>
      {overlay === 'upgrade' && <NativeUpgrade onClose={() => setOverlay(null)} onAccount={openAccount}/>}
      {overlay === 'account' && <NativeAccount onClose={() => setOverlay(null)} onUpgrade={openUpgrade}/>}
      {overlay === 'parent-gate' && <NativeParentGate onClose={()=>setOverlay(null)} onContinue={()=>setOverlay(parentDestination)}/>}
    </div>
  </NativeAccessProvider></NativeIdentity>;
}

function Loading() {
  return <div className="native-loading" role="status"><span/>Opening your adventure…</div>;
}

function NativeRoutes() {
  const { pathname } = useLocation(), navigate = useNavigate(), access = useNativeAccess();
  const route = parseRoute(pathname);
  const island = ISLANDS.find(item => item.id === route.islandId);
  const level = island && route.levelId ? resolveIslandLevel(island, route.levelId) : null;
  const blocked = route.screen === 'gameplay' && island && level && !canAccessLevel(access.fullAccess, island.id, level);
  // App Store access is independent of the shared authentication service.
  const checkingAccess = access.checking;
  const accountRoute = /^\/(login|signup|parent|auth\/callback|subscriptions)(\/|$)/.test(pathname);
  useLayoutEffect(() => {
    document.body.classList.remove('legends-website-body');
    document.documentElement.dataset.nativeExperience = 'game';
    return () => { delete document.documentElement.dataset.nativeExperience; };
  }, []);
  useEffect(() => {
    if (accountRoute) { pathname.startsWith('/subscriptions') ? access.openUpgrade() : access.openAccount(); navigate('/play', { replace: true }); }
  }, [accountRoute, pathname, navigate, access.openAccount, access.openUpgrade]);
  useEffect(() => {
    if (blocked && !checkingAccess) access.openUpgrade();
  }, [Boolean(blocked), checkingAccess, pathname, access.openUpgrade]);
  const first = FREE_PRACTICE_LEVELS[0];
  if (pathname === '/' || route.screen === 'splash' || accountRoute) return <NativeWelcome onStart={() => navigate(`/island/${first.island.id}`)} onAccount={access.openAccount}/>;
  if (blocked) return checkingAccess ? <Loading/> : <main className="native-locked" data-native-route-locked><LockKeyhole size={36}/><h1>This mission is part of the full adventure.</h1><p>The first three practice games are free.</p><button type="button" className="native-primary" onClick={access.openUpgrade}>Explore full access</button><button type="button" className="native-secondary" onClick={() => navigate(`/island/${island.id}`, { replace: true })}>Back to levels</button></main>;
  if (route.screen === 'gameplay' && (!island || !level)) return <Navigate to={`/island/${first.island.id}`} replace/>;
  return <GameLoadBoundary><Suspense fallback={<Loading/>}><Game/></Suspense></GameLoadBoundary>;
}
