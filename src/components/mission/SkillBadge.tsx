import React from 'react';
import AssetIcon, { AssetIconName } from '../AssetIcon';

export type SkillBadgeTone = 'cyan' | 'amber' | 'emerald' | 'rose';

type SkillBadgeProps = {
  label: string;
  icon?: AssetIconName;
  tone?: SkillBadgeTone;
  className?: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const toneClass: Record<SkillBadgeTone, string> = {
  cyan: 'border-cyan-200/40 bg-cyan-300/12 text-cyan-50',
  amber: 'border-amber-200/45 bg-amber-300/14 text-amber-50',
  emerald: 'border-emerald-200/40 bg-emerald-300/12 text-emerald-50',
  rose: 'border-rose-200/40 bg-rose-300/12 text-rose-50',
};

const SkillBadge: React.FC<SkillBadgeProps> = ({ label, icon, tone = 'cyan', className }) => (
  <div
    className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
      'text-[10px] font-black uppercase tracking-[0.18em]',
      'shadow-[0_12px_22px_rgba(2,6,23,0.26)]',
      toneClass[tone],
      className,
    )}
  >
    {icon ? <AssetIcon name={icon} className="h-4 w-4 opacity-90" alt="" /> : null}
    <span className="leading-none">{label}</span>
  </div>
);

export default SkillBadge;

