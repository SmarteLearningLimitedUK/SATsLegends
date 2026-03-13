import React, { Component, ReactNode, ErrorInfo } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData, LevelData } from '../types';
import AssetIcon from './AssetIcon';

interface IslandLevelsProps {
  island: IslandData;
  player: PlayerData;
  onBack: () => void;
  onSelectLevel: (level: LevelData) => void;
}

const GAME_TYPE_LABELS: Record<NonNullable<LevelData['gameType']>, string> = {
  quiz: 'Quiz',
  potion_pour: 'Potion Pour',
  burger_bar: 'Burger Bar',
  cloud_collapse: 'Cloud Collapse',
  sequence_sprint: 'Sequence Sprint',
  logic_sort: 'Logic Sort',
  shape_shift: 'Shape Shift',
  matrix_match: 'Matrix Match',
  burger_builder: 'Burger Bar',
  fraction_match: 'Crystal Match',
  prime_pop: 'Prime Pop',
  angle_arena: 'Angle Arena',
  polygon_palace: 'Polygon Palace',
  data_dungeon: 'Data Dungeon',
  monster_market: 'Monster Market',
  tower_of_factors: 'Tower Of Factors',
  measurement_forge: 'Measurement Forge',
  timekeeper_temple: 'Timekeeper Temple',
  ratio_rapids: 'Ratio Rapids',
  place_value_peaks: 'Place Value Peaks',
  calculation_clash: 'Calculation Clash',
  percent_pulse: 'Percent Pulse',
  coordinate_quest: 'Coordinate Quest',
  transform_temple: 'Transform Temple',
  scale_safari: 'Scale Safari',
  chart_chase: 'Chart Chase',
  mean_machine: 'Mean Machine',
  equation_grove: 'Equation Grove',
  rule_runner: 'Rule Runner',
};

const getGameLabel = (level: LevelData) => {
  if (!level.gameType) return `Level ${level.id}`;
  return GAME_TYPE_LABELS[level.gameType] || level.gameType.replace(/_/g, ' ');
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  public state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  public props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("IslandLevels Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-white z-[9999] absolute inset-0">
          <h1 className="text-4xl text-red-500 font-bold mb-4">Map Crash</h1>
          <p className="text-xl font-mono bg-black p-4 rounded-xl">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const IslandLevelsContent: React.FC<IslandLevelsProps> = ({ island, player, onBack, onSelectLevel }) => {
  const NODE_POSITIONS = [
    { top: '80%', left: '25%' },
    { top: '65%', left: '70%' },
    { top: '45%', left: '35%' },
    { top: '25%', left: '75%' },
    { top: '8%', left: '50%' },
  ];

  const completedLevels = player.completedLevels[island.id] || [];
  const earnedStars = island.levels.reduce((sum, level) => {
    const key = `${island.id}-${level.id}`;
    return sum + (player.levelStars?.[key] || 0);
  }, 0);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden md:overflow-hidden touch-pan-y">
        <div className="relative w-full h-[150vh] md:h-full md:w-auto md:aspect-[3/4] md:mx-auto">
          {island.mapImage ? (
            <img
              src={island.mapImage}
              alt={`${island.themeName} Map`}
              className="absolute w-full h-full object-cover md:object-contain object-top"
              draggable={false}
            />
          ) : (
            <div className={`absolute w-full h-full bg-gradient-to-b ${island.bgGradient || 'from-sky-400 to-sky-200'} `} />
          )}

          {island.levels.map((level, index) => {
            const isUnlocked = true;
            const stars = player.levelStars?.[`${island.id}-${level.id}`] || 0;
            const isCompleted = completedLevels.includes(level.id);
            const gameLabel = getGameLabel(level);

            const pos = NODE_POSITIONS[index] || { top: '50%', left: '50%' };

            return (
              <motion.div
                key={level.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.15, type: 'spring', stiffness: 150, damping: 15 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ top: pos.top, left: pos.left, zIndex: 10 + index }}
              >
                <button
                  onClick={() => isUnlocked && onSelectLevel(level)}
                  disabled={!isUnlocked}
                  className={`group relative flex flex-col items-center justify-center transition-all ${isUnlocked ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-80'}`}
                >
                  <div className={`relative flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full border-[3px] shadow-2xl bg-center bg-cover ${level.isBoss
                    ? 'border-yellow-400 bg-red-600 shadow-[0_4px_15px_rgba(220,38,38,0.5)]'
                    : isCompleted ? 'border-amber-700 bg-amber-500' : isUnlocked ? 'border-amber-800 bg-amber-400' : 'border-slate-800 bg-slate-600'
                    }`}>

                    <div className="absolute inset-1 rounded-full border border-white/20 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                    {level.isBoss ? (
                      <AssetIcon name="trophy" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md text-yellow-100" />
                    ) : !isUnlocked ? (
                      <span className="text-xl md:text-3xl text-slate-800 font-bold opacity-50">🔒</span>
                    ) : (
                      <span className="text-2xl md:text-4xl font-black text-amber-950 drop-shadow-sm">{level.id}</span>
                    )}

                    {isCompleted && !level.isBoss && (
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-amber-700 shadow-md">
                        <AssetIcon name="check" className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {isUnlocked && !level.isBoss && (
                    <div className="casual-ribbon-chip absolute top-full mt-1 flex gap-0.5 rounded-full px-2 py-0.5">
                      {[1, 2, 3].map(value => (
                        <AssetIcon
                          key={value as any}
                          name={value <= stars ? 'star' : 'starOutline'}
                          className={`w-3 h-3 md:w-4 md:h-4 drop-shadow-md ${value <= stars ? 'text-yellow-400' : 'text-white/40'}`}
                        />
                      ))}
                    </div>
                  )}

                  {level.isBoss && isUnlocked && (
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} className="casual-ribbon-chip absolute -top-8 rounded-lg px-2 py-1">
                      <span className="text-[10px] md:text-xs font-black text-yellow-400 tracking-wider">BOSS</span>
                    </motion.div>
                  )}

                  <div className="absolute top-full mt-6 flex w-24 justify-center md:w-32">
                    <div className="rounded-[0.95rem] border border-white/15 bg-slate-950/70 px-2 py-1 text-center shadow-[0_10px_24px_rgba(2,6,23,0.28)] backdrop-blur-md">
                      <span className="block text-[9px] font-black uppercase leading-[1.15] tracking-[0.08em] text-white/95 md:text-[10px]">
                        {gameLabel}
                      </span>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
        <div className="flex justify-between items-start w-full max-w-6xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="pointer-events-auto casual-panel-surface rounded-full p-3 text-white shadow-xl md:p-4"
          >
            <AssetIcon name="back" className="h-6 w-6 md:h-8 md:w-8" />
          </motion.button>

          <div className="pointer-events-auto casual-tab-shell flex items-center gap-2 rounded-full p-2 shadow-xl md:p-3">
            <div className="casual-ribbon-chip flex items-center gap-1.5 rounded-full px-3 py-1">
              <AssetIcon name="star" className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
              <span className="text-sm md:text-base font-black text-white">{earnedStars}</span>
            </div>
            <div className="casual-ribbon-chip hidden items-center gap-1.5 rounded-full px-3 py-1 md:flex">
              <span className="text-[10px] uppercase font-black tracking-widest text-white/70">Progress</span>
              <span className="text-sm font-black text-white ml-1">{completedLevels.length}/{island.levels.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="absolute bottom-6 left-6 right-6 z-50 pointer-events-none hidden md:flex justify-center">
        <div className="casual-panel-strong flex items-center gap-6 rounded-3xl p-4 shadow-2xl">
          <div>
            <div className="text-[10px] font-black uppercase text-amber-400 tracking-widest">{island.category} Island</div>
            <h1 className="text-2xl font-black text-white drop-shadow-md">{island.themeName || island.name}</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

const IslandLevels: React.FC<IslandLevelsProps> = (props) => (
  <ErrorBoundary>
    <IslandLevelsContent {...props} />
  </ErrorBoundary>
);

export default IslandLevels;
