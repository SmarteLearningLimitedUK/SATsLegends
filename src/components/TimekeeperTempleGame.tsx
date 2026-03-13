import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { AvatarData } from '../types';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { Home, HelpCircle, Star, Timer, Clock, Hourglass } from './GameIcons';

interface TimekeeperTempleGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface TimeProblem {
  question: string;
  options: string[];
  answer: string;
}

const generateTimeProblem = (levelId: number): TimeProblem => {
  const types = ['read_analog', 'add_time', 'sub_time', 'duration'];
  const availableTypes = types.slice(0, Math.min(types.length, 1 + levelId));
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  const formatTime = (h: number, m: number) => {
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const mm = m.toString().padStart(2, '0');
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hh}:${mm} ${ampm}`;
  };

  const getRandomTime = () => {
    const h = Math.floor(Math.random() * 24);
    // Level 1: 15 min increments. Level 2: 5 min. Level 3+: 1 min.
    const inc = levelId === 1 ? 15 : levelId === 2 ? 5 : 1;
    const m = Math.floor(Math.random() * (60 / inc)) * inc;
    return { h, m };
  };

  let question = '';
  let answer = '';
  let options = new Set<string>();

  const t1 = getRandomTime();
  const t1Formatted = formatTime(t1.h, t1.m);

  if (type === 'read_analog') {
    question = `What time is ${t1Formatted} in 24-hour format?`;
    answer = `${t1.h.toString().padStart(2, '0')}:${t1.m.toString().padStart(2, '0')}`;
    options.add(answer);
    
    // Generate wrong options
    while (options.size < 4) {
      const wrongH = (t1.h + Math.floor(Math.random() * 5) - 2 + 24) % 24;
      const wrongM = (t1.m + (Math.floor(Math.random() * 3) - 1) * 15 + 60) % 60;
      options.add(`${wrongH.toString().padStart(2, '0')}:${wrongM.toString().padStart(2, '0')}`);
    }
  } else if (type === 'add_time') {
    const addMins = (Math.floor(Math.random() * 6) + 1) * 15 + (Math.random() > 0.5 ? 60 : 0); // 15 to 150 mins
    
    // SATs style: sometimes say "1 hour and 15 minutes" instead of "75 minutes"
    let durationStr = `${addMins} minutes`;
    if (addMins >= 60 && Math.random() > 0.5) {
      const h = Math.floor(addMins / 60);
      const m = addMins % 60;
      durationStr = m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h} hour${h > 1 ? 's' : ''} and ${m} minutes`;
    }
    
    question = `What time is ${durationStr} after ${t1Formatted}?`;
    
    const totalMins = t1.h * 60 + t1.m + addMins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    answer = formatTime(newH, newM);
    options.add(answer);

    while (options.size < 4) {
      const wrongTotal = totalMins + (Math.floor(Math.random() * 5) - 2) * 15;
      const wH = Math.floor(wrongTotal / 60) % 24;
      const wM = (wrongTotal % 60 + 60) % 60;
      options.add(formatTime(wH, wM));
    }
  } else if (type === 'sub_time') {
    const subMins = (Math.floor(Math.random() * 6) + 1) * 15 + (Math.random() > 0.5 ? 60 : 0);
    
    let durationStr = `${subMins} minutes`;
    if (subMins >= 60 && Math.random() > 0.5) {
      const h = Math.floor(subMins / 60);
      const m = subMins % 60;
      durationStr = m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h} hour${h > 1 ? 's' : ''} and ${m} minutes`;
    }
    
    question = `What time is ${durationStr} before ${t1Formatted}?`;
    
    const totalMins = t1.h * 60 + t1.m - subMins + 24 * 60; // Add 24h to avoid negative
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    answer = formatTime(newH, newM);
    options.add(answer);

    while (options.size < 4) {
      const wrongTotal = totalMins + (Math.floor(Math.random() * 5) - 2) * 15;
      const wH = Math.floor(wrongTotal / 60) % 24;
      const wM = (wrongTotal % 60 + 60) % 60;
      options.add(formatTime(wH, wM));
    }
  } else {
    // duration
    const t2 = getRandomTime();
    // Ensure t2 is after t1
    if (t2.h < t1.h || (t2.h === t1.h && t2.m <= t1.m)) {
      t2.h = (t2.h + 12) % 24;
      if (t2.h < t1.h) t2.h = t1.h + 1;
    }
    const t2Formatted = formatTime(t2.h, t2.m);
    
    let diffMins = (t2.h * 60 + t2.m) - (t1.h * 60 + t1.m);
    if (diffMins < 0) diffMins += 24 * 60;

    const diffH = Math.floor(diffMins / 60);
    const diffM = diffMins % 60;
    
    question = `How long is it from ${t1Formatted} to ${t2Formatted}?`;
    answer = `${diffH}h ${diffM}m`;
    options.add(answer);

    while (options.size < 4) {
      const wH = Math.max(0, diffH + Math.floor(Math.random() * 3) - 1);
      const wM = (diffM + (Math.floor(Math.random() * 3) - 1) * 15 + 60) % 60;
      options.add(`${wH}h ${wM}m`);
    }
  }

  return {
    question,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
};

const TimekeeperTempleGame: React.FC<TimekeeperTempleGameProps> = ({ 
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
  
  const [problem, setProblem] = useState<TimeProblem | null>(null);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);

  useEffect(() => {
    setTimeLeft(90 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    setProblem(generateTimeProblem(levelId));
  }, [levelId]);

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

  const handleAnswer = (selected: string) => {
    if (feedback || isGameOver || isVictory || !problem) return;

    if (selected === problem.answer) {
      setFeedback('correct');
      const points = 100 + (streak * 20);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f59e0b']
      });

      setTimeout(() => {
        setProblem(generateTimeProblem(levelId));
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setScore(prev => Math.max(0, prev - 30));
      
      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="h-full w-full flex flex-col items-center p-4 relative overflow-hidden bg-amber-950 font-sans">
      {/* Temple Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 50%, #d97706 2px, transparent 2px)', 
        backgroundSize: '50px 50px' 
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,119,6,0.3)_0%,transparent_70%)] pointer-events-none" />

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-3 md:gap-6 h-full flex-1 min-h-0">
        <GameplayHUD
          title="Timekeeper Temple"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-violet-900"
          accentSoftBg="bg-violet-100/80"
          accentBorder="border-violet-200/80"
          progressBar="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500"
          statLabel="Streak"
          statValue={streak}
        />

        {/* Game Area */}
        <div className="w-full flex-1 relative flex flex-col items-center justify-center gap-8">
          
          {problem && (
            <>
              {/* Question Tablet */}
              <div className="bg-amber-100 p-8 rounded-[3rem] border-8 border-amber-600 shadow-2xl text-center max-w-2xl w-full relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-800 p-4 rounded-full border-4 border-amber-600 shadow-lg">
                  <Hourglass className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
                <h3 className="text-3xl text-amber-900 font-black mt-4">
                  {problem.question}
                </h3>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                {problem.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback}
                    className="relative group bg-amber-800 border-4 border-amber-600 p-6 rounded-3xl shadow-[0_8px_0_#92400e] hover:translate-y-1 hover:shadow-[0_4px_0_#92400e] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                  >
                    <Clock className="w-8 h-8 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-4xl font-black text-amber-100 drop-shadow-md">
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Feedback Overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none`}
              >
                <div className={`px-12 py-6 rounded-full backdrop-blur-md border-4 ${feedback === 'correct' ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
                  <span className={`text-6xl font-black drop-shadow-lg ${feedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
                    {feedback === 'correct' ? 'TIMELESS!' : 'OUT OF SYNC!'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-violet-700"
        />

        {/* Game Over / Victory Modals */}
        <AnimatePresence>
        {(isGameOver || isVictory) && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="app-modal-panel w-full max-w-md rounded-[2rem] border-4 border-amber-600 bg-amber-900 p-6 shadow-2xl flex flex-col items-center gap-5 md:rounded-[3rem] md:border-8 md:gap-8 md:p-12">
              <div className={`text-5xl font-black ${isVictory ? 'text-amber-400' : 'text-red-500'} drop-shadow-md text-center`}>
                {isVictory ? 'TIME MASTER!' : 'TIME UP!'}
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
                      <Star className={`w-16 h-16 ${s <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-amber-800'}`} />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <div className="text-amber-600 font-black uppercase tracking-widest text-sm">Final Score</div>
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

export default TimekeeperTempleGame;
