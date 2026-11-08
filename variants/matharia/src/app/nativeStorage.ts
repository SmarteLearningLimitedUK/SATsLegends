import { Capacitor } from '@capacitor/core';
import {resetLearningState,LEARNING_CONSENT_KEY} from '../../../../src/systems/learning/learningStorage';
import {resetLearningSupport} from '../../../../src/systems/learning/learningSupport';

export const NATIVE_AUTH_KEY = 'matharia-ios-auth-v1';
export const NATIVE_PLAYER_KEY = 'matharia-ios-player-v1';
export const NATIVE_PROGRESSION_KEY = 'matharia-ios-progression-v1';
// Existing native device saves are retained once. A browser preview never
// imports the website's local progress into the independent app.
export function migrateNativeDeviceSaves() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let child: string | null = null;
    try {
      const parent = JSON.parse(localStorage.getItem(NATIVE_AUTH_KEY) ?? 'null')?.user?.id;
      const selected = parent && sessionStorage.getItem(`legends-child:${parent}`);
      if (typeof selected === 'string' && /^[a-f0-9-]{36}$/i.test(selected)) child = selected;
    } catch { /* A damaged identity must not discard a valid guest save. */ }
    for (const [previous, current] of [['maths_quest_player_v2', NATIVE_PLAYER_KEY], ['sats-legends-save', NATIVE_PROGRESSION_KEY]]) {
      if (localStorage.getItem(current)) continue;
      // Preserve an already cached native profile, without downloading website
      // progress or continuing its former cloud-sync queue.
      for (const key of [...(child ? [`${previous}:${child}`] : []), previous]) {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        try { JSON.parse(saved); } catch { continue; }
        localStorage.setItem(current, saved); break;
      }
    }
    // Preserve only the native device's completed paper history.
    if(!localStorage.getItem('matharia-ios-paper-results-v2')){
      const previous=localStorage.getItem('sats-legends-mock-results-v1');
      if(previous){try{JSON.parse(previous);localStorage.setItem('matharia-ios-paper-results-v2',previous);}catch{/* Ignore invalid history. */}}
    }
    for(const oldKey of Object.keys(sessionStorage)){
      if(!oldKey.startsWith('sats-legends-mock-checkpoint-v4:'))continue;
      const nextKey=oldKey.replace('sats-legends-mock-checkpoint-v4:','matharia-ios-paper-checkpoint-v2:');
      if(!sessionStorage.getItem(nextKey))sessionStorage.setItem(nextKey,sessionStorage.getItem(oldKey)!);
    }

  } catch { /* A damaged legacy save must not prevent the app from opening. */ }
}
export function clearNativeDeviceProgress() {
  resetLearningState();resetLearningSupport();localStorage.removeItem(LEARNING_CONSENT_KEY);
  localStorage.removeItem(NATIVE_PLAYER_KEY);
  localStorage.removeItem(NATIVE_PROGRESSION_KEY);
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (/^matharia-ios-(?:learning|support|paper|quest|learner)/.test(key)) storage.removeItem(key);
      // Previous native versions used the shared paper key. Never leave pupil
      // answers/working behind after deleting native progress.
      if (Capacitor.isNativePlatform() && /^sats-legends-mock-(?:results|checkpoint)-/.test(key)) storage.removeItem(key);
    }
  }
  // Remove obsolete native copies as well so the next launch cannot migrate
  // deleted progress back in. These keys live in the native app's own origin.
  if (Capacitor.isNativePlatform()) {
    localStorage.removeItem('maths_quest_player_v2');
    localStorage.removeItem('sats-legends-save');
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('maths_quest_player_v2:') || key.startsWith('sats-legends-save:') || (key.startsWith('legends-outbox:') && key.endsWith(':matharia'))) localStorage.removeItem(key);
    }
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('legends-child:')) sessionStorage.removeItem(key);
  }
}
