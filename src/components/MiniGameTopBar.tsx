import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './game-ui/GameUiKit';

interface MiniGameTopBarProps {
  onBack: () => void;
  XP: number;
  scoreLabel?: string;
  metaLabel?: string;
  metaValue?: React.ReactNode;
  className?: string;
}

const MiniGameTopBar: React.FC<MiniGameTopBarProps> = ({
  onBack,
  XP,
  scoreLabel = 'XP',
  metaLabel,
  metaValue,
  className = '',
}) => (
  <div className={`mini-game-top-bar pointer-events-none absolute inset-x-0 top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${className}`.trim()}>
    <div className="flex items-center justify-between gap-2">
      <div className="pointer-events-auto">
        <IconButton icon={<ArrowLeft className="h-5 w-5" />} label="Back" onClick={onBack} />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {metaLabel && metaValue !== undefined && metaValue !== null ? (
          <div className="inline-flex h-10 items-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-white">
            {metaLabel} {metaValue}
          </div>
        ) : null}
        <div className="inline-flex h-10 items-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-white">
          {scoreLabel} {XP.toLocaleString()}
        </div>
      </div>
    </div>
  </div>
);

export default MiniGameTopBar;
