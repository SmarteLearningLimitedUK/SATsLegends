import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, Store, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS } from '../constants';
import fantasyWeaponsPreview from '../assets/monster_market/fantasy_weapons_preview.png';

interface Currency {
  id: string;
  label: string;
  value: number;
  tone: 'silver' | 'gold' | 'copper' | 'aqua' | 'amber';
  type: 'coin' | 'note';
}

interface ShopperProfile {
  name: string;
  title: string;
  crest: string;
  aura: string;
  badge: string;
}

interface MarketItem {
  name: string;
  price: number;
  objectPosition: string;
  scaleClass: string;
}

const CURRENCIES: Currency[] = [
  { id: '10p', label: '10p', value: 0.1, tone: 'silver', type: 'coin' },
  { id: '20p', label: '20p', value: 0.2, tone: 'silver', type: 'coin' },
  { id: '50p', label: '50p', value: 0.5, tone: 'silver', type: 'coin' },
  { id: '1pound', label: '£1', value: 1, tone: 'gold', type: 'coin' },
  { id: '2pound', label: '£2', value: 2, tone: 'gold', type: 'coin' },
  { id: '5pound', label: '£5', value: 5, tone: 'aqua', type: 'note' },
  { id: '10pound', label: '£10', value: 10, tone: 'amber', type: 'note' },
  { id: '1p', label: '1p', value: 0.01, tone: 'copper', type: 'coin' },
  { id: '2p', label: '2p', value: 0.02, tone: 'copper', type: 'coin' },
  { id: '5p', label: '5p', value: 0.05, tone: 'silver', type: 'coin' },
];

const SHOPPERS: ShopperProfile[] = [
  { name: 'Nyx', title: 'Night Bazaar Scout', crest: 'N', aura: 'from-cyan-300/55 via-sky-500/30 to-transparent', badge: 'text-cyan-100' },
  { name: 'Brugo', title: 'Cavern Coin Keeper', crest: 'B', aura: 'from-amber-300/55 via-orange-500/30 to-transparent', badge: 'text-amber-100' },
  { name: 'Vela', title: 'Potion Quartermaster', crest: 'V', aura: 'from-fuchsia-300/55 via-violet-500/30 to-transparent', badge: 'text-fuchsia-100' },
  { name: 'Drak', title: 'Dragon Lane Broker', crest: 'D', aura: 'from-rose-300/55 via-red-500/30 to-transparent', badge: 'text-rose-100' },
  { name: 'Moro', title: 'Forest Relic Trader', crest: 'M', aura: 'from-emerald-300/55 via-lime-500/30 to-transparent', badge: 'text-lime-100' },
  { name: 'Zuri', title: 'Crystal Vault Collector', crest: 'Z', aura: 'from-indigo-300/55 via-blue-500/30 to-transparent', badge: 'text-blue-100' },
];

const ITEMS: MarketItem[] = [
  { name: 'Ranger Bow', price: 12.4, objectPosition: '8% 54%', scaleClass: 'scale-[2.15]' },
  { name: 'Knight Sword', price: 16.8, objectPosition: '78% 56%', scaleClass: 'scale-[2.05]' },
  { name: 'Twin Blade', price: 14.2, objectPosition: '64% 67%', scaleClass: 'scale-[2.1]' },
  { name: 'Battle Axe', price: 15.6, objectPosition: '34% 26%', scaleClass: 'scale-[2.1]' },
  { name: 'War Hammer', price: 18.35, objectPosition: '60% 18%', scaleClass: 'scale-[2.05]' },
  { name: 'Arcane Staff', price: 11.95, objectPosition: '54% 38%', scaleClass: 'scale-[2.1]' },
  { name: 'Tower Shield', price: 17.4, objectPosition: '84% 34%', scaleClass: 'scale-[2]' },
  { name: 'Spiked Barrier', price: 19.2, objectPosition: '92% 34%', scaleClass: 'scale-[2]' },
];

const PAYMENT_OPTIONS = [5, 10, 20, 50];

const TONE_CLASSES: Record<Currency['tone'], string> = {
  silver: 'border-slate-200/70 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.92),rgba(226,232,240,0.92)_24%,rgba(148,163,184,0.92)_72%,rgba(71,85,105,0.96)_100%)] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_12px_22px_rgba(15,23,42,0.18)]',
  gold: 'border-amber-200/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,196,0.98),rgba(253,224,71,0.96)_22%,rgba(251,191,36,0.96)_68%,rgba(146,64,14,0.98)_100%)] text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_12px_24px_rgba(146,64,14,0.18)]',
  copper: 'border-orange-200/70 bg-[radial-gradient(circle_at_30%_28%,rgba(255,237,213,0.98),rgba(251,146,60,0.96)_26%,rgba(194,65,12,0.96)_72%,rgba(124,45,18,0.98)_100%)] text-orange-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_22px_rgba(124,45,18,0.22)]',
  aqua: 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(207,250,254,0.96),rgba(103,232,249,0.92)_48%,rgba(14,116,144,0.96)_100%)] text-cyan-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_22px_rgba(8,47,73,0.18)]',
  amber: 'border-orange-200/80 bg-[linear-gradient(180deg,rgba(255,237,213,0.96),rgba(253,186,116,0.92)_48%,rgba(194,65,12,0.96)_100%)] text-orange-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_22px_rgba(124,45,18,0.18)]',
};

interface MonsterMarketGameProps {
  avatarId: string;
  onBack: () => void;
}

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

const MonsterMarketGame: React.FC<MonsterMarketGameProps> = ({ avatarId, onBack }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [shopper, setShopper] = useState<ShopperProfile>(SHOPPERS[0]);
  const [currentItem, setCurrentItem] = useState<MarketItem | null>(null);
  const [scenario, setScenario] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeNeeded, setChangeNeeded] = useState(0);
  const [tray, setTray] = useState<Currency[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [streak, setStreak] = useState(0);

  const targetScore = 1000;
  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const currentTrayTotal = Number(tray.reduce((sum, item) => sum + item.value, 0).toFixed(2));
  const progress = Math.min((score / targetScore) * 100, 100);

  useEffect(() => {
    generateCustomer();
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const generateCustomer = () => {
    const nextShopper = SHOPPERS[Math.floor(Math.random() * SHOPPERS.length)];
    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    const paid = PAYMENT_OPTIONS.find(option => option > item.price) || 50;

    setShopper(nextShopper);
    setCurrentItem(item);
    setScenario(`Restock ${item.name}`);
    setAmountPaid(paid);
    setChangeNeeded(Number((paid - item.price).toFixed(2)));
    setTray([]);
    setFeedback(null);
  };

  const addToTray = (currency: Currency) => {
    if (feedback) return;
    setTray(prev => [...prev, { ...currency, id: `${currency.id}-${Date.now()}-${Math.random()}` }]);
  };

  const removeFromTray = (id: string) => {
    if (feedback) return;
    setTray(prev => prev.filter(item => item.id !== id));
  };

  const clearTray = () => {
    if (feedback) return;
    setTray([]);
  };

  const handleSubmit = () => {
    if (feedback || tray.length === 0) return;

    if (currentTrayTotal === changeNeeded) {
      setFeedback('correct');
      const timeBonus = Math.floor(timeLeft / 10);
      const updatedScore = score + 100 + timeBonus;
      setScore(updatedScore);
      setStreak(prev => prev + 1);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#fde047'],
      });

      if (updatedScore >= targetScore) {
        setIsVictory(true);
      } else {
        setTimeout(generateCustomer, 1400);
      }
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));

      setTimeout(() => {
        setFeedback(null);
        setTray([]);
      }, 1400);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden border-[8px] border-emerald-950 bg-[linear-gradient(180deg,#0b3133_0%,#0d213f_42%,#041421_100%)] p-2 pt-[env(safe-area-inset-top)] font-sans shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] sm:p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[8%] h-[28%] w-[42%] rounded-full bg-emerald-400/14 blur-3xl" />
        <div className="absolute right-[-12%] top-[18%] h-[36%] w-[44%] rounded-full bg-cyan-400/16 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[18%] h-[34%] w-[46%] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#99f6e4 1.8px, transparent 1.8px)', backgroundSize: '36px 36px' }} />
      </div>

      <div className="z-10 flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col items-center gap-2">
        <GameplayHUD
          title="Monster Market"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-emerald-900"
          accentSoftBg="bg-emerald-100/80"
          accentBorder="border-emerald-200/80"
          progressBar="bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400"
          statLabel="Streak"
          statValue={streak}
        />

        <div className="licensed-board-frame relative flex w-full min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 md:p-4 lg:flex-row lg:gap-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(16,185,129,0.22),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.18),transparent_24%),linear-gradient(180deg,rgba(4,120,87,0.12),rgba(2,6,23,0.48))]" />

          <div className="relative flex w-full flex-shrink-0 flex-row items-center gap-3 rounded-2xl border-2 border-emerald-200/22 bg-[linear-gradient(180deg,rgba(13,148,136,0.84),rgba(4,120,87,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_36px_rgba(2,6,23,0.24)] backdrop-blur-sm lg:w-[37%] lg:flex-col lg:justify-center lg:p-4">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${shopper.aura} opacity-85`} />
            <motion.div
              key={`${shopper.name}-${currentItem?.name || 'order'}`}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.8rem] border border-white/20 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.42),rgba(255,255,255,0.08)_38%,rgba(15,23,42,0.42)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_16px_28px_rgba(2,6,23,0.35)] sm:h-28 sm:w-28 lg:h-36 lg:w-36"
            >
              <div className={`absolute inset-[8%] rounded-[1.4rem] bg-gradient-to-br ${shopper.aura} blur-md`} />
              <div className="relative h-[78%] w-[78%] overflow-hidden rounded-[1.2rem] border border-white/16 bg-slate-950/28">
                {currentItem && (
                  <img
                    src={fantasyWeaponsPreview}
                    alt={currentItem.name}
                    className={`absolute inset-0 h-full w-full object-cover ${currentItem.scaleClass}`}
                    style={{ objectPosition: currentItem.objectPosition }}
                    draggable={false}
                  />
                )}
                <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/16 bg-slate-950/76 text-xs font-black text-white shadow-[0_8px_14px_rgba(2,6,23,0.26)] lg:h-9 lg:w-9 lg:text-base">
                  {shopper.crest}
                </div>
              </div>
            </motion.div>

            <div className="relative flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-white/12 bg-slate-950/32 p-3 backdrop-blur-md">
              <div className="border-b border-white/10 pb-2">
                <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${shopper.badge}`}>{shopper.title}</div>
                <div className="truncate text-lg font-black text-white sm:text-xl lg:text-2xl">{shopper.name}</div>
              </div>
              <div className="grid grid-cols-[4.6rem_1fr] gap-2 rounded-2xl border border-white/10 bg-white/6 p-2.5">
                <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/40">
                  {currentItem && (
                    <img
                      src={fantasyWeaponsPreview}
                      alt={currentItem.name}
                      className={`absolute inset-0 h-full w-full object-cover ${currentItem.scaleClass}`}
                      style={{ objectPosition: currentItem.objectPosition }}
                      draggable={false}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/72">Order</div>
                  <div className="truncate text-sm font-black text-white sm:text-base lg:text-lg">{currentItem?.name || scenario}</div>
                  <div className="mt-1 text-[11px] font-semibold leading-tight text-white/68 lg:text-sm">{scenario}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-emerald-950/26 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/68">Paid</div>
                  <div className="text-lg font-black text-emerald-300 sm:text-xl lg:text-2xl">{formatMoney(amountPaid)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-amber-950/24 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/68">Change</div>
                  <div className="text-lg font-black text-amber-300 sm:text-xl lg:text-2xl">{formatMoney(changeNeeded)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col gap-2 md:flex-row md:gap-3">
            <div className="flex min-h-0 flex-[3.15] flex-col rounded-2xl border-2 border-cyan-200/18 bg-[linear-gradient(180deg,rgba(11,84,83,0.92),rgba(5,65,72,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_36px_rgba(2,6,23,0.28)] md:rounded-[2rem]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 md:text-sm">
                  <Store className="h-4 w-4" /> Till
                </h3>
                <span className="rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/76">
                  Tap To Add
                </span>
              </div>

              <div className="grid flex-1 auto-rows-[minmax(3.75rem,1fr)] grid-cols-4 gap-2 md:auto-rows-[minmax(4.5rem,1fr)] md:gap-3">
                {CURRENCIES.map(currency => (
                  <button
                    key={currency.id}
                    onClick={() => addToTray(currency)}
                    disabled={!!feedback}
                    className={`relative flex min-h-[3.75rem] items-center justify-center overflow-hidden border-2 font-black transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[4.5rem] ${currency.type === 'note' ? 'col-span-2 rounded-[1.1rem] text-sm md:text-base' : 'rounded-full text-sm md:text-base'} ${TONE_CLASSES[currency.tone]}`}
                  >
                    <span className="pointer-events-none absolute inset-x-[15%] top-[10%] h-[20%] rounded-full bg-white/28 blur-[1px]" />
                    {currency.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex min-h-0 flex-[2.05] flex-col rounded-2xl border-2 border-cyan-200/16 bg-[linear-gradient(180deg,rgba(9,32,49,0.96),rgba(7,18,32,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_36px_rgba(2,6,23,0.3)] md:rounded-[2rem]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 md:text-sm">
                  <Coins className="h-4 w-4" /> Tray
                </h3>
                <span className="text-base font-black text-white md:text-2xl">{formatMoney(currentTrayTotal)}</span>
              </div>

              <div className="licensed-game-card-dark grid min-h-0 flex-1 auto-rows-[minmax(2.85rem,auto)] grid-cols-3 content-start gap-2 rounded-[1.35rem] border border-white/10 bg-black/32 p-2.5 md:auto-rows-[minmax(3.5rem,auto)]">
                <AnimatePresence>
                  {tray.map(item => (
                    <motion.button
                      key={item.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => removeFromTray(item.id)}
                      disabled={!!feedback}
                      className={`flex min-h-[2.85rem] items-center justify-center border font-black transition-opacity hover:opacity-80 md:min-h-[3.5rem] ${item.type === 'note' ? 'col-span-2 rounded-xl text-[11px] md:text-sm' : 'rounded-full text-[11px] md:text-sm'} ${TONE_CLASSES[item.tone]}`}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {tray.length === 0 && (
                  <div className="col-span-3 flex h-full w-full items-center justify-center text-center text-[11px] font-bold text-cyan-100/38 md:text-sm">
                    Tap money from the till to build the exact change.
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={clearTray}
                  disabled={tray.length === 0 || !!feedback}
                  className="rounded-2xl border border-white/12 bg-white/8 py-2.5 text-xs font-black text-white transition-all hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
                >
                  CLEAR
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={tray.length === 0 || !!feedback}
                  className="licensed-submit-button rounded-2xl py-2.5 text-xs font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
                >
                  GIVE CHANGE
                </button>
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 z-20 flex items-center justify-center rounded-[1.3rem] backdrop-blur-md ${feedback === 'correct' ? 'bg-green-500/24' : 'bg-red-500/24'}`}
                  >
                    <span className={`text-2xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] md:text-4xl ${feedback === 'correct' ? 'text-green-300' : 'text-red-400'}`}>
                      {feedback === 'correct' ? 'CORRECT!' : 'WRONG!'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-emerald-700"
        />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            >
              <div className="licensed-overlay-card flex w-full max-w-md flex-col items-center gap-6 p-8 md:p-12">
                <div className={`text-center text-3xl font-black drop-shadow-md md:text-5xl ${isVictory ? 'text-emerald-400' : 'text-red-500'}`}>
                  {isVictory ? 'TOP CASHIER!' : 'SHIFT OVER!'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(value => (
                      <motion.div
                        key={value}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: value * 0.2, type: 'spring' }}
                      >
                        <Star className={`h-12 w-12 md:h-16 md:w-16 ${value <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-emerald-900/50'}`} />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 md:text-sm">Final Score</div>
                  <div className="text-5xl font-black text-white md:text-6xl">{score}</div>
                </div>

                <button
                  onClick={onBack}
                  className="licensed-submit-button w-full rounded-2xl py-4 text-xl font-black text-white transition-all md:py-5"
                >
                  CONTINUE
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
