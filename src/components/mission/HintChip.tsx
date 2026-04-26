import React from 'react';

type HintChipProps = {
  label: string;
  className?: string;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const HintChip: React.FC<HintChipProps> = ({ label, className }) => (
  <div
    className={cn(
      'inline-flex items-center justify-center rounded-full border border-cyan-100/18 bg-slate-950/40 px-2.5 py-1',
      'text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/85',
      'shadow-[0_10px_18px_rgba(2,6,23,0.22)]',
      className,
    )}
  >
    {label}
  </div>
);

export default HintChip;

