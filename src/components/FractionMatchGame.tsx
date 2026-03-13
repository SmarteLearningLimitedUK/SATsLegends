import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer } from './GameIcons';

interface FractionMatchGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Card {
  id: string;
  pairId: string;
  display: string;
  type: 'fraction' | 'equivalent' | 'visual';
  isFlipped: boolean;
  isMatched: boolean;
}

const FRACTION_PAIRS = [
  { id: 'half', fraction: '1/2', equivalent: '0.5', visual: '50%' },
  { id: 'quarter', fraction: '1/4', equivalent: '0.25', visual: '25%' },
  { id: 'three-quarters', fraction: '3/4', equivalent: '0.75', visual: '75%' },
  { id: 'third', fraction: '1/3', equivalent: '2/6', visual: '33.3%' },
  { id: 'two-thirds', fraction: '2/3', equivalent: '4/6', visual: '66.6%' },
  { id: 'fifth', fraction: '1/5', equivalent: '0.2', visual: '20%' },
  { id: 'two-fifths', fraction: '2/5', equivalent: '0.4', visual: '40%' },
  { id: 'tenth', fraction: '1/10', equivalent: '0.1', visual: '10%' },
  { id: 'three-tenths', fraction: '3/10', equivalent: '0.3', visual: '30%' },
  { id: 'hundredth', fraction: '1/100', equivalent: '0.01', visual: '1%' },
];

const FractionMatchGame: React.FC<FractionMatchGameProps> = ({ 
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
  
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 500 + (levelId * 200);

  const initializeGame = useCallback(() => {
    const numPairs = Math.min(4 + Math.floor(levelId / 2), 8);
    const selectedPairs = [...FRACTION_PAIRS].sort(() => Math.random() - 0.5).slice(0, numPairs);
    
    const newCards: Card[] = [];
    selectedPairs.forEach(pair => {
      // Randomly decide if we match fraction with equivalent or visual
      const useVisual = Math.random() > 0.5;
      
      newCards.push({
        id: Math.random().toString(36).substr(2, 9),
        pairId: pair.id,
        display: pair.fraction,
        type: 'fraction',
        isFlipped: false,
        isMatched: false
      });
      
      newCards.push({
        id: Math.random().toString(36).substr(2, 9),
        pairId: pair.id,
        display: useVisual ? pair.visual : pair.equivalent,
        type: useVisual ? 'visual' : 'equivalent',
        isFlipped: false,
        isMatched: false
      });
    });
    
    setCards(newCards.sort(() => Math.random() - 0.5));
    setFlippedIndices([]);
    setStreak(0);
  }, [levelId]);

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    initializeGame();
  }, [levelId, initializeGame]);

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

  const handleCardClick = (index: number) => {
    if (isLocked || cards[index].isFlipped || cards[index].isMatched || isGameOver || isVictory) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setIsLocked(true);
      checkForMatch(newFlippedIndices, newCards);
    }
  };

  const checkForMatch = (indices: number[], currentCards: Card[]) => {
    const [index1, index2] = indices;
    const card1 = currentCards[index1];
    const card2 = currentCards[index2];

    if (card1.pairId === card2.pairId) {
      // Match!
      setTimeout(() => {
        const newCards = [...currentCards];
        newCards[index1].isMatched = true;
        newCards[index2].isMatched = true;
        setCards(newCards);
        setFlippedIndices([]);
        setIsLocked(false);
        
        const points = 50 + (streak * 10);
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        
        // Check if all matched
        if (newCards.every(c => c.isMatched)) {
          // Board cleared bonus
          setScore(prev => prev + 200);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
          setTimeout(initializeGame, 1500);
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        const newCards = [...currentCards];
        newCards[index1].isFlipped = false;
        newCards[index2].isFlipped = false;
        setCards(newCards);
        setFlippedIndices([]);
        setIsLocked(false);
        setStreak(0);
        setScore(prev => Math.max(0, prev - 10)); // Penalty
      }, 1000);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-hidden bg-indigo-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6">
        <GameplayHUD
          title="Fraction Match"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-indigo-900"
          accentSoftBg="bg-indigo-100/80"
          accentBorder="border-indigo-200/80"
          progressBar="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full max-w-3xl grid grid-cols-4 gap-4 p-6 bg-white/50 backdrop-blur-sm rounded-[3rem] border-4 border-indigo-200 shadow-inner">
          {cards.map((card, index) => (
            <div 
              key={card.id}
              className="relative aspect-square perspective-1000"
              onClick={() => handleCardClick(index)}
            >
              <motion.div
                className="w-full h-full relative preserve-3d cursor-pointer"
                animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {/* Front (Hidden) */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl shadow-md border-4 border-indigo-300 flex items-center justify-center">
                  <span className="text-4xl text-white/50 font-black">?</span>
                </div>
                
                {/* Back (Revealed) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl shadow-md border-4 border-indigo-200 flex items-center justify-center overflow-hidden">
                  <div className={`text-3xl sm:text-4xl font-black ${card.isMatched ? 'text-green-500' : 'text-indigo-600'}`}>
                    {card.display}
                  </div>
                  {card.isMatched && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 bg-green-400/20"
                    />
                  )}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-indigo-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-indigo-400 bg-white p-6 shadow-2xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-green-500' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'PERFECT MATCH!' : 'TIME UP!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-gray-500 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-indigo-500 drop-shadow-sm">{score}</div>
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

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FractionMatchGame;
