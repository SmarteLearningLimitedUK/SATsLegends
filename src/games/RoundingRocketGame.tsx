import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from '../components/AssetIcon';
import { AVATARS } from '../constants';
import hudAvatarName from '../assets/ui_frames/hudfortextplace_slices/hud_avatar_name.png';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import missionBackground from '../assets/maps/gemini-2.5-flash-image_using_the_same_aesthetic_-_create_a_dark_and_mysterious_forest_path_with_dense_f-1.jpg';

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
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const PLAYER_STORAGE_KEY = 'maths_quest_player';
const ROUND_DURATION_SECONDS = 65;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

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
    num = parseFloat((Math.random() * 100).toFixed(3));
    const targets: RoundingTarget[] = ['nearest whole number', 'nearest 1 decimal place', 'nearest 2 decimal places'];
    target = targets[Math.floor(Math.random() * targets.length)];
    if (target === 'nearest whole number') {
      answer = Math.round(num).toString();
    } else if (target === 'nearest 1 decimal place') {
      answer = (Math.round(num * 10) / 10).toFixed(1);
    } else {
      answer = (Math.round(num * 100) / 100).toFixed(2);
    }
  }

  return { id: Date.now() + Math.floor(Math.random() * 1000), number: num, target, answer };
};

const getRoundingStep = (target: RoundingTarget): number => {
  switch (target) {
    case 'nearest 10': return 10;
    case 'nearest 100': return 100;
    case 'nearest 1,000': return 1000;
    case 'nearest 10,000': return 10000;
    case 'nearest 100,000': return 100000;
    case 'nearest 1,000,000': return 1000000;
    case 'nearest whole number': return 1;
    case 'nearest 1 decimal place': return 0.1;
    case 'nearest 2 decimal places': return 0.01;
    default: return 1;
  }
};

const formatRoundedValue = (value: number, target: RoundingTarget): string => {
  if (target === 'nearest 1 decimal place') return value.toFixed(1);
  if (target === 'nearest 2 decimal places') return value.toFixed(2);
  if (target === 'nearest whole number') return Math.round(value).toString();
  return Math.round(value).toLocaleString('en-GB');
};

const normalizeOptionValue = (value: number, target: RoundingTarget): number => {
  if (target === 'nearest 1 decimal place') return Number(value.toFixed(1));
  if (target === 'nearest 2 decimal places') return Number(value.toFixed(2));
  return Math.round(value);
};

const generateOptions = (problem: RoundingProblem): string[] => {
  const step = getRoundingStep(problem.target);
  const correctNumeric = normalizeOptionValue(parseFloat(problem.answer), problem.target);
  const optionSet = new Set<number>([correctNumeric]);
  const shifts = [-2, -1, 1, 2, -3, 3];

  for (const shift of shifts) {
    if (optionSet.size >= 3) break;
    const candidate = normalizeOptionValue(correctNumeric + (step * shift), problem.target);
    if (candidate >= 0) optionSet.add(candidate);
  }

  while (optionSet.size < 3) {
    const randomShift = randomInt(-4, 4) || 1;
    const candidate = normalizeOptionValue(correctNumeric + (step * randomShift), problem.target);
    if (candidate >= 0) optionSet.add(candidate);
  }

  const options = Array.from(optionSet).slice(0, 3);
  const correctFormatted = formatRoundedValue(correctNumeric, problem.target);
  const formatted = options.map((option) => formatRoundedValue(option, problem.target));
  if (!formatted.includes(correctFormatted)) {
    formatted[0] = correctFormatted;
  }

  return formatted.sort(() => Math.random() - 0.5);
};

const scoreToStars = (score: number, correct: number, total: number) => {
  const accuracy = total > 0 ? correct / total : 0;
  if (score >= 2200 && accuracy >= 0.8) return 3;
  if (score >= 1400 && accuracy >= 0.6) return 2;
  return 1;
};

const RoundingRocketGame: React.FC<RoundingRocketGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const selectedAvatar = useMemo(() => AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0], [avatarId]);
  const playerName = useMemo(() => {
    if (typeof window === 'undefined') return 'Explorer';
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return 'Explorer';
    try {
      const parsed = JSON.parse(raw) as { displayName?: string };
      return parsed.displayName?.trim() || 'Explorer';
    } catch {
      return 'Explorer';
    }
  }, []);

  const [level, setLevel] = useState(Math.max(1, levelId));
  const [problem, setProblem] = useState<RoundingProblem>(() => generateProblem(Math.max(1, levelId)));
  const [options, setOptions] = useState<string[]>(() => generateOptions(generateProblem(Math.max(1, levelId))));
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [roundEnded, setRoundEnded] = useState(false);

  const endRef = useRef(false);

  const nextQuestion = useCallback((nextLevel: number) => {
    const generated = generateProblem(nextLevel);
    setProblem(generated);
    setOptions(generateOptions(generated));
    setSelectedOption(null);
  }, []);

  useEffect(() => {
    if (roundEnded || endRef.current) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [roundEnded]);

  useEffect(() => {
    if (timeLeft > 0 || endRef.current) return;
    endRef.current = true;
    setRoundEnded(true);
    const stars = scoreToStars(score, correctAnswers, questionsAnswered);
    onVictory(stars, score);
  }, [correctAnswers, onVictory, questionsAnswered, score, timeLeft]);

  const timerProgress = Math.max(0, Math.min(1, timeLeft / ROUND_DURATION_SECONDS));
  const timerFillColor = `hsl(${Math.round(timerProgress * 120)}, 82%, 54%)`;

  const missionLabel = useMemo(() => {
    const target = problem.target.replace('nearest ', '');
    return `Round to nearest ${target}`;
  }, [problem.target]);

  const displayNumber = useMemo(() => (
    problem.target.includes('decimal')
      ? problem.number.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
      : Math.round(problem.number).toLocaleString('en-GB')
  ), [problem.number, problem.target]);

  const submitAnswer = () => {
    if (!selectedOption || roundEnded) return;
    const isCorrect = selectedOption === formatRoundedValue(parseFloat(problem.answer), problem.target);
    const nextQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(nextQuestionsAnswered);
    let nextLevel = level;

    if (isCorrect) {
      const nextCorrect = correctAnswers + 1;
      setCorrectAnswers(nextCorrect);
      setScore((prev) => prev + (180 + (level * 18)));
      setFeedback({ type: 'success', text: 'Correct!' });

      if (nextCorrect > 0 && nextCorrect % 4 === 0) {
        nextLevel = Math.min(10, level + 1);
        setLevel(nextLevel);
      }
    } else {
      setFeedback({ type: 'error', text: `Correct answer: ${formatRoundedValue(parseFloat(problem.answer), problem.target)}` });
    }

    window.setTimeout(() => {
      setFeedback(null);
      if (!endRef.current) nextQuestion(nextLevel);
    }, 380);
  };

  const topHudLayout = useMemo(() => ({
    rowHeight: 'clamp(3.1rem, 8.35vh, 4.35rem)',
    profileWidth: 'clamp(10.4rem, 46vw, 14.6rem)',
    timerWidth: 'clamp(9.8rem, 36vw, 13.2rem)',
  }), []);

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden bg-[#08162c] select-none">
      <img
        src={missionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,26,0.24),rgba(2,7,20,0.78)_82%)]" />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-40"
        style={{
          paddingTop: 'max(0.4rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.55rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.55rem, env(safe-area-inset-right))',
        }}
      >
        <div className="flex w-full items-center justify-between gap-[clamp(0.25rem,1.6vw,0.75rem)] py-[clamp(0.14rem,0.65vh,0.4rem)]">
          <div className="relative shrink-0" style={{ height: topHudLayout.rowHeight, width: topHudLayout.profileWidth }}>
            <img
              src={hudAvatarName}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div className="absolute left-[2.8%] top-1/2 h-[79%] w-[26%] -translate-y-1/2">
              <div className="absolute inset-[10%] overflow-hidden rounded-[28%]">
                <img
                  src={selectedAvatar.portrait || selectedAvatar.image}
                  alt={selectedAvatar.name}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="pointer-events-none absolute left-[31%] right-[8.5%] top-1/2 -translate-y-1/2 overflow-hidden text-left text-[clamp(0.76rem,2.35vw,1.06rem)] font-black uppercase tracking-[0.06em] text-cyan-50">
              <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap [text-shadow:0_1px_2px_rgba(2,6,23,0.6)]">
                {playerName}
              </span>
            </div>
          </div>

          <div className="relative shrink-0" style={{ height: topHudLayout.rowHeight, width: topHudLayout.timerWidth }}>
            <div className="pointer-events-none absolute inset-0 flex items-center">
              <div className="flex h-[82%] w-full items-center rounded-full border border-cyan-200/35 bg-slate-900/62 px-[clamp(0.35rem,1.3vw,0.62rem)] shadow-[0_6px_16px_rgba(2,6,23,0.45)]">
                <img
                  src={hourglassIcon}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-[74%] w-auto shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(2,6,23,0.5)]"
                />
                <div className="relative ml-[clamp(0.32rem,1.2vw,0.56rem)] h-[44%] flex-1 overflow-hidden rounded-full border border-cyan-100/25 bg-slate-950/58">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{
                      boxShadow: '0 0 10px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                      backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
                    }}
                  />
                </div>
                <span className="ml-[clamp(0.35rem,1.2vw,0.58rem)] shrink-0 text-[clamp(0.62rem,1.9vw,0.92rem)] font-black uppercase tracking-[0.06em] text-white">
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-100/35 bg-slate-900/60 text-white shadow-[0_10px_20px_rgba(2,6,23,0.42)] transition hover:brightness-110"
              aria-label="Back to map"
            >
              <AssetIcon name="home" className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-100/35 bg-slate-900/60 text-white shadow-[0_10px_20px_rgba(2,6,23,0.42)] transition hover:brightness-110"
              aria-label="Toggle sound"
            >
              <AssetIcon name={isMuted ? 'soundMute' : 'sound'} className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowHelp((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-100/35 bg-slate-900/60 text-white shadow-[0_10px_20px_rgba(2,6,23,0.42)] transition hover:brightness-110"
              aria-label="Toggle help"
            >
              <AssetIcon name="question" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <main
        className="relative z-20 flex h-full w-full flex-col items-center px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5.35rem)]"
      >
        <div className="flex h-full w-full max-w-[32rem] flex-col items-center justify-between py-3">
          <section className="flex w-full flex-col items-center gap-4 text-center">
            <div className="mt-2">
              <p className="text-xs font-black tracking-[0.32em] text-amber-200 uppercase">Mission</p>
              <h1 className="mt-2 text-[clamp(1.45rem,6.6vw,2.05rem)] font-black tracking-tight text-white">
                {missionLabel.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-amber-300">{missionLabel.split(' ').slice(-1)[0]}</span>
              </h1>
            </div>

            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mt-1 w-full rounded-[1.65rem] border border-cyan-200/28 bg-[linear-gradient(180deg,rgba(15,31,70,0.82),rgba(6,20,54,0.92))] px-4 py-6 shadow-[0_20px_44px_rgba(2,6,23,0.52)]"
            >
              <div className="absolute inset-x-[8%] bottom-2 h-[1px] bg-cyan-300/60 blur-[0.5px]" />
              <div className="rounded-[1rem] bg-slate-950/34 px-3 py-5">
                <span className="text-[clamp(2.5rem,14vw,5.15rem)] font-black tabular-nums tracking-tight text-white [text-shadow:0_8px_18px_rgba(14,165,233,0.28)]">
                  {displayNumber}
                </span>
              </div>
            </motion.div>

            <div className="w-full text-center">
              <p className="text-[clamp(1.05rem,4.4vw,1.55rem)] font-bold text-slate-200">Your Answer</p>
              <div className="mx-auto mt-2 inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-full border border-amber-300/62 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,16,32,0.96))] px-5 py-3 shadow-[0_0_24px_rgba(250,204,21,0.3)]">
                <span className="text-[clamp(1.6rem,7vw,2.65rem)] font-black tabular-nums text-amber-200">
                  {selectedOption ?? '—'}
                </span>
                {selectedOption ? (
                  <span className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_16px_rgba(34,197,94,0.56)]">
                    <AssetIcon name="check" className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="w-full">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {options.map((option) => {
                const selected = option === selectedOption;
                return (
                  <button
                    key={`${problem.id}-${option}`}
                    onClick={() => setSelectedOption(option)}
                    className={`rounded-[1.1rem] border px-2 py-4 text-[clamp(1.05rem,5.25vw,2.2rem)] font-black tabular-nums transition ${
                      selected
                        ? 'border-amber-300 bg-[linear-gradient(180deg,rgba(252,211,77,0.18),rgba(250,204,21,0.06))] text-amber-200 shadow-[0_0_24px_rgba(250,204,21,0.35)]'
                        : 'border-cyan-200/42 bg-[linear-gradient(180deg,rgba(15,31,70,0.86),rgba(6,20,54,0.94))] text-cyan-50 shadow-[0_12px_24px_rgba(2,6,23,0.46)]'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <button
              onClick={submitAnswer}
              disabled={!selectedOption || roundEnded}
              className="w-full rounded-[1.35rem] border border-fuchsia-300/52 bg-[linear-gradient(180deg,#1d4ed8,#7c3aed)] py-4 text-[clamp(1.2rem,5.2vw,2rem)] font-black tracking-[0.08em] text-white uppercase shadow-[0_18px_38px_rgba(59,130,246,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Confirm
            </button>
            <p className="mt-2 text-center text-sm font-medium text-slate-300/90">Choose the correct rounded value</p>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.1rem)] z-50 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${
              feedback.type === 'success'
                ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-100'
                : 'border-rose-300/60 bg-rose-500/20 text-rose-100'
            }`}
          >
            {feedback.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/65 px-6 text-center"
          >
            <div className="max-w-sm rounded-2xl border border-cyan-100/35 bg-slate-950/90 p-5 text-cyan-50 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">How To Play</p>
              <p className="mt-3 text-sm leading-relaxed">
                Read the mission, choose the correct rounded value, then press Confirm. Answer fast before the timer runs out.
              </p>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 rounded-full border border-cyan-200/50 bg-cyan-600/25 px-4 py-2 text-xs font-black uppercase tracking-[0.14em]"
              >
                Continue
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default RoundingRocketGame;
