import React from 'react';
import { AVATARS } from '../constants';
import { PlayerData } from '../types';
import AssetIcon from '../components/AssetIcon';
import { ACHIEVEMENT_CATALOG } from '../systems/progression/achievementCatalog';
import {
  FramedPanel,
  GameScreenShell,
  PrimaryActionButton,
  RewardPanel,
  ScrollScreenShell,
} from '../layout/ScreenPrimitives';

interface PlayerProfileProps {
  player: PlayerData;
  onBack: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onBack }) => {
  const selectedAvatar = AVATARS.find((avatar) => avatar.id === player.avatarId) ?? AVATARS[0];
  const avatarSrc = selectedAvatar.portrait || selectedAvatar.image;
  const playerName = player.playerName.trim() || 'Explorer';
  const brainpowerTokensEarned = player.stats?.totalStars ?? 0;
  const earnedAchievementIds = new Set(player.achievementState?.earned ?? player.achievements ?? []);
  const earnedAchievements = ACHIEVEMENT_CATALOG
    .filter((achievement) => earnedAchievementIds.has(achievement.id))
    .slice(0, 12);

  return (
    <GameScreenShell className="relative h-auto min-h-[100dvh] max-h-none overflow-visible md:h-auto md:max-h-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_34%),linear-gradient(180deg,rgba(7,12,26,0.12),rgba(7,12,26,0.38))]" />

      <ScrollScreenShell className="relative z-10 flex w-full flex-col px-4 pb-4 pt-[calc(0.8rem+env(safe-area-inset-top))] md:px-8 md:pb-6 md:pt-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pt-3 md:gap-6 md:pt-4">
          <RewardPanel className="mx-auto w-full max-w-3xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-slate-950/35 md:h-12 md:w-12">
                <AssetIcon name="user" className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900/70 md:text-xs">
                  Player summary
                </div>
                <div className="mt-1 text-xl font-black tracking-tight text-amber-950 md:text-3xl">
                  {playerName}
                </div>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-amber-950/70 md:text-base">
                  {player.level ? `Level ${player.level}` : 'Adventure level not set yet'} · {player.xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          </RewardPanel>

          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr] md:gap-6">
            <FramedPanel variant="surface" className="flex flex-col gap-4 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55 md:text-xs">
                  Key stats
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight text-white md:text-4xl">
                  What this explorer has earned so far
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.1rem] border border-white/12 bg-white/6 px-4 py-4 shadow-[0_10px_20px_rgba(2,6,23,0.18)] md:rounded-[1.25rem] md:px-5 md:py-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:text-xs">
                    XP
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
                    {player.xp.toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/70 md:text-base">
                    Total experience collected.
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-white/12 bg-white/6 px-4 py-4 shadow-[0_10px_20px_rgba(2,6,23,0.18)] md:rounded-[1.25rem] md:px-5 md:py-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:text-xs">
                    Current level
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
                    {player.level}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/70 md:text-base">
                    Adventure progress rank.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.1rem] border border-white/12 bg-white/6 px-4 py-4 shadow-[0_10px_20px_rgba(2,6,23,0.18)] md:rounded-[1.25rem] md:px-5 md:py-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:text-xs">
                    Brainpower tokens
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
                    {brainpowerTokensEarned}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/70 md:text-base">
                    Total brainpower tokens earned.
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-white/12 bg-white/6 px-4 py-4 shadow-[0_10px_20px_rgba(2,6,23,0.18)] md:rounded-[1.25rem] md:px-5 md:py-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:text-xs">
                    Achievements
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
                    {earnedAchievements.length}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/70 md:text-base">
                    Earned badges and milestones.
                  </div>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-cyan-100/12 bg-slate-950/40 px-4 py-4 md:rounded-[1.4rem] md:px-5 md:py-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:text-xs">
                  Selected avatar
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 ${selectedAvatar.color} shadow-[0_10px_18px_rgba(2,6,23,0.18)] md:h-14 md:w-14`}>
                    <AssetIcon name="star" className="h-5 w-5 text-white/90 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight text-white md:text-2xl">{selectedAvatar.name}</div>
                    <div className="text-sm font-semibold text-white/68 md:text-base">
                      {selectedAvatar.rarity} hero
                    </div>
                  </div>
                </div>
              </div>
            </FramedPanel>

            <FramedPanel variant="surface" className="flex flex-col rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55 md:text-xs">
                Avatar preview
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
                {selectedAvatar.name}
              </div>
              <div className="mt-1 text-sm font-semibold text-white/65 md:text-base">
                This is the hero currently equipped on the map.
              </div>

              <div className="mt-4 flex items-center justify-center rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
                <img
                  src={avatarSrc}
                  alt={selectedAvatar.name}
                  draggable={false}
                  className="max-h-[24rem] w-auto object-contain object-bottom drop-shadow-[0_16px_28px_rgba(2,6,23,0.26)] md:max-h-[30rem]"
                />
              </div>
            </FramedPanel>
          </div>

          <FramedPanel variant="surface" className="flex flex-col gap-4 rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55 md:text-xs">
                Achievements earned
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-white md:text-4xl">
                {playerName}'s milestone shelf
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {earnedAchievements.length ? earnedAchievements.map((achievement) => (
                <div key={achievement.id} className="rounded-[1rem] border border-white/12 bg-white/6 px-4 py-3 shadow-[0_10px_20px_rgba(2,6,23,0.18)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/72 md:text-xs">
                    {achievement.category}
                  </div>
                  <div className="mt-1 text-lg font-black tracking-tight text-white md:text-xl">
                    {achievement.name}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/68 md:text-base">
                    {achievement.description}
                  </div>
                </div>
              )) : (
                <div className="rounded-[1rem] border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/68">
                  No achievements unlocked yet.
                </div>
              )}
            </div>
          </FramedPanel>

          <div className="flex justify-center pt-1">
            <PrimaryActionButton onClick={onBack} className="rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
              Back to map
            </PrimaryActionButton>
          </div>
        </div>
      </ScrollScreenShell>
    </GameScreenShell>
  );
};

export default PlayerProfile;
