import { lazy, Suspense, useEffect, useState } from 'react';
import { WELLBEING_ORIENTATION_EVENT } from '../../wellbeing/orientation';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { parseRoute } from '../../app/routeConfig';
import { ISLANDS } from '../../constants';
import { allowsAdaptiveGameOrientation, getGameOrientation } from '../../app/gameOrientation';
import FamilyAccount, { hasMathariaAccess, useFamily } from '../../website/FamilyAccount';
import ParentAccount from '../../website/ParentAccount';
import GameGate from '../../website/GameGate';
import GameLoadBoundary, { GameLoadingFallback } from '../../components/GameLoadBoundary';
import IOSAccountLayout from './IOSAccountLayout';
import IOSFamilyScreen from './IOSFamilyScreen';
import AppleSubscriptions from './IOSSubscriptionScreen';

const Game = lazy(() => import('../../App'));
let orientationQueue = Promise.resolve();

export default function IOSAppRoot() {
  return <FamilyAccount><IOSRoutes /></FamilyAccount>;
}
function IOSRoutes() {
  const [landscapeActivity,setLandscapeActivity]=useState(false);
  useEffect(()=>{const update=(event:Event)=>setLandscapeActivity(Boolean((event as CustomEvent<{landscape:boolean}>).detail?.landscape));window.addEventListener(WELLBEING_ORIENTATION_EVENT,update);return()=>window.removeEventListener(WELLBEING_ORIENTATION_EVENT,update);},[]);
  const { pathname } = useLocation(), family = useFamily();
  const playing = parseRoute(pathname).screen === 'gameplay' && Boolean(family.session && family.selectedChild && hasMathariaAccess(family.subscriptions, family.complimentary));
  const route = parseRoute(pathname);
  const level = ISLANDS.find(island => island.id === route.islandId)?.levels.find(item => item.id === route.levelId);
  const adaptiveGame = playing && allowsAdaptiveGameOrientation(level);
  const landscapeGame = (playing && getGameOrientation(level) === 'landscape')
    || (route.screen === 'wellbeing_activity' && landscapeActivity);
  useEffect(() => {
    document.body.classList.remove('legends-website-body');
    document.documentElement.dataset.appOrientation = adaptiveGame ? 'adaptive' : landscapeGame ? 'landscape-required' : 'portrait';
    if (!Capacitor.isNativePlatform()) return;
    // Serialize native requests so a quick redirect cannot leave an old lock active.
    // Let the learner physically turn the phone. App's shared orientation gate
    // pauses a portrait game instead of forcing the UI sideways on entry.
    orientationQueue = orientationQueue.catch(() => {}).then(() => landscapeGame || adaptiveGame
      ? ScreenOrientation.unlock()
      : ScreenOrientation.lock({ orientation: 'portrait-primary' })).catch(error => console.error('Screen orientation could not be updated', error));
  }, [landscapeGame,adaptiveGame]);
  return <Routes>
    <Route path="/login" element={<ParentAccount mode="login" />} />
    <Route path="/signup" element={<ParentAccount mode="signup" />} />
    <Route path="/forgot-password" element={<ParentAccount mode="forgot" />} />
    <Route path="/reset-password" element={<ParentAccount mode="reset" />} />
    <Route path="/auth/callback" element={<AccountCallback />} />
    <Route path="/parent/*" element={<IOSFamilyScreen />} />
    <Route path="/subscriptions" element={<IOSAccountLayout title="Matharia access"><AppleSubscriptions embedded /></IOSAccountLayout>} />
    <Route path="/" element={<Navigate to="/parent" replace />} />
    <Route path="*" element={<GameLoadBoundary><Suspense fallback={<GameLoadingFallback message="Opening Matharia…" />}><GameGate><Game /></GameGate></Suspense></GameLoadBoundary>} />
  </Routes>;
}
function AccountCallback() {
  const family = useFamily();
  if (family.recovery) return <Navigate to="/reset-password" replace />;
  if (family.session) return <Navigate to="/parent" replace />;
  return <IOSAccountLayout title={family.loading ? 'Confirming your account…' : 'Continue in SATs Legends'}><p role="status">{family.loading ? 'Please wait.' : 'Return to sign in after confirming your email.'}</p><a href="/login">Sign in</a></IOSAccountLayout>;
}
