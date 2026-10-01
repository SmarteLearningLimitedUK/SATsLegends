import React from 'react';
import { AVATARS } from '../constants';
import { PlayerData } from '../types';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import AssetIcon from '../components/AssetIcon';
import { ACHIEVEMENT_CATALOG } from '../systems/progression/achievementCatalog';
import { GameScreenShell, PrimaryActionButton, ScrollScreenShell } from '../layout/ScreenPrimitives';
import '../components/game-ui/arcade-amendments.css';

interface PlayerProfileProps { player: PlayerData; onBack: () => void; }

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onBack }) => {
  const avatar = AVATARS.find((entry) => entry.id === player.avatarId) ?? AVATARS[0];
  const portrait = useTrimmedImageSource(avatar.portrait || avatar.image);
  const earnedIds = new Set(player.achievementState?.earned ?? player.achievements ?? []);
  const achievements = ACHIEVEMENT_CATALOG.filter((entry) => earnedIds.has(entry.id));
  const stats = [
    { label: 'Experience', value: `${player.xp.toLocaleString()} XP` },
    { label: 'Adventure level', value: player.level },
    { label: 'Brainpower tokens', value: player.stats?.totalStars ?? 0 },
    { label: 'Achievements', value: achievements.length },
  ];
  return (
    <GameScreenShell className="player-profile-arcade relative h-full min-h-0 overflow-hidden">
      <ScrollScreenShell className="relative z-10 h-full w-full overflow-y-auto px-4 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
          <header className="profile-summary-hero">
            <img src={portrait} alt={avatar.name} className="profile-summary-portrait" />
            <div className="min-w-0">
              <div className="profile-summary-label">Player summary</div>
              <h1 className="profile-summary-heading">{player.playerName.trim() || 'Explorer'}</h1>
              <p className="profile-summary-copy">{avatar.name} · {avatar.rarity} hero</p>
              <p className="profile-summary-copy">Every challenge builds your brainpower.</p>
            </div>
          </header>
          <section className="profile-summary-stats" aria-label="Your adventure stats">
            {stats.map((stat) => <div className="profile-summary-stat" key={stat.label}>
              <span className="profile-summary-label">{stat.label}</span><strong>{stat.value}</strong>
            </div>)}
          </section>
          <section aria-labelledby="profile-achievements">
            <h2 id="profile-achievements" className="mb-3 text-2xl font-bold text-white">Your achievements</h2>
            <div className="profile-achievement-list">
              {achievements.length ? achievements.map((achievement) => <article className="profile-achievement" key={achievement.id}>
                <AssetIcon name="star" className="mt-1 h-6 w-6 shrink-0" />
                <div><h3>{achievement.name}</h3><p className="profile-summary-copy">{achievement.description}</p></div>
              </article>) : <p className="profile-summary-copy rounded-xl border border-cyan-100/20 bg-slate-950/60 p-4">Your first badge is waiting. Explore an island and complete a challenge.</p>}
            </div>
          </section>
          <PrimaryActionButton onClick={onBack} className="mx-auto rounded-xl px-8 py-3 text-base">Back to map</PrimaryActionButton>
        </div>
      </ScrollScreenShell>
    </GameScreenShell>
  );
};
export default PlayerProfile;
