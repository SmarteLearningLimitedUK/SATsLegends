import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  CloudCollapseLevelConfig,
  AvatarData
} from '../types';
import { CLOUD_COLLAPSE_LEVELS, AVATARS } from '../constants';
import HUD from './HUD';
import GameBoard from './GameBoard';
import Tutorial from './Tutorial';
import GameActionDock from './GameActionDock';
import { Star } from './GameIcons';

interface CloudCollapseGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const CloudCollapseGame: React.FC<CloudCollapseGameProps> = ({ 
  levelId, 
  avatarId, 
  onVictory, 
  onGameOver, 
  onBack 
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const level = CLOUD_COLLAPSE_LEVELS.find(l => l.id === levelId) || CLOUD_COLLAPSE_LEVELS[0];
  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  useEffect(() => {
    setTimeLeft(level.duration);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
  }, [level]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory) {
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
  }, [timeLeft, isGameOver, isVictory]);

  const handleTimeUp = () => {
    if (score >= level.targetScore) {
      handleWin();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleWin = () => {
    const stars = calculateStars(score, level.targetScore);
    setIsVictory(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFFFFF', '#87CEEB']
    });
    onVictory(stars, score);
  };

  const calculateStars = (score: number, target: number) => {
    if (score >= target * 2) return 3;
    if (score >= target * 1.5) return 2;
    return 1;
  };

  const handleScoreUpdate = (points: number) => {
    setScore(prev => prev + points);
  };

  return (
    <div className="cloud-bg h-full w-full flex flex-col items-center p-2 md:p-4 relative overflow-hidden">
      {/* Animated Clouds */}
      <div className="cloud w-64 h-24 top-20" style={{ animationDuration: '25s' }} />
      <div className="cloud w-48 h-16 top-40" style={{ animationDuration: '40s', animationDelay: '-10s' }} />
      <div className="cloud w-80 h-32 bottom-20" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
      <div className="cloud w-40 h-20 top-1/2 -left-20" style={{ animationDuration: '35s', animationDelay: '-15s' }} />
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="z-10 flex h-full w-full min-h-0 flex-1 flex-col items-center gap-2 md:gap-3">
        <HUD 
          title="Cloud Collapse"
          score={score} 
          targetScore={level.targetScore} 
          timeLeft={timeLeft} 
          level={level} 
          avatar={avatar}
        />

        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/15 bg-white/8 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:rounded-[2.6rem] md:p-4">
          <GameBoard
            level={level}
            onScoreUpdate={handleScoreUpdate}
            onMatch={() => {}}
          />
        </div>

        <GameActionDock
          onBack={onBack}
          onHelp={() => setShowTutorial(true)}
          accentClass="text-white"
        />
      </div>

      <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-white/50 bg-white/30 p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:p-12">
              <div className={`text-6xl font-black ${isVictory ? 'text-yellow-400' : 'text-red-500'} drop-shadow-md`}>
                {isVictory ? 'VICTORY!' : 'TIME UP!'}
              </div>

              {isVictory && (
                <div className="flex gap-2">
                  {[1, 2, 3].map(s => (
                    <motion.div
                      key={s}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: s * 0.2 }}
                    >
                      <Star className={`w-16 h-16 ${s <= calculateStars(score, level.targetScore) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-white/80 font-bold uppercase tracking-widest">Final Score</div>
                <div className="text-5xl font-black text-white drop-shadow-md">{score}</div>
              </div>

              <div className="flex flex-col gap-4 w-full mt-4">
                <button 
                  onClick={onBack}
                  className="w-full py-4 text-white text-2xl font-black rounded-2xl transition-all licensed-submit-button"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
};

export default CloudCollapseGame;
