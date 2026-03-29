import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { CloudCollapseLevelConfig } from '../types';
import { CLOUD_COLLAPSE_LEVELS, AVATARS } from '../constants';
import HUD from '../components/HUD';
import GameBoard from '../components/GameBoard';
import Tutorial from '../components/Tutorial';
import GameActionDock from '../components/GameActionDock';
import AssetIcon from '../components/AssetIcon';
import cloudBackdrop from '../assets/fantasy_hero/demo_bg/background_01.png';
import sparkle from '../assets/fantasy_hero/cloud_collapse/sparkle.png';

interface CloudCollapseGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const CloudCollapseGame: React.FC<CloudCollapseGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const level = CLOUD_COLLAPSE_LEVELS.find((entry) => entry.id === levelId) || CLOUD_COLLAPSE_LEVELS[0];
  const avatar = AVATARS.find((entry) => entry.id === avatarId) || AVATARS[0];

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
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, isVictory, XP]);

  const calculateStars = (currentScore: number, target: number) => {
    if (currentScore >= target * 2) return 3;
    if (currentScore >= target * 1.5) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = calculateStars(XP, level.targetScore);
    setIsVictory(true);
    confetti({
      particleCount: 140,
      spread: 72,
      origin: { y: 0.6 },
      colors: ['#fde047', '#7dd3fc', '#86efac', '#f9a8d4'],
    });
    onVictory(stars, XP);
  };

  const handleTimeUp = () => {
    if (XP >= level.targetScore) {
      handleWin();
      return;
    }

    setIsGameOver(true);
    onGameOver(XP);
  };

  const handleScoreUpdate = (points: number) => {
    setScore((prev) => prev + points);
  };

  const helperText = level.mathTypes.includes('FRACTIONS') && level.mathTypes.includes('DECIMALS')
    ? 'Swap to match 3 equal values across fractions and decimals.'
    : level.mathTypes.includes('FRACTIONS')
      ? 'Swap adjacent gems to match 3 equal fraction values.'
      : 'Swap adjacent gems to match 3 equal decimal values.';

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden p-2 md:p-4">
      <div className="absolute inset-0 bg-cover bg-center opacity-95" style={{ backgroundImage: `url(${cloudBackdrop})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,44,0.62),rgba(8,15,31,0.74)_40%,rgba(7,12,23,0.94)_100%)]" />
      <div className="absolute inset-x-[8%] top-[2%] h-[28%] rounded-[50%] bg-[radial-gradient(circle,rgba(96,165,250,0.22),rgba(96,165,250,0)_62%)] blur-3xl" />
      <motion.div
        animate={{ scale: [0.96, 1.06, 0.96], opacity: [0.14, 0.3, 0.14] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-1/2 top-[44%] h-[34rem] w-[34rem] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.16),rgba(125,211,252,0)_62%)] blur-3xl"
      />
      <motion.img
        src={sparkle}
        alt=""
        animate={{ y: [0, -10, 0], opacity: [0.12, 0.36, 0.12] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-[5%] top-[18%] h-24 w-24 object-contain opacity-30 md:h-32 md:w-32"
        draggable={false}
      />
      <motion.img
        src={sparkle}
        alt=""
        animate={{ y: [0, 10, 0], opacity: [0.1, 0.28, 0.1] }}
        transition={{ duration: 6.1, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute right-[6%] top-[22%] h-20 w-20 object-contain opacity-24 md:h-28 md:w-28"
        draggable={false}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col items-center gap-2 md:gap-3">
        <HUD
          title="Cloud Collapse"
          XP={XP}
          targetScore={level.targetScore}
          timeLeft={timeLeft}
          level={level as CloudCollapseLevelConfig}
          avatar={avatar}
        />

          <div className="casual-panel-strong structured-playfield-frame relative flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(18,28,55,0.985),rgba(8,14,27,0.995))] px-2 py-2 md:rounded-[2.4rem] md:px-4 md:py-4">
          <div className="relative z-10 mb-2 flex w-full shrink-0 items-center justify-between gap-2 px-1 md:mb-3">
            <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] md:px-4 md:py-1.5 md:text-[10px]">
              <AssetIcon name="star" className="h-4 w-4" />
              Crystal Grid
            </div>
            <div className="rounded-full bg-slate-950/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:text-[10px]">
              {level.gridSize} x {level.gridSize}
            </div>
          </div>

          <div className="relative z-10 mb-2 w-full shrink-0 px-2 text-center md:mb-3">
            <div className="mx-auto max-w-3xl rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,34,0.92),rgba(7,12,23,0.96))] px-3 py-2 text-[10px] font-bold text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:rounded-[1.4rem] md:px-4 md:py-2.5 md:text-sm">
              {helperText}
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
            <GameBoard
              level={level}
              onScoreUpdate={handleScoreUpdate}
              onMatch={() => undefined}
            />
          </div>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.88, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              className="app-modal-panel casual-modal-panel relative flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-[2rem] p-5 text-center md:max-w-lg md:rounded-[2.6rem] md:p-8"
            >
              <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] md:text-xs">
                <AssetIcon name={isVictory ? 'trophy' : 'timer'} className="h-4 w-4" />
                {isVictory ? 'Crystal Cleared' : 'Out of Time'}
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                {isVictory ? 'Victory' : 'Try Again'}
              </h2>

              {isVictory && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((starIndex) => (
                    <motion.div
                      key={starIndex}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: starIndex * 0.12, type: 'spring', stiffness: 220 }}
                      className="rounded-full bg-white/8 p-2"
                    >
                      <AssetIcon
                        name="star"
                        className={`h-8 w-8 md:h-10 md:w-10 ${starIndex <= calculateStars(XP, level.targetScore) ? '' : 'opacity-25 grayscale'}`}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="grid w-full grid-cols-2 gap-3">
                <div className="casual-panel-surface rounded-[1.2rem] p-3 md:rounded-[1.5rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 md:text-[10px]">XP</div>
                  <div className="mt-1 text-2xl font-black text-white md:text-4xl">{XP}</div>
                </div>
                <div className="casual-panel-surface rounded-[1.2rem] p-3 md:rounded-[1.5rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 md:text-[10px]">Target</div>
                  <div className="mt-1 text-2xl font-black text-white md:text-4xl">{level.targetScore}</div>
                </div>
              </div>

              <button
                onClick={onBack}
                className="fantasy-cta-button w-full px-6 py-3 text-sm uppercase tracking-[0.18em] md:px-8 md:py-4 md:text-base"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
};

export default CloudCollapseGame;
