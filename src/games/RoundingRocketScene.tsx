import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import launchPad from '../assets/maps/premium/rounding-rocket-launchpad.webp';
import { playRocketCountdownSound, playRocketLaunchSound } from '../audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import './rounding-rocket.css';
import {getVisionObject,getVisionEnvironment} from './visionScene';

export const ROCKET_PART_NAMES = ['Engine', 'Fuel tank', 'Left booster', 'Right booster', 'Guidance module', 'Crew capsule', 'Nose cone', 'Comms antenna'];
type Phase = 'assembly' | 'countdown' | 'launching' | 'orbit';

interface Props {
  installed: number;
  total: number;
  launch: boolean;
  paused: boolean;
  failed: boolean;
  onLaunchComplete: () => void;
}

export default function RoundingRocketScene({ installed, total, launch, paused, failed, onLaunchComplete }: Props) {
  const id = useId().replace(/:/g, '');
  const reducedMotion = Boolean(useReducedMotion());
  const [phase, setPhase] = useState<Phase>('assembly');
  const [countdown, setCountdown] = useState(3);
  const [hidden, setHidden] = useState(document.hidden);
  const [muted, setMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  const elapsed = useRef(0);
  const finished = useRef(false);
  const completion = useRef(onLaunchComplete);
  completion.current = onLaunchComplete;
  const countdownMs = reducedMotion ? 900 : 2400;
  const flightMs = reducedMotion ? 1200 : 7000;
  const stopped = paused || hidden;
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const audio = (event: Event) => setMuted((event as CustomEvent<{ muted: boolean }>).detail?.muted === true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, audio);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, audio); };
  }, []);
  useEffect(() => {
    if (!launch) { elapsed.current = 0; finished.current = false; setPhase('assembly'); setCountdown(3); return; }
    if (stopped || finished.current) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (!stopped && previous !== undefined) elapsed.current += Math.min(100, Math.max(0, now - previous));
      previous = now;
      const time = elapsed.current;
      if (time < countdownMs) {
        setPhase('countdown');
        setCountdown(Math.max(1, 3 - Math.floor(time / (countdownMs / 3))));
      } else if (time < countdownMs + flightMs) setPhase('launching');
      else setPhase('orbit');
      if (time >= countdownMs + flightMs + 1000 && !finished.current) {
        finished.current = true;
        completion.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [launch, stopped, countdownMs, flightMs]);
  useEffect(() => {
    if (phase === 'countdown' && !stopped && !muted) playRocketCountdownSound();
  }, [phase, countdown, stopped, muted]);
  useEffect(() => {
    if (phase !== 'launching' || stopped || muted) return;
    return playRocketLaunchSound(Math.max(.1, (countdownMs + flightMs - elapsed.current) / 1000));
  }, [phase, stopped, muted, countdownMs, flightMs]);

  const metal = `url(#${id}-metal)`;
  const teal = `url(#${id}-teal)`;
  const purple = `url(#${id}-purple)`;
  const parts: React.ReactNode[] = [
    <g><path d="M88 276H132L143 318H77Z" fill={purple}/><path d="M90 291H130L135 318H85Z" fill="#495e75"/><path d="M81 318H139V326H81Z" fill="#e4b868"/><path d="M98 302V317M110 302V317M122 302V317" stroke="#9badb9"/></g>,
    <g><path d="M83 164H137V273Q110 294 83 273Z" fill={teal}/><path d="M84 173H136M84 260H136" stroke="#dfb765" strokeWidth="6"/><path d="M94 183V248" stroke="#b9f5ff" strokeWidth="4"/><path d="M104 204L110 191L116 204L130 208L117 214L110 227L104 214L91 208Z" fill="#ffe6a3" strokeWidth="1"/><circle cx="92" cy="270" r="2" fill="#fff"/><circle cx="128" cy="270" r="2" fill="#fff"/></g>,
    <g><path d="M47 150L60 127L73 150V288L60 303L47 288Z" fill={metal}/><path d="M47 173H73V192H47Z" fill={purple}/><path d="M48 252H72V281H48Z" fill={teal}/><path d="M46 270L27 308H47Z" fill={purple}/><path d="M50 299H70L74 315H46Z" fill="#52687b"/></g>,
    <g><path d="M147 150L160 127L173 150V288L160 303L147 288Z" fill={metal}/><path d="M147 173H173V192H147Z" fill={purple}/><path d="M148 252H172V281H148Z" fill={teal}/><path d="M174 270L193 308H173Z" fill={purple}/><path d="M150 299H170L174 315H146Z" fill="#52687b"/></g>,
    <g><path d="M83 102H137V164H83Z" fill={metal}/><path d="M83 139H137V159H83Z" fill={purple}/><path d="M93 119H127V129H93Z" fill="#234363"/><circle cx="99" cy="124" r="2" fill="#66f2d6"/><path d="M108 123H121" stroke="#66f2d6"/></g>,
    <g><path d="M86 58H134L137 102H83Z" fill={metal}/><circle cx="110" cy="81" r="15" fill={purple}/><circle cx="110" cy="81" r="10" fill="#15344c"/><path d="M104 76L114 86" stroke="#8bebff" strokeWidth="3"/><path d="M85 100H135" stroke="#deb766" strokeWidth="5"/></g>,
    <g><path d="M86 58Q91 26 110 9Q129 26 134 58Z" fill={purple}/><path d="M96 49Q98 33 109 21" stroke="#c8b6fc" strokeWidth="4"/><path d="M86 57H134" stroke="#e8bf64" strokeWidth="5"/></g>,
    <g><path d="M136 116L153 108V81" fill="none" stroke="#ecedf5" strokeWidth="4"/><circle cx="153" cy="76" r="6" fill="#ffe6a3"/><path d="M163 65Q174 76 163 87" fill="none" stroke="#86e9ee"/></g>,
  ];

  return <div className={`rr-scene ${phase !== 'assembly' ? 'rr-scene--cinematic' : ''} ${stopped ? 'rr-scene--paused' : ''}`} data-rocket-phase={phase} style={{ '--rr-flight-duration': `${flightMs}ms` } as React.CSSProperties}>
    <div className={`rr-world ${phase === 'launching' || phase === 'orbit' ? 'rr-world--flying' : ''}`} aria-hidden="true">
      <div className="rr-space"><div className="rr-earth"><svg viewBox="0 0 1000 650" preserveAspectRatio="none"><path d="M115 76L260 35L350 60L377 109L309 132L288 195L217 171L194 225L142 179ZM367 222L420 246L445 297L431 352L397 419L369 339L347 289ZM635 61L706 41L772 70L816 139L748 155L723 211L657 173L601 108ZM717 244L798 219L836 285L813 348L745 321Z" fill="#59b9a3" opacity=".75"/><path d="M80 150Q280 90 445 155M543 229Q723 146 925 215M102 349Q390 279 570 341" fill="none" stroke="#d7f5ff" strokeWidth="18" opacity=".35"/></svg></div><div className="rr-stars"/></div>
      <div className="rr-atmosphere">{['one', 'two', 'three'].map(layer => <svg key={layer} className={`rr-cloud rr-cloud--${layer}`} viewBox="0 0 800 180" preserveAspectRatio="none"><path d="M0 140Q30 90 95 110Q110 45 185 68Q222 0 300 35Q340 5 397 50Q445 30 475 88Q535 45 585 93Q650 62 690 120Q755 96 800 140V180H0Z" fill="#e8f7ff"/><path d="M0 155Q105 125 185 145Q260 100 350 133Q430 104 510 145Q675 110 800 155V180H0Z" fill="#b5dbeec9"/></svg>)}</div>
      <div className="rr-launchpad" style={{ backgroundImage: `url(${getVisionEnvironment('rounding_rocket') || launchPad})` }}><div className="rr-pad-lights"/><div className="rr-steam rr-steam--left"/><div className="rr-steam rr-steam--right"/></div>
      <div className="rr-ground-crew" data-rocket-ground-crew />
    </div>
    <div className={`rr-vehicle-position ${phase === 'launching' || phase === 'orbit' ? 'rr-vehicle-position--flying' : ''}`}>
      <div className={`rr-vehicle ${failed ? 'rr-vehicle--error' : ''}`}>
        <svg viewBox="0 0 220 360" role="img" aria-label={`Rocket: ${installed} of ${total} parts installed`} className="rr-rocket" data-rocket-parts={installed}>
          <defs>
            <linearGradient id={`${id}-metal`}><stop stopColor="#afc2d3"/><stop offset=".35" stopColor="#fff8e8"/><stop offset=".65" stopColor="#eaf0f3"/><stop offset="1" stopColor="#8299b0"/></linearGradient>
            <linearGradient id={`${id}-teal`}><stop stopColor="#24788f"/><stop offset=".4" stopColor="#63e0e8"/><stop offset=".7" stopColor="#29afc6"/><stop offset="1" stopColor="#16637e"/></linearGradient>
            <linearGradient id={`${id}-purple`}><stop stopColor="#38275c"/><stop offset=".4" stopColor="#9a70dc"/><stop offset="1" stopColor="#4d2f82"/></linearGradient>
          </defs>
          {(getVisionObject('rocket') ? <>
            <image href={getVisionObject('rocket')} width="220" height="360" preserveAspectRatio="none" opacity={installed >= total ? 1 : .32}/>
            {installed < total && [[67,272,86,88],[67,128,86,144],[0,128,67,232],[153,128,67,232],[67,96,86,32],[67,48,86,48],[0,0,220,48]].slice(0, installed).map(([x,y,width,height],index)=><g key={index}>
              <defs><clipPath id={`${id}-part-${index}`}><rect x={x} y={y} width={width} height={height}/></clipPath></defs>
              <motion.g initial={reducedMotion ? false : {opacity:0,x:index%2?-30:30}} animate={{opacity:1,x:0}} transition={{duration:.35,ease:'easeOut'}}>
                <image href={getVisionObject('rocket')} width="220" height="360" preserveAspectRatio="none" clipPath={`url(#${id}-part-${index})`}/>
              </motion.g>
            </g>)}
          </> : parts.slice(0, total).map((part, index) => installed > index
            ? <motion.g key={`installed-${index}`} stroke="#173148" strokeWidth="2.5" strokeLinejoin="round" initial={reducedMotion ? { opacity: 0 } : { x: index % 2 ? -130 : 130, y: -30, opacity: 0, rotate: index % 2 ? -12 : 12 }} animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 130, damping: 17 }}>{part}</motion.g>
            : <g key={`blueprint-${index}`} className="rr-blueprint" stroke="#c4efff" strokeWidth="2.5" strokeLinejoin="round">{part}</g>))}
        </svg>
        {phase === 'launching' ? <><div className="rr-exhaust"/><div className="rr-exhaust rr-exhaust--booster-left"/><div className="rr-exhaust rr-exhaust--booster-right"/><div className="rr-smoke-burst"/></> : null}
      </div>
    </div>
    {phase === 'assembly' ? <>
      <ol className="rr-parts-list" aria-label="Rocket assembly">
        {ROCKET_PART_NAMES.slice(0, total).map((name, index) => <li key={name} className={installed > index ? 'rr-part--installed' : installed === index ? 'rr-part--next' : ''}><span aria-hidden="true">{installed > index ? '✓' : index + 1}</span>{name}</li>)}
      </ol>
      <div className="rr-build-status" role="status">{installed}/{total} parts installed <span>Next: {ROCKET_PART_NAMES[Math.min(installed, total - 1)]}</span></div>
    </> : <div className="rr-flight-status" role="status" aria-live="polite"><strong>{phase === 'countdown' ? countdown : phase === 'orbit' ? 'Orbit reached!' : 'Lift-off!'}</strong><span>{phase === 'countdown' ? 'All systems go. Stand by for launch.' : phase === 'orbit' ? 'Rocket built. Mission accomplished.' : 'Through the clouds. Next stop: space.'}</span></div>}
  </div>;
}
