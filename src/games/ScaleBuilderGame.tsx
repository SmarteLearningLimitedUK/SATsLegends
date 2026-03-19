import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  Ruler,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ScaleBuilderGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Shape {
  type: 'rect' | 'triangle' | 'l-shape';
  baseWidth: number;
  baseHeight: number;
}

interface Level {
  id: number;
  name: string;
  shape: Shape;
  targetScale: number;
  instructions: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'The Foundation',
    shape: { type: 'rect', baseWidth: 60, baseHeight: 40 },
    targetScale: 2.0,
    instructions: 'Scale the foundation to exactly 2.0x its original size.',
  },
  {
    id: 2,
    name: 'Compact Living',
    shape: { type: 'rect', baseWidth: 100, baseHeight: 80 },
    targetScale: 0.5,
    instructions: 'Shrink the living area to exactly 0.5x for a compact design.',
  },
  {
    id: 3,
    name: 'The Gable',
    shape: { type: 'triangle', baseWidth: 80, baseHeight: 60 },
    targetScale: 1.5,
    instructions: 'Expand the roof gable to a 1.5x scale factor.',
  },
  {
    id: 4,
    name: 'The Corner Office',
    shape: { type: 'l-shape', baseWidth: 80, baseHeight: 80 },
    targetScale: 1.25,
    instructions: 'Scale the corner office by 1.25x for more desk space.',
  },
  {
    id: 5,
    name: 'The Grand Hall',
    shape: { type: 'rect', baseWidth: 40, baseHeight: 120 },
    targetScale: 2.25,
    instructions: 'Final challenge: Scale the grand hall to exactly 2.25x.',
  },
];

const GRID_SIZE = 20;

const BlueprintGrid: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 opacity-20">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, #60a5fa 1px, transparent 1px), linear-gradient(to bottom, #60a5fa 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, #60a5fa 2px, transparent 2px), linear-gradient(to bottom, #60a5fa 2px, transparent 2px)',
        backgroundSize: `${GRID_SIZE * 5}px ${GRID_SIZE * 5}px`,
      }}
    />
  </div>
);

const ShapeRenderer: React.FC<{
  shape: Shape;
  scale: number;
  colorClass: string;
  isBase?: boolean;
}> = ({ shape, scale, colorClass, isBase = false }) => {
  const width = shape.baseWidth * scale;
  const height = shape.baseHeight * scale;

  if (shape.type === 'rect') {
    return (
      <div
        className={`absolute border-2 transition-all duration-300 ${colorClass}`}
        style={{
          width,
          height,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {!isBase ? (
          <>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono">
              {width.toFixed(1)} units
            </div>
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] font-mono">
              {height.toFixed(1)} units
            </div>
          </>
        ) : null}
      </div>
    );
  }

  if (shape.type === 'triangle') {
    return (
      <div
        className="absolute transition-all duration-300"
        style={{
          width,
          height,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <path
            d={`M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={colorClass.replace('border-', 'text-')}
          />
        </svg>
        {!isBase ? (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono">
            {width.toFixed(1)} units
          </div>
        ) : null}
      </div>
    );
  }

  const thickness = 30 * scale;
  return (
    <div
      className="absolute transition-all duration-300"
      style={{
        width,
        height,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={`M 0 0 L ${thickness} 0 L ${thickness} ${height - thickness} L ${width} ${height - thickness} L ${width} ${height} L 0 ${height} Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={colorClass.replace('border-', 'text-')}
        />
      </svg>
      {!isBase ? (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono">
          {width.toFixed(1)} units
        </div>
      ) : null}
    </div>
  );
};

const ScaleBuilderGame: React.FC<ScaleBuilderGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentScale, setCurrentScale] = useState(1.0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'success' | 'complete'>('start');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showBase, setShowBase] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);

  const currentLevel = LEVELS[currentLevelIdx];
  const completedLevels = currentLevelIdx + (gameState === 'complete' ? 1 : 0);
  const targetThreshold = useMemo(() => 6 + levelId, [levelId]);

  const finalScore = useMemo(() => {
    const base = 900 + (completedLevels * 220);
    const levelBonus = levelId * 60;
    const penalty = mistakeCount * 90;
    return Math.max(300, base + levelBonus - penalty);
  }, [completedLevels, levelId, mistakeCount]);

  const starRating = useMemo(() => {
    if (mistakeCount <= 1) return 3;
    if (mistakeCount <= 4) return 2;
    return 1;
  }, [mistakeCount]);

  const handleScaleSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentScale(parseFloat(event.target.value));
    setFeedback(null);
  };

  const adjustScale = (delta: number) => {
    setCurrentScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    setFeedback(null);
  };

  const verifyScale = () => {
    const difference = Math.abs(currentScale - currentLevel.targetScale);
    if (difference < 0.01) {
      setFeedback({ type: 'success', message: 'Perfect scale. Structure integrity verified.' });
      setGameState('success');
      return;
    }

    const direction = currentScale < currentLevel.targetScale ? 'larger' : 'smaller';
    setFeedback({ type: 'error', message: `Inaccurate scale. Try making it slightly ${direction}.` });
    setMistakeCount((previous) => previous + 1);
  };

  const proceed = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx((previous) => previous + 1);
      setCurrentScale(1.0);
      setFeedback(null);
      setGameState('playing');
      return;
    }

    setGameState('complete');
  };

  const resetLevel = () => {
    setCurrentScale(1.0);
    setFeedback(null);
  };

  const restartProject = () => {
    setCurrentLevelIdx(0);
    setCurrentScale(1.0);
    setFeedback(null);
    setGameState('start');
    setMistakeCount(0);
  };

  const finishAndContinue = () => {
    onVictory(starRating, finalScore);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0f172a] text-slate-200">
      <header className="z-20 flex h-16 items-center justify-between border-b border-slate-700 bg-slate-900/60 px-3 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 transition-colors hover:bg-slate-700"
            aria-label="Back"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <div className="rounded-lg bg-blue-500 p-2">
            <Ruler className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Scale Builder</h1>
            <p className="text-[10px] uppercase tracking-tight text-slate-400">Architectural Precision Challenge</p>
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <div className="text-right">
            <span className="block text-[10px] uppercase text-slate-500">Project Phase</span>
            <span className="text-xs font-bold text-blue-300">{currentLevel.name}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-right">
            <span className="block text-[10px] uppercase text-slate-500">Level</span>
            <span className="text-xs font-bold text-white">
              {currentLevelIdx + 1} / {LEVELS.length}
            </span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="z-10 flex w-full shrink-0 flex-col gap-5 border-b border-slate-700 bg-slate-900/40 p-4 md:w-72 md:border-b-0 md:border-r md:p-6">
          <section>
            <div className="mb-3 flex items-center gap-2 text-blue-400">
              <Info className="h-4 w-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Instructions</h2>
            </div>
            <p className="text-xs italic leading-relaxed text-slate-400">{currentLevel.instructions}</p>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-500">Target Scale</span>
              <span className="text-lg font-black text-white">{currentLevel.targetScale.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-500">Current Scale</span>
              <span className={`text-lg font-black ${gameState === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {currentScale.toFixed(2)}x
              </span>
            </div>
          </section>

          <section className="mt-auto grid grid-cols-2 gap-2 md:grid-cols-1">
            <button
              onClick={() => setShowBase((previous) => !previous)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-all ${
                showBase ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-500'
              }`}
            >
              <span className="text-[10px] font-bold uppercase">Reference Overlay</span>
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={resetLevel}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <span className="text-[10px] font-bold uppercase">Reset Structure</span>
              <RotateCcw className="h-4 w-4" />
            </button>
          </section>
        </aside>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0f172a] p-3 md:p-0">
          <BlueprintGrid />

          <div className="relative flex h-[min(72vw,500px)] w-[min(72vw,500px)] items-center justify-center rounded-full border border-slate-700/40 md:h-[500px] md:w-[500px]">
            <AnimatePresence>
              {showBase ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.32 }} exit={{ opacity: 0 }} className="absolute">
                  <ShapeRenderer shape={currentLevel.shape} scale={1.0} colorClass="border-slate-400 border-dashed" isBase />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div animate={{ scale: 1 }} className="relative z-10">
              <ShapeRenderer
                shape={currentLevel.shape}
                scale={currentScale}
                colorClass={
                  gameState === 'success'
                    ? 'border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.24)]'
                    : 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.16)]'
                }
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {gameState === 'start' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.06 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/86 p-8 text-center backdrop-blur-sm"
                >
                  <div className="max-w-md">
                    <Sparkles className="mx-auto mb-6 h-12 w-12 text-blue-400" />
                    <h2 className="mb-4 text-3xl font-black italic tracking-tighter text-white">ARCHITECTURAL MASTERY</h2>
                    <p className="mb-8 text-sm leading-relaxed text-slate-400">
                      Resize structures to exact scale factors. Precision is everything.
                    </p>
                    <button
                      onClick={() => setGameState('playing')}
                      className="rounded-full bg-blue-500 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-colors hover:bg-blue-400"
                    >
                      Initialize Blueprint
                    </button>
                  </div>
                </motion.div>
              ) : null}

              {gameState === 'complete' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-8 text-center backdrop-blur-sm"
                >
                  <div className="max-w-md">
                    <Trophy className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
                    <h2 className="mb-2 text-4xl font-black italic tracking-tighter text-white">CERTIFIED ARCHITECT</h2>
                    <p className="mb-6 text-sm leading-relaxed text-slate-400">
                      All structures verified. Spatial precision complete.
                    </p>
                    <div className="mb-6 rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Build Score</div>
                      <div className="mt-1 text-2xl font-black text-white">{finalScore}</div>
                      <div className="mt-1 text-xs font-bold text-blue-300">Stars: {starRating}</div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={finishAndContinue}
                        className="rounded-full bg-emerald-500 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
                      >
                        Continue
                      </button>
                      <button
                        onClick={restartProject}
                        className="rounded-full bg-slate-700 px-10 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-600"
                      >
                        New Project
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {feedback ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute bottom-6 rounded-full border px-6 py-3 shadow-2xl md:bottom-12 ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span className="text-[10px] font-bold uppercase tracking-wide">{feedback.message}</span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <aside className="z-10 flex w-full shrink-0 flex-col gap-6 border-t border-slate-700 bg-slate-900/40 p-4 md:w-72 md:border-l md:border-t-0 md:p-6">
          <section>
            <div className="mb-4 flex items-center gap-2 text-blue-400">
              <Maximize2 className="h-4 w-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Scale Control</h2>
            </div>
            <div className="space-y-6">
              <div className="pt-3">
                <input
                  type="range"
                  min="0.1"
                  max="4.0"
                  step="0.01"
                  value={currentScale}
                  onChange={handleScaleSlider}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
                />
                <div className="mt-2 flex justify-between text-[8px] font-bold uppercase text-slate-500">
                  <span>0.1x</span>
                  <span>2.0x</span>
                  <span>4.0x</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => adjustScale(-0.01)} className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs transition-colors hover:bg-slate-700">
                  -0.01
                </button>
                <button onClick={() => adjustScale(0.01)} className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs transition-colors hover:bg-slate-700">
                  +0.01
                </button>
                <button onClick={() => adjustScale(-0.1)} className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs transition-colors hover:bg-slate-700">
                  -0.10
                </button>
                <button onClick={() => adjustScale(0.1)} className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs transition-colors hover:bg-slate-700">
                  +0.10
                </button>
              </div>
            </div>
          </section>

          <section className="mt-auto">
            {gameState === 'success' ? (
              <button
                onClick={proceed}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
              >
                Next Project <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={verifyScale}
                disabled={gameState !== 'playing'}
                className={`w-full rounded-xl py-4 text-sm font-black uppercase tracking-widest shadow-lg transition-colors ${
                  gameState === 'playing'
                    ? 'bg-blue-500 text-white shadow-blue-500/20 hover:bg-blue-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-600'
                }`}
              >
                Verify Scale
              </button>
            )}
          </section>
        </aside>
      </main>

      <footer className="z-20 hidden h-8 items-center justify-between border-t border-slate-700 bg-slate-950 px-6 md:flex">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[8px] font-bold uppercase text-slate-500">System Online</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Precision Mode: Active</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-[8px] font-bold uppercase text-slate-500">
            <LayoutGrid className="h-3 w-3" />
            <span>Coord: 50.0, 50.0</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-[8px] font-bold uppercase text-slate-500">Build 03.19.26</span>
        </div>
      </footer>
    </div>
  );
};

export default ScaleBuilderGame;
