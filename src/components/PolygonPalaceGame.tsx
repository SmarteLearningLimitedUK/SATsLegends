import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Check, X } from './GameIcons';

interface PolygonPalaceGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Shape {
  id: string;
  name: string;
  sides: number;
  isRegular: boolean;
  svg: React.ReactNode;
}

const SHAPES: Shape[] = [
  { id: 'tri_eq', name: 'Equilateral Triangle', sides: 3, isRegular: true, svg: <polygon points="50,10 90,90 10,90" fill="currentColor" /> },
  { id: 'tri_iso', name: 'Isosceles Triangle', sides: 3, isRegular: false, svg: <polygon points="50,10 70,90 30,90" fill="currentColor" /> },
  { id: 'tri_right', name: 'Right Triangle', sides: 3, isRegular: false, svg: <polygon points="10,10 10,90 90,90" fill="currentColor" /> },
  { id: 'quad_sq', name: 'Square', sides: 4, isRegular: true, svg: <rect x="15" y="15" width="70" height="70" fill="currentColor" /> },
  { id: 'quad_rect', name: 'Rectangle', sides: 4, isRegular: false, svg: <rect x="10" y="30" width="80" height="40" fill="currentColor" /> },
  { id: 'quad_rhombus', name: 'Rhombus', sides: 4, isRegular: false, svg: <polygon points="50,10 90,50 50,90 10,50" fill="currentColor" /> },
  { id: 'quad_para', name: 'Parallelogram', sides: 4, isRegular: false, svg: <polygon points="30,20 90,20 70,80 10,80" fill="currentColor" /> },
  { id: 'quad_trap', name: 'Trapezium', sides: 4, isRegular: false, svg: <polygon points="30,20 70,20 90,80 10,80" fill="currentColor" /> },
  { id: 'quad_kite', name: 'Kite', sides: 4, isRegular: false, svg: <polygon points="50,10 80,40 50,90 20,40" fill="currentColor" /> },
  { id: 'pent_reg', name: 'Regular Pentagon', sides: 5, isRegular: true, svg: <polygon points="50,10 90,38 75,85 25,85 10,38" fill="currentColor" /> },
  { id: 'hex_reg', name: 'Regular Hexagon', sides: 6, isRegular: true, svg: <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="currentColor" /> },
  { id: 'oct_reg', name: 'Regular Octagon', sides: 8, isRegular: true, svg: <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="currentColor" /> },
];

interface Question {
  text: string;
  check: (shape: Shape) => boolean;
}

const QUESTIONS: Question[] = [
  { text: 'Select a shape with exactly 3 sides.', check: s => s.sides === 3 },
  { text: 'Select a shape with exactly 4 sides.', check: s => s.sides === 4 },
  { text: 'Select a regular polygon.', check: s => s.isRegular },
  { text: 'Select an irregular polygon.', check: s => !s.isRegular },
  { text: 'Select a quadrilateral.', check: s => s.sides === 4 },
  { text: 'Select a shape with more than 4 sides.', check: s => s.sides > 4 },
  { text: 'Select the Square.', check: s => s.id === 'quad_sq' },
  { text: 'Select the Rhombus.', check: s => s.id === 'quad_rhombus' },
  { text: 'Select the Regular Hexagon.', check: s => s.id === 'hex_reg' },
];

const PolygonPalaceGame: React.FC<PolygonPalaceGameProps> = ({ 
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
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<Shape[]>([]);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 300);

  const generateQuestion = useCallback(() => {
    // Pick a random question
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    setCurrentQuestion(q);

    // Find at least one correct answer
    const correctShapes = SHAPES.filter(s => q.check(s));
    const correctShape = correctShapes[Math.floor(Math.random() * correctShapes.length)];

    // Find incorrect answers
    const incorrectShapes = SHAPES.filter(s => !q.check(s)).sort(() => Math.random() - 0.5);
    
    // Combine and shuffle (4 options total)
    const newOptions = [correctShape, ...incorrectShapes.slice(0, 3)].sort(() => Math.random() - 0.5);
    
    setOptions(newOptions);
    setFeedback(null);
    setSelectedShapeId(null);
  }, []);

  useEffect(() => {
    setTimeLeft(60 + levelId * 15);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    generateQuestion();
  }, [levelId, generateQuestion]);

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

  const handleSelect = (shape: Shape) => {
    if (feedback || isGameOver || isVictory || !currentQuestion) return;

    setSelectedShapeId(shape.id);
    const isCorrect = currentQuestion.check(shape);
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      const comboMultiplier = 1 + (streak * 0.1);
      const points = Math.round(100 * comboMultiplier);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#a855f7', '#d946ef', '#ec4899']
      });
    } else {
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));
    }

    setTimeout(() => {
      generateQuestion();
    }, 1500);
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-y-auto overflow-x-hidden bg-fuchsia-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d946ef 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-6 h-full flex-1">
        <GameplayHUD
          title="Polygon Palace"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-fuchsia-900"
          accentSoftBg="bg-fuchsia-100/80"
          accentBorder="border-fuchsia-200/80"
          progressBar="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative bg-white/50 backdrop-blur-sm rounded-[3rem] border-4 border-fuchsia-200 shadow-inner overflow-hidden flex flex-col items-center p-8">
          
          <div className="bg-white px-8 py-6 rounded-3xl shadow-lg border-2 border-fuchsia-100 mb-12 max-w-2xl w-full text-center">
            <h3 className="text-3xl font-black text-slate-800">
              {currentQuestion?.text}
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
            <AnimatePresence mode="popLayout">
              {options.map((shape) => {
                const isSelected = selectedShapeId === shape.id;
                const isCorrect = currentQuestion?.check(shape);
                
                let buttonStyle = "bg-white border-fuchsia-200 text-fuchsia-500 hover:bg-fuchsia-50 hover:border-fuchsia-300";
                
                if (feedback) {
                  if (isSelected) {
                    buttonStyle = isCorrect 
                      ? "bg-green-100 border-green-400 text-green-600" 
                      : "bg-red-100 border-red-400 text-red-600";
                  } else if (isCorrect) {
                    // Highlight the correct answer if they got it wrong
                    buttonStyle = "bg-green-50 border-green-300 text-green-500";
                  } else {
                    buttonStyle = "bg-white border-slate-200 text-slate-300 opacity-50";
                  }
                }

                return (
                  <motion.button
                    key={shape.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileHover={!feedback ? { scale: 1.05 } : {}}
                    whileTap={!feedback ? { scale: 0.95 } : {}}
                    onClick={() => handleSelect(shape)}
                    disabled={!!feedback}
                    className={`relative aspect-square rounded-3xl border-4 shadow-xl flex flex-col items-center justify-center p-6 transition-colors duration-300 ${buttonStyle}`}
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                      {shape.svg}
                    </svg>
                    
                    {/* Feedback Icons */}
                    {feedback && isSelected && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        {isCorrect ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-fuchsia-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <div className="bg-white p-12 rounded-[3rem] border-8 border-fuchsia-400 shadow-2xl flex flex-col items-center gap-8 max-w-md w-full">
              <div className={`text-5xl font-black ${isVictory ? 'text-green-500' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'ROYAL ARCHITECT!' : 'TIME UP!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-slate-500 font-black uppercase tracking-widest text-sm">Final Score</div>
                <div className="text-6xl font-black text-fuchsia-500 drop-shadow-sm">{score}</div>
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

export default PolygonPalaceGame;
