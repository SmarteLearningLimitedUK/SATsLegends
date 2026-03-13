import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Target } from './GameIcons';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({ 
  levelId, 
  avatarId, 
  onVictory, 
  onGameOver, 
  onBack 
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  
  const [targetAngle, setTargetAngle] = useState(45);
  const [playerAngle, setPlayerAngle] = useState(90);
  const [isFiring, setIsFiring] = useState(false);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);
  const [streak, setStreak] = useState(0);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 500 + (levelId * 200);
  
  // Tolerance gets stricter on higher levels
  const tolerance = Math.max(2, 10 - levelId);

  const generateNewTarget = () => {
    // Generate angles in increments of 5 for easier playability, or 1 for hard mode
    const increment = levelId > 3 ? 1 : 5;
    const min = 10;
    const max = 170;
    let newAngle = Math.floor((Math.random() * (max - min + 1) + min) / increment) * increment;
    
    // Ensure it's different from the last one
    if (newAngle === targetAngle) {
      newAngle = newAngle + 15 > 170 ? newAngle - 15 : newAngle + 15;
    }
    setTargetAngle(newAngle);
    setPlayerAngle(90); // Reset cannon to straight up
    setFeedback(null);
  };

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    generateNewTarget();
  }, [levelId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && !isFiring) {
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
  }, [timeLeft, isGameOver, isVictory, isFiring]);

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

  const handleFire = () => {
    if (isFiring || isGameOver || isVictory) return;
    
    setIsFiring(true);
    
    // Wait for animation to reach target
    setTimeout(() => {
      const diff = Math.abs(playerAngle - targetAngle);
      const isHit = diff <= tolerance;
      
      setFeedback(isHit ? 'hit' : 'miss');
      
      if (isHit) {
        const points = 100 + (streak * 20) + (tolerance <= 5 ? 50 : 0);
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.4 }
        });
      } else {
        setStreak(0);
        setScore(prev => Math.max(0, prev - 20));
      }
      
      // Reset and next target
      setTimeout(() => {
        setIsFiring(false);
        if (isHit) {
          generateNewTarget();
        }
      }, 1500);
      
    }, 600); // 600ms matches the flight animation duration
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  // Calculate positions on the semi-circle
  // 0 degrees is right (180 in standard math), 180 is left (0 in standard math)
  // We'll map 0-180 to a standard SVG arc where 0 is right, 90 is top, 180 is left
  const getCoordinates = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    // SVG coordinates: 0,0 is top-left. We want center bottom to be origin.
    // So x = center - cos(angle)*radius, y = bottom - sin(angle)*radius
    return {
      x: 50 - Math.cos(rad) * radius, // percentage
      y: 100 - Math.sin(rad) * radius // percentage
    };
  };

  const targetPos = getCoordinates(targetAngle, 40); // 40% radius

  return (
    <div className="h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden licensed-playfield-bg">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-2 md:gap-6 h-full flex-1 min-h-0">
        <GameplayHUD
          title="Angle Arena"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-sky-900"
          accentSoftBg="bg-sky-100/80"
          accentBorder="border-sky-200/80"
          progressBar="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative licensed-board-frame overflow-hidden flex flex-col items-center justify-end pb-4 md:pb-8">
          
          {/* Protractor / Arena Background */}
          <div className="absolute bottom-0 w-[88%] md:w-[80%] aspect-[2/1] border-t-4 border-l-4 border-r-4 border-slate-600 rounded-t-full opacity-30" />
          <div className="absolute bottom-0 w-[68%] md:w-[60%] aspect-[2/1] border-t-2 border-l-2 border-r-2 border-slate-500 border-dashed rounded-t-full opacity-20" />
          <div className="absolute bottom-0 w-[48%] md:w-[40%] aspect-[2/1] border-t-2 border-l-2 border-r-2 border-slate-500 border-dashed rounded-t-full opacity-20" />
          
          {/* Angle Markers */}
          {[0, 30, 60, 90, 120, 150, 180].map(angle => {
            const pos = getCoordinates(angle, 42);
            return (
              <div 
                key={angle} 
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 md:text-sm"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {angle}°
              </div>
            );
          })}

          {/* Target */}
          <motion.div 
            className="absolute h-12 w-12 md:h-16 md:w-16 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-ping" />
            <Target className="h-9 w-9 md:h-12 md:w-12 text-red-500" />
            {/* Show target angle only on lower levels */}
            {levelId <= 2 && (
              <div className="absolute -top-7 md:-top-8 bg-slate-800 text-white px-2 py-1 rounded text-[10px] md:text-xs font-bold border border-slate-600">
                {targetAngle}°
              </div>
            )}
          </motion.div>

          {/* Projectile */}
          <AnimatePresence>
            {isFiring && (
              <motion.div
                initial={{ left: '50%', top: '100%', scale: 0.5, opacity: 1 }}
                animate={{ 
                  left: `${getCoordinates(playerAngle, 40).x}%`, 
                  top: `${getCoordinates(playerAngle, 40).y}%`,
                  scale: 1
                }}
                exit={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute w-6 h-6 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] -translate-x-1/2 -translate-y-1/2 z-20"
              />
            )}
          </AnimatePresence>

          {/* Feedback Text */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.5 }}
                animate={{ opacity: 1, y: -50, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={`absolute top-1/3 text-2xl md:text-4xl font-black drop-shadow-lg z-30 ${feedback === 'hit' ? 'text-green-400' : 'text-red-500'}`}
              >
                {feedback === 'hit' ? 'BULLSEYE!' : 'MISS!'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cannon / Player */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Cannon Barrel */}
            <motion.div 
              className="absolute bottom-7 md:bottom-8 h-20 w-7 md:h-24 md:w-8 bg-slate-400 rounded-t-lg origin-bottom border-[3px] md:border-4 border-slate-500 shadow-lg"
              animate={{ rotate: playerAngle - 90 }} // 90 is straight up, so subtract 90
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="absolute top-0 left-0 w-full h-4 bg-slate-600 rounded-t-sm" />
            </motion.div>
            
            {/* Cannon Base */}
            <div className="w-20 h-14 md:w-24 md:h-16 bg-slate-600 rounded-t-full border-4 border-slate-700 shadow-2xl flex items-center justify-center relative z-10 mt-12 md:mt-16">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-800 rounded-full border-2 border-slate-500" />
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-3 left-3 right-3 md:bottom-8 md:left-8 md:right-8 flex items-center justify-between gap-3 md:gap-8 licensed-overlay-card p-3 md:p-6 z-30">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2">
              <div className="flex justify-between text-[11px] md:text-base text-slate-300 font-bold">
                <span>0°</span>
                <span className="text-cyan-400 text-xl">{playerAngle}°</span>
                <span>180°</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="180" 
                value={playerAngle}
                onChange={(e) => setPlayerAngle(parseInt(e.target.value))}
                disabled={isFiring}
                className="w-full h-3 md:h-4 bg-amber-100/70 rounded-lg appearance-none cursor-pointer licensed-slider"
              />
            </div>
            
            <button
              onClick={handleFire}
              disabled={isFiring}
              className={`px-5 py-3 md:px-10 md:py-4 rounded-2xl font-black text-lg md:text-2xl transition-all licensed-answer-button ${
                isFiring 
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-red-500 text-white shadow-[0_6px_0_#991b1b] hover:translate-y-1 hover:shadow-[0_2px_0_#991b1b] active:translate-y-2 active:shadow-none'
              }`}
            >
              FIRE!
            </button>
          </div>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-sky-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="app-modal-panel licensed-overlay-card w-full max-w-md flex flex-col items-center gap-5 p-6 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-green-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'SHARPSHOOTER!' : 'OUT OF TIME!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-slate-400 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-white drop-shadow-sm">{score}</div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-5 text-2xl font-black rounded-2xl transition-all licensed-submit-button"
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

export default AngleArenaGame;
