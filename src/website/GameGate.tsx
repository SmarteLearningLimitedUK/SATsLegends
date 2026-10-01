import { Fragment, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { createDefaultPlayer, PLAYER_STORAGE_KEY } from '../app/usePlayerProgression';
import { useProgressionStore } from '../store/useProgressionStore';
import { DEFAULT_AVATAR_ID } from '../assets/characters';
import { hasMathariaAccess, useFamily } from './FamilyAccount';
import { supabase } from './services/supabase';
import { GameSaveContext, ProgressionSnapshot, ProgressSnapshot } from './GameSaveContext';

type SaveRow = { player: Partial<ProgressSnapshot['player']>; progression: Partial<ProgressionSnapshot>; revision: number; last_request_id: string | null };
type Attempt = ProgressSnapshot & { requestId: string };
type Outbox = { revision: number; attempt: Attempt | null; latest: ProgressSnapshot | null };
const outboxKey = (id: string) => `legends-outbox:${id}:matharia`;
function readOutbox(id: string): Outbox | null {
  try { return JSON.parse(localStorage.getItem(outboxKey(id)) || 'null'); } catch { return null; }
}
function GateMessage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="legends-website"><main className="website-container family-main" id="website-main"><h1>{title}</h1>{children}</main></div>;
}
export default function GameGate({ children }: { children: ReactNode }) {
  const family = useFamily();
  const child = family.selectedChild;
  const [loaded, setLoaded] = useState<{ id: string; saved: SaveRow | null; outbox: Outbox | null; conflict: boolean } | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!family.session || !child || !supabase) return;
    let alive = true;
    setError(''); setLoaded(null);
    supabase.from('child_progress').select('player,progression,revision,last_request_id').eq('child_id', child.id).eq('product_code', 'matharia').maybeSingle().then(result => {
      if (!alive) return;
      if (result.error) { setError('Unable to load saved progress. Please try again.'); return; }
      const saved = result.data as SaveRow | null;
      const outbox = readOutbox(child.id);
      if (outbox?.attempt && outbox.attempt.requestId === saved?.last_request_id) {
        outbox.attempt = null; outbox.revision = Number(saved.revision);
      }
      setLoaded({ id: child.id, saved, outbox, conflict: Boolean(outbox && outbox.revision !== Number(saved?.revision ?? 0)) });
    });
    return () => { alive = false; };
  }, [child?.id, family.session?.user.id, reload]);
  useEffect(() => {
    const clock = window.setInterval(() => tick(value => value + 1), 15000);
    const refresh = window.setInterval(() => { if (family.session) void family.refresh(); }, 300000);
    return () => { window.clearInterval(clock); window.clearInterval(refresh); };
  }, [family.refresh, family.session?.user.id]);
  if (!family.configured) {
    if (import.meta.env.DEV || import.meta.env.VITE_ALLOW_GAME_PREVIEW === 'true') return children;
    return <GateMessage title="Your adventure is nearly ready."><p>Parent accounts and subscriptions are being connected. Please check back soon.</p><Link to="/subscriptions" className="website-button website-button-gold">Explore Matharia</Link></GateMessage>;
  }
  if (family.loading || (family.dataLoading && !family.settings)) return <GateMessage title="Opening your adventure…"><p role="status">Loading your family account.</p></GateMessage>;
  if (!family.session) return <Navigate to="/login?next=/parent" replace />;
  if (family.error) return <GateMessage title="Let’s try again."><p role="alert">{family.error}</p><button className="website-button website-button-gold" onClick={() => void family.refresh()}>Reload account</button></GateMessage>;
  if (!hasMathariaAccess(family.subscriptions, family.complimentary)) return <Navigate to="/subscriptions" replace />;
  if (!child) return <Navigate to="/parent" replace />;
  if (error) return <GateMessage title="Let’s reconnect."><p role="alert">{error}</p><button className="website-button website-button-gold" onClick={() => setReload(value => value + 1)}>Try again</button></GateMessage>;
  if (loaded?.id !== child.id) return <GateMessage title="Opening Matharia…"><p role="status">Loading {child.nickname}’s adventure.</p></GateMessage>;
  if (loaded.conflict) return <GateMessage title="Progress was saved on another device."><p>This device also has unsaved progress. Reload the cloud save to continue; this discards this device’s unsaved changes.</p><button className="website-button website-button-gold" onClick={() => { localStorage.removeItem(outboxKey(child.id)); setReload(value => value + 1); }}>Use latest cloud save</button><Link className="website-text-link" to="/parent">Back to parent account</Link></GateMessage>;
  return <Fragment key={`${child.id}:${reload}`}><SavedGame id={child.id} nickname={child.nickname} saved={loaded.saved} pending={loaded.outbox}>{children}</SavedGame></Fragment>;
}

function SavedGame({ id, nickname, saved, pending, children }: { id: string; nickname: string; saved: SaveRow | null; pending: Outbox | null; children: ReactNode }) {
  const initial = pending?.latest ?? pending?.attempt;
  const initialPlayer = useRef(createDefaultPlayer({ ...(initial?.player ?? saved?.player), playerName: nickname }));
  const initialProgression = useRef(initial?.progression ?? saved?.progression);
  const outbox = useRef<Outbox>(pending ?? { revision: Number(saved?.revision ?? 0), attempt: null, latest: null });
  const inFlight = useRef(false);
  const blocked = useRef(false);
  const alive = useRef(true);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(pending ? 'Syncing saved progress…' : 'Progress saved');
  function cache() {
    try {
      if (outbox.current.attempt || outbox.current.latest) localStorage.setItem(outboxKey(id), JSON.stringify(outbox.current));
      else localStorage.removeItem(outboxKey(id));
    } catch { if (alive.current) setStatus('Device storage is full. Keep this page open while progress syncs.'); }
  }
  async function flush() {
    if (inFlight.current || blocked.current || (!outbox.current.attempt && !outbox.current.latest)) return;
    inFlight.current = true;
    if (!outbox.current.attempt && outbox.current.latest) {
      outbox.current.attempt = { ...outbox.current.latest, requestId: crypto.randomUUID() };
      outbox.current.latest = null;
    }
    const sending = outbox.current.attempt!;
    cache();
    if (alive.current) setStatus('Saving progress…');
    try {
      const result = await supabase!.rpc('save_child_progress', {
        target_child: id, game_code: 'matharia', expected_revision: outbox.current.revision, request_id: sending.requestId,
        player_data: sending.player, progression_data: sending.progression,
      });
      if (result.error) {
        if (result.error.message.includes('PROGRESS_CONFLICT')) { blocked.current = true; throw new Error('Another device saved progress. Reopen the game from your account to choose the latest save.'); }
        throw new Error('Saved on this device. Cloud sync will retry when connected.');
      }
      outbox.current.revision = Number(result.data); outbox.current.attempt = null; cache();
      if (alive.current) setStatus(outbox.current.latest ? 'Progress waiting to sync' : 'Progress saved');
    } catch (caught) { if (alive.current) setStatus(caught instanceof Error ? caught.message : 'Unable to sync progress.'); }
    finally {
      inFlight.current = false;
      if (!alive.current && !outbox.current.attempt && outbox.current.latest) void flush();
    }
  }
  function queue(snapshot: ProgressSnapshot) {
    outbox.current.latest = snapshot; cache();
  }
  useLayoutEffect(() => {
    useProgressionStore.persist.setOptions({ name: `sats-legends-save:${id}` });
    const progression = initialProgression.current;
    useProgressionStore.setState({ player: progression?.player ?? { avatarId: initialPlayer.current.avatarId || DEFAULT_AVATAR_ID, level: initialPlayer.current.level, currentXp: initialPlayer.current.xp, totalXpEarned: 0 }, levels: progression?.levels ?? {}, totalStars: progression?.totalStars ?? 0 });
    if (!progression?.levels || !Object.keys(progression.levels).length) useProgressionStore.getState().hydrateFromLegacy({ levelStars: initialPlayer.current.levelStars, completedLevels: initialPlayer.current.completedLevels, playerLevel: initialPlayer.current.level, playerXp: initialPlayer.current.xp });
    setReady(true);
  }, [id]);
  useEffect(() => {
    alive.current = true;
    const online = () => void flush();
    const hide = () => { if (document.visibilityState === 'hidden') void flush(); };
    window.addEventListener('online', online); document.addEventListener('visibilitychange', hide);
    // Stagger the first upload so a shared school start does not synchronize every save.
    let retry: number | null = null;
    const firstSync = window.setTimeout(() => {
      void flush();
      retry = window.setInterval(() => void flush(), 30000);
    }, 1000 + Math.random() * 29000);
    return () => { alive.current = false; window.clearTimeout(firstSync); if (retry !== null) window.clearInterval(retry); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', hide); void flush(); };
  }, [id]);
  if (!ready) return <GateMessage title="Preparing your adventure…"><p role="status">One moment, legend.</p></GateMessage>;
  return <GameSaveContext.Provider value={{ initialPlayer: initialPlayer.current, storageKey: `${PLAYER_STORAGE_KEY}:${id}`, queue }}>{children}<div className="game-save-status" role="status">{status}{status !== 'Progress saved' && <Link to="/parent">Parent account</Link>}</div></GameSaveContext.Provider>;
}
