import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Coins, Store } from './GameIcons';

interface MonsterMarketGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Currency {
  id: string;
  value: number; // in pence to avoid floating point issues
  label: string;
  type: 'note' | 'coin';
  color: string;
}

const CURRENCIES: Currency[] = [
  { id: '1000', value: 1000, label: '£10', type: 'note', color: 'bg-orange-200 border-orange-400 text-orange-800' },
  { id: '500', value: 500, label: '£5', type: 'note', color: 'bg-teal-200 border-teal-400 text-teal-800' },
  { id: '200', value: 200, label: '£2', type: 'coin', color: 'bg-yellow-300 border-yellow-500 text-yellow-900' },
  { id: '100', value: 100, label: '£1', type: 'coin', color: 'bg-yellow-300 border-yellow-500 text-yellow-900' },
  { id: '50', value: 50, label: '50p', type: 'coin', color: 'bg-slate-300 border-slate-400 text-slate-700' },
  { id: '20', value: 20, label: '20p', type: 'coin', color: 'bg-slate-300 border-slate-400 text-slate-700' },
  { id: '10', value: 10, label: '10p', type: 'coin', color: 'bg-slate-300 border-slate-400 text-slate-700' },
  { id: '5', value: 5, label: '5p', type: 'coin', color: 'bg-slate-300 border-slate-400 text-slate-700' },
  { id: '2', value: 2, label: '2p', type: 'coin', color: 'bg-amber-600 border-amber-800 text-amber-100' },
  { id: '1', value: 1, label: '1p', type: 'coin', color: 'bg-amber-600 border-amber-800 text-amber-100' },
];

const MONSTERS = ['👾', '👽', '👻', '🤖', '🎃', '👹', '👺', '🤡'];

const formatMoney = (pence: number) => {
  return `£${(pence / 100).toFixed(2)}`;
};

const MonsterMarketGame: React.FC<MonsterMarketGameProps> = ({ 
  levelId, 
  avatarId, 
  onVictory, 
  onGameOver, 
  onBack 
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  
  const [targetCost, setTargetCost] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeNeeded, setChangeNeeded] = useState(0);
  const [scenario, setScenario] = useState('');
  const [tray, setTray] = useState<Currency[]>([]);
  const [monster, setMonster] = useState(MONSTERS[0]);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);

  const generateCustomer = useCallback(() => {
    // Higher levels = more complex amounts
    const maxPence = levelId > 2 ? 2000 : 1000; // £20 or £10 max
    
    let cost = 0;
    let scenarioText = '';

    // SATs style word problems
    if (Math.random() > 0.5 && levelId > 1) {
      const quantity = Math.floor(Math.random() * 4) + 2; // 2 to 5 items
      const itemCost = Math.floor(Math.random() * 300) + 50; // 50p to £3.50
      cost = quantity * itemCost;
      scenarioText = `Bought ${quantity} items for ${formatMoney(itemCost)} each.`;
    } else {
      cost = Math.floor(Math.random() * (maxPence - 50)) + 50;
      if (levelId <= 2) {
        cost = Math.round(cost / 5) * 5;
      }
      scenarioText = `Total cost: ${formatMoney(cost)}`;
    }

    // Determine paid amount (always higher than cost, usually a round note)
    let paid = 0;
    if (cost < 500) paid = 500; // £5
    else if (cost < 1000) paid = 1000; // £10
    else paid = 2000; // £20

    setTargetCost(cost);
    setAmountPaid(paid);
    setChangeNeeded(paid - cost);
    setScenario(scenarioText);
    setTray([]);
    setMonster(MONSTERS[Math.floor(Math.random() * MONSTERS.length)]);
    setFeedback(null);
  }, [levelId]);

  useEffect(() => {
    setTimeLeft(90 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    generateCustomer();
  }, [levelId, generateCustomer]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && !feedback) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, isVictory, feedback]);

  const handleTimeUp = () => {
    if (score >= targetScore) {
      handleWin();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleWin = () => {
    const stars = score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFFFFF', '#87CEEB']
    });
    onVictory(stars, score);
  };

  const addToTray = (currency: Currency) => {
    if (feedback || isGameOver || isVictory) return;
    setTray(prev => [...prev, { ...currency, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeFromTray = (id: string) => {
    if (feedback || isGameOver || isVictory) return;
    setTray(prev => prev.filter(item => item.id !== id));
  };

  const currentTrayTotal = tray.reduce((sum, item) => sum + item.value, 0);

  const handleSubmit = () => {
    if (feedback || isGameOver || isVictory) return;

    if (currentTrayTotal === changeNeeded) {
      setFeedback('correct');
      const points = 100 + (streak * 20);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399']
      });

      setTimeout(generateCustomer, 1500);
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
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-y-auto overflow-x-hidden bg-emerald-900 font-sans">
      {/* Market Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(#10b981 2px, transparent 2px)', 
        backgroundSize: '40px 40px' 
      }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6 h-full flex-1">
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
        <div className="w-full flex-1 relative flex flex-col items-center gap-6">
          
          {/* Customer Area */}
          <div className="w-full max-w-3xl bg-emerald-800/50 backdrop-blur-sm rounded-[3rem] border-4 border-emerald-700 shadow-inner p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Monster */}
            <motion.div 
              key={monster}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-9xl drop-shadow-2xl"
            >
              {monster}
            </motion.div>

            {/* Order Details */}
            <div className="flex-1 bg-emerald-900/80 p-6 rounded-3xl border-2 border-emerald-600 shadow-lg flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-1 border-b border-emerald-700 pb-3">
                <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Customer Order</span>
                <span className="text-2xl font-black text-white">{scenario}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold text-emerald-200 border-b border-emerald-700 pb-2">
                <span>Amount Paid:</span>
                <span className="text-3xl text-green-400">{formatMoney(amountPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black text-emerald-400 pt-2">
                <span>Change Needed:</span>
                <span className="text-4xl text-yellow-400">{formatMoney(changeNeeded)}</span>
              </div>
            </div>

          </div>

          {/* Till / Tray Area */}
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Available Currency */}
            <div className="lg:col-span-2 bg-emerald-800/80 p-6 rounded-[2rem] border-4 border-emerald-600 shadow-xl">
              <h3 className="text-emerald-300 font-bold mb-4 flex items-center gap-2">
                <Store className="w-5 h-5" /> Till
              </h3>
              <div className="flex flex-wrap gap-3">
                {CURRENCIES.map(currency => (
                  <button
                    key={currency.id}
                    onClick={() => addToTray(currency)}
                    disabled={!!feedback}
                    className={`
                      ${currency.type === 'note' ? 'w-24 h-12 rounded-md' : 'w-14 h-14 rounded-full'}
                      ${currency.color} border-2 shadow-md flex items-center justify-center font-black text-lg
                      hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {currency.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Tray */}
            <div className="bg-emerald-900 p-6 rounded-[2rem] border-4 border-emerald-700 shadow-inner flex flex-col">
              <h3 className="text-emerald-400 font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Coins className="w-5 h-5" /> Change Tray</span>
                <span className="text-2xl text-white">{formatMoney(currentTrayTotal)}</span>
              </h3>
              
              <div className="flex-1 rounded-xl p-4 min-h-[150px] flex flex-wrap content-start gap-2 overflow-y-auto licensed-game-card-dark">
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
                        ${item.type === 'note' ? 'w-16 h-8 rounded-sm text-xs' : 'w-10 h-10 rounded-full text-xs'}
                        ${item.color} border-2 shadow-sm flex items-center justify-center font-bold
                        hover:opacity-80 transition-opacity
                      `}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {tray.length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-emerald-800 font-bold">
                    Add coins/notes here
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={tray.length === 0 || !!feedback}
                className="mt-4 w-full py-4 text-white text-xl font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed licensed-submit-button"
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
                    className={`absolute inset-0 flex items-center justify-center rounded-[2rem] backdrop-blur-sm z-20 ${feedback === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                  >
                    <span className={`text-5xl font-black drop-shadow-lg ${feedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-emerald-900 p-12 rounded-[3rem] border-8 border-emerald-600 shadow-2xl flex flex-col items-center gap-8 max-w-md w-full">
              <div className={`text-5xl font-black ${isVictory ? 'text-emerald-400' : 'text-red-500'} drop-shadow-md text-center`}>
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-emerald-700'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-emerald-500 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-white drop-shadow-sm">{score}</div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-5 text-white text-2xl font-black rounded-2xl transition-all licensed-submit-button"
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
