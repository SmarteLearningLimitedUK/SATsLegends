import React from 'react';
import { motion } from 'motion/react';
import { FramedPanel, PrimaryActionButton } from '../../layout/ScreenPrimitives';
import { AssetIconName } from '../AssetIcon';
import HintChip from './HintChip';
import SkillBadge, { SkillBadgeTone } from './SkillBadge';

type MissionCardProps = {
  eyebrow?: string;
  title: string;
  instruction: string;
  visual: React.ReactNode;
  skillLabel?: string;
  skillIcon?: AssetIconName;
  skillTone?: SkillBadgeTone;
  hintChips?: string[];
  ctaLabel: string;
  onCta: () => void;
  className?: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const MissionCard: React.FC<MissionCardProps> = ({
  eyebrow = 'Mission',
  title,
  instruction,
  visual,
  skillLabel,
  skillIcon,
  skillTone,
  hintChips = [],
  ctaLabel,
  onCta,
  className,
}) => {
  const chips = hintChips.filter(Boolean).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className={cn('w-full', className)}
    >
      <FramedPanel
        variant="surface"
        className="relative flex w-full max-w-[22rem] min-h-0 max-h-[calc(100svh-3rem)] flex-col gap-3 overflow-hidden p-4 text-left md:max-w-[28rem] md:gap-4 md:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
              {eyebrow}
            </div>
            <div className="mt-2 text-[clamp(1.25rem,4.8vw,1.75rem)] font-black leading-none tracking-[0.03em] text-white">
              {title}
            </div>
          </div>
          {skillLabel ? (
            <div className="shrink-0">
              <SkillBadge label={skillLabel} icon={skillIcon} tone={skillTone} />
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1">
          {visual}
        </div>

        <div className="space-y-2">
          <div className="text-center text-[clamp(0.95rem,3.1vw,1.05rem)] font-black text-white/92">
            {instruction}
          </div>
          {chips.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <HintChip key={chip} label={chip} />
              ))}
            </div>
          ) : null}
        </div>

        <PrimaryActionButton
          onClick={onCta}
          className="w-full shrink-0 py-3 text-sm md:text-base"
        >
          {ctaLabel}
        </PrimaryActionButton>
      </FramedPanel>
    </motion.div>
  );
};

export default MissionCard;
