import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  FileText,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import dataDetectiveBackground from '../assets/maps/backgroundsforgames/data detective.jpg';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface StolenItem {
  name: string;
  amount: number;
  color: string;
}

interface Suspect {
  id: number;
  name: string;
  items: number[];
  color: string;
  portrait?: string;
}

interface DataDetectiveGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type CaseMode = 'detective' | 'whodunnit';

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const ITEMS = [
  { name: 'Shiny Crystals', color: '#60a5fa' },
  { name: 'Magic Cookies', color: '#f59e0b' },
  { name: 'Stinky Socks', color: '#10b981' },
  { name: 'Ancient Runes', color: '#facc15' },
];

const MONSTER_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500'];

const MONSTER_NAMES = ['Grumpy Green', 'Blue Blob', 'Purple Prowler', 'Red Rogue'];
const loadSortedImages = (record: Record<string, string>) => (
  Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
);
const MUGSHOT_IMAGES = loadSortedImages(
  import.meta.glob('../assets/datadetective/mugshots/*.png', { eager: true, import: 'default' }) as Record<string, string>,
);
const FALLBACK_SUSPECT_IMAGES = loadSortedImages(
  import.meta.glob('../assets/bosses/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>,
);
const SUSPECT_PORTRAITS = MUGSHOT_IMAGES.length > 0 ? MUGSHOT_IMAGES : FALLBACK_SUSPECT_IMAGES;
const DETECTIVE_BRIEFS = [
  'Match the evidence totals to the suspect report.',
  'Check the chart carefully before accusing.',
  'Find the suspect whose stash matches the data.',
  'Use the totals to close this case.',
];
const WHODUNNIT_BRIEFS = [
  'Who took the items? Use the clues to decide.',
  'Compare the clue chart to each suspect.',
  'Spot the thief by reading the evidence graph.',
  'Find the culprit hiding in the numbers.',
];
const CASE_REVIEW_PROMPT = "Good evening detective - here's the evidence I'd like you to review.";

const MAX_CASES = 10;

type AxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value: number | string };
};

const GraphXAxisTick: React.FC<AxisTickProps> = ({ x = 0, y = 0, payload }) => {
  const label = String(payload?.value ?? '');
  const parts = label.split(' ');
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={16}
        textAnchor="middle"
        fill="#d6d3d1"
        fontSize={10}
        fontWeight={800}
      >
        {parts.map((part, index) => (
          <tspan key={`${label}-${part}-${index}`} x={0} dy={index === 0 ? 0 : 12}>
            {part}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const GraphYAxisTick: React.FC<AxisTickProps> = ({ x = 0, y = 0, payload }) => {
  const rawValue = payload?.value;
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  const isMajor = Number.isFinite(value) && value % 10 === 0;
  const tickLength = isMajor ? 11 : 6;
  const strokeWidth = isMajor ? 2.1 : 1;
  const fontSize = isMajor ? 11 : 9;
  const fontWeight = isMajor ? 900 : 700;
  const labelOpacity = isMajor ? 1 : 0.8;

  return (
    <g transform={`translate(${x},${y})`}>
      <line
        x1={0}
        y1={0}
        x2={tickLength}
        y2={0}
        stroke={isMajor ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.7)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <text
        x={-8}
        y={4}
        textAnchor="end"
        fill="#ffffff"
        fontSize={fontSize}
        fontWeight={fontWeight}
        opacity={labelOpacity}
      >
        {value}
      </text>
    </g>
  );
};

const scoreToStars = (XP: number) => {
  if (XP >= 900) return 3;
  if (XP >= 700) return 2;
  return 1;
};

const DataDetectiveGame: React.FC<DataDetectiveGameProps> = ({
  isPractice,
  practiceBriefing,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [XP, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [currentCase, setCurrentCase] = useState<StolenItem[]>([]);
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [guiltyId, setGuiltyId] = useState<number | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [caseMode, setCaseMode] = useState<CaseMode>('detective');
  const [caseBrief, setCaseBrief] = useState(DETECTIVE_BRIEFS[0]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedSuspectId, setSelectedSuspectId] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [incorrectSuspectIds, setIncorrectSuspectIds] = useState<number[]>([]);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const maxCaseValue = Math.max(...currentCase.map((item) => item.amount), 0);
  const barAxisMax = Math.max(6, Math.ceil(maxCaseValue / 2) * 2);
  const barTicks = Array.from({ length: Math.floor(barAxisMax / 2) + 1 }, (_, index) => index * 2);

  const generateCase = useCallback(() => {
    const nextMode: CaseMode = Math.random() > 0.5 ? 'detective' : 'whodunnit';
    setCaseMode(nextMode);
    setCaseBrief(nextMode === 'whodunnit'
      ? WHODUNNIT_BRIEFS[Math.floor(Math.random() * WHODUNNIT_BRIEFS.length)]
      : DETECTIVE_BRIEFS[Math.floor(Math.random() * DETECTIVE_BRIEFS.length)]);
    setChartType(Math.random() > 0.5 ? 'bar' : 'pie');

    const caseData = ITEMS.map(item => ({
      ...item,
      amount: Math.floor(Math.random() * 10) + 2,
    }));
    setCurrentCase(caseData);

    const correctIdx = Math.floor(Math.random() * 4);
    const getPortraitForSuspect = (index: number) => (
      SUSPECT_PORTRAITS.length ? SUSPECT_PORTRAITS[index % SUSPECT_PORTRAITS.length] : undefined
    );
    const newSuspects = Array.from({ length: 4 }, (_, i) => {
      if (i === correctIdx) {
        return {
          id: i,
          name: MONSTER_NAMES[i],
          items: caseData.map(d => d.amount),
          color: MONSTER_COLORS[i],
          portrait: getPortraitForSuspect(i),
        };
      }

      let randomItems: number[];
      do {
        randomItems = caseData.map(() => Math.floor(Math.random() * 10) + 2);
      } while (JSON.stringify(randomItems) === JSON.stringify(caseData.map(d => d.amount)));

      return {
        id: i,
        name: MONSTER_NAMES[i],
        items: randomItems,
        color: MONSTER_COLORS[i],
        portrait: getPortraitForSuspect(i),
      };
    });

    setSuspects(newSuspects);
    setGuiltyId(correctIdx);
    setFeedback(null);
    setSelectedSuspectId(null);
    setIncorrectSuspectIds([]);
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setGameState('playing');
    setLives(3);
    setIncorrectSuspectIds([]);
    generateCase();
  };

  useEffect(() => {
    generateCase();
  }, [generateCase]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const handleSuspectClick = (id: number) => {
    if (gameState !== 'playing') return;
    if (incorrectSuspectIds.includes(id)) return;
    setSelectedSuspectId(id);
    setFeedback(null);
  };

  const handleAccuse = (id: number) => {
    if (gameState !== 'playing') return;
    if (id === guiltyId) {
      setFeedback({ type: 'success', message: 'CASE CLOSED! You found the guilty monster.' });
      setGameState('success');
      setScore(prev => prev + 140);
      return;
    }

    setFeedback({ type: 'error', message: 'WRONG SUSPECT! You lose a life.' });
    setIncorrectSuspectIds((previous) => (previous.includes(id) ? previous : [...previous, id]));
    setSelectedSuspectId(id);
    setScore(prev => Math.max(0, prev - 20));
    setLives((previous) => {
      const nextLives = Math.max(0, previous - 1);
      if (nextLives === 0) {
        window.setTimeout(() => onGameOver(XP), 450);
      }
      return nextLives;
    });
  };

  const selectedSuspect = selectedSuspectId !== null
    ? suspects.find((suspect) => suspect.id === selectedSuspectId) || null
    : null;

  const nextCase = () => {
    if (level < MAX_CASES) {
      setLevel(prev => prev + 1);
      setGameState('playing');
      generateCase();
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  };

  return (
    <div className="relative h-full w-full min-h-0 text-slate-100">
      <img
        src={dataDetectiveBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Data Detective"
        body="The Monster Minds have scrambled the evidence board.\nCompare the chart with each suspect and find who matches.\nRead the totals carefully before you accuse."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <GameScreenLayout
        className="relative z-10 h-full w-full min-h-0 gap-0 text-slate-100"
        topClassName="!min-h-0 flex flex-col items-center gap-0 px-2 pt-0 sm:px-3 md:px-4"
        top={(
        <div className="flex w-full flex-col gap-0">
          {!useSharedTopHud ? (
            <header className="z-20 flex h-16 items-center justify-between border-b border-cyan-200/16 bg-[linear-gradient(180deg,rgba(8,26,66,0.78),rgba(5,16,42,0.84))] px-6 backdrop-blur-md max-[480px]:h-14 max-[480px]:px-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-800/80 text-stone-200 transition hover:bg-stone-700/80"
                  aria-label="Back to levels"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="rounded-lg bg-amber-500 p-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Search className="h-5 w-5 text-stone-900" />
                </div>
                <div>
                  <h1 className="text-sm font-black uppercase tracking-widest text-white">
                    {caseMode === 'whodunnit' ? 'Whodunnit Files' : 'Data Detective Agency'}
                  </h1>
                  <p className="text-[10px] italic uppercase tracking-tighter text-stone-500">
                    {caseMode === 'whodunnit' ? 'Clues hidden in the charts' : 'Solving crimes with statistics'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-stone-500">Lives</span>
                  <span className="text-xs font-black text-rose-300">{lives}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-stone-500">Reputation</span>
                  <span className="text-xs font-bold text-amber-500">{XP} PTS</span>
                </div>
                <div className="h-8 w-[1px] bg-stone-800" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-stone-500">Case File</span>
                  <span className="text-xs font-bold text-white">{level} / {MAX_CASES}</span>
                </div>
              </div>
            </header>
          ) : null}
          <GameQuestionCard
            className="z-30 mt-0 w-full max-w-[780px] max-[480px]:px-2 max-[480px]:py-1.5"
            title={caseMode === 'whodunnit' ? 'Who took the loot?' : 'Match the evidence totals.'}
            subtitle={caseBrief}
          >
            {CASE_REVIEW_PROMPT}
          </GameQuestionCard>
        </div>
      )}
        main={(
          <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <section className="z-10 flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden border-b border-cyan-200/12 bg-[linear-gradient(180deg,rgba(12,32,74,0.2),rgba(6,20,48,0.24))] px-2 pb-1 pt-1 sm:px-3 sm:pb-2 sm:pt-2 md:gap-3 md:border-b md:border-cyan-200/12 md:px-5 md:pb-3 md:pt-3 max-[480px]:gap-1 max-[480px]:px-1.5 max-[480px]:pb-0.5 max-[480px]:pt-0.5">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <FileText className="h-5 w-5" />
              <h2 className="text-xs font-black uppercase tracking-widest">
                {caseMode === 'whodunnit' ? 'Clue Board' : 'Evidence: Stolen Items'}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800 px-3 py-1">
              {chartType === 'bar'
                ? <BarChart3 className="h-3 w-3 text-amber-400" />
                : <PieChartIcon className="h-3 w-3 text-amber-400" />}
              <span className="text-[10px] font-bold uppercase text-stone-400">{chartType} Chart</span>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(7,18,44,0.72))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3 md:p-4 max-[480px]:p-1.5">
            <div className="pointer-events-none absolute inset-0 bg-slate-950/20" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.3)_1px,transparent_1px)] opacity-7 [background-size:20px_20px]" />

            <div className="relative w-full min-h-0 flex-1" style={{ minHeight: 'clamp(9rem, 20vh, 13.5rem)' }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart data={currentCase} margin={{ top: 12, right: 10, left: -4, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#a8a29e"
                        tick={GraphXAxisTick as never}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        height={52}
                      />
                    <YAxis
                      ticks={barTicks}
                      domain={[0, barAxisMax]}
                      tick={GraphYAxisTick as never}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={46}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px', fontSize: '18px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {currentCase.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <Pie
                    data={currentCase}
                    cx="50%"
                    cy="50%"
                    innerRadius="34%"
                    outerRadius="68%"
                    paddingAngle={3}
                    labelLine={false}
                    dataKey="amount"
                    isAnimationActive={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.68;
                        const rad = (-midAngle * Math.PI) / 180;
                        const x = cx + radius * Math.cos(rad);
                        const y = cy + radius * Math.sin(rad);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#f8fafc"
                            fontSize={18}
                            fontWeight={700}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {value}
                          </text>
                        );
                      }}
                    >
                      {currentCase.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px', fontSize: '10px' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-1.5 shrink-0 grid grid-cols-2 gap-1 sm:gap-1.5 max-[480px]:mt-1 max-[480px]:gap-0.5">
              {currentCase.map(item => (
                <div key={item.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-2 py-1">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 truncate text-[16px] font-bold uppercase tracking-wide text-stone-300 max-[480px]:text-[13px]">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        </main>
      )}
      bottom={(
        <section className="z-10 flex w-full flex-col gap-1 bg-[linear-gradient(180deg,rgba(8,18,40,0.16),rgba(5,12,28,0.24))] px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-0.5 sm:px-3 sm:pb-[calc(env(safe-area-inset-bottom)+0.35rem)] sm:pt-0.5 md:px-5 md:pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pt-1 max-[480px]:gap-1 max-[480px]:px-1.5 max-[480px]:pt-0.5">
          <div className="relative overflow-visible">
            <div className="mb-0.5 flex items-center gap-2 text-amber-500">
              <Users className="h-5 w-5" />
              <h2 className="text-xs font-black uppercase tracking-widest">Suspect Lineup</h2>
            </div>
            <div className={`grid grid-cols-4 items-start gap-1 max-[480px]:gap-0.5 ${selectedSuspect ? 'pointer-events-none opacity-0' : ''}`}>
              {suspects.map((suspect) => (
                <motion.button
                  key={suspect.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuspectClick(suspect.id)}
                  transition={{ duration: 0.35 }}
                  className={`group relative flex w-full aspect-[4/3] items-center justify-center rounded-[1.2rem] border-0 bg-transparent p-0 transition-all duration-300 sm:aspect-[3/4] max-[480px]:aspect-[1/1.7] max-[480px]:rounded-lg ${
                    gameState === 'success' && suspect.id === guiltyId
                      ? 'drop-shadow-[0_0_18px_rgba(16,185,129,0.65)]'
                      : incorrectSuspectIds.includes(suspect.id)
                        ? 'pointer-events-none opacity-35 grayscale'
                        : selectedSuspectId === suspect.id
                          ? 'drop-shadow-[0_0_18px_rgba(125,211,252,0.75)]'
                          : 'hover:drop-shadow-[0_0_14px_rgba(125,211,252,0.42)]'
                  }`}
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-visible rounded-[1.05rem] bg-transparent p-0 max-[480px]:rounded-[0.9rem]">
                    {suspect.portrait ? (
                      <img
                        src={suspect.portrait}
                        alt=""
                        draggable={false}
                        className="suspect-portrait block h-full w-full max-h-full max-w-full object-contain object-bottom drop-shadow-[0_10px_16px_rgba(2,6,23,0.45)]"
                        data-suspect-portrait="true"
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center ${suspect.color}/20`}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-black text-white">
                          {suspect.name.split(' ').map((part) => part[0]).join('')}
                        </div>
                      </div>
                    )}
                  </div>

                  {gameState === 'success' && suspect.id === guiltyId && (
                    <div className="absolute right-2 top-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}
                  {incorrectSuspectIds.includes(suspect.id) && (
                    <div className="absolute inset-0 rounded-[1.1rem] bg-stone-950/10" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-0.5 flex flex-col gap-1.5 pt-0">
            <AnimatePresence mode="wait">
              {gameState === 'success' ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={nextCase}
                  className="ui-button-success flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-black uppercase tracking-widest max-[480px]:py-3"
                >
                  Next Case File <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      )}
      overlay={(
        <>
          <AnimatePresence>
            {selectedSuspect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-md max-[480px]:p-1"
              >
                <div className="w-full max-w-[20rem] max-h-[calc(100%-0.75rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(9,24,58,0.96),rgba(4,12,28,0.98))] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.45)] max-[480px]:max-w-[calc(100%-0.5rem)] max-[480px]:max-h-[calc(100%-0.5rem)] max-[480px]:p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-20 items-center justify-center overflow-visible bg-transparent p-0 max-[480px]:h-20 max-[480px]:w-20">
                      {selectedSuspect.portrait && (
                        <img
                          src={selectedSuspect.portrait}
                          alt=""
                          draggable={false}
                          className="suspect-portrait block h-full w-full max-h-full max-w-full object-contain object-center drop-shadow-[0_10px_16px_rgba(2,6,23,0.45)]"
                          data-suspect-portrait="true"
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Suspect</div>
                      <div className="text-lg font-black text-white">{selectedSuspect.name}</div>
                    </div>
                  </div>

                  <div className="mt-4 max-h-[38vh] space-y-2 overflow-y-auto pr-1 max-[480px]:mt-3 max-[480px]:max-h-[28vh]">
                    {selectedSuspect.items.map((amount, index) => (
                      <div key={`${selectedSuspect.id}-item-${index}`} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/6 px-3 py-2 max-[480px]:px-2 max-[480px]:py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ITEMS[index].color }} />
                          <span className="text-xs font-bold text-white">{ITEMS[index].name}</span>
                        </div>
                        <span className="text-sm font-black text-amber-200">{amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2 max-[480px]:mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSuspectId(null)}
                      className="ui-button-secondary flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] max-[480px]:px-3 max-[480px]:py-1.5"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccuse(selectedSuspect.id)}
                      className="ui-button-primary flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] max-[480px]:px-3 max-[480px]:py-1.5"
                    >
                      Lock Up
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {gameState === 'complete' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-[120] flex items-center justify-center bg-stone-950/95 p-12 text-center backdrop-blur-xl max-[480px]:p-4"
              >
                <div className="max-w-md max-[480px]:max-w-[min(100%,18rem)]">
                  <Trophy className="mx-auto mb-8 h-20 w-20 text-yellow-400 max-[480px]:mb-5 max-[480px]:h-14 max-[480px]:w-14" />
                  <h2 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white italic max-[480px]:text-2xl">Chief Of Detectives</h2>
                  <p className="mb-8 text-sm leading-relaxed text-stone-400 max-[480px]:mb-5 max-[480px]:text-xs">
                    All cases solved. The city is safe once again thanks to your expert data interpretation.
                  </p>
                  <div className="mb-8 rounded-2xl border border-stone-800 bg-stone-900 p-6 max-[480px]:mb-5 max-[480px]:p-4">
                    <span className="mb-1 block text-[10px] uppercase text-stone-500">Final Reputation</span>
                    <span className="text-4xl font-black text-amber-500 max-[480px]:text-3xl">{XP} PTS</span>
                  </div>
                  <button
                    onClick={startGame}
                    className="ui-button-primary rounded-full px-12 py-4 text-sm font-black uppercase tracking-widest max-[480px]:px-8 max-[480px]:py-3 max-[480px]:text-xs"
                  >
                    Reopen Files
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {feedback ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="pointer-events-none absolute inset-0 z-[200] flex items-start justify-center pt-4 text-center"
              >
                <div
                  className={`w-[min(92%,24rem)] rounded-[1.4rem] border px-4 py-3 shadow-[0_28px_56px_rgba(0,0,0,0.42)] ${
                    feedback.type === 'success'
                      ? 'border-emerald-300/75 bg-[linear-gradient(180deg,rgba(5,95,70,0.96),rgba(4,47,46,0.96))] text-emerald-50'
                      : 'border-rose-300/75 bg-[linear-gradient(180deg,rgba(127,29,29,0.96),rgba(69,10,10,0.96))] text-rose-50'
                  }`}
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] opacity-75">
                    {feedback.type === 'success' ? 'Success' : 'Failure'}
                  </div>
                  <div className="mt-1 text-lg font-black">{feedback.message}</div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
      />
    </div>
  );
};

export default DataDetectiveGame;



