import React from 'react';
import { Link } from 'react-router-dom';
import { AVATARS, ISLANDS } from '../constants';
import { PlayerData } from '../types';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import AssetIcon from '../components/AssetIcon';
import { ACHIEVEMENT_CATALOG } from '../systems/progression/achievementCatalog';
import { getRecommendedPractice } from '../systems/content/recommendedPractice';
import { GameScreenShell, PrimaryActionButton, ScrollScreenShell } from '../layout/ScreenPrimitives';
import '../components/game-ui/arcade-amendments.css';
import './desktop-hub-layout.css';
import './player-summary.css';

interface PlayerProfileProps {
  player: PlayerData;
  onBack: () => void;
  onOpenShop: () => void;
  onOpenQuests: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onBack, onOpenShop, onOpenQuests }) => {
  const avatar = AVATARS.find((entry) => entry.id === player.avatarId) ?? AVATARS[0];
  const portrait = useTrimmedImageSource(avatar.portrait || avatar.image);
  const earnedIds = new Set(player.achievementState?.earned ?? player.achievements ?? []);
  const achievements = ACHIEVEMENT_CATALOG.filter((entry) => earnedIds.has(entry.id));
  const recommendedPractice = getRecommendedPractice(player, ISLANDS);
  const stats = [
    { label: 'Experience', value: `${player.xp.toLocaleString()} XP` },
    { label: 'Adventure level', value: player.level },
    { label: 'Brainpower tokens', value: player.stats?.totalStars ?? 0 },
    { label: 'Achievements', value: achievements.length },
  ];
  return (
    <GameScreenShell className="player-profile-arcade relative h-full min-h-0 overflow-hidden">
      <ScrollScreenShell className="relative z-10 h-full w-full overflow-y-auto px-4 py-5 md:px-8">
        <div className="profile-page-content mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
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
          <details className="profile-secondary-destinations">
          <summary>Adventure activities</summary>
          <nav className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Player activities">
            <PrimaryActionButton type="button" onClick={onOpenQuests} className="min-h-12 rounded-xl px-3 py-3 text-sm md:text-base">
              Daily Quests{player.dailyQuests.some(quest => quest.current >= quest.target && !quest.isClaimed) ? ' · Claim' : ''}
            </PrimaryActionButton>
            <PrimaryActionButton type="button" onClick={onOpenShop} className="min-h-12 rounded-xl px-3 py-3 text-sm md:text-base">
              Character Shop
            </PrimaryActionButton>
            <Link to="/settings" className="ui-button-secondary col-span-2 flex min-h-12 items-center justify-center rounded-xl px-3 py-3 text-center text-sm font-black uppercase tracking-wide focus-visible:outline focus-visible:outline-3 focus-visible:outline-amber-300 md:col-span-1 md:text-base">
              Sound &amp; music settings
            </Link>
          </nav>
          </details>
          <section className="profile-next-practice" aria-labelledby="profile-next-practice">
            <h2 id="profile-next-practice" className="mb-2 text-2xl font-bold text-white">Your next practice</h2>
            {recommendedPractice.length ? <div className="profile-achievement-list">
              {recommendedPractice.slice(0,1).map((item) => <Link className="profile-achievement block min-h-11 transition-colors hover:border-cyan-200 focus-visible:outline focus-visible:outline-3 focus-visible:outline-amber-300" to={item.href} key={item.key} aria-label={`Practise ${item.name} on ${item.islandName}`}>
                <div><h3>{item.name} →</h3><p className="profile-summary-copy">{item.islandName} · {item.reason}</p></div>
              </Link>)}
            </div> : <p className="profile-summary-copy rounded-xl border border-cyan-100/20 bg-slate-950/60 p-4">Once you have played a few levels, your practice picks will appear here.</p>}
            <details className="profile-practice-details"><summary>Practice details</summary>
              <p className="profile-summary-copy mb-3">Revisit a skill, then try its level again. A short session today and another later in the week will help it stick.</p>
              {recommendedPractice.slice(1).map(item=><Link className="profile-achievement" to={item.href} key={item.key} aria-label={`Practise ${item.name} on ${item.islandName}`}><div><h3>{item.name} →</h3><p className="profile-summary-copy">{item.islandName} · {item.reason}</p></div></Link>)}
            </details>
          </section>
          <details className="profile-achievement-details">
            <summary>Your achievements</summary>
          <section aria-labelledby="profile-achievements">
            <h2 id="profile-achievements" className="mb-3 text-2xl font-bold text-white">Your achievements</h2>
            <div className="profile-achievement-list">
              {achievements.length ? achievements.map((achievement) => <article className="profile-achievement" key={achievement.id}>
                <AssetIcon name="star" className="mt-1 h-6 w-6 shrink-0" />
                <div><h3>{achievement.name}</h3><p className="profile-summary-copy">{achievement.description}</p></div>
              </article>) : <p className="profile-summary-copy rounded-xl border border-cyan-100/20 bg-slate-950/60 p-4">Your first badge is waiting. Explore an island and complete a challenge.</p>}
            </div>
          </section>
          </details>
          <PrimaryActionButton onClick={onBack} className="mx-auto rounded-xl px-8 py-3 text-base">Back to map</PrimaryActionButton>
        </div>
      </ScrollScreenShell>
    </GameScreenShell>
  );
};
export default PlayerProfile;
