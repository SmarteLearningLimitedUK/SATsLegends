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
    <div className="relative w-full h-full flex flex-col bg-[#07111f] overflow-hidden font-sans">
      <div className="absolute inset-0 bg-center bg-cover opacity-30" style={{ backgroundImage: `url(${forestBg})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,58,138,0.35)_0%,rgba(7,17,31,0.84)_42%,rgba(3,7,18,0.98)_100%)]" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${(i % 4) + 2}px`,
              height: `${(i % 4) + 2}px`,
              top: `${(i * 13) % 100}%`,
              left: `${(i * 17) % 100}%`,
            }}
            animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.5, 1] }}
            transition={{ duration: 2.5 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}

        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`nebula-${i}`}
            animate={{ x: [0, i % 2 === 0 ? 25 : -25, 0], y: [0, -20, 0] }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full blur-3xl"
            style={{
              width: `${180 + i * 50}px`,
              height: `${180 + i * 50}px`,
              top: `${8 + i * 15}%`,
              left: `${i * 18}%`,
              background: i % 2 === 0 ? 'rgba(56,189,248,0.14)' : 'rgba(168,85,247,0.12)',
            }}
          />
        ))}
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 md:px-8 md:pt-6 pointer-events-none">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="pointer-events-auto flex w-full md:w-auto items-center gap-3 md:gap-4 rounded-[1.5rem] md:rounded-[2rem] border border-white/15 bg-white/10 px-3 py-3 md:px-4 md:py-4 backdrop-blur-2xl shadow-2xl">
              <div className="relative flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-xl md:rounded-[1.5rem] border border-white/20 bg-gradient-to-b from-white/25 to-white/5 text-3xl md:text-4xl shadow-[0_15px_40px_rgba(0,0,0,0.35)] shrink-0">
                {avatar?.image || '🌟'}
                <div className="absolute -bottom-2 -right-2 flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl border-2 border-white bg-yellow-400 text-[10px] md:text-xs font-black text-yellow-950 shadow-lg">
                  {player.level}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] md:text-xs font-black uppercase tracking-[0.35em] text-white/60 truncate">Adventure profile</div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-white truncate">{player.playerName || 'Explorer'}</h1>
                <div className="mt-1 md:mt-2 h-2.5 md:h-3 w-full md:w-60 overflow-hidden rounded-full border border-white/10 bg-black/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(player.xp % 1000) / 10}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500"
                  />
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/60">
                  XP {player.xp % 1000} / 1000
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex w-full md:w-auto gap-2 md:gap-3">
              {[
                { icon: 'coin', value: player.coins, label: 'Coins' },
                { icon: 'gem', value: player.gems, label: 'Gems' },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex-1 md:flex-none rounded-xl md:rounded-[1.5rem] border border-white/15 bg-white/10 px-3 py-2 md:px-5 md:py-3 text-white backdrop-blur-xl shadow-xl flex flex-col items-center md:items-start"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-base md:text-xl font-black">
                    <AssetIcon name={item.icon as any} className="h-4 w-4 md:h-6 md:w-6 shrink-0" />
                    <span>{item.value}</span>
                  </div>
                  <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-white/55 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-auto grid grid-cols-3 gap-2 md:gap-3 md:max-w-3xl">
            {[
              { label: 'Stars won', value: totalStars, icon: 'star' },
              { label: 'Levels cleared', value: totalCompletedLevels, icon: 'play' },
              { label: 'Islands open', value: `${unlockedCount}/${ISLANDS.length}`, icon: 'trophy' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 md:rounded-[1.5rem] md:px-4 md:py-3 backdrop-blur-xl shadow-lg flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-1.5 md:gap-2 text-white">
                  <AssetIcon name={item.icon as any} className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm font-black md:text-2xl">{item.value}</span>
                </div>
                <div className="mt-0.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-white/55 leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="absolute bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 pointer-events-auto">
        <button
          onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
          className={`rounded-full border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-white/20 ${activeIndex === 0 ? 'opacity-40' : ''}`}
          aria-label="Previous island"
        >
          <AssetIcon name="back" className="h-7 w-7" />
        </button>
        <div className="rounded-full border border-white/15 bg-black/25 px-4 py-2 backdrop-blur-xl">
          <div className="flex gap-2">
            {islandProgress.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`h-3 rounded-full transition-all ${index === activeIndex ? 'w-10 bg-white' : 'w-3 bg-white/35 hover:bg-white/55'}`}
                aria-label={`Go to island ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => scrollTo(Math.min(ISLANDS.length - 1, activeIndex + 1))}
          className={`rounded-full border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-white/20 ${activeIndex === ISLANDS.length - 1 ? 'opacity-40' : ''}`}
          aria-label="Next island"
        >
          <AssetIcon name="next" className="h-7 w-7" />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex h-full w-full flex-1 snap-x snap-mandatory overflow-x-auto hide-scrollbar"
      >
        {islandProgress.map(({ island, isUnlocked, completedCount, earnedStars, maxStars, completion }, index) => {
          const isActive = index === activeIndex;
          const nextLevelLabel = completedCount >= island.levels.length ? 'Boss cleared' : `Next stage ${Math.min(completedCount + 1, island.levels.length)}`;

          return (
            <section
              key={island.id}
              className="relative flex h-full min-w-[100vw] snap-center items-center justify-center overflow-hidden px-4 pb-20 pt-24 min-h-0 md:pb-24 md:pt-48 lg:px-12"
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${island.bgGradient || 'from-sky-600 to-slate-900'} opacity-70`} />
              <div className="absolute inset-x-0 bottom-0 h-40 md:h-56 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

              <motion.div
                animate={isActive ? { y: [0, -10, 0] } : { y: 0 }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between shrink-0"
              >
                <div className="relative w-full max-w-[540px]">
                  <div className="absolute inset-x-10 -bottom-8 h-10 rounded-full bg-black/40 blur-2xl md:h-14 md:-bottom-12" />

                  <div className="relative mx-auto h-[120px] w-[180px] sm:h-[200px] sm:w-[280px] md:h-[300px] md:w-[460px]">
                    <div className={`absolute inset-x-0 top-10 h-[48%] rounded-[100%] ${island.groundColor || 'bg-green-500'} border-b-4 border-black/20 shadow-[inset_0_18px_30px_rgba(255,255,255,0.16),0_18px_40px_rgba(0,0,0,0.32)] md:border-b-[14px]`} />
                    <div className="absolute left-1/2 top-[42%] h-[48%] w-[86%] -translate-x-1/2 rounded-b-[100%] bg-stone-800 shadow-[inset_0_-16px_40px_rgba(0,0,0,0.45)] md:shadow-[inset_0_-24px_40px_rgba(0,0,0,0.45)]" />

                    {Array.from({ length: 5 }).map((_, particleIndex) => (
                      <motion.div
                        key={particleIndex}
                        animate={isActive ? { y: [0, -18, 0], opacity: [0.25, 0.7, 0.25] } : { opacity: 0.2 }}
                        transition={{ duration: 3 + particleIndex, repeat: Infinity, delay: particleIndex * 0.35 }}
                        className="absolute rounded-full bg-white/60 blur-sm"
                        style={{
                          width: `${10 + particleIndex * 3}px`,
                          height: `${10 + particleIndex * 3}px`,
                          left: `${14 + particleIndex * 18}%`,
                          top: `${20 + (particleIndex % 3) * 14}%`,
                        }}
                      />
                    ))}

                    <div className="absolute inset-0 z-10">
                      {island.decorations?.map((decoration, decorationIndex) => (
                        <motion.div
                          key={decorationIndex}
                          animate={isActive ? { y: [0, -6, 0], rotate: [0, 4, -4, 0] } : { y: 0 }}
                          transition={{ duration: 4 + decorationIndex, repeat: Infinity, delay: decorationIndex * 0.2 }}
                          className="absolute text-3xl drop-shadow-xl md:text-6xl"
                          style={{
                            left: `${12 + decorationIndex * 18}%`,
                            top: `${18 + (decorationIndex % 2) * 10}%`,
                          }}
                        >
                          {decoration}
                        </motion.div>
                      ))}
                    </div>

                    <div className="absolute left-1/2 top-[10%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 backdrop-blur-xl md:py-2 md:px-4 hidden md:flex">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 md:text-xs">Island {island.id}</span>
                    </div>
                  </div>
                </div>

                <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/15 bg-black/25 p-4 text-white shadow-[0_15px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8 md:rounded-[2.5rem] shrink-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-4 md:gap-3">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-white/70 md:px-4 md:py-2 md:text-[10px]">
                      {island.category}
                    </span>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-100 md:px-4 md:py-2 md:text-[10px]">
                      {isUnlocked ? nextLevelLabel : 'Complete previous boss'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-6xl">{island.themeName || island.name}</h2>
                  <p className="mt-1 text-[11px] leading-snug text-white/70 md:mt-3 md:text-lg hidden sm:block">
                    {island.name} training zone with {island.levels.length} playable stages, animated progression, and a boss gate at the end.
                  </p>

                  <div className="mt-3 grid gap-2 grid-cols-3 md:mt-6 md:gap-4">
                    <div className="rounded-[1rem] md:rounded-[1.75rem] border border-white/10 bg-white/8 p-2.5 md:p-4">
                      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/55">Progress</div>
                      <div className="mt-0.5 text-sm md:text-2xl font-black">{completedCount} / {island.levels.length}</div>
                    </div>
                    <div className="rounded-[1rem] md:rounded-[1.75rem] border border-white/10 bg-white/8 p-2.5 md:p-4">
                      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/55">Stars</div>
                      <div className="mt-0.5 text-sm md:text-2xl font-black">{earnedStars} / {maxStars}</div>
                    </div>
                    <div className="rounded-[1rem] md:rounded-[1.75rem] border border-white/10 bg-white/8 p-2.5 md:p-4">
                      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/55">Status</div>
                      <div className="mt-0.5 text-sm md:text-2xl font-black">{isUnlocked ? `${completion}%` : 'Locked'}</div>
                    </div>
                  </div>

                  <div className="mt-3 md:mt-6 hidden sm:block">
                    <div className="mb-1.5 flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-white/55">
                      <span>Island completion</span>
                      <span>{completion}%</span>
                    </div>
                    <div className="h-2 md:h-4 overflow-hidden rounded-full border border-white/10 bg-black/35">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completion}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-7 md:gap-4">
                    <button
                      onClick={() => isUnlocked && onSelectIsland(island)}
                      disabled={!isUnlocked}
                      className={`group inline-flex w-full sm:w-auto items-center justify-center gap-2 md:gap-3 rounded-[1.25rem] md:rounded-[1.75rem] px-5 py-3.5 md:px-7 md:py-5 text-sm md:text-xl font-black shadow-xl transition-all ${isUnlocked
                        ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_0_#047857] md:shadow-[0_10px_0_#047857] hover:translate-y-1 hover:shadow-none md:hover:shadow-[0_5px_0_#047857]'
                        : 'cursor-not-allowed bg-white/10 text-white/50 shadow-none'
                        }`}
                    >
                      {isUnlocked ? <AssetIcon name="play" className="h-4 w-4 md:h-6 md:w-6" /> : <AssetIcon name="plusSquare" className="h-4 w-4 md:h-6 md:w-6" />}
                      {isUnlocked ? 'Open island path' : 'Island locked'}
                    </button>
                    <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] md:px-4 md:py-3 md:text-sm font-black text-white/75">
                      <AssetIcon name="star" className="h-3 w-3 md:h-4 md:w-4" />
                      Best rewards persist
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>
          );
        })}
      </div>
    </div >
  );
};

export default WorldMap;
