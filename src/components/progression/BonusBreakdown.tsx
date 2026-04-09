import React from 'react';
import { BonusBreakdown as BonusBreakdownType } from '../../lib/progression/types';

interface BonusBreakdownProps {
  bonuses: BonusBreakdownType[];
}

const BonusBreakdown: React.FC<BonusBreakdownProps> = ({ bonuses }) => {
  if (!bonuses.length) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {bonuses.map((bonus) => (
        <div
          key={bonus.label}
          className="flex items-center justify-between rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-white/85"
        >
          <span className="uppercase tracking-[0.12em]">{bonus.label}</span>
          <span className="text-amber-200">+{bonus.amount} XP</span>
        </div>
      ))}
    </div>
  );
};

export default BonusBreakdown;
