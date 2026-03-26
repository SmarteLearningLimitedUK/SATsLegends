import React, { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';

export type FantasyAnswerFeedbackState = 'default' | 'selected' | 'correct' | 'incorrect';
export type FantasyAnswerVisualState = FantasyAnswerFeedbackState;

export const deriveFantasyAnswerState = <T,>(
  option: T,
  selected: T | null,
  feedback: FantasyAnswerFeedbackState,
  correctOption?: T,
): FantasyAnswerVisualState => {
  if (feedback === 'correct' && option === correctOption) return 'correct';
  if (feedback === 'incorrect' && option === selected) return 'incorrect';
  if (selected !== null && option === selected) return 'selected';
  return 'default';
};

export interface FantasyAnswerOptionButtonProps {
  label: React.ReactNode;
  visualState: FantasyAnswerVisualState;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const stateClassMap: Record<FantasyAnswerVisualState, string> = {
  default: [
    'border-cyan-100/45 text-white',
    'bg-[linear-gradient(180deg,rgba(32,74,180,0.58),rgba(22,48,118,0.66))]',
    'shadow-[0_12px_22px_rgba(2,6,23,0.34)]',
  ].join(' '),
  selected: [
    'border-cyan-100/95 text-cyan-50',
    'bg-[linear-gradient(180deg,rgba(56,189,248,0.64),rgba(59,130,246,0.56),rgba(67,56,202,0.55))]',
    'shadow-[0_18px_32px_rgba(34,211,238,0.42)]',
  ].join(' '),
  correct: [
    'border-emerald-100/95 text-emerald-50',
    'bg-[linear-gradient(180deg,rgba(74,222,128,0.66),rgba(22,163,74,0.6))]',
    'shadow-[0_20px_34px_rgba(16,185,129,0.42)]',
  ].join(' '),
  incorrect: [
    'border-rose-100/95 text-rose-50',
    'bg-[linear-gradient(180deg,rgba(251,113,133,0.66),rgba(225,29,72,0.58))]',
    'shadow-[0_18px_30px_rgba(244,63,94,0.4)]',
  ].join(' '),
};

const StateIcon: React.FC<{ visualState: FantasyAnswerVisualState }> = ({ visualState }) => {
  if (visualState === 'correct') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-100/95" />;
  }
  if (visualState === 'incorrect') {
    return <XCircle className="h-5 w-5 text-rose-100/95" />;
  }
  if (visualState === 'selected') {
    return <Sparkles className="h-4 w-4 text-cyan-100/95" />;
  }
  return null;
};

export const FantasyAnswerOptionButton: React.FC<FantasyAnswerOptionButtonProps> = ({
  label,
  visualState,
  onClick,
  disabled = false,
  className = '',
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : { scale: 1.018, y: -1 }}
    whileTap={disabled ? undefined : { scale: 0.976, y: 1 }}
    className={[
      'group relative h-16 w-full overflow-hidden rounded-2xl border text-2xl font-black tracking-tight transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      'disabled:cursor-not-allowed disabled:opacity-65',
      stateClassMap[visualState],
      className,
    ].join(' ')}
    aria-pressed={visualState === 'selected'}
  >
    <div className="pointer-events-none absolute inset-[1px] rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0)_44%)]" />
    <div className="pointer-events-none absolute -inset-8 rounded-full bg-cyan-200/10 blur-2xl transition-opacity duration-150 group-hover:opacity-100" />
    <span className="relative inline-flex items-center gap-2 [text-shadow:0_2px_2px_rgba(0,0,0,0.28)]">
      {label}
      <AnimatePresence mode="wait" initial={false}>
        {visualState !== 'default' ? (
          <motion.span
            key={visualState}
            initial={{ opacity: 0, scale: 0.8, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -2 }}
            transition={{ duration: 0.16 }}
            className="inline-flex"
          >
            <StateIcon visualState={visualState} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  </motion.button>
);

export interface FantasyAnswerClusterProps<T extends string | number> {
  options: readonly T[];
  selected: T | null;
  feedback: FantasyAnswerFeedbackState;
  correctOption?: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
  buttonClassName?: string;
  renderLabel?: (value: T) => React.ReactNode;
}

export const FantasyAnswerCluster = <T extends string | number>({
  options,
  selected,
  feedback,
  correctOption,
  onSelect,
  disabled = false,
  columns = 2,
  className = '',
  buttonClassName = '',
  renderLabel,
}: FantasyAnswerClusterProps<T>) => {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };

  return (
    <div className={['grid gap-2.5', className].join(' ')} style={gridStyle}>
      {options.map((value) => (
        <FantasyAnswerOptionButton
          key={`${value}`}
          label={renderLabel ? renderLabel(value) : value}
          visualState={deriveFantasyAnswerState(value, selected, feedback, correctOption)}
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={buttonClassName}
        />
      ))}
    </div>
  );
};

interface FantasyAnswerFeedbackBannerProps {
  state: 'correct' | 'incorrect' | null;
  correctText?: string;
  incorrectText?: string;
}

export const FantasyAnswerFeedbackBanner: React.FC<FantasyAnswerFeedbackBannerProps> = ({
  state,
  correctText = 'Great job!',
  incorrectText = 'Not quite. Try again!',
}) => (
  <AnimatePresence mode="wait" initial={false}>
    {state ? (
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={[
          'pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.2rem)] z-30 -translate-x-1/2 rounded-full border px-4 py-2',
          'text-xs font-black uppercase tracking-[0.1em] shadow-[0_12px_26px_rgba(2,6,23,0.35)]',
          state === 'correct'
            ? 'border-emerald-100/90 bg-emerald-500/35 text-emerald-50'
            : 'border-rose-100/90 bg-rose-500/35 text-rose-50',
        ].join(' ')}
      >
        {state === 'correct' ? correctText : incorrectText}
      </motion.div>
    ) : null}
  </AnimatePresence>
);
