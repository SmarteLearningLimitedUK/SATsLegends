import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameActionDock from '../components/GameActionDock';
import AssetIcon from '../components/AssetIcon';
import blankClockAsset from '../assets/timekeeper/blank_clock.png';
import sceneBackdrop from '../assets/fantasy_hero/demo_bg/background_01.png';

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

const createHarbourChallenge = (levelId: number, _roundNumber: number, _totalRounds: number): HarbourChallenge => {
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
    prompt: 'Compare both ship schedules and set the harbour clock to the first departure.',
    support: `${shipName} departs at ${formatClock(primary.hour, primary.minute)}. ${SHIP_NAMES[randomInt(0, SHIP_NAMES.length - 1)]} departs at ${formatClock(secondary.hour, secondary.minute)}.`,
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
  <div className="rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(30,41,59,0.9))] p-3 shadow-[0_16px_26px_rgba(2,6,23,0.22)]">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/64 md:text-xs">{label}</div>
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

const TimekeeperTempleGame: React.FC<TimekeeperTempleGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
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

  const selectedMeridiem = selectedHour >= 12 ? 'PM' : 'AM';

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

  const toggleMeridiem = () => {
    if (feedback || isFinished) return;
    setSelectedHour((previous) => (previous + 12) % 24);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#0c1f38_0%,#112f54_46%,#0a1a30_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={sceneBackdrop} alt="" className="h-full w-full object-cover opacity-45" draggable={false} />
        <div className="absolute inset-x-0 top-0 h-[62%] bg-[linear-gradient(180deg,rgba(190,242,255,0.18),rgba(125,211,252,0.08),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.26),rgba(2,6,23,0.88))]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-3 md:p-4">
        <div className="ui-panel-unified w-full max-w-5xl rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(9,32,58,0.94),rgba(10,42,78,0.88))] px-3 py-2 shadow-[0_14px_30px_rgba(2,6,23,0.32)] md:px-4">
          <div className="grid grid-cols-3 items-center gap-2 text-white md:gap-3">
            <div className="rounded-[1rem] border border-white/16 bg-black/18 px-2.5 py-1.5 md:px-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Score</div>
              <div className="mt-0.5 text-lg font-black leading-none text-white md:text-2xl">{score}</div>
            </div>
            <div className="rounded-[1rem] border border-white/16 bg-black/18 px-2.5 py-1.5 text-center md:px-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Time</div>
              <div className="mt-0.5 text-lg font-black leading-none text-white md:text-2xl">{timeLeft}s</div>
            </div>
            <div className="flex items-center justify-end gap-1.5 md:gap-2">
              {Array.from({ length: MAX_HEARTS }).map((_, index) => (
                <div key={index} className={`h-4 w-4 rounded-full md:h-5 md:w-5 ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_5px_12px_rgba(239,68,68,0.35)]' : 'bg-white/16'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="licensed-board-frame structured-playfield-frame relative flex w-full max-w-5xl min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(17,63,100,0.92),rgba(10,38,67,0.9))] shadow-[0_26px_56px_rgba(0,0,0,0.34)] md:rounded-[2.4rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,rgba(2,6,23,0.22)_100%)]" />

          <div className="relative z-10 flex h-full w-full flex-col px-3 py-3 md:px-5 md:py-5">
            <div className="rounded-[1.1rem] border border-amber-200/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.96),rgba(234,179,8,0.94))] px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(133,77,14,0.24)] md:px-6 md:py-3">
              <div className="text-base font-black tracking-tight text-slate-900 md:text-2xl">{challenge.title}</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800/90 md:text-base">{challenge.prompt}</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <div className="rounded-[1rem] border border-white/16 bg-black/20 px-3 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.24)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Digital</div>
                <div className="mt-0.5 text-lg font-black text-white md:text-xl">{formatClock(selectedHour, selectedMinute)}</div>
              </div>
              <button
                type="button"
                onClick={toggleMeridiem}
                className="rounded-[1rem] border border-white/16 bg-black/20 px-3 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.24)] active:scale-[0.98]"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Meridiem</div>
                <div className="mt-0.5 text-lg font-black text-amber-100 md:text-xl">{selectedMeridiem}</div>
              </button>
              <div className="rounded-[1rem] border border-white/16 bg-black/20 px-3 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.24)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Round</div>
                <div className="mt-0.5 text-lg font-black text-white md:text-xl">{roundNumber}/{totalRounds}</div>
              </div>
              <div className="rounded-[1rem] border border-white/16 bg-black/20 px-3 py-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.24)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/74">Target</div>
                <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-black text-white md:text-xl">
                  <AssetIcon name="star" className="h-4 w-4" />
                  {targetScore}
                </div>
              </div>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
              <div className="relative flex h-[min(58vw,30rem)] w-[min(58vw,30rem)] max-h-[31rem] max-w-[31rem] items-center justify-center rounded-full border border-white/16 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.46),rgba(148,197,255,0.3)_34%,rgba(2,6,23,0.58)_86%)] p-4 shadow-[0_24px_42px_rgba(2,6,23,0.36)] md:p-6">
                <ClockFace
                  hour={selectedHour}
                  minute={selectedMinute}
                  sizeClass="h-[84%] w-[84%] max-h-[24rem] max-w-[24rem]"
                  accentClass="from-sky-100 via-white to-cyan-100"
                />
                {phase === 'sailing' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.84, 1.05, 1.24] }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-full border-4 border-cyan-200/70"
                  />
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-stretch">
              <TimeGearControl
                label="Hour"
                value={`${((selectedHour + 11) % 12) + 1}`}
                onIncrease={() => setSelectedHour((previous) => (previous + 1) % 24)}
                onDecrease={() => setSelectedHour((previous) => (previous + 23) % 24)}
              />
              <TimeGearControl
                label="Minute"
                value={selectedMinute.toString().padStart(2, '0')}
                onIncrease={() => setSelectedMinute((previous) => (previous + stepMinutes) % 60)}
                onDecrease={() => setSelectedMinute((previous) => (previous - stepMinutes + 60) % 60)}
              />
              <button
                type="button"
                onClick={handleLaunch}
                disabled={feedback !== null || isFinished}
                className="ui-button-primary licensed-submit-button flex min-h-[4.2rem] w-full min-w-[10rem] items-center justify-center px-5 py-4 text-xl font-black text-white disabled:opacity-45 md:min-h-full md:text-2xl"
              >
                Check Time
              </button>
            </div>

            <div className="mt-3 rounded-[1rem] border border-white/14 bg-black/20 px-4 py-2.5 text-center text-xs font-bold text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:text-sm">
              {challenge.support}
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.84 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[1.6rem] border border-white/14 bg-slate-950/64 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-3xl font-black uppercase tracking-[0.12em] md:text-5xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-1.5 text-base font-bold text-white/92 md:text-xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-5xl">
          <GameActionDock onBack={onBack} accentClass="text-white" />
        </div>
      </div>
    </div>
  );
};

export default TimekeeperTempleGame;
