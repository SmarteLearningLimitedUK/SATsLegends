import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import AssetIcon from './AssetIcon';
import { AVATARS } from '../constants';
import blankClockAsset from '../assets/timekeeper/blank_clock.png';

interface TimekeeperTempleGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type HarbourMode = 'read_clock' | 'arrival_time' | 'convert_minutes' | 'first_departure';
type HarbourPhase = 'setting' | 'sailing' | 'delayed';

interface HarbourChallenge {
  mode: HarbourMode;
  title: string;
  prompt: string;
  support: string;
  shipName: string;
  dockName: string;
  previewHour: number;
  previewMinute: number;
  targetHour: number;
  targetMinute: number;
  secondaryShip?: {
    name: string;
    hour: number;
    minute: number;
  };
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];
const SHIP_NAMES = ['Aurora Gull', 'Brass Tide', 'Clockfin', 'Harbour Star', 'Steamwake', 'Moonwake'];
const DOCK_NAMES = ['Bell Pier', 'Lantern Wharf', 'Gear Dock', 'Tide Gate'];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createTime = (stepMinutes: number) => {
  const hour = randomInt(6, 18);
  const minute = randomInt(0, Math.floor(59 / stepMinutes)) * stepMinutes;
  return { hour, minute };
};

const addMinutes = (hour: number, minute: number, minutesToAdd: number) => {
  const total = (hour * 60) + minute + minutesToAdd;
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
};

const formatClock = (hour: number, minute: number) => {
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${minute.toString().padStart(2, '0')}`;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} minutes`;
  if (!mins) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
};

const createHarbourChallenge = (levelId: number, roundNumber: number, totalRounds: number): HarbourChallenge => {
  const minuteStep = levelId <= 1 ? 15 : 5;
  const shipName = SHIP_NAMES[randomInt(0, SHIP_NAMES.length - 1)];
  const dockName = DOCK_NAMES[randomInt(0, DOCK_NAMES.length - 1)];

  const availableModes: HarbourMode[] = ['read_clock', 'arrival_time'];
  if (levelId >= 2) availableModes.push('convert_minutes');
  if (levelId >= 3) availableModes.push('first_departure');

  const mode = availableModes[randomInt(0, availableModes.length - 1)];

  if (mode === 'read_clock') {
    const preview = createTime(minuteStep);
    return {
      mode,
      title: 'Read The Harbour Clock',
      prompt: `Set ${dockName} to match the ship clock.`,
      support: `${shipName} sails as soon as the dock bell matches the shown time.`,
      shipName,
      dockName,
      previewHour: preview.hour,
      previewMinute: preview.minute,
      targetHour: preview.hour,
      targetMinute: preview.minute,
    };
  }

  if (mode === 'arrival_time') {
    const depart = createTime(minuteStep);
    const journeyMinutes = randomInt(2, levelId >= 3 ? 8 : 6) * minuteStep;
    const target = addMinutes(depart.hour, depart.minute, journeyMinutes);
    return {
      mode,
      title: 'Set The Arrival Bell',
      prompt: `${shipName} leaves at ${formatClock(depart.hour, depart.minute)} and sails for ${formatDuration(journeyMinutes)}.`,
      support: `Turn the dock gears to the correct arrival time for ${dockName}.`,
      shipName,
      dockName,
      previewHour: depart.hour,
      previewMinute: depart.minute,
      targetHour: target.hour,
      targetMinute: target.minute,
    };
  }

  if (mode === 'convert_minutes') {
    const depart = createTime(minuteStep);
    const delayMinutes = randomInt(3, 9) * 10;
    const target = addMinutes(depart.hour, depart.minute, delayMinutes);
    return {
      mode,
      title: 'Convert The Tide Delay',
      prompt: `${shipName} can launch ${delayMinutes} minutes after ${formatClock(depart.hour, depart.minute)}.`,
      support: `Convert the delay, then set ${dockName} to the correct departure time.`,
      shipName,
      dockName,
      previewHour: depart.hour,
      previewMinute: depart.minute,
      targetHour: target.hour,
      targetMinute: target.minute,
    };
  }

  const shipA = createTime(minuteStep);
  const gap = randomInt(1, 4) * minuteStep;
  const later = addMinutes(shipA.hour, shipA.minute, gap);
  const swap = Math.random() > 0.5;
  const primary = swap ? later : shipA;
  const secondary = swap ? shipA : later;

  return {
    mode,
    title: 'Who Leaves First?',
    prompt: `Compare both ship schedules and set the harbour clock to the first departure.`,
    support: `${shipName} departs at ${formatClock(primary.hour, primary.minute)}. ${SHIP_NAMES[(randomInt(0, SHIP_NAMES.length - 1))]} departs at ${formatClock(secondary.hour, secondary.minute)}.`,
    shipName,
    dockName,
    previewHour: primary.hour,
    previewMinute: primary.minute,
    targetHour: secondary.hour,
    targetMinute: secondary.minute,
    secondaryShip: {
      name: 'Tide Runner',
      hour: secondary.hour,
      minute: secondary.minute,
    },
  };
};

const ClockFace: React.FC<{
  hour: number;
  minute: number;
  sizeClass?: string;
  accentClass?: string;
}> = ({
  hour,
  minute,
  sizeClass = 'h-44 w-44 md:h-56 md:w-56',
  accentClass = 'from-cyan-300 via-sky-200 to-white',
}) => {
  const hourRotation = (((hour % 12) + (minute / 60)) * 30);
  const minuteRotation = minute * 6;

  return (
    <div className={`relative ${sizeClass} overflow-hidden rounded-full shadow-[0_20px_30px_rgba(15,23,42,0.32)]`}>
      <img
        src={blankClockAsset}
        alt="Clock face"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[25%] w-[1.8%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-slate-900 shadow-[0_6px_10px_rgba(15,23,42,0.28)]"
        style={{ transform: `translate(-50%, -100%) rotate(${hourRotation}deg)`, transformOrigin: 'center bottom' }}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-[36%] w-[1.2%] origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-gradient-to-t ${accentClass} shadow-[0_6px_10px_rgba(15,23,42,0.2)]`}
        style={{ transform: `translate(-50%, -100%) rotate(${minuteRotation}deg)`, transformOrigin: 'center bottom' }}
      />
      <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[radial-gradient(circle_at_center,#fef3c7,#f59e0b)] shadow-[0_0_18px_rgba(251,191,36,0.3)]" />
    </div>
  );
};

const TimeGearControl: React.FC<{
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
}> = ({ label, value, onIncrease, onDecrease }) => (
  <div className="rounded-[1.4rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(30,41,59,0.9))] p-3 shadow-[0_20px_28px_rgba(2,6,23,0.22)]">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60 md:text-xs">{label}</div>
    <div className="mt-2 flex items-center gap-2 md:gap-3">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-2xl font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] active:scale-[0.96] md:h-12 md:w-12"
      >
        -
      </button>
      <div className="min-w-[4.8rem] rounded-[1rem] border border-white/12 bg-white/10 px-4 py-2 text-center text-2xl font-black tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:min-w-[5.4rem] md:text-3xl">
        {value}
      </div>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-2xl font-black text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] active:scale-[0.96] md:h-12 md:w-12"
      >
        +
      </button>
    </div>
  </div>
);

const DockShip: React.FC<{
  title: string;
  time: string;
  active?: boolean;
  mirrored?: boolean;
}> = ({ title, time, active = false, mirrored = false }) => (
  <motion.div
    animate={{ y: [0, -8, 0], rotate: mirrored ? [1, -1, 1] : [-1, 1, -1] }}
    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    className={`relative w-[12rem] max-w-full rounded-[2rem] border px-4 pb-4 pt-3 shadow-[0_20px_30px_rgba(15,23,42,0.26)] ${active ? 'border-amber-200/50 bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(37,99,235,0.14),rgba(15,23,42,0.6))]' : 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.48))]'}`}>
      <div className="absolute inset-x-[14%] top-[10%] h-[16%] rounded-full bg-white/14 blur-md" />
      <div className="relative text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/62">{title}</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-amber-50">{time}</div>
      </div>
      <div className={`relative mx-auto mt-3 h-16 w-24 ${mirrored ? '-scale-x-100' : ''}`}>
        <div className="absolute bottom-0 left-[6%] right-[6%] h-[44%] rounded-[40%_60%_45%_55%/42%_38%_62%_58%] bg-[linear-gradient(180deg,#38bdf8,#2563eb_58%,#1e293b)] shadow-[0_10px_16px_rgba(29,78,216,0.22)]" />
        <div className="absolute left-[42%] top-[6%] h-[38%] w-[5%] rounded-full bg-amber-300" />
        <div className="absolute left-[44%] top-[10%] h-[22%] w-[26%] -skew-x-[12deg] rounded-[0.35rem] bg-[linear-gradient(180deg,#f8fafc,#dbeafe)] shadow-[0_4px_10px_rgba(255,255,255,0.18)]" />
        <div className="absolute left-[18%] top-[48%] h-[12%] w-[28%] rounded-full bg-cyan-200/45 blur-sm" />
      </div>
    </motion.div>
);

const TimekeeperTempleGame: React.FC<TimekeeperTempleGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 860 + (levelId * 210);
  const stepMinutes = levelId <= 1 ? 15 : 5;
  const timeoutsRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(92 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<HarbourPhase>('setting');
  const [challenge, setChallenge] = useState<HarbourChallenge>(() => createHarbourChallenge(levelId, 1, totalRounds));
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    clearTimers();
    const startingChallenge = createHarbourChallenge(levelId, 1, totalRounds);
    setScore(0);
    setTimeLeft(92 + (levelId * 8));
    setHearts(MAX_HEARTS);
    setRoundNumber(1);
    setStreak(0);
    setPhase('setting');
    setChallenge(startingChallenge);
    setSelectedHour(startingChallenge.previewHour);
    setSelectedMinute(startingChallenge.previewMinute);
    setFeedback(null);
    setIsFinished(false);
  }, [levelId, totalRounds]);

  useEffect(() => {
    if (isFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isFinished, onGameOver, score]);

  const goToRound = (nextRoundNumber: number) => {
    const nextChallenge = createHarbourChallenge(levelId, nextRoundNumber, totalRounds);
    setRoundNumber(nextRoundNumber);
    setChallenge(nextChallenge);
    setSelectedHour(nextChallenge.previewHour);
    setSelectedMinute(nextChallenge.previewMinute);
    setPhase('setting');
    setFeedback(null);
  };

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * 1.45 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;

    confetti({
      particleCount: 170,
      spread: 70,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#60a5fa', '#ffffff'],
    });
    onVictory(stars, finalScore);
  };

  const loseHeart = (title: string, subtitle: string) => {
    if (feedback || isFinished) return;

    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setPhase('delayed');
    setFeedback({ type: 'error', title, subtitle });

    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(score);
      }, 900);
      timeoutsRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPhase('setting');
      setFeedback(null);
    }, 1050);
    timeoutsRef.current.push(timeoutId);
  };

  const handleLaunch = () => {
    if (feedback || isFinished) return;

    const correct = selectedHour === challenge.targetHour && selectedMinute === challenge.targetMinute;
    if (!correct) {
      loseHeart('Ship Delayed', `The harbour needed ${formatClock(challenge.targetHour, challenge.targetMinute)}.`);
      return;
    }

    const points = 160 + (streak * 25) + (challenge.mode === 'first_departure' ? 50 : 0);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setPhase('sailing');
    setFeedback({
      type: 'success',
      title: 'Perfect Departure!',
      subtitle: `+${points} score`,
    });

    const confettiId = window.setTimeout(() => {
      confetti({
        particleCount: 44,
        spread: 48,
        origin: { y: 0.7 },
        colors: ['#fcd34d', '#ffffff', '#60a5fa'],
      });
    }, 260);
    timeoutsRef.current.push(confettiId);

    const nextId = window.setTimeout(() => {
      if (roundNumber >= totalRounds) {
        finishVictory(updatedScore);
        return;
      }
      goToRound(roundNumber + 1);
    }, 1380);
    timeoutsRef.current.push(nextId);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#041c38_0%,#0d3d68_42%,#071529_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-[-10%] top-[-10%] h-[40%] rounded-full bg-cyan-200/14 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[58%] bg-[linear-gradient(180deg,rgba(125,211,252,0.28),rgba(96,165,250,0.08),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(8,47,73,0),rgba(8,47,73,0.14),rgba(15,23,42,0.94))]" />
        <div className="absolute inset-x-0 bottom-[22%] h-[22%] bg-[linear-gradient(180deg,rgba(34,197,94,0.04),rgba(20,83,45,0.14),transparent)]" />
        {Array.from({ length: 10 }).map((_, index) => (
          <motion.div
            key={index}
            animate={{ x: [0, 16, 0], opacity: [0.12, 0.3, 0.12] }}
            transition={{ duration: 3 + index * 0.18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-[2px] rounded-full bg-cyan-200/50"
            style={{ left: `${4 + index * 10}%`, top: `${14 + (index % 3) * 3}%`, width: `${36 + (index % 4) * 12}px` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Clockwork Harbour"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/80"
            accentBorder="border-sky-200/80"
            progressBar="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300"
            statLabel="Round"
            statValue={`${roundNumber}/${totalRounds}`}
            compact
          />
        </div>

      <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_28%,rgba(15,23,42,0.16)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(8,47,73,0),rgba(8,47,73,0.22),rgba(15,23,42,0.95))]" />
          <div className="absolute inset-x-[6%] bottom-[11%] h-[17%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.28),rgba(59,130,246,0.12),transparent_68%)]" />

          <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:left-5 md:top-5 md:px-4">
            {Array.from({ length: MAX_HEARTS }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="absolute right-4 top-3 z-20 rounded-full border border-white/12 bg-slate-950/42 px-4 py-2 text-center shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:right-5 md:top-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/70 md:text-xs">Selected Time</div>
            <div className="mt-0.5 text-lg font-black text-white md:text-2xl">{formatClock(selectedHour, selectedMinute)}</div>
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
              <div className="max-w-[94%] rounded-[1.5rem] border border-orange-200/22 bg-[linear-gradient(180deg,rgba(146,64,14,0.96),rgba(120,53,15,0.98))] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_30px_rgba(120,53,15,0.24)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-50 md:text-[1.9rem]">{challenge.title}</div>
                <div className="mt-1 text-xs font-bold text-amber-100/84 md:text-base">{challenge.prompt}</div>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 md:mt-4">
              <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[1.08fr_0.92fr] md:gap-6">
                <div className="relative flex min-h-[23rem] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.26))] p-4 shadow-[0_24px_40px_rgba(2,6,23,0.22)] md:min-h-[31rem] md:p-5">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(15,23,42,0.12)_100%)]" />
                  <div className="absolute inset-x-0 bottom-[12%] h-[26%] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.35),rgba(59,130,246,0.18),transparent_72%)]" />

                  <div className="relative flex flex-wrap items-center justify-center gap-3 md:justify-between">
                    <DockShip title={challenge.shipName} time={formatClock(challenge.previewHour, challenge.previewMinute)} active />
                    {challenge.secondaryShip && (
                      <DockShip title={challenge.secondaryShip.name} time={formatClock(challenge.secondaryShip.hour, challenge.secondaryShip.minute)} mirrored />
                    )}
                  </div>

                  <div className="relative flex flex-1 items-center justify-center">
                    {phase === 'sailing' && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: [0, 1, 0], x: [0, 90, 220], y: [0, -16, -38] }}
                        transition={{ duration: 1.1, ease: 'easeInOut' }}
                        className="absolute left-[18%] top-[44%] h-16 w-24 md:h-20 md:w-28"
                      >
                        <div className="absolute bottom-0 left-[6%] right-[6%] h-[44%] rounded-[40%_60%_45%_55%/42%_38%_62%_58%] bg-[linear-gradient(180deg,#38bdf8,#2563eb_58%,#1e293b)] shadow-[0_10px_16px_rgba(29,78,216,0.22)]" />
                        <div className="absolute left-1/2 top-[6%] h-[38%] w-[5%] -translate-x-1/2 rounded-full bg-amber-300" />
                        <div className="absolute left-[48%] top-[10%] h-[22%] w-[26%] -skew-x-[12deg] rounded-[0.35rem] bg-[linear-gradient(180deg,#f8fafc,#dbeafe)]" />
                      </motion.div>
                    )}
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="rounded-full border border-white/12 bg-slate-950/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/74 shadow-[0_10px_20px_rgba(2,6,23,0.16)] md:text-xs">
                        {challenge.dockName}
                      </div>
                      <ClockFace hour={selectedHour} minute={selectedMinute} />
                      <div className="rounded-[1.2rem] border border-white/12 bg-slate-950/40 px-4 py-3 text-center shadow-[0_10px_20px_rgba(2,6,23,0.16)]">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/62">Harbour Note</div>
                        <div className="mt-1 text-sm font-bold text-white/92 md:text-base">{challenge.support}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[23rem] flex-col justify-between gap-4 rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(30,41,59,0.92))] p-4 shadow-[0_24px_40px_rgba(2,6,23,0.24)] md:min-h-[31rem] md:p-5">
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    <TimeGearControl
                      label="Hour Gear"
                      value={`${((selectedHour + 11) % 12) + 1}`}
                      onIncrease={() => setSelectedHour((previous) => (previous + 1) % 24)}
                      onDecrease={() => setSelectedHour((previous) => (previous + 23) % 24)}
                    />
                    <TimeGearControl
                      label="Minute Gear"
                      value={selectedMinute.toString().padStart(2, '0')}
                      onIncrease={() => setSelectedMinute((previous) => (previous + stepMinutes) % 60)}
                      onDecrease={() => setSelectedMinute((previous) => (previous - stepMinutes + 60) % 60)}
                    />
                  </div>

                  <div className="rounded-[1.5rem] border border-white/12 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/62">Schedule card</div>
                    <div className="mt-2 text-xl font-black tracking-tight text-white md:text-[1.75rem]">{challenge.title}</div>
                    <div className="mt-2 text-sm font-bold leading-relaxed text-white/82 md:text-base">{challenge.prompt}</div>
                    <div className="mt-3 rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-bold text-sky-50/92 md:text-base">
                      Dock target: {challenge.dockName}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={feedback !== null || isFinished}
                    className="ui-button-primary licensed-submit-button flex min-h-[4.6rem] w-full items-center justify-center px-5 py-4 text-xl font-black text-white disabled:opacity-45 md:min-h-[5rem] md:text-2xl"
                  >
                    Launch Ship
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-white" />
        </div>
      </div>
    </div>
  );
};

export default TimekeeperTempleGame;
