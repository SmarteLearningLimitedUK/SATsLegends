import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS, AVATARS } from '../constants';
import AssetIcon from './AssetIcon';
import forestBg from '../assets/licensed/background.jpeg';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
}

const ISLAND_PALETTES: Record<number, {
  atmosphere: string;
  sceneGlow: string;
  halo: string;
  button: string;
  progress: string;
}> = {
  1: {
    atmosphere: 'from-cyan-300/28 via-sky-700/20 to-slate-950/88',
    sceneGlow: 'from-lime-300/35 via-cyan-300/15 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(56,189,248,0.28)]',
    button: 'from-lime-300 to-cyan-400',
    progress: 'from-lime-300 via-cyan-300 to-sky-500',
  },
  2: {
    atmosphere: 'from-violet-300/26 via-indigo-700/20 to-slate-950/88',
    sceneGlow: 'from-fuchsia-300/35 via-violet-300/18 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(192,132,252,0.28)]',
    button: 'from-fuchsia-300 to-violet-400',
    progress: 'from-fuchsia-300 via-violet-300 to-indigo-500',
  },
  3: {
    atmosphere: 'from-amber-200/28 via-rose-500/20 to-slate-950/88',
    sceneGlow: 'from-orange-200/32 via-amber-200/18 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(251,191,36,0.24)]',
    button: 'from-amber-200 to-orange-300',
    progress: 'from-amber-200 via-orange-300 to-rose-400',
  },
  4: {
    atmosphere: 'from-yellow-200/28 via-orange-500/20 to-slate-950/88',
    sceneGlow: 'from-yellow-200/35 via-orange-200/18 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(253,224,71,0.26)]',
    button: 'from-yellow-200 to-orange-300',
    progress: 'from-yellow-200 via-amber-300 to-orange-400',
  },
  5: {
    atmosphere: 'from-cyan-200/24 via-blue-700/20 to-slate-950/88',
    sceneGlow: 'from-cyan-200/30 via-sky-300/18 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(103,232,249,0.26)]',
    button: 'from-cyan-200 to-sky-300',
    progress: 'from-cyan-200 via-sky-300 to-blue-500',
  },
  6: {
    atmosphere: 'from-emerald-200/24 via-teal-700/22 to-slate-950/88',
    sceneGlow: 'from-emerald-200/32 via-teal-300/18 to-transparent',
    halo: 'shadow-[0_0_80px_rgba(110,231,183,0.26)]',
    button: 'from-emerald-200 to-teal-300',
    progress: 'from-emerald-200 via-teal-300 to-cyan-500',
  },
};

const WorldMap: React.FC<WorldMapProps> = ({ player, onSelectIsland }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const avatar = AVATARS.find(item => item.id === player.avatarId);

  const islandProgress = useMemo(() => {
    return ISLANDS.map(island => {
      const completed = player.completedLevels[island.id] || [];
      const earnedStars = island.levels.reduce((sum, level) => {
        const key = `${island.id}-${level.id}`;
        return sum + (player.levelStars?.[key] || 0);
      }, 0);
      const maxStars = island.levels.length * 3;
      const completion = Math.round((completed.length / island.levels.length) * 100);

      return {
        island,
        isUnlocked: player.unlockedIslands.includes(island.id),
        completedCount: completed.length,
        earnedStars,
        maxStars,
        completion,
      };
    });
  }, [player]);

  const totalStars = islandProgress.reduce((sum, item) => sum + item.earnedStars, 0);
  const unlockedCount = islandProgress.filter(item => item.isUnlocked).length;
  const totalCompletedLevels = islandProgress.reduce((sum, item) => sum + item.completedCount, 0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: index * scrollRef.current.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07111f] font-sans">
      <div className="absolute inset-0 bg-center bg-cover opacity-20" style={{ backgroundImage: `url(${forestBg})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2)_0%,rgba(7,17,31,0.72)_38%,rgba(2,6,23,0.98)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_20%,rgba(2,6,23,0.46)_100%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
        {Array.from({ length: 28 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${(i % 4) + 2}px`,
              height: `${(i % 4) + 2}px`,
              top: `${(i * 13) % 100}%`,
              left: `${(i * 17) % 100}%`,
            }}
            animate={{ opacity: [0.18, 0.95, 0.18], scale: [1, 1.55, 1] }}
            transition={{ duration: 2.8 + i * 0.18, repeat: Infinity, delay: i * 0.14 }}
          />
        ))}

        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={`nebula-${i}`}
            animate={{ x: [0, i % 2 === 0 ? 30 : -30, 0], y: [0, -18, 0] }}
            transition={{ duration: 10 + i * 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${180 + i * 56}px`,
              height: `${180 + i * 56}px`,
              top: `${6 + i * 14}%`,
              left: `${i * 15}%`,
              background: i % 2 === 0 ? 'rgba(56,189,248,0.15)' : 'rgba(250,204,21,0.1)',
            }}
          />
        ))}
      </div>

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-50 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] md:px-6 md:pt-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 md:gap-3">
          <div className="pointer-events-auto casual-panel-strong relative overflow-hidden rounded-[1.5rem] border border-white/15 px-3 py-3 shadow-[0_24px_60px_rgba(2,6,23,0.34)] md:rounded-[2.4rem] md:px-6 md:py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_24%)] opacity-80" />
            <div className="relative flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-3">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/20 bg-gradient-to-b from-white/28 to-white/8 text-2xl shadow-[0_16px_40px_rgba(0,0,0,0.32)] md:h-20 md:w-20 md:rounded-[1.7rem] md:text-5xl">
                  {avatar?.image || '?'}
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border-2 border-white bg-gradient-to-br from-yellow-300 to-orange-400 text-[9px] font-black text-yellow-950 shadow-lg md:h-8 md:w-8 md:rounded-xl md:text-xs">
                    {player.level}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100/70 md:text-[10px]">Adventure profile</div>
                  <h1 className="truncate text-[1.35rem] font-black tracking-tight text-white drop-shadow-[0_4px_14px_rgba(2,6,23,0.45)] md:text-[2.4rem]">
                    {player.playerName || 'Explorer'}
                  </h1>
                  <p className="mt-0.5 hidden max-w-2xl text-[11px] leading-snug text-slate-200/84 md:block md:text-sm">
                    Choose an island, keep your streak alive, and push your best stars higher across the campaign map.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:min-w-[19rem] md:grid-cols-2 md:gap-3">
                {[
                  { icon: 'coin', value: player.coins, label: 'Coins' },
                  { icon: 'gem', value: player.gems, label: 'Gems' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="casual-stat-shell rounded-[1rem] border border-white/12 px-3 py-2 text-white shadow-[0_16px_38px_rgba(2,6,23,0.22)] md:rounded-[1.5rem] md:px-4 md:py-3"
                  >
                    <div className="flex items-center gap-2 text-base font-black md:text-xl">
                      <AssetIcon name={item.icon as any} className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
                      <span>{item.value}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-100/62 md:text-[10px]">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-2 md:mt-3">
              <div className="mb-1 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.25em] text-slate-100/62 md:mb-1.5 md:text-[10px]">
                <span>Account XP</span>
                <span>{player.xp % 1000} / 1000</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/35 md:h-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(player.xp % 1000) / 10}%` }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#38bdf8_36%,#818cf8_72%,#c084fc_100%)] shadow-[0_0_18px_rgba(103,232,249,0.45)]"
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-auto hidden grid-cols-3 gap-2 md:grid md:max-w-3xl md:gap-3">
            {[
              { label: 'Stars won', value: totalStars, icon: 'star' },
              { label: 'Levels cleared', value: totalCompletedLevels, icon: 'play' },
              { label: 'Islands open', value: `${unlockedCount}/${ISLANDS.length}`, icon: 'trophy' },
            ].map(item => (
              <div
                key={item.label}
                className="casual-stat-shell rounded-[1.1rem] border border-white/12 px-3 py-2.5 text-center text-white shadow-[0_14px_34px_rgba(2,6,23,0.24)] md:rounded-[1.4rem] md:px-4 md:py-3"
              >
                <div className="flex items-center justify-center gap-1.5 md:gap-2">
                  <AssetIcon name={item.icon as any} className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm font-black md:text-2xl">{item.value}</span>
                </div>
                <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.22em] text-slate-100/58 md:text-[10px]">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 md:hidden">
            <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white/90">
              <AssetIcon name="star" className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em]">{totalStars}</span>
            </div>
            <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white/90">
              <AssetIcon name="trophy" className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em]">{unlockedCount}/{ISLANDS.length}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {islandProgress.map((item, index) => (
                <button
                  key={item.island.id}
                  onClick={() => scrollTo(index)}
                  className={`pointer-events-auto h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-white shadow-[0_0_14px_rgba(255,255,255,0.35)]' : 'w-2.5 bg-white/35'}`}
                  aria-label={`Go to island ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex h-full w-full snap-x snap-mandatory overflow-x-auto hide-scrollbar"
      >
        {islandProgress.map(({ island, isUnlocked, completedCount, earnedStars, maxStars, completion }, index) => {
          const isActive = index === activeIndex;
          const palette = ISLAND_PALETTES[island.id] || ISLAND_PALETTES[1];
          const nextLevelLabel = completedCount >= island.levels.length ? 'Boss cleared' : `Next stage ${Math.min(completedCount + 1, island.levels.length)}`;

          return (
            <section
              key={island.id}
              className="relative flex h-full min-w-[100vw] snap-center items-center justify-center overflow-hidden px-4 pb-[8rem] pt-[8.75rem] md:px-10 md:pb-32 md:pt-56 lg:px-12"
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${island.bgGradient || 'from-sky-600 to-slate-900'} opacity-72`} />
              <div className={`absolute inset-0 bg-gradient-to-b ${palette.atmosphere}`} />
              <div className={`absolute left-1/2 top-[18%] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full blur-3xl ${palette.sceneGlow} opacity-80 md:h-[34rem] md:w-[34rem]`} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent md:h-72" />

              <motion.div
                animate={isActive ? { y: [0, -8, 0] } : { y: 0 }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.95fr)] lg:items-center lg:gap-6"
              >
                <div className="relative">
                  <div className={`absolute inset-x-12 bottom-3 h-10 rounded-full bg-black/40 blur-2xl md:bottom-0 md:h-14 ${palette.halo}`} />

                  <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/70 shadow-[0_32px_90px_rgba(2,6,23,0.42)] md:rounded-[2.8rem]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.72))]" />
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/12 to-transparent md:h-28" />

                    <div className="relative p-3 md:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="casual-ribbon-chip inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-white">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] md:text-[10px]">Island {island.id}</span>
                        </div>
                        <div className="casual-ribbon-chip hidden items-center gap-2 rounded-full px-3 py-1.5 text-white/90 md:inline-flex">
                          <AssetIcon name="star" className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          <span className="text-[9px] font-black uppercase tracking-[0.24em] md:text-[10px]">{earnedStars} / {maxStars}</span>
                        </div>
                      </div>

                      <motion.div
                        animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative mt-3 overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950/70 md:mt-4 md:rounded-[2.2rem]"
                      >
                        {island.mapImage ? (
                          <img
                            src={island.mapImage}
                            alt={island.themeName || island.name}
                            className="h-[9.5rem] w-full object-cover object-center opacity-90 md:h-[22rem]"
                            draggable={false}
                          />
                        ) : (
                          <div className={`h-[9.5rem] w-full bg-gradient-to-br ${island.bgGradient || 'from-sky-600 to-slate-900'} md:h-[22rem]`} />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(2,6,23,0)_28%,rgba(2,6,23,0.56)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-3 md:p-5">
                          <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/72 px-3 py-3 backdrop-blur-xl md:rounded-[1.8rem] md:px-4 md:py-4">
                            <div className="text-[8px] font-black uppercase tracking-[0.26em] text-cyan-100/72 md:text-[10px]">{island.category}</div>
                            <h2 className="mt-1 text-lg font-black tracking-tight text-white drop-shadow-[0_6px_18px_rgba(2,6,23,0.35)] md:text-4xl">
                              {island.themeName || island.name}
                            </h2>
                            <p className="mt-1 hidden text-[11px] leading-snug text-slate-200/82 md:block md:text-sm">
                              Premium campaign zone with {island.levels.length} stages, a final boss gate, and persistent reward progress.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                <div className="casual-panel-strong relative overflow-hidden rounded-[2rem] border border-white/16 p-4 text-white shadow-[0_28px_80px_rgba(2,6,23,0.4)] md:rounded-[2.6rem] md:p-7">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)] opacity-90" />
                  <div className="relative">
                    <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-4 md:gap-3">
                      <span className="casual-ribbon-chip rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.26em] text-white/85 md:px-4 md:py-2 md:text-[10px]">
                        {island.name}
                      </span>
                      <span className="casual-ribbon-chip hidden rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-100 md:inline-flex md:px-4 md:py-2 md:text-[10px]">
                        {isUnlocked ? nextLevelLabel : 'Complete previous boss'}
                      </span>
                    </div>

                    <h3 className="text-[1.15rem] font-black tracking-tight text-white drop-shadow-[0_6px_18px_rgba(2,6,23,0.35)] md:text-[3.2rem]">
                      {isUnlocked ? 'Choose your next route' : 'Progress gate ahead'}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200/82 md:mt-2 md:text-base">
                      {isUnlocked
                        ? `Your current island completion is ${completion}%. Push deeper, improve your stars, and unlock the next world by clearing the boss path.`
                        : 'This island is still locked. Clear the previous island boss and the route will open automatically.'}
                    </p>

                    <div className="mt-3 hidden grid-cols-3 gap-2 md:mt-6 md:grid md:gap-3">
                      <div className="casual-stat-shell rounded-[1.2rem] border border-white/12 p-3 md:rounded-[1.6rem] md:p-4">
                        <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-100/56 md:text-[10px]">Progress</div>
                        <div className="mt-1 text-sm font-black md:text-2xl">{completedCount} / {island.levels.length}</div>
                      </div>
                      <div className="casual-stat-shell rounded-[1.2rem] border border-white/12 p-3 md:rounded-[1.6rem] md:p-4">
                        <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-100/56 md:text-[10px]">Stars</div>
                        <div className="mt-1 text-sm font-black md:text-2xl">{earnedStars} / {maxStars}</div>
                      </div>
                      <div className="casual-stat-shell rounded-[1.2rem] border border-white/12 p-3 md:rounded-[1.6rem] md:p-4">
                        <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-100/56 md:text-[10px]">Status</div>
                        <div className="mt-1 text-sm font-black md:text-2xl">{isUnlocked ? `${completion}%` : 'Locked'}</div>
                      </div>
                    </div>

                    <div className="mt-3 md:mt-6">
                      <div className="mb-1 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.24em] text-slate-100/58 md:mb-1.5 md:text-[10px]">
                        <span>Island completion</span>
                        <span>{completion}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/35 md:h-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${completion}%` }}
                          className={`h-full rounded-full bg-gradient-to-r ${palette.progress} shadow-[0_0_18px_rgba(255,255,255,0.2)]`}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 md:mt-6 md:flex-row md:items-center md:justify-between md:gap-3">
                      <button
                        onClick={() => isUnlocked && onSelectIsland(island)}
                        disabled={!isUnlocked}
                        className={`group inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] px-5 py-3 text-sm font-black text-slate-950 transition-all md:w-auto md:min-w-[14rem] md:gap-3 md:rounded-[1.8rem] md:px-7 md:py-4 md:text-lg ${
                          isUnlocked
                            ? `bg-gradient-to-r ${palette.button} shadow-[0_14px_30px_rgba(2,6,23,0.24)] hover:-translate-y-0.5`
                            : 'cursor-not-allowed border border-white/10 bg-white/10 text-white/50 shadow-none'
                        }`}
                      >
                        {isUnlocked ? <AssetIcon name="play" className="h-4 w-4 md:h-5 md:w-5" /> : <AssetIcon name="plusSquare" className="h-4 w-4 md:h-5 md:w-5" />}
                        {isUnlocked ? 'Open island path' : 'Island locked'}
                      </button>

                      <div className="casual-ribbon-chip hidden items-center justify-center gap-2 rounded-full px-3 py-2 text-[10px] font-black text-white/85 md:inline-flex md:justify-start md:px-4 md:py-2.5 md:text-sm">
                        <AssetIcon name="star" className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Best rewards persist between runs
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-2.5 md:flex md:bottom-8 md:gap-3">
        <button
          onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className={`pointer-events-auto casual-panel-surface rounded-full p-3 text-white shadow-[0_18px_40px_rgba(2,6,23,0.3)] transition-all md:p-4 ${activeIndex === 0 ? 'opacity-35' : 'hover:-translate-y-0.5'}`}
          aria-label="Previous island"
        >
          <AssetIcon name="back" className="h-6 w-6 md:h-7 md:w-7" />
        </button>

        <div className="pointer-events-auto casual-tab-shell rounded-full border border-white/12 px-3 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.26)] md:px-4">
          <div className="flex items-center gap-2">
            {islandProgress.map((item, index) => (
              <button
                key={item.island.id}
                onClick={() => scrollTo(index)}
                className={`h-3 rounded-full transition-all ${index === activeIndex ? 'w-10 bg-white shadow-[0_0_18px_rgba(255,255,255,0.42)]' : 'w-3 bg-white/38 hover:bg-white/60'}`}
                aria-label={`Go to island ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => scrollTo(Math.min(ISLANDS.length - 1, activeIndex + 1))}
          disabled={activeIndex === ISLANDS.length - 1}
          className={`pointer-events-auto casual-panel-surface rounded-full p-3 text-white shadow-[0_18px_40px_rgba(2,6,23,0.3)] transition-all md:p-4 ${activeIndex === ISLANDS.length - 1 ? 'opacity-35' : 'hover:-translate-y-0.5'}`}
          aria-label="Next island"
        >
          <AssetIcon name="next" className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>
    </div>
  );
};

export default WorldMap;
