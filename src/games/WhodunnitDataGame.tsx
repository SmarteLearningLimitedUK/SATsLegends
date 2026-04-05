import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, LineChart, PieChart, SearchCheck } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import dataBackground from '../assets/maps/desert.jpg';

interface WhodunnitDataGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type WhodunnitDataShellProps = WhodunnitDataGameProps & MiniGameShellContractProps;

type FeedbackState = 'idle' | 'correct' | 'incorrect';
type GraphKind = 'bar' | 'line' | 'pie';
type MetricKey = 'apples' | 'height' | 'coins' | 'jewels' | 'speed' | 'crimes';
type LootKey = 'apples' | 'coins' | 'jewels';

interface SuspectStats {
  apples: number;
  height: number;
  coins: number;
  jewels: number;
  speed: number;
  crimes: number;
  lootSplit: Record<LootKey, number>;
}

interface SuspectData {
  id: string;
  name: string;
  color: string;
  accent: string;
  emoji: string;
  stats: SuspectStats;
}

interface GraphSpec {
  id: string;
  kind: GraphKind;
  metric: MetricKey | 'lootSplit';
  title: string;
  unit: string;
}

interface CaseData {
  id: string;
  suspects: SuspectData[];
  graphs: GraphSpec[];
  clue: string;
  answerId: string;
  tier: number;
}

const CASES_TO_SOLVE = 8;
const CORRECT_ADVANCE_MS = 680;
const INCORRECT_RESET_MS = 520;

const SUSPECT_TEMPLATES = [
  { id: 'raccoon', name: 'Rex Raccoon', color: '#ef4444', accent: '#fda4af', emoji: '\u{1F99D}' },
  { id: 'fox', name: 'Casey Fox', color: '#3b82f6', accent: '#93c5fd', emoji: '\u{1F98A}' },
  { id: 'panda', name: 'Mochi Panda', color: '#22c55e', accent: '#86efac', emoji: '\u{1F43C}' },
] as const;

const METRIC_META: Record<MetricKey, { label: string; unit: string }> = {
  apples: { label: 'Apples Stolen', unit: '' },
  height: { label: 'Height', unit: 'cm' },
  coins: { label: 'Coins Stolen', unit: '' },
  jewels: { label: 'Jewels Stolen', unit: '' },
  speed: { label: 'Getaway Speed', unit: 'mph' },
  crimes: { label: 'Crime Count', unit: '' },
};

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(values: T[]) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const scoreToStars = (XP: number, solved: number, attempts: number) => {
  const accuracy = attempts > 0 ? solved / attempts : 0;
  if (XP >= 1800 && accuracy >= 0.85) return 3;
  if (XP >= 1200 && accuracy >= 0.65) return 2;
  return 1;
};

const metricValueLabel = (metric: MetricKey, value: number) => (
  metric === 'height' ? `${value} cm`
    : metric === 'speed' ? `${value} mph`
      : `${value}`
);

const prettifyMetric = (metric: MetricKey) => {
  if (metric === 'apples') return 'apples';
  if (metric === 'height') return 'height';
  if (metric === 'coins') return 'coins';
  if (metric === 'jewels') return 'jewels';
  if (metric === 'speed') return 'getaway speed';
  return 'crime count';
};

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

const isUniqueMetricValue = (suspects: SuspectData[], metric: MetricKey, value: number) =>
  suspects.filter((suspect) => suspect.stats[metric] === value).length === 1;

const buildSuspects = (): SuspectData[] => (
  SUSPECT_TEMPLATES.map((template) => {
    const apples = randInt(4, 14);
    const coins = randInt(10, 40);
    const jewels = randInt(2, 18);
    const totalLoot = apples + coins + jewels;

    return {
      ...template,
      stats: {
        apples,
        height: randInt(95, 145),
        coins,
        jewels,
        speed: randInt(18, 46),
        crimes: randInt(1, 9),
        lootSplit: {
          apples: apples / totalLoot,
          coins: coins / totalLoot,
          jewels: jewels / totalLoot,
        },
      },
    };
  })
);

const pickGraphSpecs = (tier: number): GraphSpec[] => {
  const barMetrics: MetricKey[] = ['apples', 'coins', 'jewels', 'crimes'];
  const lineMetrics: MetricKey[] = ['height', 'speed', 'coins', 'apples'];
  const barMetric = barMetrics[randInt(0, barMetrics.length - 1)];
  const lineMetric = lineMetrics[randInt(0, lineMetrics.length - 1)];

  if (tier <= 2) {
    return [{
      id: 'g1',
      kind: 'bar',
      metric: barMetric,
      title: METRIC_META[barMetric].label,
      unit: METRIC_META[barMetric].unit,
    }];
  }

  if (tier === 3) {
    return [
      {
        id: 'g1',
        kind: 'bar',
        metric: barMetric,
        title: METRIC_META[barMetric].label,
        unit: METRIC_META[barMetric].unit,
      },
      {
        id: 'g2',
        kind: 'line',
        metric: lineMetric,
        title: METRIC_META[lineMetric].label,
        unit: METRIC_META[lineMetric].unit,
      },
    ];
  }

  const secondMetric = lineMetric === barMetric ? 'height' : lineMetric;
  return [
    {
      id: 'g1',
      kind: 'bar',
      metric: barMetric,
      title: METRIC_META[barMetric].label,
      unit: METRIC_META[barMetric].unit,
    },
    {
      id: 'g2',
      kind: 'line',
      metric: secondMetric,
      title: METRIC_META[secondMetric].label,
      unit: METRIC_META[secondMetric].unit,
    },
    {
      id: 'g3',
      kind: 'pie',
      metric: 'lootSplit',
      title: 'Loot Type Split',
      unit: '%',
    },
  ];
};

const buildCase = (levelId: number, solvedCount: number): CaseData => {
  const baseTier = clamp(Math.floor((Math.max(1, levelId) - 1) / 2) + 1, 1, 5);
  const tier = clamp(baseTier + Math.floor(solvedCount / 2), 1, 5);

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const suspects = buildSuspects();
    const graphs = pickGraphSpecs(tier);
    const graphMetrics = graphs
      .filter((graph) => graph.metric !== 'lootSplit')
      .map((graph) => graph.metric as MetricKey);
    const hasPie = graphs.some((graph) => graph.kind === 'pie');

    const candidates: Array<{ clue: string; answerId: string; weight: number }> = [];
    const pushCandidate = (clue: string, predicate: (suspect: SuspectData) => boolean, weight: number) => {
      const matches = suspects.filter(predicate);
      if (matches.length === 1) {
        candidates.push({ clue, answerId: matches[0].id, weight });
      }
    };

    for (const metric of graphMetrics) {
      for (const suspect of suspects) {
        const value = suspect.stats[metric];
        if (isUniqueMetricValue(suspects, metric, value)) {
          pushCandidate(
            `Which suspect has ${prettifyMetric(metric)} of ${metricValueLabel(metric, value)}?`,
            (candidate) => candidate.stats[metric] === value,
            1,
          );
        }
      }
    }

    if (tier >= 2) {
      for (const metric of graphMetrics) {
        const sorted = [...suspects].sort((a, b) => b.stats[metric] - a.stats[metric]);
        if (sorted[0].stats[metric] !== sorted[1].stats[metric]) {
          pushCandidate(
            `Which suspect has the most ${prettifyMetric(metric)}?`,
            (candidate) => candidate.id === sorted[0].id,
            2,
          );
        }
        const asc = [...suspects].sort((a, b) => a.stats[metric] - b.stats[metric]);
        if (asc[0].stats[metric] !== asc[1].stats[metric]) {
          pushCandidate(
            `Which suspect has the fewest ${prettifyMetric(metric)}?`,
            (candidate) => candidate.id === asc[0].id,
            2,
          );
        }
      }
    }

    if (tier >= 3 && graphMetrics.length >= 2) {
      for (const suspect of suspects) {
        const metricA = graphMetrics[randInt(0, graphMetrics.length - 1)];
        const metricB = graphMetrics.find((metric) => metric !== metricA) || metricA;
        const valueA = suspect.stats[metricA];
        const valueB = suspect.stats[metricB];
        const qualifierB = metricB === 'height' || metricB === 'speed'
          ? `over ${valueB - 1} ${METRIC_META[metricB].unit}`
          : `more than ${Math.max(0, valueB - 1)}`;

        pushCandidate(
          `Which suspect has ${prettifyMetric(metricA)} of ${metricValueLabel(metricA, valueA)} and is ${qualifierB} for ${prettifyMetric(metricB)}?`,
          (candidate) => candidate.stats[metricA] === valueA && candidate.stats[metricB] > valueB - 1,
          3,
        );
      }
    }

    if (tier >= 4 && graphMetrics.length >= 2) {
      for (const suspect of suspects) {
        const refs = suspects.filter((candidate) => candidate.id !== suspect.id);
        const reference = refs[randInt(0, refs.length - 1)];
        const metricA = graphMetrics[randInt(0, graphMetrics.length - 1)];
        const metricB = graphMetrics.find((metric) => metric !== metricA) || metricA;

        pushCandidate(
          `Find the suspect with ${prettifyMetric(metricA)} greater than ${reference.name} and ${prettifyMetric(metricB)} under ${metricValueLabel(metricB, suspect.stats[metricB] + 1)}.`,
          (candidate) => (
            candidate.stats[metricA] > reference.stats[metricA]
            && candidate.stats[metricB] < suspect.stats[metricB] + 1
          ),
          4,
        );
      }
    }

    if (tier >= 5 && hasPie) {
      for (const suspect of suspects) {
        const refs = suspects.filter((candidate) => candidate.id !== suspect.id);
        const reference = refs[randInt(0, refs.length - 1)];
        const jewelsShare = suspect.stats.lootSplit.jewels;
        const apples = suspect.stats.apples;

        pushCandidate(
          `Which suspect has jewel share ${formatPercent(jewelsShare)}, stole ${apples} apples, and has more coins than ${reference.name}?`,
          (candidate) => (
            Math.abs(candidate.stats.lootSplit.jewels - jewelsShare) < 0.0001
            && candidate.stats.apples === apples
            && candidate.stats.coins > reference.stats.coins
          ),
          5,
        );
      }
    }

    const minimumWeight = tier >= 5 ? 4 : tier >= 4 ? 3 : tier >= 3 ? 2 : 1;
    const weighted = candidates.filter((candidate) => candidate.weight >= minimumWeight);
    const pool = weighted.length > 0 ? weighted : candidates;
    if (pool.length > 0) {
      const selected = pool[randInt(0, pool.length - 1)];
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        suspects: shuffle(suspects),
        graphs,
        clue: selected.clue,
        answerId: selected.answerId,
        tier,
      };
    }
  }

  // Fallback guaranteed solvable case.
  const suspects = buildSuspects();
  const metric: MetricKey = 'apples';
  const unique = [...suspects].sort((a, b) => b.stats[metric] - a.stats[metric])[0];
  return {
    id: `${Date.now()}-fallback`,
    suspects,
    graphs: [{
      id: 'g1',
      kind: 'bar',
      metric,
      title: METRIC_META[metric].label,
      unit: '',
    }],
    clue: `Which suspect has the most ${prettifyMetric(metric)}?`,
    answerId: unique.id,
    tier: 1,
  };
};

const buildPieSegments = (split: Record<LootKey, number>) => [
  { label: 'Apples', value: split.apples, color: '#f97316' },
  { label: 'Coins', value: split.coins, color: '#facc15' },
  { label: 'Jewels', value: split.jewels, color: '#22d3ee' },
];

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const arcSweep = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcSweep} 0 ${end.x} ${end.y}`;
};

const BarGraphPanel: React.FC<{ suspects: SuspectData[]; metric: MetricKey; unit: string; title: string }> = ({
  suspects,
  metric,
  unit,
  title,
}) => {
  const max = Math.max(...suspects.map((suspect) => suspect.stats[metric]), 1);
  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-2xl border border-sky-100/35 bg-slate-950/48 p-2.5">
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/90">{title}</div>
      <div className="grid h-full min-h-0 grid-cols-3 gap-2">
        {suspects.map((suspect) => {
          const value = suspect.stats[metric];
          const fillHeight = `${Math.max(12, (value / max) * 100)}%`;
          return (
            <div key={`${suspect.id}-${metric}`} className="flex min-h-0 flex-col items-center justify-end gap-1">
              <div className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-xl border border-white/20 bg-slate-900/65 px-1 py-1">
                <motion.div
                  key={`${suspect.id}-${value}`}
                  initial={{ height: 0 }}
                  animate={{ height: fillHeight }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full rounded-md"
                  style={{ background: `linear-gradient(180deg, ${suspect.accent}, ${suspect.color})` }}
                />
              </div>
              <div className="text-[11px] font-black leading-none text-white">{value}{unit ? ` ${unit}` : ''}</div>
              <div className="text-[10px] font-bold text-sky-100/85">{suspect.name.split(' ')[0]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineGraphPanel: React.FC<{ suspects: SuspectData[]; metric: MetricKey; unit: string; title: string }> = ({
  suspects,
  metric,
  unit,
  title,
}) => {
  const values = suspects.map((suspect) => suspect.stats[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 300;
  const height = 120;
  const leftPad = 20;
  const rightPad = 20;
  const topPad = 12;
  const bottomPad = 20;

  const points = suspects.map((suspect, index) => {
    const x = leftPad + (index * (width - leftPad - rightPad)) / Math.max(1, suspects.length - 1);
    const y = topPad + ((max - suspect.stats[metric]) / range) * (height - topPad - bottomPad);
    return { x, y, suspect };
  });
  const pathData = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-2xl border border-sky-100/35 bg-slate-950/48 p-2.5">
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/90">{title}</div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <path d={pathData} fill="none" stroke="#7dd3fc" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={`${point.suspect.id}-${metric}`}>
              <circle cx={point.x} cy={point.y} r={6} fill={point.suspect.color} stroke={point.suspect.accent} strokeWidth={2} />
              <text
                x={point.x}
                y={height - 4}
                textAnchor="middle"
                className="fill-white text-[11px] font-black"
              >
                {point.suspect.name.split(' ')[0]}
              </text>
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                className="fill-cyan-100 text-[10px] font-bold"
              >
                {point.suspect.stats[metric]}{unit ? unit : ''}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const PieGraphPanel: React.FC<{ suspects: SuspectData[]; title: string }> = ({ suspects, title }) => (
  <div className="flex h-full min-h-[150px] flex-col rounded-2xl border border-sky-100/35 bg-slate-950/48 p-2.5">
    <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/90">{title}</div>
    <div className="grid h-full min-h-0 grid-cols-3 gap-2">
      {suspects.map((suspect) => {
        const segments = buildPieSegments(suspect.stats.lootSplit);
        let cursor = 0;
        return (
          <div key={`${suspect.id}-pie`} className="flex min-h-0 flex-col items-center justify-center gap-1">
            <svg viewBox="0 0 92 92" className="h-[68px] w-[68px]">
              <circle cx="46" cy="46" r="30" fill="#0f172a" stroke="#e2e8f0" strokeOpacity="0.2" strokeWidth="2" />
              {segments.map((segment) => {
                const start = cursor * 360;
                cursor += segment.value;
                const end = cursor * 360;
                return (
                  <path
                    key={`${suspect.id}-${segment.label}`}
                    d={describeArc(46, 46, 30, start, end)}
                    stroke={segment.color}
                    strokeWidth="11"
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
              <circle cx="46" cy="46" r="17" fill="rgba(15,23,42,0.95)" />
            </svg>
            <div className="text-[10px] font-black text-white">{suspect.name.split(' ')[0]}</div>
            <div className="text-[9px] font-bold text-cyan-100/85">
              J {formatPercent(suspect.stats.lootSplit.jewels)}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const WhodunnitDataGame: React.FC<WhodunnitDataShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [caseData, setCaseData] = useState<CaseData>(() => buildCase(Math.max(levelId, 1), 0));
  const [solvedCases, setSolvedCases] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [XP, setScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [locked, setLocked] = useState(false);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [didComplete, setDidComplete] = useState(false);
  const [didFail, setDidFail] = useState(false);

  const timeoutIdsRef = useRef<number[]>([]);

  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const sessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const queueTimeout = (fn: () => void, delay: number) => {
    const timeoutId = window.setTimeout(fn, delay);
    timeoutIdsRef.current.push(timeoutId);
  };

  const clearTimeoutQueue = () => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  useEffect(() => () => clearTimeoutQueue(), []);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    clearTimeoutQueue();
    setCaseData(buildCase(Math.max(levelId, 1), 0));
    setSolvedCases(0);
    setAttempts(0);
    setScore(0);
    setFeedback('idle');
    setLocked(false);
    setSelectedSuspectId(null);
    setDidComplete(false);
    setDidFail(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (sessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [didComplete, didFail, lives, onGameOver, XP, sessionActive, sessionEvents, sessionState]);

  const completeRun = (finalScore: number, finalSolved: number, finalAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, finalSolved, finalAttempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { solvedCases: finalSolved, attempts: finalAttempts },
    });
    onVictory(stars, finalScore);
  };

  const loadNextCase = (nextSolvedCount: number) => {
    setCaseData(buildCase(Math.max(levelId, 1), nextSolvedCount));
    setFeedback('idle');
    setLocked(false);
    setSelectedSuspectId(null);
  };

  const handleSuspectSelect = (suspectId: string) => {
    if (!sessionActive || locked || didComplete || didFail) return;

    const isCorrect = suspectId === caseData.answerId;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedSuspectId(suspectId);
    setLocked(true);

    if (isCorrect) {
      const nextSolved = solvedCases + 1;
      const gained = 170 + caseData.tier * 30;
      const nextScore = XP + gained;

      setSolvedCases(nextSolved);
      setScore(nextScore);
      setFeedback('correct');

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: XP,
        metadata: {
          scoreAfter: nextScore,
          solvedCases: nextSolved,
          selectedSuspectId: suspectId,
          answerId: caseData.answerId,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          selectedSuspectId: suspectId,
          answerId: caseData.answerId,
          caseTier: caseData.tier,
        },
      });

      queueTimeout(() => {
        if (nextSolved >= CASES_TO_SOLVE) {
          completeRun(nextScore, nextSolved, nextAttempts);
          return;
        }
        loadNextCase(nextSolved);
      }, CORRECT_ADVANCE_MS);
      return;
    }

    setFeedback('incorrect');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: {
        selectedSuspectId: suspectId,
        answerId: caseData.answerId,
      },
    });

    queueTimeout(() => {
      setFeedback('idle');
      setLocked(false);
      setSelectedSuspectId(null);
    }, INCORRECT_RESET_MS);
  };

  const graphColumnsClass = caseData.graphs.length === 1
    ? 'grid-cols-1'
    : caseData.graphs.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  const clueHeader = `Case ${solvedCases + 1} of ${CASES_TO_SOLVE}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={dataBackground}
        alt="Desert detective backdrop"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/28" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(251,191,36,0.16),transparent_42%),radial-gradient(circle_at_20%_70%,rgba(56,189,248,0.14),transparent_44%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-2 pt-2">
        <div className="shrink-0">
          <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-100/40 bg-slate-950/52 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/95">
            <SearchCheck className="h-3.5 w-3.5 text-amber-300" />
            {clueHeader}
          </div>
        </div>

        <div className="mt-2 shrink-0 rounded-2xl border border-cyan-100/38 bg-slate-900/56 px-3 py-2 text-center shadow-[0_10px_24px_rgba(2,6,23,0.34)]">
          <p className="text-sm font-black leading-snug text-white">
            {caseData.clue}
          </p>
        </div>

        <div className={`mt-2 grid shrink-0 gap-2 ${graphColumnsClass}`}>
          {caseData.graphs.map((graph) => {
            if (graph.kind === 'bar' && graph.metric !== 'lootSplit') {
              return (
                <BarGraphPanel
                  key={graph.id}
                  suspects={caseData.suspects}
                  metric={graph.metric}
                  unit={graph.unit}
                  title={graph.title}
                />
              );
            }

            if (graph.kind === 'line' && graph.metric !== 'lootSplit') {
              return (
                <LineGraphPanel
                  key={graph.id}
                  suspects={caseData.suspects}
                  metric={graph.metric}
                  unit={graph.unit}
                  title={graph.title}
                />
              );
            }

            return <PieGraphPanel key={graph.id} suspects={caseData.suspects} title={graph.title} />;
          })}
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5">
            {caseData.suspects.map((suspect) => {
              const selected = selectedSuspectId === suspect.id;
              const isCorrect = feedback === 'correct' && selected;
              const isWrong = feedback === 'incorrect' && selected;

              return (
                <motion.button
                  key={`${caseData.id}-${suspect.id}`}
                  type="button"
                  onClick={() => handleSuspectSelect(suspect.id)}
                  disabled={locked || didComplete || didFail || !sessionActive}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex min-h-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-cyan-100/45 bg-[linear-gradient(180deg,rgba(30,58,138,0.82),rgba(15,23,42,0.9))] px-2 py-2 text-center shadow-[0_10px_16px_rgba(2,6,23,0.32)]"
                >
                  <div
                    className="h-16 w-16 rounded-full border-2 shadow-[0_0_20px_rgba(255,255,255,0.22)]"
                    style={{
                      borderColor: suspect.accent,
                      background: `radial-gradient(circle at 30% 30%, ${suspect.accent}, ${suspect.color})`,
                    }}
                  />
                  <div className="text-3xl">{suspect.emoji}</div>
                  <div className="text-[11px] font-black leading-tight text-white">{suspect.name.split(' ')[0]}</div>

                  {isCorrect ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 1, 0.8], scale: [0.8, 1.08, 1] }}
                      className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-300 bg-emerald-400/24"
                    />
                  ) : null}

                  {isWrong ? (
                    <motion.div
                      initial={{ opacity: 0.2, x: 0 }}
                      animate={{ opacity: [0.2, 0.6, 0.2], x: [0, -4, 4, -2, 0] }}
                      transition={{ duration: 0.4 }}
                      className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-rose-300 bg-rose-500/20"
                    />
                  ) : null}

                  {selected && feedback === 'idle' ? (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber-200/85" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedback !== 'idle' ? (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
          >
            <div
              className={`rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${
                feedback === 'correct'
                  ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_20px_rgba(74,222,128,0.8)]'
                  : 'bg-rose-500 text-white shadow-[0_0_20px_rgba(251,113,133,0.7)]'
              }`}
            >
              {feedback === 'correct' ? 'Case Solved!' : 'Wrong Suspect'}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
        <div className="rounded-full border border-cyan-100/35 bg-slate-950/54 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/95">
          Tier {caseData.tier}
        </div>
        <div className="rounded-full border border-amber-200/45 bg-amber-400/16 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
          XP {XP}
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-cyan-100/35 bg-slate-950/54 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/95">
        <BarChart3 className="h-3.5 w-3.5 text-cyan-200" />
        <LineChart className="h-3.5 w-3.5 text-indigo-200" />
        <PieChart className="h-3.5 w-3.5 text-amber-200" />
      </div>
    </div>
  );
};

export default WhodunnitDataGame;
