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
  LabelList,
} from 'recharts';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import dataDetectiveBackground from '../assets/level_backgrounds/datadetectivemap.jpg';

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

interface DataDetectiveGameProps {
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
  { name: 'Shiny Gems', color: '#60a5fa' },
  { name: 'Magic Cookies', color: '#f59e0b' },
  { name: 'Stinky Socks', color: '#10b981' },
  { name: 'Gold Coins', color: '#facc15' },
];

const MONSTER_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500'];

const MONSTER_NAMES = ['Grumpy Green', 'Blue Blob', 'Purple Prowler', 'Red Rogue'];
const loadSortedImages = (record: Record<string, string>) => (
  Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
);
const MUGSHOT_IMAGES = loadSortedImages(
  import.meta.glob('../assets/bosses/portraits/*.png', { eager: true, import: 'default' }) as Record<string, string>,
);
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

const MAX_CASES = 10;

const scoreToStars = (XP: number) => {
  if (XP >= 900) return 3;
  if (XP >= 700) return 2;
  return 1;
};

const DataDetectiveGame: React.FC<DataDetectiveGameProps> = ({
  useSharedTopHud = false,
  onVictory,
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

  const maxCaseValue = Math.max(...currentCase.map((item) => item.amount), 0);
  const barAxisMax = Math.max(1, maxCaseValue);
  const barTicks = Array.from({ length: barAxisMax + 1 }, (_, index) => index);

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
    const shuffledMugshots = shuffle(MUGSHOT_IMAGES).slice(0, 4);
    const newSuspects = Array.from({ length: 4 }, (_, i) => {
      if (i === correctIdx) {
        return {
          id: i,
          name: MONSTER_NAMES[i],
          items: caseData.map(d => d.amount),
          color: MONSTER_COLORS[i],
          portrait: shuffledMugshots[i],
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
        portrait: shuffledMugshots[i],
      };
    });

    setSuspects(newSuspects);
    setGuiltyId(correctIdx);
    setFeedback(null);
    setSelectedSuspectId(null);
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setGameState('playing');
    generateCase();
  };

  useEffect(() => {
    generateCase();
  }, [generateCase]);

  const handleSuspectClick = (id: number) => {
    if (gameState !== 'playing') return;
    setSelectedSuspectId(id);
    setFeedback(null);
  };

  const handleAccuse = (id: number) => {
    if (gameState !== 'playing') return;
    if (id === guiltyId) {
      setFeedback({ type: 'success', message: 'CASE CLOSED! You found the guilty monster.' });
      setGameState('success');
      setScore(prev => prev + 100);
      return;
    }

    setFeedback({ type: 'error', message: "WRONG SUSPECT! The evidence doesn't match." });
    setSelectedSuspectId(null);
    setScore(prev => Math.max(0, prev - 20));
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
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
      />
      <GameScreenLayout
        className="relative z-10 h-full w-full min-h-0 text-slate-100"
      top={(
        <div className="flex flex-col gap-2">
          {!useSharedTopHud ? (
            <header className="z-20 flex h-16 items-center justify-between border-b border-cyan-200/16 bg-[linear-gradient(180deg,rgba(8,26,66,0.78),rgba(5,16,42,0.84))] px-6 backdrop-blur-md">
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
          <div className="game-question-card">
            <div className="question-title">{caseMode === 'whodunnit' ? 'Who took the loot?' : 'Match the evidence totals.'}</div>
            <div className="question-subtitle">{caseBrief}</div>
          </div>
        </div>
      )}
      main={(
        <main className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.05rem)]' : ''}`}>
        <section className="z-10 flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden border-b border-cyan-200/12 bg-[linear-gradient(180deg,rgba(12,32,74,0.2),rgba(6,20,48,0.24))] px-2 pb-2 pt-3 sm:px-3 sm:pb-3 sm:pt-4 md:gap-3 md:border-b md:border-cyan-200/12 md:p-5">
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

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(9,24,58,0.6))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3 md:p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.3)_1px,transparent_1px)] opacity-7 [background-size:20px_20px]" />

            <div className="relative w-full" style={{ height: 'clamp(9.5rem, 26vh, 14rem)' }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart data={currentCase} margin={{ top: 12, right: 10, left: -6, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#a8a29e"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                    <YAxis
                      ticks={barTicks}
                      domain={[0, barAxisMax]}
                      stroke="#a8a29e"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {currentCase.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="amount" position="top" fill="#f1f5f9" fontSize={10} fontWeight={700} />
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <Pie
                    data={currentCase}
                    cx="50%"
                    cy="50%"
                    innerRadius="32%"
                    outerRadius="62%"
                    paddingAngle={3}
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
                            fontSize={10}
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

            <div className="mt-1.5 grid grid-cols-2 gap-1 sm:gap-1.5">
              {currentCase.map(item => (
                <div key={item.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-2 py-1">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 truncate text-[8px] font-bold uppercase tracking-wide text-stone-300">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="z-10 flex w-full flex-col gap-2 bg-[linear-gradient(180deg,rgba(8,18,40,0.16),rgba(5,12,28,0.24))] px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-2 md:gap-3 md:p-5">
          <div className="mb-1 flex items-center gap-2 text-amber-500">
            <Users className="h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest">Suspect Lineup</h2>
          </div>

          <div className="relative">
            <div className={`grid grid-cols-4 gap-1 items-center ${selectedSuspect ? 'opacity-0 pointer-events-none' : ''}`}>
              {suspects.map((suspect) => (
                <motion.button
                  key={suspect.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuspectClick(suspect.id)}
                  transition={{ duration: 0.35 }}
                  className={`group relative flex w-full aspect-[4/3] items-center justify-center rounded-[1.2rem] border-2 p-1 transition-all duration-300 sm:aspect-[3/4] ${
                    gameState === 'success' && suspect.id === guiltyId
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-stone-800 bg-stone-900/50 hover:border-amber-500/50'
                  }`}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-[1.05rem] border border-white/16 bg-slate-950/40 shadow-lg">
                    {suspect.portrait ? (
                      <img
                        src={suspect.portrait}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
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
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedSuspect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-full max-w-[20rem] max-h-[70vh] overflow-hidden rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(9,24,58,0.96),rgba(4,12,28,0.98))] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/20">
                        {selectedSuspect.portrait && (
                          <img
                            src={selectedSuspect.portrait}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Suspect</div>
                        <div className="text-lg font-black text-white">{selectedSuspect.name}</div>
                      </div>
                    </div>

                    <div className="mt-4 max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                      {selectedSuspect.items.map((amount, index) => (
                        <div key={`${selectedSuspect.id}-item-${index}`} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/6 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ITEMS[index].color }} />
                            <span className="text-xs font-bold text-white">{ITEMS[index].name}</span>
                          </div>
                          <span className="text-sm font-black text-amber-200">{amount}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSuspectId(null)}
                        className="flex-1 rounded-xl border border-white/16 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccuse(selectedSuspect.id)}
                        className="flex-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
                      >
                        Accuse
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-1 flex flex-col gap-1.5 pt-0.5">
            <AnimatePresence mode="wait">
              {gameState === 'success' ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={nextCase}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-stone-900 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  Next Case File <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : null}
            </AnimatePresence>
            {feedback && (
              <div className={`rounded-full border px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${
                feedback.type === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/50 bg-rose-500/10 text-amber-200'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>
        </section>
        </main>
      )}
      overlay={(
        <>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,46,0.34),rgba(4,16,38,0.48)_55%,rgba(2,8,24,0.62)_100%)]" />
          <AnimatePresence>
            {gameState === 'complete' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/95 p-12 text-center backdrop-blur-xl"
              >
                <div className="max-w-md">
                  <Trophy className="mx-auto mb-8 h-20 w-20 text-yellow-400" />
                  <h2 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white italic">Chief Of Detectives</h2>
                  <p className="mb-8 text-sm leading-relaxed text-stone-400">
                    All cases solved. The city is safe once again thanks to your expert data interpretation.
                  </p>
                  <div className="mb-8 rounded-2xl border border-stone-800 bg-stone-900 p-6">
                    <span className="mb-1 block text-[10px] uppercase text-stone-500">Final Reputation</span>
                    <span className="text-4xl font-black text-amber-500">{XP} PTS</span>
                  </div>
                  <button
                    onClick={startGame}
                    className="rounded-full bg-stone-100 px-12 py-4 text-sm font-black uppercase tracking-widest text-stone-900 transition-all hover:bg-white"
                  >
                    Reopen Files
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      />
    </div>
  );
};

export default DataDetectiveGame;



