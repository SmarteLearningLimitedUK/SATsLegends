import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import FamilyAccount, { hasMathariaAccess, useFamily } from '../../website/FamilyAccount';
import ParentAccount from '../../website/ParentAccount';
import GameGate from '../../website/GameGate';
import GameLoadBoundary, { GameLoadingFallback } from '../../components/GameLoadBoundary';
import IOSAccountLayout from './IOSAccountLayout';
import IOSFamilyScreen from './IOSFamilyScreen';
import AppleSubscriptions from './IOSSubscriptionScreen';

const Game = lazy(() => import('../../App'));
const accountPath = (path: string) => /^\/(login|signup|forgot-password|reset-password|auth|parent|subscriptions)(\/|$)/.test(path);
let orientationQueue = Promise.resolve();

export default function IOSAppRoot() {
  return <FamilyAccount><IOSRoutes /></FamilyAccount>;
}
function IOSRoutes() {
  const { pathname } = useLocation(), family = useFamily();
  const playing = !accountPath(pathname) && Boolean(family.session && family.selectedChild && hasMathariaAccess(family.subscriptions, family.complimentary));
  useEffect(() => {
    document.body.classList.remove('legends-website-body');
    document.documentElement.dataset.appOrientation = playing ? 'landscape' : 'portrait';
    if (!Capacitor.isNativePlatform()) return;
    // Serialize native requests so a quick redirect cannot leave an old lock active.
    orientationQueue = orientationQueue.catch(() => {}).then(() => ScreenOrientation.lock({ orientation: playing ? 'landscape' : 'portrait-primary' })).catch(error => console.error('Screen orientation could not be updated', error));
  }, [playing]);
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
