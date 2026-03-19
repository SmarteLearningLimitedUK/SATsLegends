import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import GameActionDock from '../components/GameActionDock';
import GameplayHUD from '../components/GameplayHUD';
import { Check, Star, X } from '../components/GameIcons';

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
  palette: string;
  glow: string;
}

const SHAPES: Shape[] = [
  { id: 'tri_eq', name: 'Equilateral Triangle', sides: 3, isRegular: true, palette: 'from-amber-300 via-yellow-300 to-orange-400', glow: 'shadow-[0_0_28px_rgba(251,191,36,0.3)]', svg: <polygon points="50,10 90,90 10,90" fill="currentColor" /> },
  { id: 'tri_iso', name: 'Isosceles Triangle', sides: 3, isRegular: false, palette: 'from-rose-300 via-orange-300 to-amber-400', glow: 'shadow-[0_0_28px_rgba(251,146,60,0.28)]', svg: <polygon points="50,10 70,90 30,90" fill="currentColor" /> },
  { id: 'tri_right', name: 'Right Triangle', sides: 3, isRegular: false, palette: 'from-sky-300 via-cyan-300 to-blue-400', glow: 'shadow-[0_0_28px_rgba(56,189,248,0.28)]', svg: <polygon points="10,10 10,90 90,90" fill="currentColor" /> },
  { id: 'quad_sq', name: 'Square', sides: 4, isRegular: true, palette: 'from-cyan-300 via-pink-300 to-rose-400', glow: 'shadow-[0_0_28px_rgba(244,114,182,0.28)]', svg: <rect x="15" y="15" width="70" height="70" fill="currentColor" /> },
  { id: 'quad_rect', name: 'Rectangle', sides: 4, isRegular: false, palette: 'from-blue-300 via-indigo-300 to-sky-400', glow: 'shadow-[0_0_28px_rgba(129,140,248,0.28)]', svg: <rect x="10" y="30" width="80" height="40" fill="currentColor" /> },
  { id: 'quad_rhombus', name: 'Rhombus', sides: 4, isRegular: false, palette: 'from-lime-300 via-emerald-300 to-green-400', glow: 'shadow-[0_0_28px_rgba(74,222,128,0.28)]', svg: <polygon points="50,10 90,50 50,90 10,50" fill="currentColor" /> },
  { id: 'quad_para', name: 'Parallelogram', sides: 4, isRegular: false, palette: 'from-orange-300 via-amber-300 to-yellow-400', glow: 'shadow-[0_0_28px_rgba(251,191,36,0.3)]', svg: <polygon points="30,20 90,20 70,80 10,80" fill="currentColor" /> },
  { id: 'quad_trap', name: 'Trapezium', sides: 4, isRegular: false, palette: 'from-cyan-300 via-sky-300 to-indigo-400', glow: 'shadow-[0_0_28px_rgba(56,189,248,0.28)]', svg: <polygon points="30,20 70,20 90,80 10,80" fill="currentColor" /> },
  { id: 'quad_kite', name: 'Kite', sides: 4, isRegular: false, palette: 'from-sky-300 via-cyan-300 to-pink-400', glow: 'shadow-[0_0_28px_rgba(232,121,249,0.28)]', svg: <polygon points="50,10 80,40 50,90 20,40" fill="currentColor" /> },
  { id: 'pent_reg', name: 'Regular Pentagon', sides: 5, isRegular: true, palette: 'from-emerald-300 via-teal-300 to-cyan-400', glow: 'shadow-[0_0_28px_rgba(45,212,191,0.28)]', svg: <polygon points="50,10 90,38 75,85 25,85 10,38" fill="currentColor" /> },
  { id: 'hex_reg', name: 'Regular Hexagon', sides: 6, isRegular: true, palette: 'from-yellow-300 via-amber-300 to-orange-400', glow: 'shadow-[0_0_28px_rgba(251,191,36,0.3)]', svg: <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="currentColor" /> },
  { id: 'oct_reg', name: 'Regular Octagon', sides: 8, isRegular: true, palette: 'from-sky-300 via-blue-300 to-indigo-400', glow: 'shadow-[0_0_28px_rgba(96,165,250,0.28)]', svg: <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="currentColor" /> },
];

interface Question {
  text: string;
  check: (shape: Shape) => boolean;
}

const QUESTIONS: Question[] = [
  { text: 'Select a shape with exactly 3 sides.', check: (shape) => shape.sides === 3 },
  { text: 'Select a shape with exactly 4 sides.', check: (shape) => shape.sides === 4 },
  { text: 'Select a regular polygon.', check: (shape) => shape.isRegular },
  { text: 'Select an irregular polygon.', check: (shape) => !shape.isRegular },
  { text: 'Select a quadrilateral.', check: (shape) => shape.sides === 4 },
  { text: 'Select a shape with more than 4 sides.', check: (shape) => shape.sides > 4 },
  { text: 'Select the Square.', check: (shape) => shape.id === 'quad_sq' },
  { text: 'Select the Rhombus.', check: (shape) => shape.id === 'quad_rhombus' },
  { text: 'Select the Regular Hexagon.', check: (shape) => shape.id === 'hex_reg' },
];

const PolygonPalaceGame: React.FC<PolygonPalaceGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(65 + (levelId * 15));
  const [streak, setStreak] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<Shape[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 820 + (levelId * 320);
  const progress = Math.min((score / targetScore) * 100, 100);

  const generateQuestion = useCallback(() => {
    const nextQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const correctShapes = SHAPES.filter((shape) => nextQuestion.check(shape));
    const correctShape = correctShapes[Math.floor(Math.random() * correctShapes.length)];
    const incorrectShapes = SHAPES.filter((shape) => !nextQuestion.check(shape)).sort(() => Math.random() - 0.5);

    setCurrentQuestion(nextQuestion);
    setOptions([correctShape, ...incorrectShapes.slice(0, 3)].sort(() => Math.random() - 0.5));
    setFeedback(null);
    setSelectedShapeId(null);
  }, []);

  useEffect(() => {
    setScore(0);
    setTimeLeft(65 + (levelId * 15));
    setStreak(0);
    setFeedback(null);
    setSelectedShapeId(null);
    setIsGameOver(false);
    setIsVictory(false);
    generateQuestion();
  }, [generateQuestion, levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;
    if (timeLeft <= 0) {
      if (score >= targetScore) {
        const stars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
        setIsVictory(true);
        confetti({
          particleCount: 160,
          spread: 72,
          origin: { y: 0.62 },
          colors: ['#fde68a', '#f9a8d4', '#ffffff'],
        });
        onVictory(stars, score);
      } else {
        setIsGameOver(true);
        onGameOver(score);
      }
      return undefined;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore, timeLeft]);

  const handleSelect = (shape: Shape) => {
    if (feedback || isGameOver || isVictory || !currentQuestion) return;

    const isCorrect = currentQuestion.check(shape);
    setSelectedShapeId(shape.id);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      const points = 120 + (streak * 18);
      const newScore = score + points;
      setScore(newScore);
      setStreak((prev) => prev + 1);

      confetti({
        particleCount: 48,
        spread: 52,
        origin: { y: 0.68 },
        colors: ['#f59e0b', '#f472b6', '#60a5fa'],
      });

      setTimeout(() => {
        if (newScore >= targetScore) {
          const stars = newScore >= targetScore * 1.85 ? 3 : newScore >= targetScore * 1.3 ? 2 : 1;
          setIsVictory(true);
          onVictory(stars, newScore);
        } else {
          generateQuestion();
        }
      }, 720);
    } else {
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 30));
      setTimeout(() => {
        generateQuestion();
      }, 720);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#1e1b4b_0%,#111827_42%,#09090b_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[6%] top-[14%] h-28 w-28 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute right-[4%] top-[12%] h-28 w-28 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="absolute bottom-[8%] left-[10%] h-40 w-[36%] rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(120,53,15,0),rgba(120,53,15,0.28)_24%,rgba(41,24,13,0.86)_100%)]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Polygon Palace"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-cyan-950"
          accentSoftBg="bg-cyan-100/86"
          accentBorder="border-cyan-200/88"
          progressBar="bg-gradient-to-r from-cyan-300 via-pink-300 to-amber-300"
          statLabel="Streak"
          statValue={streak}
        />

      <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-2 shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem] md:p-4">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.14))]" />

          <div className="relative z-10 mb-2 rounded-[1.35rem] border border-amber-200/16 bg-[linear-gradient(180deg,rgba(72,35,15,0.9),rgba(36,20,10,0.94))] px-4 py-3 text-center shadow-[0_18px_36px_rgba(0,0,0,0.26)] md:mb-4 md:rounded-[1.8rem]">
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-100/72 md:text-xs">Royal Brief</div>
            <div className="mt-1 text-base font-black leading-tight text-white md:text-3xl">{currentQuestion?.text}</div>
          </div>

          <div className="relative z-10 grid min-h-0 flex-1 grid-cols-2 gap-2 md:gap-3">
            <AnimatePresence mode="popLayout">
              {options.map((shape, index) => {
                const isSelected = selectedShapeId === shape.id;
                const isCorrect = currentQuestion?.check(shape);

                let surfaceClass = 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(15,23,42,0.22))]';
                if (feedback) {
                  if (isSelected && isCorrect) surfaceClass = 'border-emerald-300/55 bg-[linear-gradient(180deg,rgba(16,185,129,0.24),rgba(15,23,42,0.24))]';
                  if (isSelected && !isCorrect) surfaceClass = 'border-rose-300/55 bg-[linear-gradient(180deg,rgba(244,63,94,0.24),rgba(15,23,42,0.24))]';
                  if (!isSelected && isCorrect) surfaceClass = 'border-emerald-200/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.22))]';
                }

                return (
                  <motion.button
                    key={shape.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={!feedback ? { scale: 1.02, y: -2 } : {}}
                    whileTap={!feedback ? { scale: 0.97 } : {}}
                    onClick={() => handleSelect(shape)}
                    disabled={!!feedback}
                    className={`relative flex min-h-0 flex-col overflow-hidden rounded-[1.4rem] border ${surfaceClass} p-2 shadow-[0_22px_34px_rgba(0,0,0,0.24)] md:rounded-[1.8rem] md:p-3 ${shape.glow}`}
                  >
                    <div className={`absolute inset-x-[18%] top-[12%] h-[34%] rounded-full bg-gradient-to-br ${shape.palette} opacity-45 blur-2xl`} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />

                    <div className="relative flex min-h-0 flex-1 flex-col">
                      <div className="relative flex flex-1 items-center justify-center rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.42),rgba(8,15,30,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[1.5rem]">
                        <div className="absolute bottom-[10%] h-4 w-[48%] rounded-full bg-black/32 blur-md md:h-5" />
                        <motion.svg
                          viewBox="0 0 100 100"
                          className={`relative z-10 h-[56%] w-[56%] bg-gradient-to-br ${shape.palette} text-transparent`}
                          animate={feedback === null ? { rotate: [0, 2, -2, 0], y: [0, -1, 0] } : {}}
                          transition={{ duration: 3 + (index * 0.2), repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <defs>
                            <linearGradient id={`polygon-gradient-${shape.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                              <stop offset="38%" stopColor="rgba(255,255,255,0.72)" />
                              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                            </linearGradient>
                          </defs>
                          <g fill={`url(#polygon-gradient-${shape.id})`}>{shape.svg}</g>
                        </motion.svg>
                      </div>

                      <div className="mt-2 rounded-[1rem] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(71,40,16,0.84),rgba(30,20,12,0.94))] px-2.5 py-2 text-center shadow-[0_14px_24px_rgba(0,0,0,0.22)]">
                        <div className="text-[11px] font-black leading-tight text-white md:text-base">{shape.name}</div>
                      </div>
                    </div>

                    {feedback && isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-[0_10px_16px_rgba(0,0,0,0.24)] md:h-11 md:w-11 ${
                          isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      >
                        {isCorrect ? <Check className="h-4 w-4 text-white md:h-5 md:w-5" /> : <X className="h-4 w-4 text-white md:h-5 md:w-5" />}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-cyan-100" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.84, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/66 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-cyan-200/36 bg-[linear-gradient(180deg,#fff7ed,#f5d0fe)] p-6 shadow-2xl md:gap-7 md:p-10">
                <div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isVictory ? 'Gallery Cleared' : 'Time Up'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map((index) => {
                      const earnedStars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
                      return (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.16, type: 'spring' }}
                        >
                          <Star className={`h-14 w-14 ${index <= earnedStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <button onClick={onBack} className="ui-button-primary licensed-submit-button w-full py-4 text-xl font-black text-white transition-all">
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

export default PolygonPalaceGame;
