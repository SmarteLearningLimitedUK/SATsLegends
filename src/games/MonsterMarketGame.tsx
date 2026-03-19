import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Beef,
  Beer,
  Check,
  Cherry,
  CircleDollarSign,
  Coffee,
  Cookie,
  Fish,
  Flame,
  Gem as GemIcon,
  Grape,
  IceCream,
  Pizza,
  Timer as TimerIcon,
  Trophy,
  Wine,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';

interface MonsterMarketGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type Feedback = 'correct' | 'wrong' | 'timeout' | null;

interface Item {
  id: number;
  name: string;
  value: number;
  color: string;
  Icon: LucideIcon;
}

interface Customer {
  id: number;
  targetValue: number;
  patience: number;
}

const ITEMS: Item[] = [
  { id: 1, name: 'Mana Bread', value: 5, color: 'bg-amber-600', Icon: Cookie },
  { id: 2, name: 'Health Potion', value: 10, color: 'bg-red-500', Icon: Flame },
  { id: 3, name: 'Stamina Brew', value: 15, color: 'bg-green-500', Icon: Coffee },
  { id: 4, name: 'Dragon Fruit', value: 20, color: 'bg-pink-500', Icon: Apple },
  { id: 5, name: 'Ice Crystal', value: 25, color: 'bg-blue-400', Icon: IceCream },
  { id: 6, name: 'Dwarf Ale', value: 30, color: 'bg-yellow-700', Icon: Beer },
  { id: 7, name: 'Elven Wine', value: 35, color: 'bg-sky-600', Icon: Wine },
  { id: 8, name: 'Cave Fish', value: 40, color: 'bg-cyan-600', Icon: Fish },
  { id: 9, name: 'Orc Steak', value: 45, color: 'bg-rose-800', Icon: Beef },
  { id: 10, name: 'Fire Berries', value: 50, color: 'bg-orange-600', Icon: Cherry },
  { id: 11, name: 'Magic Grapes', value: 55, color: 'bg-indigo-600', Icon: Grape },
  { id: 12, name: 'Royal Feast', value: 60, color: 'bg-yellow-500', Icon: Pizza },
];

const PATIENCE_DECAY_MS = 220;
const PATIENCE_DECAY_STEP = 2;

const TopBar: React.FC<{ score: number; coins: number; gems: number; timer: string }> = ({ score, coins, gems, timer }) => (
  <div className="z-50 w-full px-2 pt-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-900/60 p-1 shadow-lg">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-white bg-blue-500 text-sm font-black text-white shadow-lg">
          5
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-tight text-blue-200">Chef Jon</span>
          <div className="h-2 w-24 overflow-hidden rounded-full border border-white/10 bg-black/40">
            <div className="h-full w-3/4 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
          </div>
        </div>
        <span className="px-1 text-xs font-black text-white">{score.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-yellow-400/50 bg-blue-900/80 px-3 py-1 shadow-lg">
        <TimerIcon className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-black text-white">{timer}</span>
      </div>
    </div>

    <div className="mt-2 flex justify-end gap-2">
      <div className="flex items-center gap-1 rounded-md border border-yellow-600/30 bg-black/40 px-2 py-0.5">
        <CircleDollarSign className="h-3 w-3 text-yellow-400" />
        <span className="text-[10px] font-bold text-white">{coins.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-pink-600/30 bg-black/40 px-2 py-0.5">
        <GemIcon className="h-3 w-3 text-pink-400" />
        <span className="text-[10px] font-bold text-white">{gems}</span>
      </div>
    </div>
  </div>
);

const GoblinCustomer: React.FC<{ customer: Customer }> = ({ customer }) => (
  <motion.div
    initial={{ x: -100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 160, opacity: 0 }}
    className="flex flex-col items-center gap-2"
  >
    <div className="relative">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl border-4 border-blue-400 bg-white px-4 py-2 font-black text-blue-900 shadow-xl"
      >
        I need <span className="text-orange-600">{customer.targetValue}</span> gold worth!
        <div className="absolute bottom-[-12px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-blue-400" />
      </motion.div>

      <div className="relative h-24 w-24 rounded-full border-4 border-green-800 bg-gradient-to-b from-green-600 to-green-900 shadow-2xl">
        <div className="absolute left-4 top-1/3 h-4 w-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
        <div className="absolute right-4 top-1/3 h-4 w-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
        <div className="absolute bottom-4 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-black/40" />
      </div>
    </div>

    <div className="h-3 w-32 overflow-hidden rounded-full border border-white/20 bg-black/40">
      <motion.div
        className={`h-full ${
          customer.patience > 50
            ? 'bg-green-500'
            : customer.patience > 20
              ? 'bg-yellow-500'
              : 'bg-red-500'
        }`}
        animate={{ width: `${customer.patience}%` }}
      />
    </div>
  </motion.div>
);

const MonsterMarketGame: React.FC<MonsterMarketGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const baseRoundTime = 60 + (levelId * 5);
  const targetScore = 1600 + (levelId * 260);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [timer, setTimer] = useState(baseRoundTime);
  const [currentOrder, setCurrentOrder] = useState<Item[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [gameActive, setGameActive] = useState(true);
  const [customersServed, setCustomersServed] = useState(0);

  const endedRef = useRef(false);

  const generateCustomer = useCallback(() => {
    const itemCount = levelId <= 2 ? 2 : levelId <= 5 ? 3 : 4;
    const picks: Item[] = [];
    for (let index = 0; index < itemCount; index += 1) {
      picks.push(ITEMS[Math.floor(Math.random() * ITEMS.length)]);
    }
    const target = picks.reduce((sum, item) => sum + item.value, 0);

    setCustomer({
      id: Math.random(),
      targetValue: target,
      patience: 100,
    });
    setCurrentOrder([]);
    setFeedback(null);
  }, [levelId]);

  const finishRound = useCallback((finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);
    if (finalScore >= targetScore) {
      const stars = finalScore >= targetScore * 1.8 ? 3 : finalScore >= targetScore * 1.35 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }
    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  useEffect(() => {
    endedRef.current = false;
    setScore(0);
    setCoins(0);
    setGems(0);
    setTimer(baseRoundTime);
    setCurrentOrder([]);
    setCustomer(null);
    setFeedback(null);
    setGameActive(true);
    setCustomersServed(0);
    generateCustomer();
  }, [baseRoundTime, generateCustomer, levelId]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return undefined;
    const gameInterval = window.setInterval(() => {
      setTimer((previous) => {
        if (previous <= 1) {
          window.clearInterval(gameInterval);
          finishRound(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(gameInterval);
  }, [finishRound, gameActive, score]);

  useEffect(() => {
    if (!gameActive || !customer || feedback) return undefined;
    const patienceInterval = window.setInterval(() => {
      setCustomer((previous) => {
        if (!previous) return null;
        const nextPatience = previous.patience - PATIENCE_DECAY_STEP;
        if (nextPatience <= 0) {
          setFeedback('timeout');
          setScore((value) => Math.max(0, value - 500));
          window.setTimeout(() => {
            if (!endedRef.current) generateCustomer();
          }, 1200);
          return { ...previous, patience: 0 };
        }
        return { ...previous, patience: nextPatience };
      });
    }, PATIENCE_DECAY_MS);
    return () => window.clearInterval(patienceInterval);
  }, [customer, feedback, gameActive, generateCustomer]);

  const currentTotal = useMemo(
    () => currentOrder.reduce((sum, item) => sum + item.value, 0),
    [currentOrder],
  );

  const handleItemClick = (item: Item) => {
    if (!gameActive || feedback) return;
    setCurrentOrder((previous) => [...previous, item]);
  };

  const handleClear = () => {
    if (!gameActive || feedback) return;
    setCurrentOrder([]);
  };

  const handleServe = () => {
    if (!gameActive || !customer || feedback) return;
    if (!currentOrder.length) return;

    if (currentTotal === customer.targetValue) {
      setFeedback('correct');
      const earned = 900 + Math.floor(customer.patience * 8) + (Math.max(0, currentOrder.length - 2) * 40);
      setScore((value) => value + earned);
      setCoins((value) => value + 100);
      setGems((value) => value + (customer.patience >= 80 ? 1 : 0));
      setCustomersServed((value) => value + 1);
      window.setTimeout(() => {
        if (!endedRef.current) generateCustomer();
      }, 1200);
      return;
    }

    setFeedback('wrong');
    setScore((value) => Math.max(0, value - 300));
    window.setTimeout(() => {
      if (endedRef.current) return;
      setFeedback(null);
      setCurrentOrder([]);
    }, 900);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-[#0a1a3a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#0a1a3a_100%)]" />
      <GameplaySceneBackdrop gameType="monster_market" />

      <div className="relative z-10 flex h-full w-full max-w-[500px] flex-col">
        <TopBar score={score} coins={coins} gems={gems} timer={timer.toString().padStart(2, '0')} />

        <div className="flex flex-1 flex-col items-center justify-between px-4 py-6">
          <div className="flex h-48 w-full items-center justify-center">
            <AnimatePresence mode="wait">
              {customer && !feedback && <GoblinCustomer key={customer.id} customer={customer} />}
              {feedback && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.16 }}
                  exit={{ scale: 0 }}
                  className={`text-4xl font-black italic drop-shadow-2xl ${
                    feedback === 'correct' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {feedback === 'correct'
                    ? 'PERFECT!'
                    : feedback === 'timeout'
                      ? 'TOO SLOW!'
                      : 'WRONG VALUE!'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[100px] w-full rounded-2xl border-2 border-blue-400/30 bg-blue-900/40 p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Current Order</span>
              <span className={`text-xl font-black ${currentTotal > (customer?.targetValue || 0) ? 'text-red-400' : 'text-yellow-400'}`}>
                {currentTotal} / {customer?.targetValue || 0}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {currentOrder.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`${item.color} flex h-8 w-8 items-center justify-center rounded-md border border-white/20 shadow-lg`}
                >
                  <item.Icon className="h-4 w-4 text-white" />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-4 gap-3">
            {ITEMS.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleItemClick(item)}
                className={`${item.color} group relative aspect-square overflow-hidden rounded-xl border-2 border-white/20 shadow-xl`}
              >
                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-black/10" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center">
                  <item.Icon className="h-8 w-8 text-white drop-shadow-md" />
                  <span className="mt-1 rounded-full bg-black/40 px-1.5 text-[10px] font-black">{item.value}</span>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 flex w-full gap-4">
            <button
              onClick={handleClear}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-b-4 border-red-800 bg-red-600 text-lg font-black transition-all active:translate-y-1 active:border-b-0"
            >
              <X className="h-6 w-6" /> CLEAR
            </button>
            <button
              onClick={handleServe}
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-xl border-b-4 border-orange-800 bg-gradient-to-b from-yellow-400 to-orange-600 text-xl font-black text-white shadow-lg transition-all active:translate-y-1 active:border-b-0"
            >
              <Check className="h-8 w-8" /> SERVE ORDER
            </button>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />

        {!gameActive && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-blue-950/90 p-8 text-center">
            <Trophy className="mb-4 h-24 w-24 animate-bounce text-yellow-400" />
            <h2 className="mb-2 text-5xl font-black italic">TIME'S UP!</h2>
            <div className="w-full max-w-xs rounded-2xl border-2 border-blue-400 bg-blue-900/60 p-6">
              <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-200">Final Score</p>
              <p className="text-4xl font-black text-white">{score.toLocaleString()}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-blue-300">
                Served: {customersServed}
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-8 rounded-full bg-white px-8 py-3 text-xl font-black text-blue-900 transition-transform hover:scale-105"
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonsterMarketGame;
