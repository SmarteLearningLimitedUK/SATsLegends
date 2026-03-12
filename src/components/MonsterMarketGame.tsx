import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Coins, Star } from 'lucide-react';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS } from '../constants';
import confetti from 'canvas-confetti';

interface Currency {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'coin' | 'note';
}

const CURRENCIES: Currency[] = [
  { id: '10p', label: '10p', value: 0.1, color: 'bg-slate-300 border-slate-400 text-slate-700', type: 'coin' },
  { id: '20p', label: '20p', value: 0.2, color: 'bg-slate-300 border-slate-400 text-slate-700', type: 'coin' },
  { id: '50p', label: '50p', value: 0.5, color: 'bg-slate-300 border-slate-400 text-slate-700', type: 'coin' },
  { id: '1pound', label: '£1', value: 1, color: 'bg-yellow-400 border-yellow-600 text-yellow-900', type: 'coin' },
  { id: '2pound', label: '£2', value: 2, color: 'bg-yellow-400 border-yellow-600 text-yellow-900', type: 'coin' },
  { id: '5pound', label: '£5', value: 5, color: 'bg-cyan-200 border-cyan-400 text-cyan-800', type: 'note' },
  { id: '10pound', label: '£10', value: 10, color: 'bg-orange-200 border-orange-400 text-orange-800', type: 'note' },
  { id: '1p', label: '1p', value: 0.01, color: 'bg-orange-600 border-orange-800 text-orange-200', type: 'coin' },
  { id: '2p', label: '2p', value: 0.02, color: 'bg-orange-600 border-orange-800 text-orange-200', type: 'coin' },
  { id: '5p', label: '5p', value: 0.05, color: 'bg-slate-300 border-slate-400 text-slate-700', type: 'coin' },
];

const MONSTERS = ['🟢', '😈', '🧚', '🐉', '🔥', '👁️', '👾', '👑'];

interface MonsterMarketGameProps {
  avatarId: string;
  onBack: () => void;
}

const MonsterMarketGame: React.FC<MonsterMarketGameProps> = ({ avatarId, onBack }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [monster, setMonster] = useState('');
  const [scenario, setScenario] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeNeeded, setChangeNeeded] = useState(0);
  const [tray, setTray] = useState<Currency[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [streak, setStreak] = useState(0);

  const targetScore = 1000;
  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

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
    const randomMonster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    const items = [
      { name: 'Magic Potion', price: 4.50 },
      { name: 'Dragon Egg', price: 12.75 },
      { name: 'Spell Book', price: 8.20 },
      { name: 'Hero Shield', price: 15.40 },
      { name: 'Crystal Ball', price: 6.65 },
      { name: 'Golden Apple', price: 2.35 },
      { name: 'Phoenix Feather', price: 1.90 },
      { name: 'Titan Boots', price: 24.50 },
      { name: 'Invisibility Cloak', price: 35.80 },
      { name: 'Sword of Light', price: 19.99 },
    ];

    const randomItem = items[Math.floor(Math.random() * items.length)];
    const paymentOptions = [5, 10, 20, 50];
    const paid = paymentOptions.find(p => p > randomItem.price) || 50;

    setMonster(randomMonster);
    setScenario(`Shopping for ${randomItem.name}`);
    setAmountPaid(paid);
    setChangeNeeded(Number((paid - randomItem.price).toFixed(2)));
    setTray([]);
    setFeedback(null);
  };

  const formatMoney = (val: number) => `£${val.toFixed(2)}`;

  const currentTrayTotal = Number(tray.reduce((sum, item) => sum + item.value, 0).toFixed(2));

  const addToTray = (currency: Currency) => {
    if (feedback) return;
    setTray(prev => [...prev, { ...currency, id: `${currency.id}-${Date.now()}` }]);
  };

  const removeFromTray = (id: string) => {
    if (feedback) return;
    setTray(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    if (feedback || tray.length === 0) return;

    if (currentTrayTotal === changeNeeded) {
      setFeedback('correct');
      const timeBonus = Math.floor(timeLeft / 10);
      setScore(prev => prev + 100 + timeBonus);
      setStreak(prev => prev + 1);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399']
      });

      if (score + 100 + timeBonus >= targetScore) {
        setIsVictory(true);
      } else {
        setTimeout(generateCustomer, 1500);
      }
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));

      setTimeout(() => {
        setFeedback(null);
        setTray([]);
      }, 1500);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-2 sm:p-4 pt-[env(safe-area-inset-top)] bg-emerald-900 border-[8px] border-emerald-950 font-sans shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
      {/* Market Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(#10b981 2px, transparent 2px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-1.5 md:gap-4 h-full flex-1 min-h-0">
        <GameplayHUD
          title="Monster Market"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-emerald-900"
          accentSoftBg="bg-emerald-100/80"
          accentBorder="border-emerald-200/80"
          progressBar="bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400"
          statLabel="Coins"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 min-h-0 min-w-0 relative flex flex-col lg:flex-row items-stretch justify-center gap-2 md:gap-4 licensed-board-frame p-2 md:p-4 overflow-hidden">

          {/* Customer Area */}
          <div className="w-full lg:w-2/5 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-2 md:gap-4 bg-emerald-800/50 backdrop-blur-sm rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-emerald-700 shadow-inner p-3 md:p-6 min-h-0 flex-shrink-0">

            {/* Monster */}
            <motion.div
              key={monster}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-5xl sm:text-6xl md:text-8xl drop-shadow-2xl flex-shrink-0"
            >
              {monster}
            </motion.div>

            {/* Order Details */}
            <div className="flex-1 lg:w-full bg-emerald-900/80 p-2 md:p-4 rounded-xl md:rounded-2xl border-2 border-emerald-600 shadow-lg flex flex-col justify-center gap-1 md:gap-2 min-w-0 min-h-0">
              <div className="flex flex-col border-b border-emerald-700 pb-1">
                <span className="text-emerald-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider">Order</span>
                <span className="text-sm sm:text-base md:text-xl font-black text-white truncate">{scenario}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm md:text-lg font-bold text-emerald-200 border-b border-emerald-700 pb-1">
                <span>Paid:</span>
                <span className="text-base sm:text-lg md:text-2xl text-green-400">{formatMoney(amountPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-sm md:text-xl font-black text-emerald-400 pt-1">
                <span>Change:</span>
                <span className="text-lg sm:text-xl md:text-3xl text-yellow-400">{formatMoney(changeNeeded)}</span>
              </div>
            </div>

          </div>

          {/* Till / Tray Area */}
          <div className="w-full lg:w-3/5 flex-1 flex flex-col md:flex-row gap-2 md:gap-4 min-h-0">

            {/* Available Currency */}
            <div className="flex-[3] bg-emerald-800/80 p-3 md:p-5 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-emerald-600 shadow-xl overflow-hidden flex flex-col">
              <h3 className="text-emerald-300 font-bold mb-2 flex items-center gap-1 md:gap-2 text-[10px] md:text-base leading-none">
                <Store className="w-4 h-4" /> Till
              </h3>
              <div className="flex flex-wrap gap-1 sm:gap-2 flex-1 content-start overflow-y-auto hide-scrollbar pt-1">
                {CURRENCIES.map(currency => (
                  <button
                    key={currency.id}
                    onClick={() => addToTray(currency)}
                    disabled={!!feedback}
                    className={`
                      ${currency.type === 'note' ? 'w-12 h-6 md:w-20 md:h-10 rounded text-[10px] md:text-sm' : 'w-8 h-8 md:w-14 md:h-14 rounded-full text-[10px] md:text-sm'}
                      ${currency.color} border-2 shadow-md flex items-center justify-center font-black drop-shadow-sm
                      hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {currency.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Tray */}
            <div className="flex-[2] bg-emerald-900 p-3 md:p-5 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-emerald-700 shadow-inner flex flex-col min-h-0 relative">
              <h3 className="text-emerald-400 font-bold mb-2 flex items-center justify-between text-[10px] md:text-sm leading-none">
                <span className="flex items-center gap-1"><Coins className="w-4 h-4" /> Tray</span>
                <span className="text-sm md:text-xl text-white drop-shadow-md">{formatMoney(currentTrayTotal)}</span>
              </h3>

              <div className="flex-1 rounded-xl p-2 min-h-0 flex flex-wrap content-start gap-1 overflow-y-auto hide-scrollbar licensed-game-card-dark bg-black/40 border border-white/10">
                <AnimatePresence>
                  {tray.map(item => (
                    <motion.button
                      key={item.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => removeFromTray(item.id)}
                      disabled={!!feedback}
                      className={`
                        ${item.type === 'note' ? 'w-10 h-5 md:w-14 md:h-7 rounded-sm text-[8px] md:text-xs' : 'w-6 h-6 md:w-10 md:h-10 rounded-full text-[8px] md:text-xs'}
                        ${item.color} border shadow-sm flex items-center justify-center font-bold drop-shadow-sm
                        hover:opacity-80 transition-opacity flex-shrink-0
                      `}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {tray.length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-emerald-800/80 font-bold text-[10px] md:text-sm text-center">
                    Tap till to give change
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={tray.length === 0 || !!feedback}
                className="mt-2 w-full py-2 text-white text-xs md:text-lg font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed licensed-submit-button"
              >
                GIVE CHANGE
              </button>

              {/* Feedback Overlay */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 flex items-center justify-center rounded-[1rem] backdrop-blur-md z-20 ${feedback === 'correct' ? 'bg-green-500/30' : 'bg-red-500/30'}`}
                  >
                    <span className={`text-2xl md:text-4xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] ${feedback === 'correct' ? 'text-green-300' : 'text-red-400'}`}>
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

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-default pointer-events-auto"
            >
              <div className="licensed-overlay-card p-8 md:p-12 flex flex-col items-center gap-6 max-w-md w-full">
                <div className={`text-3xl md:text-5xl font-black ${isVictory ? 'text-emerald-400' : 'text-red-500'} drop-shadow-md text-center`}>
                  {isVictory ? 'TOP CASHIER!' : 'SHIFT OVER!'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                      <motion.div
                        key={s}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: s * 0.2, type: 'spring' }}
                      >
                        <Star className={`w-12 h-12 md:w-16 md:h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-emerald-900/50'}`} />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="text-center">
                  <div className="text-emerald-700 font-black uppercase tracking-widest text-[10px] md:text-sm">Final Score</div>
                  <div className="text-5xl md:text-6xl font-black text-white drop-shadow-sm">{score}</div>
                </div>

                <button
                  onClick={onBack}
                  className="w-full py-4 md:py-5 text-white text-xl font-black rounded-2xl transition-all licensed-submit-button"
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
