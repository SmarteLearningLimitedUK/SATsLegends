import React from 'react';
import { BossPose } from '../assets/bosses';
import { BossEncounter } from '../bossMeta';
import { resolveEncounterEnemyArt } from '../assets/enemies/cohesive';
import MonsterMindActor from './game-ui/MonsterMindActor';

interface BossPortraitProps {
  encounter: BossEncounter;
  pose: BossPose;
  className?: string;
  compact?: boolean;
}

const BossPortrait: React.FC<BossPortraitProps> = ({ encounter, pose, className = '' }) => {
  const image = resolveEncounterEnemyArt(encounter.assetId);
  const reaction = pose === 'defeat' ? 'defeated' : pose === 'dazed' ? 'hit' : pose === 'neutral' ? 'idle' : 'taunt';

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border border-white/16 bg-[linear-gradient(180deg,rgba(12,18,28,0.9),rgba(5,10,18,0.96))] shadow-[0_18px_38px_rgba(0,0,0,0.34)] ${className}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${encounter.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.2),rgba(255,255,255,0)_40%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_22%,rgba(2,6,23,0.16))]" />
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-12 rounded-full bg-white/12 blur-2xl"
      />
      <div className="relative flex h-full min-h-0 items-center gap-3 p-2.5 md:p-3.5">
        <div
          className="relative flex h-full min-h-[4rem] w-[4.5rem] shrink-0 items-end justify-center rounded-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0.02))]"
        >
          <div
            className="pointer-events-none absolute inset-[10%] rounded-full bg-white/14 blur-xl"
          />
          <MonsterMindActor
            src={image}
            alt={encounter.name}
            reaction={reaction}
            reactionKey={pose}
            className="relative z-10 h-full max-h-[7rem] w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.42)]"
          />
        </div>
        <div className="min-w-0">
          <div className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${encounter.chipClass}`}>
            {encounter.title}
          </div>
          <div className="mt-1.5 truncate text-sm font-black text-white md:text-lg">{encounter.name}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65 md:text-[11px]">
            {pose === 'defeat' ? 'Boss broken' : pose === 'victory' ? 'Boss dominant' : pose === 'dazed' ? 'Boss staggered' : pose === 'attack' ? 'Boss attacking' : 'Boss waiting'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossPortrait;
