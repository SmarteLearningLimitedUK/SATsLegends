import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { GAME_META } from '../gameMeta';
import GameplayHUD from './GameplayHUD';
import AssetIcon from './AssetIcon';
import { Star } from './GameIcons';

type SupportedChallengeGameType =
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'percent_pulse'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'scale_safari'
  | 'chart_chase'
  | 'mean_machine'
  | 'equation_grove'
  | 'rule_runner';

interface CurriculumChallengeGameProps {
  gameType: SupportedChallengeGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface CoordinatePoint {
  x: number;
  y: number;
  label: string;
  tone?: string;
}

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

type VisualData =
  | { type: 'tokens'; items: string[]; accent?: string }
  | { type: 'equation'; lines: string[]; badge?: string }
  | { type: 'bars'; bars: BarDatum[]; caption?: string }
  | { type: 'coordinates'; points: CoordinatePoint[]; min: number; max: number; caption?: string }
  | { type: 'sequence'; values: string[]; caption?: string }
  | { type: 'ratio'; leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; caption?: string };

interface ChallengeQuestion {
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  visual: VisualData;
}

interface ChallengeTheme {
  title: string;
  surface: string;
  scene: string;
  ambient: string;
  prompt: string;
  answer: string;
  answerActive: string;
  statText: string;
  statSoftBg: string;
  statBorder: string;
  progress: string;
  badge: string;
}

const QUESTION_TIME_BONUS = 7;

const CHALLENGE_THEMES: Record<SupportedChallengeGameType, ChallengeTheme> = {
  place_value_peaks: {
    title: 'Place Value Peaks',
    surface: 'from-emerald-300/20 via-sky-200/12 to-slate-950/86',
    scene: 'from-lime-200/14 via-emerald-300/10 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.22),transparent_30%),linear-gradient(180deg,#0f3026_0%,#09131b_100%)]',
    prompt: 'from-emerald-200/20 to-cyan-100/10',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-lime-300/55 to-emerald-400/48',
    statText: 'text-emerald-950',
    statSoftBg: 'bg-emerald-100/85',
    statBorder: 'border-emerald-200/90',
    progress: 'bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-400',
    badge: 'text-lime-100',
  },
  calculation_clash: {
    title: 'Calculation Clash',
    surface: 'from-rose-300/18 via-orange-200/12 to-slate-950/86',
    scene: 'from-orange-300/16 via-yellow-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.24),transparent_28%),linear-gradient(180deg,#2e140c_0%,#0b1018_100%)]',
    prompt: 'from-orange-200/20 to-amber-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-orange-300/55 to-rose-400/48',
    statText: 'text-orange-950',
    statSoftBg: 'bg-orange-100/85',
    statBorder: 'border-orange-200/90',
    progress: 'bg-gradient-to-r from-yellow-300 via-orange-300 to-rose-400',
    badge: 'text-amber-100',
  },
  percent_pulse: {
    title: 'Percent Pulse',
    surface: 'from-fuchsia-300/18 via-violet-200/12 to-slate-950/86',
    scene: 'from-fuchsia-300/16 via-pink-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(232,121,249,0.2),transparent_28%),linear-gradient(180deg,#28113a_0%,#091018_100%)]',
    prompt: 'from-fuchsia-200/20 to-violet-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-fuchsia-300/55 to-violet-400/48',
    statText: 'text-violet-950',
    statSoftBg: 'bg-violet-100/85',
    statBorder: 'border-violet-200/90',
    progress: 'bg-gradient-to-r from-pink-300 via-fuchsia-300 to-violet-400',
    badge: 'text-fuchsia-100',
  },
  coordinate_quest: {
    title: 'Coordinate Quest',
    surface: 'from-sky-300/18 via-cyan-200/12 to-slate-950/86',
    scene: 'from-sky-300/18 via-cyan-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_28%),linear-gradient(180deg,#10283a_0%,#071018_100%)]',
    prompt: 'from-sky-200/18 to-cyan-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-cyan-300/55 to-sky-400/48',
    statText: 'text-cyan-950',
    statSoftBg: 'bg-cyan-100/85',
    statBorder: 'border-cyan-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400',
    badge: 'text-cyan-100',
  },
  transform_temple: {
    title: 'Transform Temple',
    surface: 'from-amber-300/18 via-yellow-200/12 to-slate-950/86',
    scene: 'from-yellow-200/18 via-amber-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),transparent_28%),linear-gradient(180deg,#33240f_0%,#091018_100%)]',
    prompt: 'from-amber-200/18 to-yellow-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-amber-300/55 to-yellow-400/48',
    statText: 'text-amber-950',
    statSoftBg: 'bg-amber-100/85',
    statBorder: 'border-amber-200/90',
    progress: 'bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400',
    badge: 'text-amber-100',
  },
  scale_safari: {
    title: 'Scale Safari',
    surface: 'from-lime-300/18 via-yellow-200/12 to-slate-950/86',
    scene: 'from-lime-300/20 via-yellow-200/10 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.2),transparent_28%),linear-gradient(180deg,#223310_0%,#091018_100%)]',
    prompt: 'from-lime-200/18 to-yellow-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-lime-300/55 to-yellow-400/48',
    statText: 'text-lime-950',
    statSoftBg: 'bg-lime-100/85',
    statBorder: 'border-lime-200/90',
    progress: 'bg-gradient-to-r from-lime-300 via-yellow-300 to-orange-400',
    badge: 'text-lime-100',
  },
  chart_chase: {
    title: 'Chart Chase',
    surface: 'from-indigo-300/18 via-blue-200/12 to-slate-950/86',
    scene: 'from-indigo-300/16 via-sky-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.2),transparent_28%),linear-gradient(180deg,#101f40_0%,#091018_100%)]',
    prompt: 'from-indigo-200/18 to-blue-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-indigo-300/55 to-sky-400/48',
    statText: 'text-indigo-950',
    statSoftBg: 'bg-indigo-100/85',
    statBorder: 'border-indigo-200/90',
    progress: 'bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-400',
    badge: 'text-sky-100',
  },
  mean_machine: {
    title: 'Mean Machine',
    surface: 'from-blue-300/18 via-slate-200/12 to-slate-950/86',
    scene: 'from-cyan-300/16 via-blue-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%),linear-gradient(180deg,#10243e_0%,#091018_100%)]',
    prompt: 'from-blue-200/18 to-slate-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-cyan-300/55 to-blue-400/48',
    statText: 'text-blue-950',
    statSoftBg: 'bg-blue-100/85',
    statBorder: 'border-blue-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-400',
    badge: 'text-blue-100',
  },
  equation_grove: {
    title: 'Equation Grove',
    surface: 'from-emerald-300/18 via-lime-200/12 to-slate-950/86',
    scene: 'from-emerald-300/18 via-lime-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.2),transparent_28%),linear-gradient(180deg,#133222_0%,#091018_100%)]',
    prompt: 'from-emerald-200/18 to-lime-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-emerald-300/55 to-lime-400/48',
    statText: 'text-emerald-950',
    statSoftBg: 'bg-emerald-100/85',
    statBorder: 'border-emerald-200/90',
    progress: 'bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-400',
    badge: 'text-emerald-100',
  },
  rule_runner: {
    title: 'Rule Runner',
    surface: 'from-purple-300/18 via-indigo-200/12 to-slate-950/86',
    scene: 'from-violet-300/18 via-indigo-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.2),transparent_28%),linear-gradient(180deg,#1c173b_0%,#091018_100%)]',
    prompt: 'from-violet-200/18 to-indigo-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-violet-300/55 to-indigo-400/48',
    statText: 'text-violet-950',
    statSoftBg: 'bg-violet-100/85',
    statBorder: 'border-violet-200/90',
    progress: 'bg-gradient-to-r from-fuchsia-300 via-violet-300 to-indigo-400',
    badge: 'text-violet-100',
  },
};

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatCoordinate = (point: { x: number; y: number }) => `(${point.x}, ${point.y})`;

const makeOptions = (correct: string, wrongOptions: string[]) => {
  const options = shuffle([correct, ...wrongOptions.slice(0, 3)]);
  return {
    options,
    answerIndex: options.indexOf(correct),
  };
};

const fractionToPercentSet = [
  { fraction: '1/2', decimal: '0.5', percent: '50%' },
  { fraction: '1/4', decimal: '0.25', percent: '25%' },
  { fraction: '3/4', decimal: '0.75', percent: '75%' },
  { fraction: '1/5', decimal: '0.2', percent: '20%' },
  { fraction: '3/5', decimal: '0.6', percent: '60%' },
  { fraction: '3/8', decimal: '0.375', percent: '37.5%' },
];

const renderCoordinates = (visual: Extract<VisualData, { type: 'coordinates' }>) => null;
const renderVisual = (visual: VisualData) => null;
const generateQuestion = (gameType: SupportedChallengeGameType, levelId: number): ChallengeQuestion => ({
  prompt: `${gameType} prompt`,
  sublabel: `Level ${levelId}`,
  options: ['A', 'B', 'C', 'D'],
  answerIndex: 0,
  visual: { type: 'tokens', items: ['1', '2', '3', '4'] },
});

const CurriculumChallengeGame: React.FC<CurriculumChallengeGameProps> = () => null;

export default CurriculumChallengeGame;
