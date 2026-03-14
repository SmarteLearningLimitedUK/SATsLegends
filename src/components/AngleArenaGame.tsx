import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import GameActionDock from './GameActionDock';
import GameplayHUD from './GameplayHUD';
import { Star, Target } from './GameIcons';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface RoundTarget {
  angle: number;
  lane: 'low' | 'mid' | 'high';
  title: string;
  bounty: number;
}

interface FlightState {
  x: string[];
  y: string[];
  rotation: number[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const TARGET_TITLES = ['Tower Guard', 'Rune Stack', 'Goblin Fort', 'Crown Keep', 'Sky Bastion'];

const targetLaneMap: Record<RoundTarget['lane'], { x: number; y: number }> = {
  low: { x: 80, y: 70 },
  mid: { x: 82, y: 58 },
  high: { x: 84, y: 44 },
};

const createTarget = (levelId: number, previousAngle?: number): RoundTarget => {
  const increment = levelId >= 4 ? 2 : 5;
  let angle = Math.round((20 + Math.random() * 55) / increment) * increment;
  if (angle === previousAngle) {
    angle = clamp(angle + increment, 20, 80);
  }

  const lanes: RoundTarget['lane'][] = ['low', 'mid', 'high'];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];

  return {
    angle,
    lane,
    title: TARGET_TITLES[Math.floor(Math.random() * TARGET_TITLES.length)],
    bounty: 110 + (levelId * 18),
  };
};

const buildFlight = (angle: number, power: number, lane: RoundTarget['lane'], hit: boolean): FlightState => {
  const target = targetLaneMap[lane];
  const launchHeight = clamp(30 + (angle * 0.42) + (power * 18), 28, 62);
  const landing = hit
    ? target
    : angle < 45
      ? { x: target.x - 12, y: target.y + 14 }
      : { x: target.x + 9, y: target.y - 12 };

  return {
    x: ['18%', '34%', '55%', `${landing.x}%`],
    y: ['74%', `${74 - (launchHeight * 0.48)}%`, `${74 - launchHeight}%`, `${landing.y}%`],
    rotation: [0, -18, 8, hit ? 0 : 20],
  };
};

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 620 + (levelId * 220);
  const tolerance = Math.max(3, 10 - levelId);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(72 + (levelId * 10));
  const [streak, setStreak] = useState(0);
  const [aimAngle, setAimAngle] = useState(42);
  const [pullStrength, setPullStrength] = useState(72);
  const [roundTarget, setRoundTarget] = useState<RoundTarget>(() => createTarget(levelId));
  const [flight, setFlight] = useState<FlightState | null>(null);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);
  const [status, setStatus] = useState('Pull back the sling and launch at the marked tower angle.');
  const [isLaunching, setIsLaunching] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);
  const power = clamp(pullStrength / 100, 0.35, 1);

  useEffect(() => {
    setScore(0);
    setTimeLeft(72 + (levelId * 10));
    setStreak(0);
    setAimAngle(42);
    setPullStrength(72);
    setRoundTarget(createTarget(levelId));
    setFeedback(null);
    setStatus('Pull back the sling and launch at the marked tower angle.');
    setIsLaunching(false);
    setIsGameOver(false);
    setIsVictory(false);
  }, [levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || isLaunching) return undefined;
    if (timeLeft <= 0) {
      if (score >= targetScore) {
        const stars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
        setIsVictory(true);
        confetti({
          particleCount: 180,
          spread: 72,
          origin: { y: 0.62 },
          colors: ['#fde68a', '#f59e0b', '#ffffff'],
        });
        onVictory(stars, score);
      } else {
        setIsGameOver(true);
        onGameOver(score);
      }
      return undefined;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isGameOver, isLaunching, isVictory, onGameOver, onVictory, score, targetScore, timeLeft]);

  const predictionDots = useMemo(() => (
    Array.from({ length: 5 }, (_, index) => {
      const step = (index + 1) / 6;
      const x = 20 + (step * 44) + (power * 6);
      const y = 74 - (Math.sin(step * Math.PI) * (aimAngle * 0.58 + power * 14));
      return { x, y, scale: 1 - (index * 0.12) };
    })
  ), [aimAngle, power]);

  const handleLaunch = () => {
    if (isLaunching || isGameOver || isVictory) return;

    const difference = Math.abs(aimAngle - roundTarget.angle);
    const hit = difference <= tolerance;
    const flightPath = buildFlight(aimAngle, power, roundTarget.lane, hit);

    setIsLaunching(true);
    setFeedback(null);
    setFlight(flightPath);
    setStatus(hit ? 'Direct line. Hold steady for impact.' : 'Shot away. Watch the landing.');

    window.setTimeout(() => {
      setFeedback(hit ? 'hit' : 'miss');

      if (hit) {
        const points = roundTarget.bounty + (streak * 24) + Math.max(0, 40 - (difference * 6));
        const newScore = score + points;
        triggerHaptic('success');
        setScore(newScore);
        setStreak((prev) => prev + 1);
        setStatus(`Bullseye at ${roundTarget.angle} degrees. +${points}`);

        confetti({
          particleCount: 70,
          spread: 54,
          origin: { x: 0.78, y: 0.42 },
          colors: ['#f59e0b', '#fcd34d', '#ffffff'],
        });

        window.setTimeout(() => {
          if (newScore >= targetScore) {
            const stars = newScore >= targetScore * 1.85 ? 3 : newScore >= targetScore * 1.3 ? 2 : 1;
            setIsVictory(true);
            onVictory(stars, newScore);
          } else {
            setRoundTarget(createTarget(levelId, roundTarget.angle));
            setFeedback(null);
            setFlight(null);
            setIsLaunching(false);
          }
        }, 850);
      } else {
        triggerHaptic('warning');
        setStreak(0);
        setStatus(`The tower held. You were ${difference} degrees away.`);

        window.setTimeout(() => {
          setFeedback(null);
          setFlight(null);
          setIsLaunching(false);
        }, 820);
      }
    }, 740);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#7dd3fc_0%,#38bdf8_20%,#1d4ed8_58%,#12203a_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[10%] h-28 w-40 rounded-full bg-white/18 blur-2xl md:h-36 md:w-56" />
        <div className="absolute right-[8%] top-[14%] h-24 w-36 rounded-full bg-white/18 blur-2xl md:h-32 md:w-52" />
        <div className="absolute bottom-[20%] left-[-8%] h-40 w-[48%] rounded-full bg-emerald-500/28 blur-3xl" />
        <div className="absolute bottom-[16%] right-[-10%] h-44 w-[52%] rounded-full bg-lime-400/22 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(34,197,94,0),rgba(21,128,61,0.88)_30%,rgba(20,83,45,0.98)_100%)]" />
        <div className="absolute bottom-[14%] left-0 right-0 h-[18%] bg-[radial-gradient(circle_at_20%_40%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(101,163,13,0.18),rgba(21,128,61,0.72))]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Angle Arena"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-sky-950"
          accentSoftBg="bg-sky-100/88"
          accentBorder="border-sky-200/88"
          progressBar="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-400"
          statLabel="Streak"
          statValue={streak}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(7,18,32,0.18),rgba(7,18,32,0.42))] p-2 shadow-[0_28px_70px_rgba(2,6,23,0.28)] md:rounded-[2.6rem] md:p-4">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_18%,rgba(15,23,42,0.24))]" />

          <div className="relative z-10 mb-2 grid grid-cols-[1fr_auto] gap-2 md:mb-3 md:grid-cols-[1fr_auto_auto]">
            <div className="rounded-[1.2rem] border border-white/16 bg-slate-950/26 px-3 py-2 shadow-[0_16px_28px_rgba(2,6,23,0.22)]">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-100/78 md:text-[10px]">Launch Brief</div>
              <div className="mt-1 text-[11px] font-bold text-white md:text-sm">{status}</div>
            </div>
            <div className="rounded-[1.2rem] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(120,53,15,0.82),rgba(68,32,12,0.9))] px-3 py-2 text-center shadow-[0_16px_28px_rgba(2,6,23,0.24)]">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-100/76 md:text-[10px]">Target</div>
              <div className="mt-1 text-xl font-black text-white md:text-2xl">{roundTarget.angle}°</div>
            </div>
            <div className="hidden rounded-[1.2rem] border border-white/16 bg-white/10 px-3 py-2 text-center shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:block">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/68">Your Aim</div>
              <div className="mt-1 text-2xl font-black text-white">{aimAngle}°</div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.12))] md:rounded-[2rem]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[7%] top-[18%] h-16 w-24 rounded-full bg-white/16 blur-2xl md:h-20 md:w-32" />
              <div className="absolute bottom-[24%] right-[18%] h-32 w-32 rounded-full bg-orange-300/16 blur-3xl" />
            </div>

            <div className="relative flex min-h-0 flex-1">
              <div className="absolute inset-x-0 bottom-[12%] h-[3px] bg-white/18" />

              <div className="absolute left-[8%] bottom-[11%] w-[30%] max-w-[11rem]">
                <div className="relative aspect-[1.05/1]">
                  <div className="absolute left-[42%] top-[10%] h-[54%] w-[8%] rounded-full bg-[linear-gradient(180deg,#8b5e34,#4a2d18)] shadow-[0_8px_14px_rgba(0,0,0,0.24)]" />
                  <div className="absolute left-[62%] top-[18%] h-[48%] w-[8%] rounded-full bg-[linear-gradient(180deg,#8b5e34,#4a2d18)] shadow-[0_8px_14px_rgba(0,0,0,0.24)]" />
                  <div className="absolute left-[46%] top-[26%] h-[3px] w-[20%] origin-left bg-amber-100/70" style={{ transform: `rotate(${-aimAngle * 0.75}deg)` }} />
                  <div className="absolute left-[46%] top-[38%] h-[3px] w-[22%] origin-left bg-amber-100/70" style={{ transform: `rotate(${aimAngle * 0.45}deg)` }} />
                  <motion.div
                    animate={{ x: [0, -2, 0], y: [0, 2, 0] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-[39%] top-[31%] flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/70 bg-[radial-gradient(circle_at_30%_30%,#fde68a,#f59e0b_55%,#b45309_100%)] shadow-[0_10px_16px_rgba(0,0,0,0.26)]"
                    style={{ transform: `translate(${-pullStrength * 0.16}px, ${pullStrength * 0.08}px)` }}
                  >
                    <Target className="h-4 w-4 text-amber-950" />
                  </motion.div>
                </div>
              </div>

              <div className="absolute right-[8%] bottom-[12%] w-[28%] max-w-[12rem]">
                <div className="relative aspect-[0.9/1]">
                  <div className="absolute inset-x-[12%] bottom-0 h-[20%] rounded-[1.2rem] bg-[linear-gradient(180deg,#7c3f13,#4a2510)] shadow-[0_10px_18px_rgba(0,0,0,0.26)]" />
                  <div className="absolute left-[20%] bottom-[18%] h-[28%] w-[18%] rounded-t-[0.9rem] bg-[linear-gradient(180deg,#d1d5db,#6b7280)] shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
                  <div className="absolute left-[42%] bottom-[18%] h-[44%] w-[18%] rounded-t-[0.9rem] bg-[linear-gradient(180deg,#d1d5db,#6b7280)] shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
                  <div className="absolute left-[64%] bottom-[18%] h-[34%] w-[18%] rounded-t-[0.9rem] bg-[linear-gradient(180deg,#d1d5db,#6b7280)] shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
                  <div
                    className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-100 bg-[radial-gradient(circle_at_30%_30%,#fef08a,#f59e0b_65%,#b45309_100%)] text-xs font-black text-amber-950 shadow-[0_12px_18px_rgba(0,0,0,0.28)] md:h-12 md:w-12 md:text-sm"
                    style={{ left: `${targetLaneMap[roundTarget.lane].x - 60}%`, top: `${targetLaneMap[roundTarget.lane].y - 6}%` }}
                  >
                    {roundTarget.angle}°
                  </div>
                  <div className="absolute right-[8%] top-[4%] rounded-full border border-white/14 bg-slate-950/56 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/84 md:text-[10px]">
                    {roundTarget.title}
                  </div>
                </div>
              </div>

              {predictionDots.map((dot, index) => (
                <div
                  key={`${dot.x}-${index}`}
                  className="pointer-events-none absolute rounded-full bg-white/65 shadow-[0_0_12px_rgba(255,255,255,0.42)]"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: `${8 * dot.scale}px`,
                    height: `${8 * dot.scale}px`,
                    opacity: 0.78 - (index * 0.12),
                  }}
                />
              ))}

              <AnimatePresence>
                {flight && (
                  <motion.div
                    initial={{ left: flight.x[0], top: flight.y[0], rotate: 0, scale: 1 }}
                    animate={{ left: flight.x, top: flight.y, rotate: flight.rotation, scale: [1, 1.04, 0.96, feedback === 'hit' ? 0.7 : 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.72, ease: 'easeInOut' }}
                    className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-[radial-gradient(circle_at_30%_30%,#fde68a,#f59e0b_60%,#92400e_100%)] shadow-[0_16px_24px_rgba(0,0,0,0.28)]"
                  >
                    <Target className="h-4 w-4 text-amber-950" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className={`absolute left-1/2 top-[16%] -translate-x-1/2 rounded-full border px-4 py-2 text-lg font-black uppercase tracking-[0.2em] shadow-[0_18px_28px_rgba(0,0,0,0.28)] md:text-2xl ${
                      feedback === 'hit'
                        ? 'border-lime-200/50 bg-lime-400/18 text-lime-50'
                        : 'border-rose-200/40 bg-rose-500/18 text-rose-50'
                    }`}
                  >
                    {feedback === 'hit' ? 'Fort Cracked' : 'Missed Shot'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative z-10 mt-2 grid grid-cols-[1fr_auto] gap-2 md:grid-cols-[1.2fr_1fr_auto] md:gap-3">
            <div className="rounded-[1.3rem] border border-white/12 bg-slate-950/28 px-3 py-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.24)] md:px-4 md:py-3">
              <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/70 md:text-[10px]">
                <span>Aim Angle</span>
                <span>{aimAngle}°</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step={levelId >= 4 ? 2 : 5}
                value={aimAngle}
                onChange={(event) => setAimAngle(Number(event.target.value))}
                disabled={isLaunching}
                className="licensed-slider h-3 w-full appearance-none rounded-full bg-white/14"
              />
            </div>

            <div className="rounded-[1.3rem] border border-white/12 bg-slate-950/28 px-3 py-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.24)] md:px-4 md:py-3">
              <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/70 md:text-[10px]">
                <span>Sling Power</span>
                <span>{pullStrength}%</span>
              </div>
              <input
                type="range"
                min="45"
                max="100"
                step={5}
                value={pullStrength}
                onChange={(event) => setPullStrength(Number(event.target.value))}
                disabled={isLaunching}
                className="licensed-slider h-3 w-full appearance-none rounded-full bg-white/14"
              />
            </div>

            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="licensed-submit-button rounded-[1.3rem] px-5 py-3 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50 md:px-8 md:text-xl"
            >
              Launch
            </button>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-sky-100" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.84, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/66 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-sky-100/30 bg-[linear-gradient(180deg,#f8fafc,#cbd5e1)] p-6 shadow-2xl md:gap-7 md:p-10">
                <div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isVictory ? 'Siege Won' : 'Out Of Shots'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map((index) => {
                      const earnedStars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
                      return (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.16, type: 'spring' }}
                        >
                          <Star className={`h-14 w-14 ${index <= earnedStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] bg-sky-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700/70">Score</div>
                    <div className="mt-1 text-2xl font-black text-sky-950">{score}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-emerald-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700/70">Target</div>
                    <div className="mt-1 text-2xl font-black text-emerald-950">{targetScore}</div>
                  </div>
                </div>

                <button onClick={onBack} className="licensed-submit-button w-full rounded-2xl py-4 text-xl font-black text-white transition-all">
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AngleArenaGame;
