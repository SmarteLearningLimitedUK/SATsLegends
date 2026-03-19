import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { Coins, Sparkles, Store } from '../components/GameIcons';

interface MonsterMarketGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Currency {
  id: string;
  label: string;
  valuePence: number;
  type: 'coin' | 'note';
  tint: string;
}

interface MarketItem {
  id: string;
  name: string;
  pricePence: number;
  stallTint: string;
}

interface Shopper {
  name: string;
  title: string;
  tint: string;
  crest: string;
}

interface MarketRound {
  shopper: Shopper;
  items: MarketItem[];
  totalPence: number;
  amountPaidPence: number;
  changeDuePence: number;
}

const CURRENCIES: Currency[] = [
  { id: '10p', label: '10p', valuePence: 10, type: 'coin', tint: 'from-slate-100 via-slate-200 to-slate-500' },
  { id: '20p', label: '20p', valuePence: 20, type: 'coin', tint: 'from-slate-100 via-slate-200 to-slate-500' },
  { id: '50p', label: '50p', valuePence: 50, type: 'coin', tint: 'from-slate-100 via-slate-200 to-slate-600' },
  { id: '1gbp', label: 'GBP 1', valuePence: 100, type: 'coin', tint: 'from-yellow-100 via-amber-200 to-orange-500' },
  { id: '2gbp', label: 'GBP 2', valuePence: 200, type: 'coin', tint: 'from-yellow-100 via-amber-200 to-orange-600' },
  { id: '5gbp', label: 'GBP 5', valuePence: 500, type: 'note', tint: 'from-cyan-100 via-sky-200 to-cyan-600' },
  { id: '10gbp', label: 'GBP 10', valuePence: 1000, type: 'note', tint: 'from-cyan-100 via-sky-200 to-sky-600' },
];

const SHOPPERS: Shopper[] = [
  { name: 'Brugo', title: 'Ogre Customer', tint: 'from-lime-300 via-emerald-400 to-green-700', crest: 'B' },
  { name: 'Vela', title: 'Wizard Shopper', tint: 'from-cyan-200 via-sky-300 to-indigo-700', crest: 'V' },
  { name: 'Nyx', title: 'Goblin Trader', tint: 'from-cyan-200 via-sky-300 to-blue-700', crest: 'N' },
  { name: 'Moro', title: 'Slime Buyer', tint: 'from-emerald-200 via-green-300 to-teal-700', crest: 'M' },
];

const MARKET_ITEMS: MarketItem[] = [
  { id: 'potion', name: 'Potion Bottle', pricePence: 325, stallTint: 'from-cyan-200 via-sky-300 to-cyan-700' },
  { id: 'scroll', name: 'Ancient Scroll', pricePence: 280, stallTint: 'from-amber-100 via-yellow-200 to-orange-500' },
  { id: 'orb', name: 'Magic Orb', pricePence: 415, stallTint: 'from-cyan-100 via-sky-200 to-cyan-600' },
  { id: 'gem-bag', name: 'Gem Pouch', pricePence: 560, stallTint: 'from-emerald-100 via-lime-200 to-green-600' },
  { id: 'dagger', name: 'Rune Dagger', pricePence: 470, stallTint: 'from-slate-100 via-slate-300 to-slate-600' },
  { id: 'lantern', name: 'Glow Lantern', pricePence: 390, stallTint: 'from-yellow-100 via-amber-200 to-red-500' },
];

const PAYMENT_OPTIONS = [500, 1000, 2000, 5000];

const formatMoney = (valuePence: number) => `GBP ${(valuePence / 100).toFixed(2)}`;

const nextPayment = (totalPence: number) => PAYMENT_OPTIONS.find((value) => value > totalPence) || 5000;

const generateRound = (roundIndex: number): MarketRound => {
  const itemCount = roundIndex >= 5 ? 3 : roundIndex >= 2 ? 2 : 1;
  const items: MarketItem[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    items.push(MARKET_ITEMS[Math.floor(Math.random() * MARKET_ITEMS.length)]);
  }

  const totalPence = items.reduce((sum, item) => sum + item.pricePence, 0);
  const amountPaidPence = nextPayment(totalPence);
  return {
    shopper: SHOPPERS[Math.floor(Math.random() * SHOPPERS.length)],
    items,
    totalPence,
    amountPaidPence,
    changeDuePence: amountPaidPence - totalPence,
  };
};

const MonsterMarketGame: React.FC<MonsterMarketGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<MarketRound>(() => generateRound(0));
  const [tray, setTray] = useState<Currency[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 1000 + levelId * 120;
  const trayTotalPence = tray.reduce((sum, item) => sum + item.valuePence, 0);
  const progress = Math.min((score / targetScore) * 100, 100);

  useEffect(() => {
    setScore(0);
    setTimeLeft(120 + levelId * 8);
    setRoundIndex(0);
    setRound(generateRound(0));
    setTray([]);
    setFeedback(null);
    setStreak(0);
    setIsGameOver(false);
    setIsVictory(false);
  }, [levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          if (score >= targetScore) {
            const stars = score >= targetScore * 1.7 ? 3 : score >= targetScore * 1.25 ? 2 : 1;
            setIsVictory(true);
            onVictory(stars, score);
            return 0;
          }

          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore]);

  const addCurrency = (currency: Currency) => {
    if (feedback) return;
    setTray((previous) => [...previous, { ...currency, id: `${currency.id}-${Date.now()}-${Math.random()}` }]);
  };

  const removeCurrency = (id: string) => {
    if (feedback) return;
    setTray((previous) => previous.filter((item) => item.id !== id));
  };

  const clearTray = () => {
    if (feedback) return;
    setTray([]);
  };

  const advanceRound = (nextScore: number, nextRoundIndex: number) => {
    if (nextRoundIndex >= 8 || nextScore >= targetScore) {
      const stars = nextScore >= targetScore * 1.7 ? 3 : nextScore >= targetScore * 1.25 ? 2 : 1;
      setIsVictory(true);
      onVictory(stars, nextScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(generateRound(nextRoundIndex));
    setTray([]);
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (feedback || tray.length === 0) return;

    if (trayTotalPence === round.changeDuePence) {
      const nextScore = score + 140 + streak * 30 + Math.max(0, timeLeft);
      const nextRoundIndex = roundIndex + 1;

      setFeedback('correct');
      setScore(nextScore);
      setStreak((previous) => previous + 1);

      confetti({
        particleCount: 65,
        spread: 58,
        origin: { y: 0.54 },
        colors: ['#fde047', '#34d399', '#f59e0b'],
      });

      window.setTimeout(() => advanceRound(nextScore, nextRoundIndex), 1200);
      return;
    }

    setFeedback('incorrect');
    setStreak(0);
    setScore((previous) => Math.max(0, previous - 40));
    window.setTimeout(() => {
      setTray([]);
      setFeedback(null);
    }, 900);
  };

  const shopperMessage = useMemo(() => {
    if (round.items.length === 1) {
      return `I need ${round.items[0].name}. Give me the exact change.`;
    }
    return `Bundle these ${round.items.length} items and return the right change.`;
  }, [round.items]);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden p-2 font-sans pt-[env(safe-area-inset-top)] md:p-4">
      <GameplaySceneBackdrop gameType="monster_market" />

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Monster Market"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-cyan-900"
          accentSoftBg="bg-cyan-100/80"
          accentBorder="border-cyan-200/80"
          progressBar="bg-gradient-to-r from-cyan-400 via-emerald-400 to-yellow-300"
          statLabel="Streak"
          statValue={streak}
          compact
        />

        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,224,122,0.16),transparent_22%),radial-gradient(circle_at_16%_36%,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,rgba(9,19,36,0.1),rgba(9,19,36,0.32))]" />

          <div className="relative z-10 mb-2 flex flex-col gap-2 md:mb-3 md:flex-row md:items-center md:justify-between">
            <div className="licensed-game-card w-full max-w-[24rem] px-4 py-3 md:max-w-[32rem] md:px-5 md:py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Fantasy Marketplace</div>
              <div className="mt-1 text-[1.5rem] font-black leading-none text-white md:text-[2rem]">Serve The Customer</div>
              <div className="mt-2 text-xs font-bold text-white/78 md:text-sm">{shopperMessage}</div>
            </div>
            <div className="casual-ribbon-chip flex items-center gap-2 rounded-full px-4 py-2 text-[10px] md:text-xs">
              <Store className="h-5 w-5 text-yellow-300" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Round</div>
                <div className="text-xl font-black text-white">{roundIndex + 1} / 8</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
            <div className="flex min-h-[17.5rem] flex-[0.95] flex-col gap-3 md:min-h-0">
              <div className="licensed-game-card-dark relative overflow-hidden rounded-[1.75rem] p-4">
                <div className={`absolute left-4 top-4 h-16 w-16 rounded-[1.2rem] bg-gradient-to-br ${round.shopper.tint} blur-md opacity-80`} />
                <div className="relative flex items-center gap-4">
                  <div className={`relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br ${round.shopper.tint} text-3xl font-black text-white shadow-[0_16px_28px_rgba(0,0,0,0.28)]`}>
                    {round.shopper.crest}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">{round.shopper.title}</div>
                    <div className="mt-1 text-2xl font-black text-white">{round.shopper.name}</div>
                    <div className="mt-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/82">
                      {shopperMessage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="licensed-game-card-dark rounded-[1.75rem] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  Order Board
                </div>
                <div className="mt-3 space-y-3">
                  {round.items.map((item) => (
                    <div key={`${item.id}-${item.name}`} className="flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br ${item.stallTint} text-sm font-black text-slate-950 shadow-[0_10px_18px_rgba(0,0,0,0.22)]`}>
                          {item.name.split(' ')[0][0]}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{item.name}</div>
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-100/56">Stall Item</div>
                        </div>
                      </div>
                      <div className="text-lg font-black text-yellow-300">{formatMoney(item.pricePence)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-[1.15] flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="licensed-game-card-dark rounded-[1.35rem] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60">Total</div>
                  <div className="mt-1 text-xl font-black text-white md:text-2xl">{formatMoney(round.totalPence)}</div>
                </div>
                <div className="licensed-game-card-dark rounded-[1.35rem] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60">Paid</div>
                  <div className="mt-1 text-xl font-black text-emerald-300 md:text-2xl">{formatMoney(round.amountPaidPence)}</div>
                </div>
                <div className="licensed-game-card-dark rounded-[1.35rem] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60">Change</div>
                  <div className="mt-1 text-xl font-black text-yellow-300 md:text-2xl">{formatMoney(round.changeDuePence)}</div>
                </div>
              </div>

              <div className="licensed-game-card-dark rounded-[1.75rem] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Till</div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white/82">Tap to add</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.id}
                      onClick={() => addCurrency(currency)}
                      disabled={!!feedback}
                      className={`flex min-h-[4.25rem] items-center justify-center border border-white/12 bg-gradient-to-br ${currency.tint} px-2 text-center font-black text-slate-950 shadow-[0_12px_20px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
                        currency.type === 'note' ? 'col-span-2 rounded-[1.1rem] text-xs' : 'rounded-full text-sm'
                      }`}
                    >
                      {currency.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="licensed-game-card-dark rounded-[1.75rem] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Change Tray</div>
                    <div className="mt-1 text-2xl font-black text-white">{formatMoney(trayTotalPence)}</div>
                  </div>
                  <button
                    onClick={clearTray}
                    disabled={tray.length === 0 || !!feedback}
                    className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid min-h-[8rem] grid-cols-3 gap-2 rounded-[1.2rem] border border-white/10 bg-white/6 p-3">
                  <AnimatePresence>
                    {tray.map((currency) => (
                      <motion.button
                        key={currency.id}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        onClick={() => removeCurrency(currency.id)}
                        className={`flex min-h-[3rem] items-center justify-center border border-white/10 bg-gradient-to-br ${currency.tint} px-2 text-slate-950 shadow-[0_10px_18px_rgba(0,0,0,0.16)] ${
                          currency.type === 'note' ? 'col-span-2 rounded-[1rem] text-xs font-black' : 'rounded-full text-sm font-black'
                        }`}
                      >
                        {currency.label}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {tray.length === 0 && (
                    <div className="col-span-3 flex items-center justify-center text-center text-sm font-bold text-white/42">
                      Build the exact change for this customer.
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={tray.length === 0 || !!feedback}
                    className="ui-button-primary licensed-submit-button mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-45 md:text-base"
                >
                  <Coins className="h-5 w-5" />
                  Give Change
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/18 backdrop-blur-[2px]"
              >
                <div className={`rounded-[2rem] border px-8 py-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.34)] ${
                  feedback === 'correct'
                    ? 'border-emerald-300/60 bg-emerald-500/16 text-emerald-300'
                    : 'border-rose-300/60 bg-rose-500/16 text-rose-300'
                }`}>
                  <div className="text-4xl font-black">{feedback === 'correct' ? 'Perfect Change!' : 'Count Again!'}</div>
                  <div className="mt-2 text-sm font-bold text-white/82">
                    {feedback === 'correct' ? 'The customer leaves happy and the stall earns a bonus.' : 'That tray total does not match the change due.'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md"
            >
              <div className="licensed-overlay-card flex w-full max-w-md flex-col items-center gap-6 p-8 text-center md:p-10">
                <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isVictory ? 'Market Won!' : 'Stall Closed!'}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/54">Final Score</div>
                  <div className="mt-2 text-5xl font-black text-white">{score}</div>
                </div>
                <button
                  onClick={onBack}
                  className="ui-button-primary licensed-submit-button flex w-full items-center justify-center gap-2 py-4 text-lg font-black uppercase tracking-[0.14em] text-white"
                >
                  <Coins className="h-5 w-5" />
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

export default MonsterMarketGame;
