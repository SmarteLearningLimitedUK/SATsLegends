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
  Ghost,
  Fingerprint,
  PieChart as PieChartIcon,
  BarChart3,
  ShieldAlert,
  Dna,
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
  Legend,
} from 'recharts';

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
  icon: React.ReactNode;
}

interface DataDetectiveGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const ITEMS = [
  { name: 'Shiny Gems', color: '#60a5fa' },
  { name: 'Magic Cookies', color: '#f59e0b' },
  { name: 'Stinky Socks', color: '#10b981' },
  { name: 'Gold Coins', color: '#facc15' },
];

const MONSTER_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500'];

const MONSTER_ICONS = [
  <Ghost className="h-12 w-12" />,
  <Fingerprint className="h-12 w-12" />,
  <Dna className="h-12 w-12" />,
  <ShieldAlert className="h-12 w-12" />,
];

const MONSTER_NAMES = ['Grumpy Green', 'Blue Blob', 'Purple Prowler', 'Red Rogue'];

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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [armedSuspectId, setArmedSuspectId] = useState<number | null>(null);

  const generateCase = useCallback(() => {
    setChartType(Math.random() > 0.5 ? 'bar' : 'pie');

    const caseData = ITEMS.map(item => ({
      ...item,
      amount: Math.floor(Math.random() * 10) + 2,
    }));
    setCurrentCase(caseData);

    const correctIdx = Math.floor(Math.random() * 4);
    const newSuspects = Array.from({ length: 4 }, (_, i) => {
      if (i === correctIdx) {
        return {
          id: i,
          name: MONSTER_NAMES[i],
          items: caseData.map(d => d.amount),
          color: MONSTER_COLORS[i],
          icon: MONSTER_ICONS[i],
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
        icon: MONSTER_ICONS[i],
      };
    });

    setSuspects(newSuspects);
    setGuiltyId(correctIdx);
    setFeedback(null);
    setArmedSuspectId(null);
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
    if (armedSuspectId !== id) {
      setArmedSuspectId(id);
      setFeedback({ type: 'success', message: 'Evidence locked. Tap again to accuse this suspect.' });
      return;
    }

    if (id === guiltyId) {
      setFeedback({ type: 'success', message: 'CASE CLOSED! You found the guilty monster.' });
      setGameState('success');
      setScore(prev => prev + 100);
      return;
    }

    setFeedback({ type: 'error', message: "WRONG SUSPECT! The evidence doesn't match." });
    setArmedSuspectId(null);
    setScore(prev => Math.max(0, prev - 20));
  };

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
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden text-slate-100"><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,46,0.34),rgba(4,16,38,0.48)_55%,rgba(2,8,24,0.62)_100%)]" />
      {!useSharedTopHud && (
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
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Data Detective Agency</h1>
              <p className="text-[10px] italic uppercase tracking-tighter text-stone-500">Solving crimes with statistics</p>
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
      )}

      <main className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.25rem)]' : ''}`}>
        <section className="z-10 flex min-h-0 w-full flex-[0.42] flex-col gap-2 border-b border-cyan-200/12 bg-[linear-gradient(180deg,rgba(8,26,66,0.18),rgba(4,14,38,0.26))] p-3 sm:p-4 md:w-1/2 md:flex-1 md:gap-4 md:border-b-0 md:border-r md:p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <FileText className="h-5 w-5" />
              <h2 className="text-xs font-black uppercase tracking-widest">Evidence: Stolen Items</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800 px-3 py-1">
              {chartType === 'bar'
                ? <BarChart3 className="h-3 w-3 text-amber-400" />
                : <PieChartIcon className="h-3 w-3 text-amber-400" />}
              <span className="text-[10px] font-bold uppercase text-stone-400">{chartType} Chart</span>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(9,24,58,0.82),rgba(5,14,36,0.9))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4 md:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#444_1px,transparent_1px)] opacity-5 [background-size:20px_20px]" />

            <div className="relative h-[12.5rem] min-h-[12.5rem] w-full sm:h-[14rem] sm:min-h-[14rem] md:h-full md:min-h-[15rem]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={currentCase} margin={{ top: 16, right: 12, left: -12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#a8a29e"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      stroke="#a8a29e"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={24}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {currentCase.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <Pie
                      data={currentCase}
                      cx="50%"
                      cy="50%"
                      innerRadius="34%"
                      outerRadius="66%"
                      paddingAngle={3}
                      dataKey="amount"
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

            <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
              {currentCase.map(item => (
                <div key={item.name} className="flex items-center gap-2 rounded-lg border border-stone-800/90 bg-stone-950/35 px-2.5 py-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-stone-300">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="z-10 flex min-h-0 w-full flex-[0.58] flex-col gap-2 bg-[linear-gradient(180deg,rgba(8,16,38,0.14),rgba(5,10,26,0.24))] p-3 sm:p-4 md:w-1/2 md:flex-1 md:gap-4 md:p-6">
          <div className="mb-2 flex items-center gap-2 text-amber-500">
            <Users className="h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest">Suspect Lineup</h2>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 md:gap-3">
            {suspects.map((suspect) => (
              <motion.button
                key={suspect.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSuspectClick(suspect.id)}
                animate={armedSuspectId === suspect.id ? { scale: [1, 1.03, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`group relative flex min-h-0 flex-col rounded-2xl border-2 p-3 transition-all duration-300 md:p-4 ${
                  gameState === 'success' && suspect.id === guiltyId
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : armedSuspectId === suspect.id
                      ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                      : 'border-stone-800 bg-stone-900/50 hover:border-amber-500/50'
                }`}
              >
                <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${suspect.color} text-stone-900 shadow-lg md:mb-3 md:h-14 md:w-14`}>
                  {suspect.icon}
                </div>

                <h3 className="mb-2 text-center text-[11px] font-black uppercase tracking-tight text-white md:mb-3 md:text-xs">
                  {suspect.name}
                </h3>

                <div className="mt-auto grid grid-cols-2 gap-1.5 md:gap-2">
                  {suspect.items.map((amount, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-950/50 p-1.5 md:p-2">
                      <span className="mr-1 truncate text-[8px] font-bold uppercase text-stone-500">{ITEMS[i].name.split(' ')[1]}</span>
                      <span className="text-xs font-black text-amber-400">{amount}</span>
                    </div>
                  ))}
                </div>

                {gameState === 'success' && suspect.id === guiltyId && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          <div className="mt-auto pt-1">
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
              ) : (
                <div className="rounded-xl border border-stone-800 bg-stone-900/20 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Select the suspect whose items match the evidence
                  </span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

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

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.85rem)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border px-6 py-3 shadow-2xl ${
              feedback.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/50 bg-rose-500/10 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-xs font-bold uppercase tracking-wide">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataDetectiveGame;



