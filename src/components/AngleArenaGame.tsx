import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import GameActionDock from './GameActionDock';
import GameplayHUD from './GameplayHUD';
import { Crosshair, Sparkles, Star, Target } from './GameIcons';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type RoundType = 'direct' | 'straight' | 'triangle' | 'around' | 'boss';
type Lane = 'low' | 'mid' | 'high';
type Theme = 'emerald' | 'sky' | 'amber' | 'cyan';

interface AngleRound {
  type: RoundType;
  prompt: string;
  sublabel: string;
  targetAngle: number;
  lane: Lane;
  theme: Theme;
  label: string;
  bounty: number;
  boss?: boolean;
}

interface FlightState {
  x: string[];
  y: string[];
  rotate: number[];
}

const MAX_HEARTS = 4;
const ORIGIN = { x: 18, y: 78 };
const TOTAL_ROUNDS = [0, 5, 5, 6, 6];
const LANE_POS: Record<Lane, { x: number; y: number }> = {
  low: { x: 76, y: 60 },
  mid: { x: 77, y: 48 },
  high: { x: 80, y: 34 },
};
const THEMES: Record<Theme, { glow: string; crystal: string; chip: string }> = {
  emerald: { glow: 'rgba(74,222,128,0.3)', crystal: 'linear-gradient(180deg,#bbf7d0,#4ade80 45%,#15803d)', chip: 'bg-emerald-500/18 border-emerald-200/28 text-emerald-50' },
  sky: { glow: 'rgba(56,189,248,0.3)', crystal: 'linear-gradient(180deg,#bae6fd,#38bdf8 42%,#0369a1)', chip: 'bg-sky-500/18 border-sky-200/28 text-sky-50' },
  amber: { glow: 'rgba(251,191,36,0.3)', crystal: 'linear-gradient(180deg,#fde68a,#f59e0b 46%,#c2410c)', chip: 'bg-amber-500/18 border-amber-200/28 text-amber-50' },
  cyan: { glow: 'rgba(34,211,238,0.3)', crystal: 'linear-gradient(180deg,#cffafe,#22d3ee 45%,#0f766e)', chip: 'bg-cyan-500/18 border-cyan-200/28 text-cyan-50' },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const choose = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

const createRound = (levelId: number, roundNumber: number, totalRounds: number): AngleRound => {
  if (roundNumber === totalRounds) {
    return {
      type: 'boss',
      prompt: 'Stone Geometry Golem',
      sublabel: 'Boss shield: solve x + 70° = 180°, then launch at x°.',
      targetAngle: 110,
      lane: 'mid',
      theme: 'amber',
      label: 'Boss Core',
      bounty: 260,
      boss: true,
    };
  }

  const builders = levelId <= 1 ? ['direct', 'direct', 'straight'] : levelId === 2 ? ['direct', 'straight', 'triangle'] : ['direct', 'straight', 'triangle', 'around'];
  const type = choose(builders) as RoundType;

  if (type === 'direct') {
    const angle = choose([45, 60, 75, 90, 120, 135].filter((item) => item <= (levelId <= 1 ? 120 : 135)));
    return { type, prompt: `Launch at ${angle}°`, sublabel: 'Pull the protractor sling until the launch angle matches the target.', targetAngle: angle, lane: choose(['low', 'mid', 'high']), theme: choose(['emerald', 'sky', 'amber', 'cyan']), label: choose(['Triangle Tower', 'Rune Bastion', 'Crystal Lock']), bounty: 130 + (levelId * 20) };
  }
  if (type === 'straight') {
    const known = choose([40, 50, 60, 70, 80, 90, 110, 120, 130]);
    return { type, prompt: 'Angles on a straight line', sublabel: `Solve x + ${known}° = 180°, then launch at x°.`, targetAngle: 180 - known, lane: choose(['mid', 'high']), theme: choose(['sky', 'amber', 'cyan']), label: 'Line Lock', bounty: 150 + (levelId * 22) };
  }
  if (type === 'triangle') {
    const [a, b] = choose([[40, 50], [35, 65], [55, 45], [30, 70]]);
    return { type, prompt: 'Missing angle in a triangle', sublabel: `Find x in ${a}° + ${b}° + x = 180°, then fire.`, targetAngle: 180 - a - b, lane: choose(['low', 'mid']), theme: choose(['emerald', 'cyan', 'amber']), label: 'Triangle Seal', bounty: 160 };
  }
  const [a, b] = choose([[120, 80], [140, 90], [110, 95], [150, 70]]);
  return { type, prompt: 'Angles around a point', sublabel: `Solve x in ${a}° + ${b}° + x = 360°, then launch.`, targetAngle: 360 - a - b, lane: choose(['mid', 'high']), theme: choose(['sky', 'emerald', 'cyan']), label: 'Compass Ring', bounty: 170 };
};

const buildFlight = (aimAngle: number, power: number, lane: Lane, hit: boolean, boss = false): FlightState => {
  const target = boss ? { x: 74, y: 38 } : LANE_POS[lane];
  const launchHeight = clamp(22 + (aimAngle * 0.34) + (power * 22), 24, 74);
  const landing = hit ? target : aimAngle < 90 ? { x: target.x - 11, y: target.y + 16 } : { x: target.x + 10, y: target.y - 10 };
  return {
    x: [`${ORIGIN.x}%`, '34%', '54%', `${landing.x}%`],
    y: [`${ORIGIN.y}%`, `${ORIGIN.y - launchHeight * 0.42}%`, `${ORIGIN.y - launchHeight}%`, `${landing.y}%`],
    rotate: [0, -16, 8, hit ? 0 : 18],
  };
};

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({ levelId, avatarId, onVictory, onGameOver, onBack }) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = TOTAL_ROUNDS[levelId] || 6;
  const targetScore = 760 + (levelId * 230);
  const tolerance = Math.max(4, 10 - levelId);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(72 + (levelId * 9));
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<AngleRound>(() => createRound(levelId, 1, totalRounds));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [aimAngle, setAimAngle] = useState(58);
  const [pullStrength, setPullStrength] = useState(68);
  const [dragging, setDragging] = useState(false);
  const [reticle, setReticle] = useState({ x: ORIGIN.x + 12, y: ORIGIN.y - 18 });
  const [flight, setFlight] = useState<FlightState | null>(null);
  const [feedback, setFeedback] = useState<null | { hit: boolean; title: string; subtitle: string }>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);
  const power = clamp(pullStrength / 100, 0.38, 1);

  const updateAimFromClientPoint = (clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const dx = x - ORIGIN.x;
    const dy = ORIGIN.y - y;

    setAimAngle(clamp(roundToStep((Math.atan2(dy, dx) * 180) / Math.PI, levelId >= 3 ? 5 : 10), 25, 150));
    setPullStrength(clamp(Math.round(Math.sqrt(dx * dx + dy * dy) * 2.4), 40, 100));
    setReticle({ x: clamp(x, 10, 88), y: clamp(y, 18, 84) });
  };

  useEffect(() => {
    setScore(0);
    setTimeLeft(72 + (levelId * 9));
    setRoundNumber(1);
    setRound(createRound(levelId, 1, totalRounds));
    setHearts(MAX_HEARTS);
    setCombo(0);
    setAimAngle(58);
    setPullStrength(68);
    setDragging(false);
    setReticle({ x: ORIGIN.x + 12, y: ORIGIN.y - 18 });
    setFlight(null);
    setFeedback(null);
    setIsLaunching(false);
    setIsVictory(false);
    setIsGameOver(false);
    dragPointerIdRef.current = null;
  }, [levelId, totalRounds]);

  useEffect(() => {
    if (isGameOver || isVictory || isLaunching) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isGameOver, isLaunching, isVictory, onGameOver, score]);

  useEffect(() => {
    if (!dragging) return undefined;
    const handleMove = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return;
      updateAimFromClientPoint(event.clientX, event.clientY);
    };
    const handleRelease = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return;
      dragPointerIdRef.current = null;
      setDragging(false);
      if (!isLaunching && !isGameOver && !isVictory) launchShot();
    };
    const handleCancel = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return;
      dragPointerIdRef.current = null;
      setDragging(false);
    };
    const handleWindowBlur = () => {
      dragPointerIdRef.current = null;
      setDragging(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [dragging, isGameOver, isLaunching, isVictory, levelId]);

  const previewDots = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const step = (index + 1) / 7;
    return {
      x: ORIGIN.x + (step * 42) + (power * 6),
      y: ORIGIN.y - (Math.sin(step * Math.PI) * (aimAngle * 0.22 + power * 16)) - (step * 8),
      scale: 1 - (index * 0.1),
    };
  }), [aimAngle, power]);

  const finishGame = (updatedScore: number) => {
    setIsVictory(true);
    const stars = updatedScore >= targetScore * 1.45 && hearts >= 3 ? 3 : updatedScore >= targetScore && hearts >= 2 ? 2 : 1;
    confetti({ particleCount: 170, spread: 68, origin: { y: 0.56 }, colors: ['#fcd34d', '#38bdf8', '#ffffff'] });
    onVictory(stars, updatedScore);
  };

  const queueNextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      finishGame(updatedScore);
      return;
    }
    window.setTimeout(() => {
      const nextRound = roundNumber + 1;
      setRoundNumber(nextRound);
      setRound(createRound(levelId, nextRound, totalRounds));
      setFlight(null);
      setFeedback(null);
      setIsLaunching(false);
      setReticle({ x: ORIGIN.x + 12, y: ORIGIN.y - 18 });
    }, 900);
  };

  const loseHeart = (difference: number) => {
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setCombo(0);
    setFeedback({ hit: false, title: 'Missed Shot', subtitle: `You were ${difference}° away.` });
    if (nextHearts <= 0) {
      window.setTimeout(() => {
        setIsGameOver(true);
        onGameOver(score);
      }, 720);
      return;
    }
    window.setTimeout(() => {
      setFeedback(null);
      setFlight(null);
      setIsLaunching(false);
    }, 820);
  };

  const launchShot = () => {
    if (isLaunching || isGameOver || isVictory) return;
    const difference = Math.abs(aimAngle - round.targetAngle);
    const hit = difference <= tolerance;
    setIsLaunching(true);
    setFlight(buildFlight(aimAngle, power, round.lane, hit, Boolean(round.boss)));
    window.setTimeout(() => {
      if (!hit) {
        triggerHaptic('warning');
        loseHeart(difference);
        return;
      }
      triggerHaptic('success');
      const points = round.bounty + (combo * 26) + Math.max(0, 60 - difference * 8);
      const updatedScore = score + points;
      setScore(updatedScore);
      setCombo((previous) => previous + 1);
      setFeedback({ hit: true, title: round.boss ? 'Core Broken' : 'Fort Cracked', subtitle: `+${points} points` });
      confetti({ particleCount: round.boss ? 90 : 56, spread: round.boss ? 60 : 48, origin: { x: 0.75, y: 0.4 }, colors: ['#38bdf8', '#fcd34d', '#ffffff'] });
      queueNextRound(updatedScore);
    }, 760);
  };

  const theme = THEMES[round.theme];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#102a55_0%,#1d4ed8_34%,#0f172a_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[9%] h-24 w-44 rounded-full bg-white/18 blur-2xl md:h-32 md:w-56" />
        <div className="absolute right-[6%] top-[14%] h-24 w-36 rounded-full bg-white/18 blur-2xl md:h-28 md:w-44" />
        <div className="absolute inset-x-[28%] top-[8%] h-20 rounded-full bg-cyan-300/14 blur-3xl" />
        <div className="absolute bottom-[14%] left-[-6%] h-44 w-[46%] rounded-full bg-emerald-500/24 blur-3xl" />
        <div className="absolute bottom-[12%] right-[-8%] h-44 w-[48%] rounded-full bg-lime-400/18 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(34,197,94,0),rgba(21,128,61,0.84)_30%,rgba(20,83,45,0.98)_100%)]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD title="Angle Siege" avatar={avatar} score={score} targetScore={targetScore} timeLeft={timeLeft} progress={progress} compact accentText="text-sky-950" accentSoftBg="bg-sky-100/88" accentBorder="border-sky-200/88" progressBar="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-400" statLabel="Round" statValue={`${roundNumber}/${totalRounds}`} />
        </div>

        <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl flex-1 min-h-0 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(7,18,32,0.16),rgba(7,18,32,0.38))] shadow-[0_28px_70px_rgba(2,6,23,0.28)] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_18%,rgba(15,23,42,0.24))]" />
          <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:left-5 md:top-5 md:px-4">{Array.from({ length: MAX_HEARTS }).map((_, index) => <div key={index} className={`h-5 w-5 rounded-full md:h-6 md:w-6 ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'}`} />)}</div>
          <div className="absolute right-4 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-4 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:right-5 md:top-5"><Sparkles className="h-4 w-4 text-cyan-200 md:h-5 md:w-5" /><span className="text-sm font-black uppercase tracking-[0.14em] text-white md:text-base">Combo x{Math.max(combo, 1)}</span></div>

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
              <div className="max-w-[92%] rounded-[1.4rem] border border-amber-200/22 bg-[linear-gradient(180deg,rgba(251,146,60,0.96),rgba(194,65,12,0.98))] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_30px_rgba(120,53,15,0.24)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-50 md:text-[2rem]">{round.prompt}</div>
                <div className="mt-1 text-[0.78rem] font-bold text-amber-100/90 md:text-sm">{round.sublabel}</div>
              </div>
            </div>

            <div ref={arenaRef} className="relative mt-4 flex min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.12))] md:rounded-[2rem]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[8%] bottom-[12%] h-[20%] w-[28%] rounded-[2rem] bg-[linear-gradient(180deg,rgba(148,163,184,0.22),rgba(51,65,85,0.3))]" />
                <div className="absolute right-[8%] bottom-[12%] h-[28%] w-[30%] rounded-[2rem] bg-[linear-gradient(180deg,rgba(148,163,184,0.22),rgba(51,65,85,0.3))]" />
                <div className="absolute left-[16%] bottom-[36%] h-20 w-3 rounded-full bg-[linear-gradient(180deg,#d1d5db,#6b7280)]" />
                <div className="absolute left-[22%] bottom-[36%] h-24 w-3 rounded-full bg-[linear-gradient(180deg,#d1d5db,#6b7280)]" />
                <div className="absolute right-[16%] bottom-[36%] h-20 w-3 rounded-full bg-[linear-gradient(180deg,#d1d5db,#6b7280)]" />
                <div className="absolute right-[22%] bottom-[36%] h-24 w-3 rounded-full bg-[linear-gradient(180deg,#d1d5db,#6b7280)]" />
              </div>

              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                <defs><linearGradient id="angleArc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#fcd34d" /></linearGradient></defs>
                <path d={`M ${ORIGIN.x}% ${ORIGIN.y}% Q ${ORIGIN.x + 18}% ${clamp(ORIGIN.y - aimAngle * 0.4, 10, 70)}% ${ORIGIN.x + 34}% ${clamp(ORIGIN.y - aimAngle * 0.2, 14, 72)}%`} stroke="url(#angleArc)" strokeWidth="1.1%" fill="none" strokeLinecap="round" opacity="0.95" />
              </svg>

              {previewDots.map((dot, index) => <div key={`${dot.x}-${index}`} className="pointer-events-none absolute rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.42)]" style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: `${8 * dot.scale}px`, height: `${8 * dot.scale}px`, opacity: 0.8 - index * 0.1 }} />)}

              <div className="absolute right-[8%] bottom-[12%] top-[18%] w-[32%]">
                {!round.boss && <div className={`absolute right-[10%] top-[8%] rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${theme.chip}`}>{round.label}</div>}
                {round.boss ? (
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div className="absolute inset-x-[20%] top-[8%] h-16 rounded-full bg-amber-300/20 blur-3xl" />
                    <div className="absolute left-1/2 top-[12%] h-20 w-20 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#cbd5e1,#64748b_60%,#1e293b)] shadow-[0_16px_26px_rgba(0,0,0,0.26)] md:h-28 md:w-28" />
                    <div className="absolute left-[24%] top-[26%] h-20 w-20 rounded-[2rem] bg-[linear-gradient(180deg,#475569,#1e293b)] rotate-[-12deg]" />
                    <div className="absolute right-[24%] top-[26%] h-20 w-20 rounded-[2rem] bg-[linear-gradient(180deg,#475569,#1e293b)] rotate-[12deg]" />
                    <div className="absolute left-[30%] top-[26%] h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                    <div className="absolute right-[30%] top-[26%] h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                    <div className="absolute left-1/2 top-[44%] h-20 w-32 -translate-x-1/2 rounded-[2rem] bg-[linear-gradient(180deg,#64748b,#334155)] shadow-[0_18px_24px_rgba(0,0,0,0.28)] md:h-24 md:w-40" />
                    <div className={`absolute left-1/2 top-[50%] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 ${feedback?.hit ? 'border-emerald-200 bg-emerald-400/20' : 'border-cyan-200 bg-cyan-400/18'} shadow-[0_0_28px_rgba(34,211,238,0.35)] md:h-20 md:w-20`}>
                      <span className="text-2xl font-black text-amber-50 md:text-3xl">{round.targetAngle}°</span>
                    </div>
                    <div className="absolute bottom-[4%] left-1/2 flex h-20 w-40 -translate-x-1/2 items-center justify-center rounded-[1.8rem] bg-[linear-gradient(180deg,#7c3f13,#4a2510)] shadow-[0_18px_24px_rgba(0,0,0,0.24)] md:h-24 md:w-48"><span className="text-[1.8rem] font-black text-amber-50 drop-shadow-[0_3px_0_rgba(60,30,12,0.75)] md:text-[2.4rem]">{round.targetAngle}°</span></div>
                  </div>
                ) : (
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div className="absolute inset-x-[20%] top-[12%] h-16 rounded-full blur-3xl" style={{ backgroundColor: theme.glow }} />
                    <div className="absolute bottom-[16%] flex w-[52%] flex-col items-center gap-1.5">
                      <div className="flex gap-1.5"><div className="h-16 w-14 rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,#d6d3d1,#a8a29e_42%,#78716c_100%)] shadow-[0_12px_18px_rgba(0,0,0,0.18)]" /><div className="h-16 w-14 rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,#d6d3d1,#a8a29e_42%,#78716c_100%)] shadow-[0_12px_18px_rgba(0,0,0,0.18)]" /></div>
                      <div className="relative flex h-20 w-full items-center justify-center rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,#a8a29e,#78716c)] shadow-[0_14px_18px_rgba(0,0,0,0.18)] md:h-24"><div className="text-[1.8rem] font-black text-emerald-50 drop-shadow-[0_3px_0_rgba(60,30,12,0.75)] md:text-[2.2rem]">{round.targetAngle}°</div></div>
                      <div className={`relative h-20 w-20 rounded-[1.5rem] border-2 ${feedback?.hit ? 'scale-95 opacity-70' : ''}`} style={{ background: theme.crystal, borderColor: 'rgba(255,255,255,0.38)', boxShadow: `0 0 30px ${theme.glow}` }}><div className="absolute inset-[10%] rounded-[1.1rem] border border-white/26" /></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute left-[8%] bottom-[8%] z-20 w-[26%] max-w-[12rem]">
                <button type="button" onPointerDown={(event) => {
                  if (isLaunching || isGameOver || isVictory) return;
                  event.preventDefault();
                  dragPointerIdRef.current = event.pointerId;
                  setDragging(true);
                  updateAimFromClientPoint(event.clientX, event.clientY);
                }} className="relative aspect-[1/1.08] w-full touch-none rounded-[2.2rem] bg-transparent">
                  <div className="absolute bottom-[2%] left-1/2 h-6 w-[64%] -translate-x-1/2 rounded-full bg-cyan-300/16 blur-2xl" />
                  <div className="absolute bottom-[8%] left-[34%] h-[50%] w-[11%] rounded-full bg-[linear-gradient(180deg,#8b5e34,#4a2d18)] shadow-[0_10px_16px_rgba(0,0,0,0.24)]" />
                  <div className="absolute bottom-[12%] left-[56%] h-[44%] w-[11%] rounded-full bg-[linear-gradient(180deg,#8b5e34,#4a2d18)] shadow-[0_10px_16px_rgba(0,0,0,0.24)]" />
                  <div className="absolute bottom-[28%] left-[38%] h-[3px] w-[22%] origin-left bg-amber-100/72" style={{ transform: `rotate(${-aimAngle * 0.72}deg)` }} />
                  <div className="absolute bottom-[34%] left-[38%] h-[3px] w-[24%] origin-left bg-amber-100/72" style={{ transform: `rotate(${aimAngle * 0.34}deg)` }} />
                  <motion.div animate={{ x: [0, -2, 0], y: [0, 2, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-[34%] bottom-[24%] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/70 bg-[radial-gradient(circle_at_30%_30%,#cffafe,#22d3ee_55%,#1d4ed8_100%)] shadow-[0_10px_16px_rgba(0,0,0,0.26)] md:h-14 md:w-14" style={{ transform: `translate(${-pullStrength * 0.12}px, ${pullStrength * 0.06}px)` }}><Target className="h-5 w-5 text-cyan-950" /></motion.div>
                  <div className="absolute bottom-[0%] left-[20%] flex h-[40%] w-[60%] items-center justify-center rounded-[999px] border border-cyan-100/18 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.24),rgba(34,211,238,0.04))]"><div className="relative h-[72%] w-[72%] rounded-full border-2 border-amber-100/70"><div className="absolute inset-[10%] rounded-full border border-white/28" /><div className="absolute left-1/2 top-[4%] h-[92%] w-[2px] -translate-x-1/2 bg-white/40" /><div className="absolute left-[4%] top-1/2 h-[2px] w-[92%] -translate-y-1/2 bg-white/40" /></div></div>
                </button>
              </div>

              <div className="absolute left-[40%] bottom-[10%] z-20 rounded-full border border-white/12 bg-slate-950/48 px-4 py-2 text-center shadow-[0_12px_24px_rgba(2,6,23,0.24)]"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/72 md:text-xs">Aim / Power</div><div className="mt-1 text-lg font-black text-white md:text-2xl">{aimAngle}° / {pullStrength}%</div></div>

              <AnimatePresence>{flight && <motion.div initial={{ left: flight.x[0], top: flight.y[0], rotate: 0, scale: 1 }} animate={{ left: flight.x, top: flight.y, rotate: flight.rotate, scale: [1, 1.05, 0.96, feedback?.hit ? 0.7 : 1] }} exit={{ opacity: 0 }} transition={{ duration: 0.72, ease: 'easeInOut' }} className="absolute z-30 flex h-10 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[999px] border border-white/70 bg-[linear-gradient(180deg,#dbeafe,#60a5fa_52%,#2563eb)] shadow-[0_18px_24px_rgba(0,0,0,0.28)] md:h-12 md:w-20"><div className="absolute right-[10%] h-4 w-4 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.45)] md:h-5 md:w-5" /><div className="absolute left-[14%] h-3 w-6 rounded-[999px] bg-white/80 md:h-4 md:w-8" /></motion.div>}</AnimatePresence>
              <AnimatePresence>{feedback && <motion.div initial={{ opacity: 0, scale: 0.78, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.08 }} className="absolute inset-x-0 top-[12%] z-30 flex flex-col items-center"><div className={`rounded-full border px-4 py-2 text-lg font-black uppercase tracking-[0.2em] shadow-[0_18px_28px_rgba(0,0,0,0.28)] md:text-2xl ${feedback.hit ? 'border-lime-200/50 bg-lime-400/18 text-lime-50' : 'border-rose-200/40 bg-rose-500/18 text-rose-50'}`}>{feedback.title}</div><div className="mt-2 rounded-full border border-white/12 bg-slate-950/50 px-4 py-1 text-sm font-bold text-white md:text-lg">{feedback.subtitle}</div></motion.div>}</AnimatePresence>
              {!dragging && <motion.div className="pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block" animate={{ x: `${reticle.x}%`, y: `${reticle.y}%` }} transition={{ type: 'spring', stiffness: 170, damping: 18, mass: 0.35 }} style={{ left: 0, top: 0 }}><div className="rounded-full bg-cyan-300/10 p-1 shadow-[0_0_24px_rgba(34,211,238,0.28)]"><Crosshair className="h-9 w-9 text-cyan-300" /></div></motion.div>}
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl"><GameActionDock onBack={onBack} accentClass="text-sky-100" /></div>

        <AnimatePresence>{(isGameOver || isVictory) && <motion.div initial={{ scale: 0.84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/66 p-4 backdrop-blur-md"><div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-sky-100/30 bg-[linear-gradient(180deg,#f8fafc,#cbd5e1)] p-6 shadow-2xl md:gap-7 md:p-10"><div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-600' : 'text-rose-600'}`}>{isVictory ? 'Siege Won' : 'Out Of Shots'}</div>{isVictory && <div className="flex gap-2">{[1, 2, 3].map((index) => { const earnedStars = score >= targetScore * 1.45 && hearts >= 3 ? 3 : score >= targetScore && hearts >= 2 ? 2 : 1; return <motion.div key={index} initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: index * 0.16, type: 'spring' }}><Star className={`h-14 w-14 ${index <= earnedStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} /></motion.div>; })}</div>}<div className="grid w-full grid-cols-2 gap-3"><div className="rounded-[1.2rem] bg-sky-50 p-3 text-center"><div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Score</div><div className="mt-1 text-2xl font-black text-sky-950">{score}</div></div><div className="rounded-[1.2rem] bg-sky-50 p-3 text-center"><div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Hearts Left</div><div className="mt-1 text-2xl font-black text-sky-950">{hearts}</div></div></div><button onClick={onBack} className="ui-button-primary licensed-submit-button w-full py-4 text-xl font-black text-white transition-all">Continue</button></div></motion.div>}</AnimatePresence>
      </div>
    </div>
  );
};

export default AngleArenaGame;

