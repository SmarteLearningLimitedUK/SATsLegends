import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';
import missionBackground from '../assets/maps/rocket launch.jpg';

type RoundingTarget =
  | 'nearest 10'
  | 'nearest 100'
  | 'nearest 1,000'
  | 'nearest 10,000'
  | 'nearest 100,000'
  | 'nearest 1,000,000'
  | 'nearest whole number'
  | 'nearest 1 decimal place'
  | 'nearest 2 decimal places';

interface RoundingProblem {
  id: number;
  number: number;
  target: RoundingTarget;
  answer: string;
}

interface RoundingRocketGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const ROUND_DURATION_SECONDS = 65;
const SUCCESS_EFFECT_MS = 900;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateDecimalChallengeNumber = (target: RoundingTarget) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const value = parseFloat((Math.random() * 100).toFixed(3));
    if (target === 'nearest whole number' && !Number.isInteger(value)) return value;
    if (target === 'nearest 1 decimal place' && Math.round(value * 10) !== value * 10) return value;
    if (target === 'nearest 2 decimal places' && Math.round(value * 100) !== value * 100) return value;
  }
  // deterministic fallback (should rarely be used)
  if (target === 'nearest whole number') return 42.37;
  if (target === 'nearest 1 decimal place') return 17.249;
  return 63.457;
};

const generateProblem = (level: number): RoundingProblem => {
  let num: number;
  let target: RoundingTarget;
  let answer: string;

  if (level <= 2) {
    num = Math.floor(Math.random() * 9000) + 100;
    const targets: RoundingTarget[] = ['nearest 10', 'nearest 100', 'nearest 1,000'];
    target = targets[Math.floor(Math.random() * targets.length)];
    const factor = target === 'nearest 10' ? 10 : target === 'nearest 100' ? 100 : 1000;
    answer = (Math.round(num / factor) * factor).toString();
  } else if (level <= 5) {
    num = Math.floor(Math.random() * 900000) + 10000;
    const targets: RoundingTarget[] = ['nearest 1,000', 'nearest 10,000', 'nearest 100,000'];
    target = targets[Math.floor(Math.random() * targets.length)];
    const factor = target === 'nearest 1,000' ? 1000 : target === 'nearest 10,000' ? 10000 : 100000;
    answer = (Math.round(num / factor) * factor).toString();
  } else if (level <= 7) {
    num = Math.floor(Math.random() * 9000000) + 1000000;
    target = 'nearest 1,000,000';
    answer = (Math.round(num / 1000000) * 1000000).toString();
  } else {
    const targets: RoundingTarget[] = ['nearest whole number', 'nearest 1 decimal place', 'nearest 2 decimal places'];
    target = targets[Math.floor(Math.random() * targets.length)];
    num = generateDecimalChallengeNumber(target);
    if (target === 'nearest whole number') {
      answer = Math.round(num).toString();
    } else if (target === 'nearest 1 decimal place') {
      answer = (Math.round(num * 10) / 10).toFixed(1);
    } else {
      answer = (Math.round(num * 100) / 100).toFixed(2);
    }
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    number: num,
    target,
    answer,
  };
};

const scoreToStars = (score: number, correct: number, total: number) => {
  const accuracy = total > 0 ? correct / total : 0;
  if (score >= 2200 && accuracy >= 0.8) return 3;
  if (score >= 1400 && accuracy >= 0.6) return 2;
  return 1;
};

const formatTarget = (target: RoundingTarget) => {
  return `Round this number to the ${target}`;
};

const formatDisplayNumber = (problem: RoundingProblem) => (
  problem.target.includes('decimal')
    ? problem.number.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
    : Math.round(problem.number).toLocaleString('en-GB')
);

const isAnswerCorrect = (rawInput: string, problem: RoundingProblem) => {
  const trimmed = rawInput.trim();
  if (!trimmed) return false;
  const numericInput = parseFloat(trimmed);
  const numericAnswer = parseFloat(problem.answer);
  if (Number.isNaN(numericInput)) return false;

  if (problem.target === 'nearest 1 decimal place') {
    return numericInput.toFixed(1) === numericAnswer.toFixed(1);
  }
  if (problem.target === 'nearest 2 decimal places') {
    return numericInput.toFixed(2) === numericAnswer.toFixed(2);
  }

  return Math.round(numericInput) === Math.round(numericAnswer);
};

const RoundingRocketGame: React.FC<RoundingRocketGameProps> = ({
  levelId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [level, setLevel] = useState(Math.max(1, levelId));
  const [problem, setProblem] = useState<RoundingProblem>(() => generateProblem(Math.max(1, levelId)));
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [roundEnded, setRoundEnded] = useState(false);
  const [showLaunchFx, setShowLaunchFx] = useState(false);

  const endRef = useRef(false);

  useEffect(() => {
    if (roundEnded || endRef.current) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [roundEnded]);

  useEffect(() => {
    if (timeLeft > 0 || endRef.current) return;
    endRef.current = true;
    setRoundEnded(true);
    onVictory(scoreToStars(score, correctAnswers, questionsAnswered), score);
  }, [correctAnswers, onVictory, questionsAnswered, score, timeLeft]);

  const missionText = useMemo(() => formatTarget(problem.target), [problem.target]);
  const displayNumber = useMemo(() => formatDisplayNumber(problem), [problem]);
  const correctDisplay = useMemo(() => {
    if (problem.target.includes('decimal')) return problem.answer;
    return Number(problem.answer).toLocaleString('en-GB');
  }, [problem.answer, problem.target]);
  const sparkSeeds = useMemo(
    () => Array.from({ length: 26 }, (_, idx) => ({
      id: idx,
      left: randomInt(4, 96),
      drift: randomInt(-28, 28),
      rise: randomInt(52, 86),
      delay: randomInt(0, 36) / 100,
      duration: randomInt(58, 92) / 100,
      size: randomInt(3, 8),
    })),
    [],
  );

  const generateNextQuestion = (nextLevel: number) => {
    setProblem(generateProblem(nextLevel));
    setUserInput('');
  };

  const handleKeypad = (value: string) => {
    if (roundEnded) return;
    if (value === 'DEL') {
      setUserInput((prev) => prev.slice(0, -1));
      return;
    }

    if (value === '.') {
      if (userInput.includes('.')) return;
      if (!problem.target.includes('decimal')) return;
      setUserInput((prev) => (prev.length ? `${prev}.` : '0.'));
      return;
    }

    if (userInput.length >= 12) return;
    setUserInput((prev) => `${prev}${value}`);
  };

  const submitAnswer = () => {
    if (!userInput || roundEnded) return;
    const correct = isAnswerCorrect(userInput, problem);
    const nextAnswered = questionsAnswered + 1;
    setQuestionsAnswered(nextAnswered);

    let nextLevel = level;
    if (correct) {
      const nextCorrect = correctAnswers + 1;
      setCorrectAnswers(nextCorrect);
      setScore((prev) => prev + (170 + (level * 20)));
      setFeedback({ type: 'success', text: 'Launch successful' });
      setShowLaunchFx(true);
      if (nextCorrect % 4 === 0) {
        nextLevel = Math.min(10, level + 1);
        setLevel(nextLevel);
      }
    } else {
      setFeedback({ type: 'error', text: `Correct answer: ${correctDisplay}` });
    }

    window.setTimeout(() => {
      setFeedback(null);
      setShowLaunchFx(false);
      if (!endRef.current) generateNextQuestion(nextLevel);
    }, correct ? SUCCESS_EFFECT_MS : 520);
  };

  const topPadding = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.6rem)]'
    : 'pt-[calc(env(safe-area-inset-top)+1.2rem)]';

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden bg-[#08162c] select-none">
      <img
        src={missionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <main
        className={`relative z-20 flex h-full w-full flex-col items-center ${topPadding} px-[max(1rem,env(safe-area-inset-left))] pb-[max(7.4rem,calc(env(safe-area-inset-bottom)+6.25rem))]`}
      >
        <div className="flex h-full w-full max-w-[28rem] flex-col items-center pt-2.5">
          <section className="flex w-full flex-col items-center text-center">
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-[92%] rounded-[0.95rem] border border-cyan-200/26 bg-[linear-gradient(180deg,rgba(15,31,70,0.82),rgba(6,20,54,0.92))] px-3 py-2.5 shadow-[0_12px_22px_rgba(2,6,23,0.42)]"
            >
              <p className="text-[11px] font-black tracking-[0.24em] text-amber-200 uppercase">Mission</p>
              <h1 className="mt-1 text-[clamp(0.95rem,4.2vw,1.3rem)] font-black leading-tight tracking-tight text-white">
                {missionText}
              </h1>
              <div className="rounded-[0.72rem] bg-slate-950/34 px-2 py-2">
                <span
                  className="text-[clamp(1.2rem,6.2vw,2rem)] font-black tabular-nums text-white [text-shadow:0_4px_10px_rgba(14,165,233,0.22)]"
                  style={{ letterSpacing: '2px' }}
                >
                  {displayNumber}
                </span>
              </div>
            </motion.div>

            <div className="w-full text-center">
              <p className="text-[clamp(0.92rem,3.9vw,1.16rem)] font-bold text-slate-200">Your Answer</p>
              <div className="mx-auto mt-1.5 inline-flex min-w-[10.5rem] items-center justify-center rounded-full border border-amber-300/62 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,16,32,0.96))] px-4 py-2 shadow-[0_0_16px_rgba(250,204,21,0.26)]">
                <span className="text-[clamp(1.25rem,5.8vw,1.9rem)] font-black tabular-nums text-amber-200">
                  {userInput || '--'}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-auto w-full pb-1">
            <div className="mx-auto mb-2 grid w-[86%] max-w-[18.5rem] grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypad(String(key))}
                  disabled={roundEnded || (key === '.' && !problem.target.includes('decimal'))}
                  className={`h-[2.95rem] rounded-[0.82rem] border border-cyan-200/42 bg-[linear-gradient(180deg,rgba(15,31,70,0.86),rgba(6,20,54,0.94))] px-0 py-0 font-black text-cyan-50 shadow-[0_8px_14px_rgba(2,6,23,0.32)] transition hover:brightness-110 disabled:opacity-40 ${
                    key === 'DEL'
                      ? 'text-[clamp(0.76rem,2.9vw,0.92rem)]'
                      : 'text-[clamp(1.05rem,4.1vw,1.35rem)]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              onClick={submitAnswer}
              disabled={!userInput || roundEnded}
              className="mx-auto block w-[92%] rounded-[1.05rem] border border-fuchsia-300/52 bg-[linear-gradient(180deg,#1d4ed8,#7c3aed)] py-2.5 text-[clamp(0.95rem,4.2vw,1.25rem)] font-black tracking-[0.08em] text-white uppercase shadow-[0_12px_22px_rgba(59,130,246,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Launch!
            </button>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {showLaunchFx ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0.35 }}
              animate={{ opacity: [0.35, 0.78, 0.45, 0.2] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.16),rgba(15,23,42,0.04)_45%,transparent_72%)]"
            />
            <motion.div
              initial={{ opacity: 0.2, scaleY: 0.85 }}
              animate={{ opacity: [0.2, 0.8, 0.35], scaleY: [0.85, 1.05, 0.92] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute -bottom-12 left-[-8%] right-[-8%] h-[58%] bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.68),rgba(244,63,94,0.26)_38%,transparent_70%)] blur-2xl"
            />
            {sparkSeeds.map((spark) => (
              <motion.span
                key={`launch-spark-${spark.id}`}
                initial={{ y: '112%', x: 0, opacity: 0, scale: 0.65 }}
                animate={{
                  y: `${spark.rise}%`,
                  x: spark.drift,
                  opacity: [0, 1, 0.92, 0],
                  scale: [0.65, 1.05, 0.92, 0.4],
                }}
                transition={{ duration: spark.duration, delay: spark.delay, ease: 'easeOut' }}
                style={{ left: `${spark.left}%`, width: spark.size, height: spark.size }}
                className="absolute rounded-full bg-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.95)]"
              />
            ))}
          </motion.div>
        ) : null}

        {feedback ? (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+6.5rem)] z-50 -translate-x-1/2 ${
              feedback.type === 'success'
                ? 'rounded-2xl border border-amber-200/85 bg-[linear-gradient(180deg,rgba(251,191,36,0.22),rgba(245,158,11,0.18))] px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-amber-100 shadow-[0_10px_22px_rgba(245,158,11,0.4)]'
                : 'rounded-full border border-rose-300/60 bg-rose-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-rose-100'
            }`}
          >
            {feedback.text}
            {feedback.type === 'success' ? (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[11px] border-l-transparent border-r-transparent border-t-amber-300/85"
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </div>
  );
};

export default RoundingRocketGame;
