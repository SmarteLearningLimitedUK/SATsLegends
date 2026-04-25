import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { getBossEncounter } from '../bossMeta';
import { BossPose } from '../assets/bosses';
import { triggerHaptic } from '../haptics';
import AnimatedAvatar from '../components/AnimatedAvatar';
import BossPortrait from '../components/BossPortrait';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import bossPaperBackground from '../assets/maps/backgroundsforgames/forestbackground.png';
import { isBossEncounterGameType, SupportedBossGameType } from './bossEncounterTypes';
import type { AnimationState } from '../types';
import type { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';
import { emitMiniGameSessionEvent } from '../app/gameplaySessionContract';
import { generateArithmeticBossPaper, markArithmeticPaper } from './arithmeticBossPaper';
import type { ArithmeticPaperResult } from './arithmeticBossPaper';
import { generateReasoning1Paper, markReasoning1Paper } from './reasoning1Paper';
import type { ReasoningPaperResult, ReasoningQuestion } from './reasoning1Paper';
import { generateReasoning2Paper, markReasoning2Paper } from './reasoning2Paper';

interface BossEncounterGameProps {
  gameType: SupportedBossGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

type QuestionKind = 'fluency' | 'reasoning';
type SelectionMode = 'single' | 'multi' | 'true_false';

interface BossQuestion {
  prompt: string;
  clue: string;
  options: string[];
  correctOptionIndices: number[];
  dataPoints: string[];
  kind?: QuestionKind;
  marks?: number;
  selectionMode?: SelectionMode;
}

type OrderingDragState = {
  value: string;
  fromIndex: number;
  source: 'tray' | 'slot';
  pointerId: number;
  clientX: number;
  clientY: number;
  width: number;
  height: number;
};

const TOTAL_QUESTIONS = 30;
const BOSS_HEALTH_MAX = 20;
const HERO_HEALTH_MAX = 3;
const HIGH_SCORE_STARS = {
  bronze: 1800,
  silver: 3000,
  gold: 4500,
} as const;

export { isBossEncounterGameType };

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const makeOptions = (correct: string, wrongs: string[]) => {
  const unique = Array.from(new Set([correct, ...wrongs]));
  const options: string[] = unique.filter(Boolean);
  if (!options.includes(correct)) {
    options.unshift(correct);
  }

  let pad = 1;
  while (options.length < 4) {
    const numeric = Number(correct);
    const candidate = Number.isFinite(numeric) ? String(numeric + pad) : `${correct} ${pad}`;
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    pad += 1;
  }

  const shuffled = shuffle(options).slice(0, 4);
  return { options: shuffled, answerIndex: shuffled.indexOf(correct) };
};

const makeMultiOptions = (correctAnswers: string[], wrongs: string[]) => {
  const answers = Array.from(new Set(correctAnswers.filter(Boolean)));
  const wrongPool = Array.from(new Set(wrongs.filter(Boolean))).filter((option) => !answers.includes(option));
  const filler = shuffle(wrongPool).slice(0, Math.max(0, 4 - answers.length));
  const options = shuffle([...answers, ...filler]);
  const correctOptionIndices = options
    .map((option, index) => (answers.includes(option) ? index : -1))
    .filter((index): index is number => index >= 0);

  return { options, correctOptionIndices };
};

const makeTrueFalseOptions = (isTrue: boolean) => {
  const options = shuffle(['True', 'False', 'Cannot tell', 'Both']);
  return {
    options,
    correctOptionIndices: [options.indexOf(isTrue ? 'True' : 'False')],
  };
};

const formatReasoningAnswer = (value: any): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '').replace(/\|/g, ', ');
};

const makeReasoningChoices = (question: ReasoningQuestion): any[] => {
  if (question.choices?.length) return question.choices;

  const correct = formatReasoningAnswer(question.answer);
  const numericAnswer = Number(String(correct).replace(/[£,a-zA-Z\s]/g, ''));

  if (Array.isArray(question.answer) && question.answer.length === 2) {
    const [x, y] = question.answer.map(Number);
    return [`(${x}, ${y})`, `(${y}, ${x})`, `(${x + 1}, ${y})`, `(${x}, ${Math.max(0, y - 1)})`];
  }

  if (String(correct).includes('/')) {
    const [numerator, denominator] = String(correct).split('/').map(Number);
    return Array.from(new Set([
      correct,
      `${numerator + 1}/${denominator}`,
      `${Math.max(1, numerator - 1)}/${denominator}`,
      `${numerator}/${denominator + 1}`,
    ])).slice(0, 4);
  }

  if (Number.isFinite(numericAnswer)) {
    const prefix = String(correct).trim().startsWith('£') ? '£' : '';
    const suffix = String(correct).replace(/[0-9.,£\-\s]/g, '').trim();
    const formatOption = (value: number) => {
      if (prefix) return `${prefix}${value.toFixed(2)}`;
      return `${value}${suffix ? ` ${suffix}` : ''}`;
    };
    const step = Math.max(1, Math.round(Math.abs(numericAnswer) * 0.1));
    return Array.from(new Set([
      formatOption(numericAnswer),
      formatOption(numericAnswer + step),
      formatOption(Math.max(0, numericAnswer - step)),
      formatOption(numericAnswer + step * 2),
    ])).slice(0, 4);
  }

  return Array.from(new Set([correct, `${correct} 1`, `${correct} 2`, `${correct} 3`])).slice(0, 4);
};

const BossVisualFrame: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`mx-auto flex h-full max-w-4xl flex-col justify-center rounded-[1.15rem] border border-amber-300/50 bg-[linear-gradient(180deg,rgba(8,32,72,0.94),rgba(3,15,35,0.96))] p-3 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18),0_0_24px_rgba(0,0,0,0.28)] ${className}`}>
    {title ? (
      <div className="relative mx-auto mb-[-0.6rem] flex min-h-[2.45rem] w-[min(82%,28rem)] items-center justify-center rounded-[0.85rem] border border-amber-300/45 bg-[linear-gradient(180deg,#0758bd,#042d73)] px-5 py-2 text-center text-[clamp(0.95rem,3vw,1.45rem)] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_0_rgba(3,13,35,0.72)]">
        {title}
      </div>
    ) : null}
    <div className="min-h-0 rounded-[1rem] border-[6px] border-stone-500/80 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,#102133,#07101e)] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),inset_0_0_24px_rgba(0,0,0,0.68)]">
      {children}
    </div>
  </div>
);

const ReasoningVisual: React.FC<{ question: ReasoningQuestion }> = ({ question }) => {
  if (question.chartData) {
    const labels = question.chartData.labels as string[];
    const values = question.chartData.values as number[];
    const maxValue = Math.max(...values, 1);

    if (question.chartData.chartType === 'table') {
      return (
        <BossVisualFrame title="Data Table">
          <div className="grid overflow-hidden rounded-lg border border-cyan-100/35 bg-slate-950/38 text-sm font-bold text-white" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="bg-cyan-300/12 px-3 py-2">Item</div>
            <div className="bg-cyan-300/12 px-3 py-2">Value</div>
            {labels.map((label, index) => (
              <React.Fragment key={label}>
                <div className="border-t border-cyan-100/20 px-3 py-2">{label}</div>
                <div className="border-t border-cyan-100/20 px-3 py-2">{values[index]}</div>
              </React.Fragment>
            ))}
          </div>
        </BossVisualFrame>
      );
    }

    if (question.chartData.chartType === 'line') {
      const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${100 - (value / maxValue) * 84 - 8}`).join(' ');
      return (
        <BossVisualFrame title="Line Graph Lab">
          <svg viewBox="0 0 100 70" className="h-[clamp(10rem,31vh,18rem)] w-full rounded-lg bg-slate-950/32">
            <line x1="8" y1="8" x2="8" y2="62" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="8" y1="62" x2="96" y2="62" stroke="#ffffff" strokeWidth="1.5" />
            <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="3" />
            {values.map((value, index) => {
              const x = (index / Math.max(1, values.length - 1)) * 100;
              const y = 100 - (value / maxValue) * 84 - 8;
              return <circle key={labels[index]} cx={x} cy={y} r="3" fill="#f59e0b" />;
            })}
          </svg>
          <div className="mt-2 flex justify-between text-xs font-black text-white">
            {labels.map((label) => <span key={label}>{label}</span>)}
          </div>
        </BossVisualFrame>
      );
    }

    return (
      <BossVisualFrame title={String(question.chartData.yLabel ?? 'Points Scored')}>
        <div className="relative flex h-[clamp(10rem,32vh,19rem)] items-end gap-3 rounded-lg bg-slate-950/32 p-3 pl-8">
          <div className="absolute bottom-8 left-8 right-3 top-3 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[length:100%_20%]" />
          <div className="absolute bottom-8 left-8 top-3 w-px bg-white" />
          <div className="absolute bottom-8 left-8 right-3 h-px bg-white" />
          {labels.map((label, index) => (
            <div key={label} className="relative z-10 flex h-full flex-1 flex-col justify-end gap-2">
              <div className="rounded-t-sm border border-violet-200/50 bg-[linear-gradient(180deg,#8b5cf6,#1d4ed8)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_18px_rgba(124,58,237,0.36)]" style={{ height: `${Math.max(12, (values[index] / maxValue) * 100)}%` }} />
              <div className="text-center text-[0.65rem] font-black text-white md:text-sm">{label}</div>
            </div>
          ))}
        </div>
      </BossVisualFrame>
    );
  }

  if (question.gridData) {
    const { xMin, xMax, yMin, yMax, points } = question.gridData;
    return (
      <BossVisualFrame title="Coordinates">
        <div className="relative mx-auto aspect-square h-[clamp(13rem,35vh,22rem)] rounded-lg border-2 border-cyan-100/70 bg-slate-950/45">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(125,211,252,0.42)_1px,transparent_1px),linear-gradient(to_bottom,rgba(125,211,252,0.42)_1px,transparent_1px)] bg-[length:16.66%_16.66%]" />
          <div className="absolute bottom-2 left-2 top-2 w-px bg-white/90" />
          <div className="absolute bottom-2 left-2 right-2 h-px bg-white/90" />
          <span className="absolute right-2 bottom-5 text-sm font-black text-white">x</span>
          <span className="absolute bottom-2 left-5 text-sm font-black text-white">0</span>
          <span className="absolute left-5 top-1 text-sm font-black text-white">y</span>
          {points.map((point: { label: string; x: number; y: number }) => (
            <div
              key={point.label}
              className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-400 text-lg font-black text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              style={{
                left: `${((point.x - xMin) / (xMax - xMin)) * 100}%`,
                top: `${100 - ((point.y - yMin) / (yMax - yMin)) * 100}%`,
              }}
            >
              {point.label}
            </div>
          ))}
        </div>
      </BossVisualFrame>
    );
  }

  if (question.areaData) {
    const width = Math.min(12, Math.max(2, question.areaData.gridWidth));
    const height = Math.min(10, Math.max(2, question.areaData.gridHeight));
    const rawShaded = question.areaData.shadedCells ?? [];
    const shaded = new Set((rawShaded.length ? rawShaded : Array.from({ length: width * height }, (_, index) => ({ x: index % width, y: Math.floor(index / width) }))).map((cell: { x: number; y: number }) => `${cell.x}-${cell.y}`));
    return (
      <BossVisualFrame title="Find the Area">
        <div className="mb-2 flex items-center gap-3 text-xs font-black text-white">
          <span className="rounded bg-slate-950/55 px-2 py-1">1 cm</span>
          <span className="rounded bg-slate-950/55 px-2 py-1">1 cm</span>
        </div>
        <div className="mx-auto grid h-[clamp(12rem,32vh,20rem)] max-w-[min(95%,32rem)] rounded-lg border border-cyan-100/35 bg-slate-950/45 p-2" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
          {Array.from({ length: width * height }, (_, index) => {
            const x = index % width;
            const y = Math.floor(index / width);
            return <div key={`${x}-${y}`} className={`aspect-square border border-cyan-100/25 ${shaded.has(`${x}-${y}`) ? 'bg-violet-600/82 shadow-[inset_0_0_14px_rgba(255,255,255,0.15)]' : 'bg-slate-900/35'}`} />;
          })}
        </div>
      </BossVisualFrame>
    );
  }

  if (question.perimeterData) {
    const widthLabel = question.perimeterData.sides?.[0]?.value ?? 6;
    const heightLabel = question.perimeterData.sides?.[1]?.value ?? question.perimeterData.sides?.[3]?.value ?? 4;
    const perimeterLabel = question.perimeterData.perimeter ?? '?';
    return (
      <BossVisualFrame title="Perimeter Path">
        <div className="mx-auto flex h-[clamp(12rem,32vh,20rem)] w-full items-center justify-center">
          <svg aria-label="Perimeter diagram" className="h-full w-full max-w-xl" viewBox="0 0 420 240" role="img">
            <rect x="112" y="60" width="196" height="118" fill="#365c19" opacity="0.72" stroke="#d9f99d" strokeWidth="4" />
            <text x="210" y="45" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle">{widthLabel} cm</text>
            <text x="92" y="124" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle">{heightLabel} cm</text>
            <text x="210" y="210" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle">perimeter {perimeterLabel} cm</text>
          </svg>
        </div>
      </BossVisualFrame>
    );
  }

  if (question.volumeData) {
    const dimensions = question.volumeData.dimensions ?? { length: 3, width: 2, height: 2 };
    return (
      <BossVisualFrame title="Volume Vault">
        <div className="relative flex h-[clamp(12rem,32vh,20rem)] items-center justify-center">
          <div className="grid rotate-[-8deg] gap-1" style={{ gridTemplateColumns: `repeat(${dimensions.length * dimensions.width}, minmax(0, 1fr))` }}>
            {Array.from({ length: dimensions.length * dimensions.width }, (_, index) => (
              <div key={index} className="flex flex-col-reverse gap-1">
                {Array.from({ length: dimensions.height }, (_, z) => (
                  <div key={z} className="h-[clamp(1.7rem,5.2vw,3rem)] w-[clamp(1.7rem,5.2vw,3rem)] rounded border border-cyan-100/75 bg-[linear-gradient(135deg,#60a5fa,#1d4ed8)] shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_6px_12px_rgba(2,6,23,0.45)]" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </BossVisualFrame>
    );
  }

  if (question.ratioData) {
    const isPotion = question.ratioData.context === 'potion';
    return (
      <BossVisualFrame title={isPotion ? 'Potion Ratio' : 'Share Ratio'}>
        <div className="flex h-[clamp(12rem,32vh,20rem)] items-center justify-center gap-[clamp(1rem,5vw,3rem)] rounded-lg bg-slate-950/24 p-4">
          {question.ratioData.ratio.map((value: number, index: number) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className={`relative h-[clamp(6.5rem,20vw,10rem)] w-[clamp(4.2rem,13vw,6.5rem)] rounded-b-[2rem] rounded-t-[0.6rem] border-4 ${index === 0 ? 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(220,38,38,0.7))]' : 'border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(37,99,235,0.75))]'} shadow-[inset_0_0_22px_rgba(255,255,255,0.25),0_8px_18px_rgba(0,0,0,0.35)]`}>
                <span className="absolute inset-x-0 top-[42%] text-center text-[clamp(1.5rem,5vw,2.5rem)] font-black text-white">{value}</span>
              </div>
              <span className="text-sm font-black uppercase tracking-[0.08em] text-white">{question.ratioData.labels?.[index] ?? (index === 0 ? 'red' : 'blue')}</span>
            </div>
          ))}
        </div>
      </BossVisualFrame>
    );
  }

  if (question.scaleData) {
    const marker = ((question.scaleData.marker - question.scaleData.min) / (question.scaleData.max - question.scaleData.min)) * 100;
    return (
      <BossVisualFrame title="Read the Scale">
        <div className="relative h-[clamp(10rem,30vh,18rem)] rounded-lg bg-slate-950/35 p-4">
          <div className="absolute left-8 right-8 top-1/2 h-3 -translate-y-1/2 rounded bg-cyan-100/35" />
          <div className="absolute top-1/2 h-14 w-4 -translate-y-1/2 rounded bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.75)]" style={{ left: `${Math.min(88, Math.max(8, marker))}%` }} />
          <div className="absolute bottom-4 left-8 right-8 flex justify-between text-xs font-black text-white">
            <span>{question.scaleData.min}</span>
            <span>{question.scaleData.max} {question.scaleData.unit}</span>
          </div>
        </div>
      </BossVisualFrame>
    );
  }

  if (question.type === 'money') {
    const amounts = question.question.match(/£\d+(?:\.\d{2})?/g) ?? ['£3.45', '£2.80'];
    return (
      <BossVisualFrame title="Monster Market">
        <div className="grid h-[clamp(12rem,32vh,20rem)] grid-cols-2 gap-3">
          {amounts.slice(0, 2).map((amount, index) => (
            <div key={`${amount}-${index}`} className="flex flex-col items-center justify-center rounded-[0.9rem] border border-amber-300/70 bg-[linear-gradient(180deg,rgba(82,47,13,0.9),rgba(28,18,7,0.92))] p-3 text-center shadow-[inset_0_0_16px_rgba(251,191,36,0.15)]">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg border border-amber-200/60 bg-slate-950/35 text-3xl">
                {index === 0 ? 'S' : 'P'}
              </div>
              <div className="text-sm font-black text-amber-100">{index === 0 ? 'Shield' : 'Potion'}</div>
              <div className="mt-1 text-[clamp(1.4rem,5vw,2.4rem)] font-black text-white">{amount}</div>
            </div>
          ))}
        </div>
      </BossVisualFrame>
    );
  }

  if (question.shapeData) {
    if (question.shapeData.shapeType === 'angleLine') {
      const knownAngle = Number(question.shapeData.knownAngle ?? 78);
      const targetLabel = String(question.shapeData.targetLabel ?? 'x');

      return (
        <div className="mx-auto flex h-full max-w-4xl flex-col justify-center rounded-[1.15rem] border border-amber-300/50 bg-[linear-gradient(180deg,rgba(8,32,72,0.94),rgba(3,15,35,0.96))] p-3 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18),0_0_24px_rgba(0,0,0,0.28)]">
          <div className="relative mx-auto mb-[-0.6rem] flex min-h-[2.55rem] w-[min(82%,28rem)] items-center justify-center rounded-[0.85rem] border border-amber-300/45 bg-[linear-gradient(180deg,#0758bd,#042d73)] px-5 py-2 text-center text-[clamp(1rem,3.2vw,1.55rem)] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_0_rgba(3,13,35,0.72)]">
            Find the Angle
          </div>
          <div className="rounded-[1rem] border-[6px] border-stone-500/80 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,#1f2425,#101517)] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),inset_0_0_24px_rgba(0,0,0,0.68)]">
            <svg
              aria-label={`Angle diagram. One angle is ${knownAngle} degrees and the other is ${targetLabel} degrees.`}
              className="h-[clamp(12rem,34vh,20rem)] w-full"
              role="img"
              viewBox="0 0 420 250"
            >
              <defs>
                <radialGradient id="bossAngleGlow" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                </radialGradient>
                <filter id="bossAngleShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" floodColor="#000000" floodOpacity="0.45" stdDeviation="2" />
                </filter>
              </defs>
              <rect width="420" height="250" fill="url(#bossAngleGlow)" />
              <path d="M 153 89 A 70 46 0 0 1 267 89 L 210 125 Z" fill="#0ea5e9" opacity="0.7" />
              <path d="M 267 89 A 70 46 0 0 1 267 161 L 210 125 Z" fill="#7e22ce" opacity="0.82" />
              <ellipse cx="210" cy="125" rx="70" ry="46" fill="none" stroke="#f8fafc" strokeOpacity="0.95" strokeWidth="2.5" />
              <line x1="82" y1="42" x2="338" y2="208" stroke="#f8fafc" strokeLinecap="round" strokeWidth="4" />
              <line x1="82" y1="208" x2="338" y2="42" stroke="#f8fafc" strokeLinecap="round" strokeWidth="4" />
              <text
                filter="url(#bossAngleShadow)"
                fill="#ffffff"
                fontFamily="inherit"
                fontSize="28"
                fontWeight="900"
                textAnchor="middle"
                x="210"
                y="76"
              >
                {knownAngle}°
              </text>
              <text
                filter="url(#bossAngleShadow)"
                fill="#ffffff"
                fontFamily="inherit"
                fontSize="28"
                fontStyle="italic"
                fontWeight="900"
                textAnchor="middle"
                x="318"
                y="130"
              >
                {targetLabel}°
              </text>
            </svg>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col justify-center rounded-[1rem] border border-amber-300/45 bg-[linear-gradient(180deg,rgba(6,32,78,0.92),rgba(3,18,48,0.92))] p-3">
        <div className="mb-2 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-100">Geometry Diagram</div>
        <div className="mx-auto h-32 w-48 rounded-lg border-4 border-slate-300/70 bg-slate-950/45" />
      </div>
    );
  }

  return null;
};

const BossPaperFallbackVisual: React.FC<{
  encounter: ReturnType<typeof getBossEncounter>;
  bossPose: BossPose;
  title: string;
}> = ({ encounter, bossPose, title }) => (
  <BossVisualFrame title={title}>
    <div className="flex h-[clamp(12rem,32vh,20rem)] flex-col items-center justify-center gap-3 rounded-lg bg-[radial-gradient(circle_at_50%_24%,rgba(168,85,247,0.22),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.35))] p-4">
      <BossPortrait
        encounter={encounter}
        pose={bossPose}
        className="h-[clamp(8.5rem,26vh,14rem)] w-full max-w-[18rem] lg:max-w-[20rem]"
      />
      <div className="rounded-[0.9rem] border border-white/14 bg-slate-950/34 px-4 py-2 text-center text-[0.72rem] font-black uppercase tracking-[0.14em] text-cyan-50/82">
        Face the boss and choose the best answer.
      </div>
    </div>
  </BossVisualFrame>
);

const generateFactorsQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const factor = randomInt(2, 12);
    const other = randomInt(2, 12);
    const target = factor * other;
    const wrongs = shuffle([
      String(target - 1),
      String(target + 1),
      String(factor + other),
      String((factor * other) + factor),
    ]);
    const { options, answerIndex } = makeOptions(String(factor), wrongs);
    return {
      prompt: `Which number is a factor of ${target}?`,
      clue: 'A factor divides exactly with no remainder.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Target number ${target}`, 'Find a number that fits exactly'],
      selectionMode: 'single',
    };
  }

  if (mode === 1) {
    const base = randomInt(3, 12);
    const correct = base * pick([4, 5, 6, 7]);
    const wrongs = shuffle([
      String(correct - 1),
      String(correct + 2),
      String(base + 9),
      String((base * 3) + 1),
    ]);
    const { options, answerIndex } = makeOptions(String(correct), wrongs);
    return {
      prompt: `Which number is a multiple of ${base}?`,
      clue: `Multiples land exactly in the ${base} times table.`,
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${base}, ${base * 2}, ${base * 3}, ...`, 'Choose the next exact fit'],
      selectionMode: 'single',
    };
  }

  const a = pick([12, 18, 24, 30, 36]);
  const b = pick([18, 24, 30, 42, 48]);
  const commonFactors = [1, 2, 3, 6, 12].filter(value => a % value === 0 && b % value === 0);
  const correct = String(pick(commonFactors));
  const wrongs = shuffle(['4', '5', '7', '9', '10'].filter(value => !commonFactors.includes(Number(value))));
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `Which number is a common factor of ${a} and ${b}?`,
    clue: 'It must divide both numbers exactly.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`First number ${a}`, `Second number ${b}`],
    selectionMode: 'single',
  };
};

const fractionSets = [
  { fraction: '1/2', decimal: '0.5', percent: '50%' },
  { fraction: '1/4', decimal: '0.25', percent: '25%' },
  { fraction: '3/4', decimal: '0.75', percent: '75%' },
  { fraction: '1/5', decimal: '0.2', percent: '20%' },
  { fraction: '3/5', decimal: '0.6', percent: '60%' },
  { fraction: '3/8', decimal: '0.375', percent: '37.5%' },
];

const generateSatsArithmeticQuestion = (): BossQuestion => {
  const mode = randomInt(0, 5);

  if (mode === 0) {
    const a = randomInt(28, 96);
    const b = randomInt(12, 78);
    const correct = a + b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 10),
      String(correct - 10),
      String(correct + randomInt(1, 4)),
      String(correct - randomInt(1, 4)),
    ]);
    return {
      prompt: `${a} + ${b} =`,
      clue: 'Add carefully.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 1) {
    const a = randomInt(72, 180);
    const b = randomInt(18, 68);
    const correct = a - b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 10),
      String(correct - 10),
      String(correct + randomInt(1, 5)),
      String(correct - randomInt(1, 5)),
    ]);
    return {
      prompt: `${a} - ${b} =`,
      clue: 'Subtract carefully.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 2) {
    const a = randomInt(6, 12);
    const b = randomInt(4, 12);
    const correct = a * b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + a),
      String(correct - a),
      String(correct + b),
      String(Math.max(1, correct - b)),
    ]);
    return {
      prompt: `${a} x ${b} =`,
      clue: 'Use multiplication facts.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 3) {
    const divisor = randomInt(3, 12);
    const quotient = randomInt(4, 15);
    const dividend = divisor * quotient;
    const { options, answerIndex } = makeOptions(String(quotient), [
      String(quotient + 1),
      String(Math.max(1, quotient - 1)),
      String(quotient + divisor),
      String(divisor),
    ]);
    return {
      prompt: `${dividend} ÷ ${divisor} =`,
      clue: 'Use inverse multiplication.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 4) {
    const percent = pick([10, 20, 25, 50, 75]);
    const amount = pick([40, 60, 80, 100, 120, 160, 200]);
    const correct = (percent * amount) / 100;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 5),
      String(Math.max(1, correct - 5)),
      String(amount / 10),
      String(amount / 2),
    ]);
    return {
      prompt: `${percent}% of ${amount} =`,
      clue: 'Use the common percentage fact.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  const denominator = pick([2, 3, 4, 5, 8, 10]);
  const whole = denominator * randomInt(3, 12);
  const possibleNumerators = [1, Math.floor(denominator / 2)].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index);
  const numerator = pick(possibleNumerators);
  const correct = (whole / denominator) * numerator;
  const { options, answerIndex } = makeOptions(String(correct), [
    String(correct + numerator),
    String(Math.max(1, correct - numerator)),
    String(whole / denominator),
    String(whole - correct),
  ]);
  return {
    prompt: `${numerator}/${denominator} of ${whole} =`,
    clue: 'Divide by the denominator, then multiply by the numerator.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [],
    selectionMode: 'single',
  };
};

const generateFractionBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const sample = pick(fractionSets);
    const isTrue = Math.random() > 0.5;
    const falseSample = pick(fractionSets.filter((item) => item.fraction !== sample.fraction));
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${sample.fraction} = ${isTrue ? sample.decimal : falseSample.decimal}.`,
      clue: 'Read the equivalence carefully before you choose.',
      options,
      correctOptionIndices,
      dataPoints: [sample.fraction, sample.decimal, sample.percent],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const percent = pick([10, 20, 25, 50, 75]);
    const amount = pick([24, 36, 48, 60, 80, 120, 200]);
    const correct = String((amount * percent) / 100);
    const wrongs = shuffle([
      String(amount - Number(correct)),
      String(Number(correct) + (amount / 10)),
      String(Number(correct) - Math.max(1, amount / 20)),
      String(amount / 2),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `What is ${percent}% of ${amount}?`,
      clue: 'Use a known fraction or decimal equivalent.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${percent}%`, `of ${amount}`],
      selectionMode: 'single',
    };
  }

  const sample = pick(fractionSets);
  const wrongSample = pick(fractionSets.filter((item) => item.fraction !== sample.fraction));
  const { options, correctOptionIndices } = makeMultiOptions(
    [sample.fraction, sample.decimal, sample.percent],
    [wrongSample.fraction, wrongSample.decimal, wrongSample.percent],
  );
  return {
    prompt: `Which of these are equivalent to ${sample.fraction}?`,
    clue: 'Check the fraction, decimal and percent forms carefully.',
    options,
    correctOptionIndices,
    dataPoints: [sample.fraction, sample.decimal, sample.percent],
    selectionMode: 'multi',
  };
};

const generateGeometryBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const statement = isTrue
      ? 'A triangle has 3 sides.'
      : 'A triangle has 4 sides.';
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Use the shape definition, not a guess.',
      options,
      correctOptionIndices,
      dataPoints: ['Shape property', 'True or false'],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const x = randomInt(-3, 3);
    const y = randomInt(-3, 3);
    const dx = pick([-3, -2, -1, 1, 2, 3]);
    const dy = pick([-3, -2, -1, 1, 2, 3]);
    const correct = `(${x + dx}, ${y + dy})`;
    const wrongs = shuffle([
      `(${x - dx}, ${y + dy})`,
      `(${x + dx}, ${y - dy})`,
      `(${x + dy}, ${y + dx})`,
      `(${x}, ${y})`,
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Point A is at (${x}, ${y}). It is translated ${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}. Where is A'?`,
      clue: 'Apply the horizontal move first, then the vertical move.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Start (${x}, ${y})`, `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`, `${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`],
      selectionMode: 'single',
    };
  }

  const { options, correctOptionIndices } = makeMultiOptions(['Square', 'Rectangle', 'Trapezium'], ['Triangle', 'Pentagon', 'Hexagon', 'Circle']);
  return {
    prompt: 'Which of these shapes have 4 sides?',
    clue: 'Choose every quadrilateral.',
    options,
    correctOptionIndices,
    dataPoints: ['Four sides', 'Quadrilateral family'],
    selectionMode: 'multi',
  };
};

const generateMeasureBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const litres = pick([1.5, 2, 2.5, 3.25, 4]);
    const falseValue = pick([litres * 100, litres * 10, (litres * 1000) + 100]);
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${litres} litres = ${isTrue ? litres * 1000 : falseValue} millilitres.`,
      clue: 'Check the conversion factor first.',
      options,
      correctOptionIndices,
      dataPoints: [`${litres} L`, '1 L = 1000 ml'],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const red = pick([2, 3, 4]);
    const blue = pick([3, 5, 6]);
    const scale = pick([2, 3, 4]);
    const correct = `${red * scale}:${blue * scale}`;
    const wrongs = shuffle([
      `${red + scale}:${blue + scale}`,
      `${red * scale}:${blue + scale}`,
      `${red + blue}:${scale}`,
      `${red}:${blue * scale}`,
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `A mix uses a ratio of ${red}:${blue}. What is the ratio if the recipe is made ${scale} times larger?`,
      clue: 'Scale both sides by the same amount.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Original ${red}:${blue}`, `Scale by ${scale}`],
      selectionMode: 'single',
    };
  }

  const { options, correctOptionIndices } = makeMultiOptions(['1000 g', '1 kg'], ['500 g', '250 g', '1500 g', '2 kg']);
  return {
    prompt: 'Which of these are equal to 1 kilogram?',
    clue: 'Look for every value that matches the same mass.',
    options,
    correctOptionIndices,
    dataPoints: ['1 kg', '1000 g'],
    selectionMode: 'multi',
  };
};

const generateStatisticsBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const bars = shuffle([
      { label: 'Mon', value: randomInt(8, 15) },
      { label: 'Tue', value: randomInt(8, 15) },
      { label: 'Wed', value: randomInt(8, 15) },
      { label: 'Thu', value: randomInt(8, 15) },
    ]);
    const highest = [...bars].sort((a, b) => b.value - a.value)[0];
    const falseDay = bars.find((item) => item.label !== highest.label) ?? bars[0];
    const isTrue = Math.random() > 0.5;
    const statement = isTrue
      ? `${highest.label} has the highest value on the chart.`
      : `${falseDay.label} has the highest value on the chart.`;
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Compare the bars carefully before you decide.',
      options,
      correctOptionIndices,
      dataPoints: bars.map(item => `${item.label} ${item.value}`),
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const numbers = [4, 7, 9, 10];
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    const { options, correctOptionIndices } = makeMultiOptions(
      numbers.filter((value) => value > mean).map(String),
      [String(mean), String(numbers[0]), String(numbers[1] - 1), String(numbers[2] - 2)],
    );
    return {
      prompt: `Which numbers are above the mean of ${numbers.join(', ')}?`,
      clue: 'Find the mean first, then choose every number greater than it.',
      options,
      correctOptionIndices,
      dataPoints: numbers.map(String),
      selectionMode: 'multi',
    };
  }

  const startHour = pick([8, 9, 10, 11, 13, 14]);
  const startMinute = pick([0, 15, 30, 45]);
  const duration = pick([35, 50, 75, 90]);
  const endTotal = startHour * 60 + startMinute + duration;
  const correct = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;
  const wrongs = shuffle([
    `${String(startHour).padStart(2, '0')}:${String((startMinute + duration) % 60).padStart(2, '0')}`,
    `${String(Math.floor((endTotal + 15) / 60)).padStart(2, '0')}:${String((endTotal + 15) % 60).padStart(2, '0')}`,
    `${String(Math.floor((endTotal - 10) / 60)).padStart(2, '0')}:${String((endTotal - 10) % 60).padStart(2, '0')}`,
    `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `A train leaves at ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} and takes ${duration} minutes. What time does it arrive?`,
    clue: 'Use 24-hour time carefully.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`Leaves ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`, `Journey ${duration} min`],
    selectionMode: 'single',
  };
};

const generateReasoningBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const start = randomInt(2, 12);
    const step = pick([2, 3, 4, 5, 6]);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const statement = isTrue
      ? `The sequence ${sequence.join(', ')} goes up by ${step} each time.`
      : `The sequence ${sequence.join(', ')} goes up by ${step + 1} each time.`;
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Look for the rule linking one term to the next.',
      options,
      correctOptionIndices,
      dataPoints: [`Rule repeats each time`, `Difference ${step}`],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const x = randomInt(3, 18);
    const add = randomInt(4, 12);
    const correct = String(x);
    const wrongs = shuffle([
      String(x + add),
      String((x + add) - 1),
      String(add),
      String(x - 1),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Solve x + ${add} = ${x + add}`,
      clue: 'Undo the addition to find x.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: ['Find the missing value', 'Use inverse operations'],
      selectionMode: 'single',
    };
  }

  const start = randomInt(2, 9);
  const step = pick([2, 3, 4]);
  const second = start + step;
  const third = second + step;
  const { options, correctOptionIndices } = makeMultiOptions(
    [String(third + step), String(third + (step * 2))],
    [String(second + 1), String(third - 1), String(third + 1), String(start + 1)],
  );
  return {
    prompt: `Which numbers come next in the sequence ${start}, ${second}, ${third}?`,
    clue: 'The rule stays the same each step.',
    options,
    correctOptionIndices,
    dataPoints: [`Start ${start}`, `Step ${step}`],
    selectionMode: 'multi',
  };
};

const QUESTION_GENERATORS: Record<SupportedBossGameType, () => BossQuestion> = {
  crystal_core: generateSatsArithmeticQuestion,
  mirror_gate: generateGeometryBossQuestion,
  matrix_match: generateReasoningBossQuestion,
};

const REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. The battle is underway.',
  correct: 'Direct hit. The boss is taking damage.',
  wrong: 'The boss holds firm. Keep your focus on the next question.',
  warning: 'The boss is close to breaking.',
  victory: 'Boss defeated. The island challenge is cleared.',
  defeat: 'The hero has fallen. The boss wins this round.',
};

const normalizeSelection = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);

const areSelectionsEqual = (left: number[], right: number[]) => {
  const normalizedLeft = normalizeSelection(left);
  const normalizedRight = normalizeSelection(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

type BattleHealthBarProps = {
  label: string;
  current: number;
  max: number;
  toneClass?: string;
};

const BattleHealthBar: React.FC<BattleHealthBarProps> = ({ label, current, max, toneClass }) => {
  const segments = Array.from({ length: max }, (_, index) => index < current);

  return (
    <div className="rounded-[1rem] border border-white/14 bg-slate-950/60 px-3 py-2 text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/65">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
        {segments.map((filled, index) => (
          <span
            key={`${label}-${index}`}
            className={`h-2 rounded-full border ${filled
              ? toneClass || 'border-emerald-200/45 bg-[linear-gradient(90deg,#22c55e_0%,#86efac_100%)]'
              : 'border-white/10 bg-black/30'}`}
          />
        ))}
      </div>
    </div>
  );
};

const BossPaperStage: React.FC<{
  title: string;
  questionNumber: number;
  questionText: React.ReactNode;
  visual: React.ReactNode;
  answers: React.ReactNode;
  nav: React.ReactNode;
  warning?: string | null;
}> = ({ title, questionNumber, questionText, visual, answers, nav, warning }) => (
  <div className="relative h-full w-full overflow-hidden bg-[#050914] font-sans text-white">
    <img
      src={bossPaperBackground}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
    />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.1)_0%,rgba(2,6,23,0.2)_42%,rgba(2,6,23,0.72)_100%)]" />
    <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[clamp(0.35rem,1.1vh,0.7rem)] px-[clamp(0.55rem,2.2vw,1.2rem)] pb-[clamp(0.45rem,1.3vh,0.85rem)] pt-[clamp(0.3rem,1vh,0.65rem)]">
      <section className="relative">
        <div className="relative mb-2 flex items-center justify-between gap-3 px-1">
          <span className="relative inline-flex shrink-0 items-center rounded-[0.65rem] border border-amber-400/80 bg-slate-950/24 px-3 py-1.5 text-[clamp(0.66rem,1.8vw,0.9rem)] font-black uppercase tracking-[0.08em] text-amber-200">
            Question {questionNumber}
          </span>
          <div className="hidden flex-1 items-center justify-center gap-3 opacity-90 sm:flex">
            <span className="h-px w-24 bg-[linear-gradient(90deg,transparent,#f59e0b)]" />
            <span className="h-5 w-5 rotate-45 border-2 border-amber-300 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
            <span className="h-px w-24 bg-[linear-gradient(90deg,#f59e0b,transparent)]" />
          </div>
          <span className="shrink-0 text-[clamp(0.58rem,1.5vw,0.72rem)] font-black uppercase tracking-[0.16em] text-cyan-100/70">{title}</span>
        </div>
        <GameQuestionCard className="w-full max-w-none" bodyClassName="text-[clamp(0.96rem,2.95vw,1.12rem)] font-semibold leading-[1.22]">
          {questionText}
        </GameQuestionCard>
        {warning ? (
          <div className="relative mt-2 rounded-full border border-amber-200/50 bg-amber-300/15 px-3 py-1 text-center text-xs font-black uppercase tracking-[0.12em] text-amber-100">
            {warning}
          </div>
        ) : null}
      </section>

      <section className="min-h-0 overflow-hidden">
        {visual}
      </section>

      <section className="grid shrink-0 grid-cols-2 gap-[clamp(0.45rem,1.4vw,0.85rem)]">
        {answers}
      </section>

      <section className="shrink-0">
        {nav}
      </section>
    </div>
  </div>
);

const BossAnswerCard: React.FC<{
  label: string;
  selected?: boolean;
  correct?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, selected = false, correct = false, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`answer-choice-card relative flex h-[clamp(3.75rem,10vh,5.55rem)] min-w-0 items-center gap-[clamp(0.65rem,2vw,1.2rem)] overflow-hidden rounded-[0.85rem] border px-[clamp(0.65rem,2.2vw,1.2rem)] text-left shadow-[0_8px_18px_rgba(2,6,23,0.36)] transition ${
      correct ? 'ui-button-success answer-choice-card--correct' : selected ? 'ui-button-primary answer-choice-card--selected' : 'ui-button-secondary answer-choice-card--default'
    }`}
  >
    <span className="flex h-[clamp(2.25rem,6.5vh,3.5rem)] w-[clamp(2.25rem,6.5vh,3.5rem)] shrink-0 items-center justify-center bg-[linear-gradient(180deg,#9b3cff,#5b16d8)] text-[clamp(1.25rem,4vw,2rem)] font-black text-white shadow-[0_6px_12px_rgba(50,12,117,0.5)] [clip-path:polygon(50%_0%,90%_20%,90%_75%,50%_100%,10%_75%,10%_20%)]">
      {label}
    </span>
    <span className="min-w-0 flex-1 break-words text-[clamp(1.2rem,4vw,2rem)] font-black leading-tight text-white">
      {children}
    </span>
  </button>
);

const BossOrderingCard: React.FC<{
  value: string;
  hidden?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}> = ({ value, hidden = false, onPointerDown }) => (
  <button
    type="button"
    onPointerDown={onPointerDown}
    className={`relative flex h-[clamp(4.2rem,11vh,5.6rem)] w-full items-center justify-center overflow-hidden rounded-[0.95rem] border border-amber-400/70 bg-[linear-gradient(180deg,rgba(4,28,70,0.94),rgba(5,20,52,0.94))] px-2 text-center shadow-[0_8px_18px_rgba(2,6,23,0.36)] transition ${hidden ? 'opacity-0' : 'opacity-100'}`}
  >
    <div className="pointer-events-none absolute inset-0 rounded-[0.95rem] bg-gradient-to-br from-white/10 via-transparent to-transparent" />
    <span className="relative text-[clamp(1rem,3.4vw,1.5rem)] font-black leading-tight text-white">
      {value}
    </span>
  </button>
);

const BossPaperNav: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-[1rem] border border-cyan-200/30 bg-slate-950/72 p-2 shadow-[0_10px_22px_rgba(2,6,23,0.45)]">
    {children}
  </div>
);

const bossNavButtonClass = 'rounded-[0.75rem] border border-cyan-100/35 bg-[linear-gradient(180deg,#1fb6ff,#0b6cff)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-[0_6px_12px_rgba(2,6,23,0.34)] disabled:cursor-not-allowed disabled:opacity-40';

const BossEncounterGame: React.FC<BossEncounterGameProps> = ({
  gameType,
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const encounter = getBossEncounter(gameType);
  const isArithmeticPaper = gameType === 'crystal_core';
  const isReasoning1Paper = gameType === 'mirror_gate';
  const isReasoning2Paper = gameType === 'matrix_match';
  const isReasoningPaper = isReasoning1Paper || isReasoning2Paper;
  const reasoningDisplayTitle = isReasoning2Paper ? 'Reasoning 2' : 'Reasoning 1';
  const reactionCopy = REACTION_COPY;
  const [paperSeed, setPaperSeed] = useState<string | number>(() => `arithmetic-${Date.now()}-${Math.random()}`);
  const arithmeticPaper = useMemo(
    () => (isArithmeticPaper ? generateArithmeticBossPaper(paperSeed) : null),
    [isArithmeticPaper, paperSeed],
  );
  const [reasoningSeed, setReasoningSeed] = useState<string | number>(() => `${isReasoning2Paper ? 'reasoning-2' : 'reasoning-1'}-${Date.now()}-${Math.random()}`);
  const reasoningPaper = useMemo(
    () => (
      isReasoning1Paper
        ? generateReasoning1Paper(reasoningSeed)
        : isReasoning2Paper
          ? generateReasoning2Paper(reasoningSeed)
          : null
    ),
    [isReasoning1Paper, isReasoning2Paper, reasoningSeed],
  );
  const [arithmeticAnswers, setArithmeticAnswers] = useState<Record<number, string>>({});
  const [arithmeticResult, setArithmeticResult] = useState<ArithmeticPaperResult | null>(null);
  const [isReviewingArithmetic, setIsReviewingArithmetic] = useState(false);
  const [reasoningAnswers, setReasoningAnswers] = useState<Record<number, any>>({});
  const [reasoningResult, setReasoningResult] = useState<ReasoningPaperResult | null>(null);
  const [reasoningScreen, setReasoningScreen] = useState<'intro' | 'active' | 'confirm' | 'results' | 'review'>('intro');
  const questions = useMemo(
    () => (isArithmeticPaper || isReasoningPaper ? [] : Array.from({ length: TOTAL_QUESTIONS }, () => {
      const base = QUESTION_GENERATORS[gameType]();
      const kind: QuestionKind = base.kind ?? (gameType === 'matrix_match' ? 'reasoning' : 'fluency');
      return { ...base, kind };
    })),
    [gameType, isArithmeticPaper, isReasoningPaper, levelId],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [XP, setScore] = useState(0);
  const [bossHealth, setBossHealth] = useState(BOSS_HEALTH_MAX);
  const [heroHealth, setHeroHealth] = useState(HERO_HEALTH_MAX);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submittedIndices, setSubmittedIndices] = useState<number[] | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [reaction, setReaction] = useState(reactionCopy.idle);
  const [resolveState, setResolveState] = useState<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat'>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(!isArithmeticPaper && !isReasoningPaper);
  const timeoutRef = useRef<number | null>(null);
  const orderingBoardRef = useRef<HTMLDivElement | null>(null);
  const orderingSlotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [orderingDragState, setOrderingDragState] = useState<OrderingDragState | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  if (!encounter) {
    return null;
  }

  const question = isArithmeticPaper || isReasoningPaper ? null : questions[currentIndex % questions.length];
  const arithmeticQuestion = arithmeticPaper?.questions[currentIndex] ?? null;
  const reasoningQuestion = reasoningPaper?.questions[currentIndex] ?? null;
  const isMultiSelect = question?.selectionMode === 'multi';
  const activeSelection = submittedIndices ?? selectedIndices;
  const bossHealthRemaining = bossHealth;
  const heroPose: AnimationState = resolveState === 'defeat'
    ? 'sad'
    : resolveState === 'victory'
      ? 'victory'
      : resolveState === 'wrong'
        ? 'hit'
        : resolveState === 'correct'
          ? 'special'
          : 'idle';

  const finishEncounter = (finalScore: number) => {
    const stars = finalScore >= HIGH_SCORE_STARS.gold
      ? 3
      : finalScore >= HIGH_SCORE_STARS.silver
        ? 2
        : 1;
    setResolveState('victory');
    setReaction(reactionCopy.victory);
    setBossPose('defeat');
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.45 } });
    timeoutRef.current = window.setTimeout(() => {
      onVictory(stars, finalScore);
    }, 980);
  };

  const advanceQuestion = (isCorrect: boolean, nextScore: number, nextBossHealth: number, nextHeroHealth: number) => {
    const bossDefeated = nextBossHealth <= 0;
    const heroDefeated = nextHeroHealth <= 0;

    setScore(nextScore);
    setBossHealth(nextBossHealth);
    setHeroHealth(nextHeroHealth);

    if (isCorrect) {
      triggerHaptic('success');
      if (bossDefeated) {
        setResolveState('victory');
        setReaction(reactionCopy.victory);
        setBossPose('defeat');
      } else if (nextBossHealth <= 4) {
        setResolveState('warning');
        setReaction(reactionCopy.warning);
        setBossPose('dazed');
      } else {
        setResolveState('correct');
        setReaction(reactionCopy.correct);
        setBossPose('attack');
      }
    } else {
      triggerHaptic('warning');
      setResolveState('wrong');
      setReaction(reactionCopy.wrong);
      setBossPose(encounter.assetId === 'jelly' ? 'victory' : 'happy');
      if (heroDefeated) {
        setResolveState('defeat');
      }
    }

    timeoutRef.current = window.setTimeout(() => {
      if (bossDefeated) {
        finishEncounter(nextScore);
        return;
      }

      if (heroDefeated) {
        setReaction(reactionCopy.defeat);
        setBossPose('victory');
        onGameOver(nextScore);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSelectedIndices([]);
      setSubmittedIndices(null);
      setResolveState('idle');
      setReaction(reactionCopy.idle);
      setBossPose(nextBossHealth <= 4 ? 'dazed' : 'neutral');
    }, 1180);
  };

  const submitSelection = (selection: number[]) => {
    if (submittedIndices !== null || !question) return;

    const normalizedSelection = normalizeSelection(selection);
    const normalizedCorrect = normalizeSelection(question.correctOptionIndices);
    const isCorrect = areSelectionsEqual(normalizedSelection, normalizedCorrect);
    const nextScore = isCorrect
      ? XP + 120
      : XP;

    const nextBossHealth = isCorrect ? Math.max(0, bossHealth - 1) : bossHealth;
    const currentHeroHealth = sessionState?.lives ?? heroHealth;
    const nextHeroHealth = isCorrect ? currentHeroHealth : Math.max(0, currentHeroHealth - 1);

    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      score: nextScore,
      metadata: {
        gameType,
        levelId,
        boss: encounter.name,
        questionIndex: currentIndex,
        selected: normalizedSelection,
        expected: normalizedCorrect,
        livesBefore: currentHeroHealth,
        livesLost: isCorrect ? 0 : 1,
      },
    });

    setSubmittedIndices(normalizedSelection);
    advanceQuestion(isCorrect, nextScore, nextBossHealth, nextHeroHealth);
  };

  const handleOptionClick = (index: number) => {
    if (submittedIndices !== null) return;
    if (isMultiSelect) {
      setSelectedIndices((previous) => (
        previous.includes(index)
          ? previous.filter((item) => item !== index)
          : [...previous, index]
      ));
      return;
    }

    submitSelection([index]);
  };

  const clearSelection = () => {
    if (submittedIndices !== null) return;
    setSelectedIndices([]);
  };

  const submitArithmeticPaper = (completedBeforeTimer: boolean) => {
    if (!arithmeticPaper || arithmeticResult) return;
    const result = markArithmeticPaper(arithmeticPaper, arithmeticAnswers, completedBeforeTimer);
    setArithmeticResult(result);
    setScore(result.xpAwarded);
    sessionEvents?.onEvent?.({
      type: 'game_complete',
      score: result.xpAwarded,
      stars: result.stars,
      metadata: {
        paperId: arithmeticPaper.paperId,
        rawScore: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        correctCount: result.correctCount,
      },
    });
    triggerHaptic(result.passed ? 'success' : 'warning');
  };

  useEffect(() => {
    if (!isArithmeticPaper || arithmeticResult || !arithmeticPaper) return;
    if ((sessionState?.timeLeft ?? arithmeticPaper.timeLimitSeconds) <= 0) {
      submitArithmeticPaper(false);
    }
  }, [arithmeticPaper, arithmeticResult, isArithmeticPaper, sessionState?.timeLeft]);

  const retryArithmeticPaper = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setPaperSeed(`arithmetic-${Date.now()}-${Math.random()}`);
    setArithmeticAnswers({});
    setArithmeticResult(null);
    setIsReviewingArithmetic(false);
    setCurrentIndex(0);
    setScore(0);
    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
  };

  const handleArithmeticChoice = (value: string | number) => {
    if (!arithmeticQuestion || arithmeticResult) return;
    setArithmeticAnswers((previous) => ({
      ...previous,
      [arithmeticQuestion.id]: String(value),
    }));
    if (currentIndex >= arithmeticQuestionCount - 1) {
      submitArithmeticPaper((sessionState?.timeLeft ?? 0) > 0);
      return;
    }
    setCurrentIndex((previous) => Math.min(arithmeticQuestionCount - 1, previous + 1));
  };

  const startReasoningPaper = () => {
    setReasoningScreen('active');
    setCurrentIndex(0);
  };

  const submitReasoningPaper = (completedBeforeTimer: boolean) => {
    if (!reasoningPaper || reasoningResult) return;
    const result = isReasoning2Paper
      ? markReasoning2Paper(reasoningPaper, reasoningAnswers, completedBeforeTimer)
      : markReasoning1Paper(reasoningPaper, reasoningAnswers, completedBeforeTimer);
    setReasoningResult(result);
    setReasoningScreen('results');
    setScore(result.xpAwarded);
    sessionEvents?.onEvent?.({
      type: 'game_complete',
      score: result.xpAwarded,
      stars: result.stars,
      metadata: {
        paperId: reasoningPaper.paperId,
        rawScore: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        correctCount: result.correctCount,
      },
    });
    triggerHaptic(result.passed ? 'success' : 'warning');
  };

  useEffect(() => {
    if (!isReasoningPaper || reasoningResult || !reasoningPaper || reasoningScreen === 'intro') return;
    if ((sessionState?.timeLeft ?? reasoningPaper.timeLimitSeconds) <= 0) {
      submitReasoningPaper(false);
    }
  }, [isReasoningPaper, reasoningPaper, reasoningResult, reasoningScreen, sessionState?.timeLeft]);

  const retryReasoningPaper = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setReasoningSeed(`${isReasoning2Paper ? 'reasoning-2' : 'reasoning-1'}-${Date.now()}-${Math.random()}`);
    setReasoningAnswers({});
    setReasoningResult(null);
    setReasoningScreen('intro');
    setCurrentIndex(0);
    setScore(0);
    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
  };

  const setReasoningAnswer = (value: any) => {
    if (!reasoningQuestion || reasoningResult) return;
    setReasoningAnswers((previous) => ({
      ...previous,
      [reasoningQuestion.id]: value,
    }));
  };

  const toggleReasoningChoice = (value: string) => {
    if (!reasoningQuestion || reasoningResult) return;
    const current = Array.isArray(reasoningAnswers[reasoningQuestion.id])
      ? reasoningAnswers[reasoningQuestion.id] as string[]
      : [];
    setReasoningAnswer(current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const beginOrderingDrag = (index: number, source: 'tray' | 'slot', event: React.PointerEvent<HTMLButtonElement>) => {
    if (!reasoningQuestion || reasoningQuestion.responseMode !== 'ordering' || reasoningResult) return;
    const orderingChoices = makeReasoningChoices(reasoningQuestion).map((choice) => String(choice));
    const orderedValues = Array.isArray(reasoningAnswers[reasoningQuestion.id])
      ? [...(reasoningAnswers[reasoningQuestion.id] as string[])]
      : Array.from({ length: orderingChoices.length }, () => '');
    const value = source === 'tray' ? orderingChoices[index] : orderedValues[index];
    if (!value) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setOrderingDragState({
      value,
      fromIndex: index,
      source,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      width: rect.width,
      height: rect.height,
    });
    triggerHaptic('selection');
  };

  useEffect(() => {
    if (!orderingDragState || !reasoningQuestion || reasoningQuestion.responseMode !== 'ordering') return undefined;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== orderingDragState.pointerId) return;
      setOrderingDragState((current) => {
        if (!current || current.pointerId !== event.pointerId) return current;
        return { ...current, clientX: event.clientX, clientY: event.clientY };
      });
    };

    const onFinish = (event: PointerEvent) => {
      if (event.pointerId !== orderingDragState.pointerId) return;
      const orderingChoices = makeReasoningChoices(reasoningQuestion).map((choice) => String(choice));
      const orderedValues = Array.isArray(reasoningAnswers[reasoningQuestion.id])
        ? [...(reasoningAnswers[reasoningQuestion.id] as string[])]
        : Array.from({ length: orderingChoices.length }, () => '');

      let targetIndex = orderingDragState.fromIndex;
      let bestDistance = Number.POSITIVE_INFINITY;
      orderingSlotRefs.current.forEach((slot, index) => {
        const rect = slot?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
        if (distance < bestDistance) {
          bestDistance = distance;
          targetIndex = index;
        }
      });

      const nextOrder = [...orderedValues];
      const existingIndex = nextOrder.findIndex((item) => item === orderingDragState.value);
      if (existingIndex >= 0) {
        nextOrder[existingIndex] = '';
      }
      if (orderingDragState.source === 'slot') {
        nextOrder[orderingDragState.fromIndex] = '';
      }
      nextOrder[targetIndex] = orderingDragState.value;
      setReasoningAnswer(nextOrder);
      setOrderingDragState(null);
      triggerHaptic('selection');
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onFinish);
    window.addEventListener('pointercancel', onFinish);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onFinish);
      window.removeEventListener('pointercancel', onFinish);
    };
  }, [orderingDragState, reasoningAnswers, reasoningQuestion, reasoningResult]);

  const arithmeticAnsweredCount = arithmeticPaper
    ? arithmeticPaper.questions.filter((item) => arithmeticAnswers[item.id]?.trim()).length
    : 0;
  const arithmeticQuestionCount = arithmeticPaper?.questions.length ?? 0;
  const reasoningAnsweredCount = reasoningPaper
    ? reasoningPaper.questions.filter((item) => {
      const answer = reasoningAnswers[item.id];
      return Array.isArray(answer) ? answer.length > 0 : String(answer ?? '').trim().length > 0;
    }).length
    : 0;
  const reasoningQuestionCount = reasoningPaper?.questions.length ?? 0;
  const arithmeticTimeTakenSeconds = arithmeticPaper
    ? Math.max(0, arithmeticPaper.timeLimitSeconds - (sessionState?.timeLeft ?? arithmeticPaper.timeLimitSeconds))
    : 0;
  const reasoningTimeTakenSeconds = reasoningPaper
    ? Math.max(0, reasoningPaper.timeLimitSeconds - (sessionState?.timeLeft ?? reasoningPaper.timeLimitSeconds))
    : 0;
  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  if (isReasoningPaper) {
    if (!reasoningPaper) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#f7f4ea] text-slate-900">
          Loading {reasoningDisplayTitle} paper...
        </div>
      );
    }

    if (reasoningScreen === 'intro') {
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#f7f4ea] px-4 py-4 font-sans text-slate-950">
          <section className="w-full max-w-3xl rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.16)] md:p-8">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Final Boss Island</div>
            <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">{reasoningDisplayTitle}</h2>
            <div className="mt-5 grid gap-3 text-sm font-bold text-slate-700 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">35 marks</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">40 minutes</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">No calculator</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">Mixed reasoning questions</div>
            </div>
            <button
              type="button"
              onClick={startReasoningPaper}
              className="mt-6 w-full rounded-xl border-2 border-slate-950 bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white"
            >
              Start {reasoningDisplayTitle}
            </button>
          </section>
        </div>
      );
    }

    if (reasoningResult && reasoningScreen === 'results') {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-300 bg-white px-5 py-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{reasoningDisplayTitle}</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-4xl">Paper Complete</h2>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 md:grid-cols-[1fr_1fr] md:p-6">
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Final score</div>
                <div className="mt-2 text-5xl font-black text-slate-950">{reasoningResult.score}/35</div>
                <div className="mt-2 text-lg font-black text-slate-700">{reasoningResult.percentage}%</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
                  <div className="rounded-lg bg-slate-100 p-3">Stars<br /><span className="text-xl text-slate-950">{reasoningResult.stars}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">XP<br /><span className="text-xl text-slate-950">{reasoningResult.xpAwarded}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Time<br /><span className="text-xl text-slate-950">{formatTime(reasoningTimeTakenSeconds)}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Correct<br /><span className="text-xl text-slate-950">{reasoningResult.correctCount}/{reasoningQuestionCount}</span></div>
                </div>
              </div>
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Breakdown</div>
                <div className="mt-3 space-y-2 text-sm font-bold text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Marks available</span><span>35</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Questions</span><span>{reasoningQuestionCount}</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Pass threshold</span><span>21 marks</span></div>
                  <div className="flex justify-between py-2"><span>Paper seed</span><span className="max-w-[12rem] truncate text-right">{String(reasoningPaper.seed)}</span></div>
                </div>
              </div>
            </div>
            <div className="grid shrink-0 gap-2 border-t border-slate-300 bg-white p-3 md:grid-cols-3 md:p-4">
              <button type="button" onClick={retryReasoningPaper} className="rounded-xl border-2 border-slate-300 bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Retry New Paper
              </button>
              <button type="button" onClick={() => setReasoningScreen('review')} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Review Answers
              </button>
              <button type="button" onClick={onBack} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Return to Boss Island
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (reasoningResult && reasoningScreen === 'review') {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Review Answers</div>
                <h2 className="text-xl font-black text-slate-950">Score {reasoningResult.score}/35</h2>
              </div>
              <button type="button" onClick={() => setReasoningScreen('results')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
                Results
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 md:grid-cols-2">
                {reasoningPaper.questions.map((item) => {
                  const result = reasoningResult.results.find((entry) => entry.questionId === item.id);
                  return (
                    <div key={item.id} className={`rounded-xl border p-3 ${result?.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-black">Q{item.id}. {item.question}</div>
                        <div className="text-sm font-black">{result?.marksAwarded}/{item.marks}</div>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-700">Your answer: {formatReasoningAnswer(result?.userAnswer) || 'blank'}</div>
                      <div className="text-sm font-bold text-slate-700">Correct answer: {formatReasoningAnswer(item.answer)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (reasoningScreen === 'confirm') {
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#f7f4ea] px-4 py-4 font-sans text-slate-950">
          <section className="w-full max-w-xl rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] p-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <h2 className="text-2xl font-black">Submit {reasoningDisplayTitle}?</h2>
            <p className="mt-3 text-sm font-bold text-slate-600">
              You have answered {reasoningAnsweredCount} of {reasoningQuestionCount} questions. Results will only be shown after submission.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setReasoningScreen('active')} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Keep Working
              </button>
              <button type="button" onClick={() => submitReasoningPaper((sessionState?.timeLeft ?? 0) > 0)} className="rounded-xl border-2 border-slate-950 bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Submit Paper
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (!reasoningQuestion) return null;
    const currentReasoningAnswer = reasoningAnswers[reasoningQuestion.id] ?? '';
    const timeLeft = sessionState?.timeLeft ?? reasoningPaper.timeLimitSeconds;
    const warningText = timeLeft <= 60
      ? '1 minute left'
      : timeLeft <= 300
        ? '5 minute warning'
        : timeLeft <= 600
          ? '10 minute warning'
          : null;
    const reasoningChoiceItems = makeReasoningChoices(reasoningQuestion);
    const orderingChoices = reasoningQuestion.responseMode === 'ordering'
      ? reasoningChoiceItems.map((choice) => String(choice))
      : [];
    const orderingValues = reasoningQuestion.responseMode === 'ordering'
      ? (
        Array.isArray(currentReasoningAnswer)
          ? [...(currentReasoningAnswer as string[])]
          : Array.from({ length: orderingChoices.length }, () => '')
      )
      : [];
    const hasReasoningVisual = Boolean(
      reasoningQuestion.shapeData
      || reasoningQuestion.gridData
      || reasoningQuestion.chartData
      || reasoningQuestion.tableData
      || reasoningQuestion.numberLineData
      || reasoningQuestion.scaleData
      || reasoningQuestion.areaData
      || reasoningQuestion.perimeterData
      || reasoningQuestion.volumeData
      || reasoningQuestion.ratioData
    );
    const reasoningVisual = hasReasoningVisual
      ? <ReasoningVisual question={reasoningQuestion} />
      : <BossPaperFallbackVisual encounter={encounter} bossPose={bossPose} title={`${reasoningDisplayTitle} Boss`} />;

    return (
      <BossPaperStage
        title={reasoningDisplayTitle}
        questionNumber={currentIndex + 1}
        questionText={reasoningQuestion.question}
        warning={warningText}
        visual={reasoningVisual}
        answers={(
          reasoningQuestion.responseMode === 'ordering' ? (
            <div ref={orderingBoardRef} className="relative col-span-2 rounded-[1rem] border border-amber-300/45 bg-[linear-gradient(180deg,rgba(4,20,52,0.92),rgba(4,15,38,0.86))] p-3 shadow-[0_8px_18px_rgba(2,6,23,0.36)]">
              <div className="mb-3 text-center text-[0.72rem] font-black uppercase tracking-[0.14em] text-cyan-100/82">
                Drag the cards into the order row
              </div>
              <div className="mb-3 grid grid-cols-4 gap-2">
                {orderingChoices.map((value, index) => {
                  const hidden = orderingValues.includes(value) && orderingDragState?.value !== value;
                  return (
                    <div
                      key={`tray-${value}-${index}`}
                      className="relative min-h-[clamp(4.2rem,11vh,5.6rem)]"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[0.95rem] border border-white/10 bg-white/5" />
                      <div className="absolute inset-0">
                        <BossOrderingCard
                          value={value}
                          hidden={hidden}
                          onPointerDown={(event) => beginOrderingDrag(index, 'tray', event)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {orderingValues.map((value, index) => {
                  const hidden = orderingDragState?.source === 'slot' && orderingDragState?.fromIndex === index;
                  return (
                    <div
                      key={`${value}-${index}`}
                      ref={(node) => {
                        orderingSlotRefs.current[index] = node;
                      }}
                      className="relative min-h-[clamp(4.2rem,11vh,5.6rem)]"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[0.95rem] border border-dashed border-cyan-200/36 bg-cyan-200/10" />
                      {value ? (
                        <div className="absolute inset-0">
                          <BossOrderingCard
                            value={value}
                            hidden={hidden}
                            onPointerDown={(event) => beginOrderingDrag(index, 'slot', event)}
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[0.62rem] font-black uppercase tracking-[0.14em] text-cyan-100/55">
                          Drop here
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {orderingDragState ? (
                <div
                  className="pointer-events-none absolute z-50"
                  style={{
                    left: orderingDragState.clientX - (orderingBoardRef.current?.getBoundingClientRect().left ?? 0) - (orderingDragState.width / 2),
                    top: orderingDragState.clientY - (orderingBoardRef.current?.getBoundingClientRect().top ?? 0) - (orderingDragState.height / 2),
                    width: orderingDragState.width,
                    height: orderingDragState.height,
                  }}
                >
                  <BossOrderingCard value={orderingDragState.value} />
                </div>
              ) : null}
            </div>
          ) : (
            reasoningChoiceItems.slice(0, 4).map((choice, index) => {
              const isSelected = reasoningQuestion.responseMode === 'multiSelect'
                ? Array.isArray(currentReasoningAnswer) && currentReasoningAnswer.includes(choice)
                : String(currentReasoningAnswer) === String(choice);
              return (
                  <BossAnswerCard
                  key={String(choice)}
                  label={String.fromCharCode(65 + index)}
                  selected={isSelected}
                  correct={false}
                  onClick={() => {
                    if (reasoningQuestion.responseMode === 'multiSelect') {
                      toggleReasoningChoice(String(choice));
                    } else {
                      setReasoningAnswer(choice);
                    }
                  }}
                >
                  {String(choice)}
                </BossAnswerCard>
              );
            })
          )
        )}
        nav={(
          <BossPaperNav>
            <div className="min-w-0 flex-1 rounded-[0.75rem] border border-cyan-100/35 bg-slate-950/68 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
              Question {currentIndex + 1} of {reasoningQuestionCount}
            </div>
            <button
              type="button"
              onClick={() => setReasoningScreen('confirm')}
              className={bossNavButtonClass}
            >
              Submit
            </button>
          </BossPaperNav>
        )}
      />
    );
  }

  if (isArithmeticPaper) {
    if (!arithmeticPaper || !arithmeticQuestion) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#f7f4ea] text-slate-900">
          Loading arithmetic paper...
        </div>
      );
    }

    if (arithmeticResult && !isReviewingArithmetic) {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-300 bg-white px-5 py-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">SATs Paper 1: Arithmetic</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-4xl">Paper Complete</h2>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 md:grid-cols-[1fr_1fr] md:p-6">
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Final score</div>
                <div className="mt-2 text-5xl font-black text-slate-950">{arithmeticResult.score}/40</div>
                <div className="mt-2 text-lg font-black text-slate-700">{arithmeticResult.percentage}%</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
                  <div className="rounded-lg bg-slate-100 p-3">Stars<br /><span className="text-xl text-slate-950">{arithmeticResult.stars}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">XP<br /><span className="text-xl text-slate-950">{arithmeticResult.xpAwarded}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Time<br /><span className="text-xl text-slate-950">{formatTime(arithmeticTimeTakenSeconds)}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Correct<br /><span className="text-xl text-slate-950">{arithmeticResult.correctCount}/{arithmeticQuestionCount}</span></div>
                </div>
              </div>
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Breakdown</div>
                <div className="mt-3 space-y-2 text-sm font-bold text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Correct</span><span>{arithmeticResult.correctCount}</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Incorrect or blank</span><span>{arithmeticQuestionCount - arithmeticResult.correctCount}</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Pass threshold</span><span>24 marks</span></div>
                  <div className="flex justify-between py-2"><span>Paper seed</span><span className="max-w-[12rem] truncate text-right">{String(arithmeticPaper.seed)}</span></div>
                </div>
              </div>
            </div>
            <div className="grid shrink-0 gap-2 border-t border-slate-300 bg-white p-3 md:grid-cols-3 md:p-4">
              <button type="button" onClick={retryArithmeticPaper} className="rounded-xl border-2 border-slate-300 bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Retry with new paper
              </button>
              <button type="button" onClick={() => setIsReviewingArithmetic(true)} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Review answers
              </button>
              <button type="button" onClick={onBack} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Return to Boss Island
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (arithmeticResult && isReviewingArithmetic) {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Review answers</div>
                <h2 className="text-xl font-black text-slate-950">Score {arithmeticResult.score}/40</h2>
              </div>
              <button type="button" onClick={() => setIsReviewingArithmetic(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
                Results
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 md:grid-cols-2">
                {arithmeticPaper.questions.map((item) => {
                  const result = arithmeticResult.results.find((entry) => entry.questionId === item.id);
                  return (
                    <div key={item.id} className={`rounded-xl border p-3 ${result?.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-black">Q{item.id}. {item.question}</div>
                        <div className="text-sm font-black">{result?.marksAwarded}/{item.marks}</div>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-700">Your answer: {result?.userAnswer || 'blank'}</div>
                      <div className="text-sm font-bold text-slate-700">Correct answer: {item.answer}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      );
    }

    const selectedAnswer = arithmeticAnswers[arithmeticQuestion.id];
    return (
      <BossPaperStage
        title="Arithmetic"
        questionNumber={currentIndex + 1}
        questionText={`Calculate the value of: ${arithmeticQuestion.question}\nChoose the correct answer.`}
          visual={<BossPaperFallbackVisual encounter={encounter} bossPose={bossPose} title="Arithmetic Boss" />}
          answers={arithmeticQuestion.choices.slice(0, 4).map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              onClick={() => handleArithmeticChoice(option)}
              aria-pressed={String(option) === selectedAnswer}
              className={`answer-choice-card relative flex h-[clamp(3rem,8.2vh,4.55rem)] min-w-0 items-center gap-[clamp(0.45rem,1.5vw,0.9rem)] overflow-hidden rounded-[0.78rem] border px-[clamp(0.55rem,1.7vw,0.95rem)] text-left shadow-[0_8px_18px_rgba(2,6,23,0.36)] transition ${
                String(option) === selectedAnswer
                  ? 'ui-button-primary answer-choice-card--selected'
                  : 'ui-button-secondary answer-choice-card--default'
              }`}
            >
              <span className="pointer-events-none inline-flex h-[clamp(1.9rem,5.4vh,2.8rem)] w-[clamp(1.9rem,5.4vh,2.8rem)] shrink-0 items-center justify-center rounded-full bg-white/10 text-[clamp(0.9rem,2.8vw,1.25rem)] font-black text-white/82">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1 break-words text-[clamp(0.92rem,2.9vw,1.35rem)] font-black leading-tight text-white">
                {option}
              </span>
            </button>
          ))}
        nav={(
          <BossPaperNav>
            <div className="min-w-0 flex-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/75">
              Question {currentIndex + 1} of {arithmeticQuestionCount}
            </div>
          </BossPaperNav>
        )}
      />
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden font-sans">
      <GameplaySceneBackdrop gameType={gameType} />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Core of Calculation"
        body={isArithmeticPaper
          ? "Work through the arithmetic paper.\nChoose the answer that matches the calculation.\nThere is no combat here, just questions and answers."
          : "The Monster Minds have fortified the final boss.\nAnswer correctly to damage the enemy.\nKeep the hero standing until the boss falls."
        }
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full w-full flex-col px-2 pb-2 pt-2 lg:px-4 lg:pb-3 lg:pt-3">
        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[1.65rem] p-2 lg:gap-3 lg:rounded-[2.2rem] lg:p-3">
          <div className="pointer-events-none relative z-20 shrink-0">
            <GameQuestionCard>
              {formatFantasyPrompt(question.prompt)}
            </GameQuestionCard>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
            <div className="battle-arena-panel relative flex min-h-0 flex-1 overflow-hidden rounded-[1.1rem] border border-white/14 bg-slate-950/58 px-2 py-2 text-white shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl lg:rounded-[1.6rem] lg:px-4 lg:py-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_44%)]" />
              {isArithmeticPaper ? (
                <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between gap-2 rounded-[0.95rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.34),rgba(8,15,30,0.06))] p-2 lg:rounded-[1.8rem] lg:p-4">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="inline-flex rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-rose-50">
                      Enemy
                    </div>
                    <div className="inline-flex rounded-full border border-amber-100/20 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-50">
                      {reaction}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                    <BossPortrait encounter={encounter} pose={bossPose} className="h-[clamp(10.5rem,34vh,17.5rem)] w-full max-w-[21rem] lg:h-[22rem] lg:max-w-[27rem]" />
                    <div className="w-full max-w-[20rem] rounded-[1rem] border border-white/12 bg-black/24 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white/72 lg:max-w-[24rem]">
                      {isMultiSelect ? 'Select all that apply' : 'Choose one answer'}
                    </div>
                  </div>
                  <BattleHealthBar
                    label={`${encounter.name} HP`}
                    current={bossHealthRemaining}
                    max={BOSS_HEALTH_MAX}
                    toneClass="w-full max-w-[24rem] border-rose-200/30 bg-rose-300/16 text-rose-50"
                  />
                </div>
              ) : (
                <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-2 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.1fr)] lg:gap-4">
                  <div className="flex min-h-0 flex-col justify-end gap-1 rounded-[0.95rem] border border-cyan-200/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.28),rgba(8,15,30,0.05))] p-2 lg:rounded-[1.8rem] lg:p-4">
                    <div className="inline-flex w-fit rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-50">
                      Hero
                    </div>
                    <div className="flex min-h-0 flex-1 items-end justify-center">
                      <AnimatedAvatar
                        avatar={avatar}
                        pose={heroPose}
                        className="h-[clamp(6.5rem,20vh,9.5rem)] w-[clamp(6.5rem,20vh,9.5rem)] lg:h-[12.5rem] lg:w-[12.5rem]"
                        floating={false}
                        showBackdropGlow={true}
                      />
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col justify-between gap-2 rounded-[0.95rem] border border-rose-200/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.38),rgba(8,15,30,0.08))] p-2 lg:rounded-[1.8rem] lg:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-rose-50">
                      Enemy
                    </div>
                    <div className="inline-flex rounded-full border border-amber-100/20 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-50">
                      {reaction}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
                    <BossPortrait encounter={encounter} pose={bossPose} className="h-[clamp(7.2rem,22vh,10.25rem)] w-full max-w-[18rem] lg:h-[13.5rem] lg:max-w-[21rem]" />
                    <div className="w-full max-w-[19rem] rounded-[1rem] border border-white/12 bg-black/22 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white/72 lg:max-w-[22rem]">
                      {isMultiSelect ? 'Select all that apply' : 'Choose one answer'}
                    </div>
                  </div>
                  <BattleHealthBar
                    label={`${encounter.name} HP`}
                    current={bossHealthRemaining}
                    max={BOSS_HEALTH_MAX}
                    toneClass="border-rose-200/30 bg-rose-300/16 text-rose-50"
                  />
                </div>
              </div>
              )}
            </div>

              <div className="answer-choice-surface grid min-h-0 shrink-0 grid-cols-4 gap-1.5 lg:gap-2.5">
                {question.options.map((option, index) => {
                  const isCorrect = question.correctOptionIndices.includes(index);
                  const isSelected = activeSelection.includes(index);
                  const isRevealed = submittedIndices !== null;

                const toneClass = isRevealed
                  ? isCorrect
                    ? 'ui-button-success answer-choice-card--correct'
                    : isSelected
                      ? 'ui-button-primary answer-choice-card--selected'
                      : 'ui-button-secondary answer-choice-card--default opacity-55'
                  : isSelected
                    ? 'ui-button-primary answer-choice-card--selected'
                    : 'ui-button-secondary answer-choice-card--default';

                  return (
                    <button
                      key={`${option}-${index}`}
                      onClick={() => handleOptionClick(index)}
                      disabled={submittedIndices !== null}
                      aria-pressed={isSelected}
                      className={`answer-choice-card relative flex h-[clamp(2.75rem,7vh,3.9rem)] min-w-0 items-center justify-center rounded-[0.78rem] px-1.5 py-1.5 text-center text-[clamp(0.58rem,2.25vw,0.82rem)] font-black leading-tight lg:h-[4.8rem] lg:rounded-[1.08rem] lg:px-3 lg:py-2.5 lg:text-[0.98rem] ${toneClass}`}
                    >
                      <span className="pointer-events-none absolute left-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/10 text-[7px] font-black text-white/70 lg:left-2.5 lg:top-2.5 lg:h-5 lg:w-5 lg:text-[10px]">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="max-w-full break-words px-0.5 lg:px-0">{option}</span>
                      {isRevealed && isCorrect && (
                        <AssetIcon name="check" className="absolute bottom-1 right-1 h-3.5 w-3.5 text-emerald-100 lg:bottom-2 lg:right-2 lg:h-5 lg:w-5" />
                      )}
                    </button>
                );
              })}
            </div>

            {isMultiSelect ? (
              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={submittedIndices !== null || selectedIndices.length === 0}
                  className="ui-button-secondary rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => submitSelection(selectedIndices)}
                  disabled={submittedIndices !== null || selectedIndices.length === 0}
                  className="ui-button-success rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Check answers
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossEncounterGame;

