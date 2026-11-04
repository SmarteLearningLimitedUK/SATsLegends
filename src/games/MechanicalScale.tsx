import { useContext, useEffect, useId, type RefObject, type ReactNode } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { VisionSceneContext } from './visionScene';
import scaleHousingArtwork from '../assets/game-visions/instruments/scale-housing-v1.png';

interface Props {
  grams: number;
  target: number;
  paused: boolean;
  broken: boolean;
  dropRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/** The tray responds to the load; the digital display reports the exact mass. */
export default function MechanicalScale({ grams, target, paused, broken, dropRef, children }: Props) {
  const reducedMotion = useReducedMotion();
  const scene = useContext(VisionSceneContext);
  const frozen = paused || scene.paused;
  const id = useId().replaceAll(':', '');
  const load = useSpring(0, { stiffness: 180, damping: 18, mass: .9 });
  const ratio = Math.min(2, grams / Math.max(1, target));
  useEffect(() => {
    if (frozen) { load.jump(load.get()); return; }
    if (reducedMotion) load.jump(ratio); else load.set(ratio);
  }, [frozen, load, ratio, reducedMotion]);
  const tray = useTransform(load, value => Math.max(-2, Math.min(24, value * 12)));
  const springCompression = useTransform(tray, value => Math.max(.4, 1 - value / 30));
  const trayBottom = useTransform(tray, value => `${100 - (118 + value) / 400 * 100}%`);
  return <div className="conversion-scale-frame mechanical-scale" data-conversion-scale data-conversion-target={target} data-conversion-broken={broken} data-scale-load-ratio={ratio}>
    <svg viewBox="0 0 360 400" className="conversion-scale-art" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-steel`} x2="1" y2="1"><stop stopColor="#dff4f5"/><stop offset=".24" stopColor="#87acba"/><stop offset=".49" stopColor="#ecf7f2"/><stop offset=".56" stopColor="#618793"/><stop offset="1" stopColor="#284958"/></linearGradient>
      </defs>
      <ellipse cx="180" cy="384" rx="135" ry="10" fill="#071b2c66"/>
      <rect x="161" y="142" width="38" height="52" rx="6" fill={`url(#${id}-steel)`} stroke="#25485a" strokeWidth="3"/>
      <motion.g style={{ scaleY: springCompression, originX: '180px', originY: '181px', transformBox: 'view-box' }} data-scale-spring>
        <path d="M154 148L206 153L154 159L206 165L154 171L206 177L154 181" fill="none" stroke="#182f3b" strokeWidth="8" strokeLinecap="round"/>
        <path d="M154 147L206 152L154 158L206 164L154 170L206 176L154 180" fill="none" stroke={`url(#${id}-steel)`} strokeWidth="4" strokeLinecap="round"/>
      </motion.g>
      <image href={scaleHousingArtwork} x="42" y="131" width="276" height="276" />
      <circle data-scale-dial cx="180" cy="265" r="64" fill="#102d3d" stroke="#d4aa66" strokeWidth="3"/>
      <motion.g style={{ y: tray }} data-scale-pan>
        <rect x="169" y="139" width="22" height="32" rx="4" fill={`url(#${id}-steel)`} stroke="#345565" strokeWidth="2"/>
        <ellipse cx="180" cy="120" rx="158" ry="17" fill="#a3c2ca" stroke="#e6efdd" strokeWidth="4"/>
        <path d="M22 120Q180 151 338 120L323 147Q180 177 37 147Z" fill={`url(#${id}-steel)`} stroke="#345362" strokeWidth="3"/>
        <path d="M22 120Q180 151 338 120" fill="none" stroke="#f5f7e8" strokeWidth="5"/>
        <path d="M43 143Q180 165 315 142" fill="none" stroke="#183949" strokeOpacity=".55" strokeWidth="3"/>
      </motion.g>
    </svg>
    <motion.div ref={dropRef} className="conversion-load-tray" data-conversion-tray style={{ bottom: trayBottom }}>{children}</motion.div>
    <div className="conversion-load-meter" data-conversion-load={grams} role="status" aria-live="polite"><span>{broken ? 'Overload: reset' : 'Measured load'}</span><strong>{grams.toLocaleString()} g</strong></div>
  </div>;
}
