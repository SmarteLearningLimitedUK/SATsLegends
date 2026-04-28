import { useState } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

type Screen = 'lobby' | 'missions' | 'champions' | 'equipment' | 'game' | 'shop' | 'battlepass' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('lobby');
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="size-full bg-gradient-to-b from-[#1a2e5c] to-[#0d1b3a] flex items-center justify-center">
      {/* Portrait iOS Container */}
      <div className="w-full h-full max-w-[430px] relative overflow-hidden flex flex-col">
        {/* Conditional Screen Rendering */}
        {currentScreen === 'game' ? (
          <GameScreen
            onPause={() => setShowPause(true)}
            onResult={() => setShowResult(true)}
          />
        ) : (
          <>
            {/* Top Resource Bar */}
            <div className="h-14 flex items-center justify-between px-3 z-20 bg-blue-900/50">
              {currentScreen !== 'shop' && currentScreen !== 'battlepass' && currentScreen !== 'settings' ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 rounded-lg px-2 py-1 flex items-center gap-1.5">
                      <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-white text-xs">5</div>
                      <div className="text-white text-xs">
                        <div>Jon</div>
                        <div className="text-[10px]">132/500</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ResourceDisplay icon="⚡" value="5/15" />
                    <ResourceDisplay icon="🪙" value="54000" />
                    <ResourceDisplay icon="💎" value="420" />
                  </div>

                  <button
                    onClick={() => setCurrentScreen('settings')}
                    className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center"
                  >
                    <div className="text-white text-lg">☰</div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentScreen('lobby')}
                    className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white"
                  >←</button>
                  <h1 className="text-white text-xl flex-1 text-center">
                    {currentScreen === 'shop' && 'Shop'}
                    {currentScreen === 'battlepass' && 'Season 2'}
                    {currentScreen === 'settings' && 'Settings'}
                  </h1>
                  <div className="w-10" />
                </>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
              {currentScreen === 'lobby' && <LobbyScreen onShowDailyBonus={() => setShowDailyBonus(true)} onPlay={() => setCurrentScreen('game')} />}
              {currentScreen === 'missions' && <MissionsScreen />}
              {currentScreen === 'champions' && <ChampionsScreen />}
              {currentScreen === 'equipment' && <EquipmentScreen />}
              {currentScreen === 'shop' && <ShopScreen />}
              {currentScreen === 'battlepass' && <BattlePassScreen />}
              {currentScreen === 'settings' && <SettingsScreen />}
            </div>

            {/* Bottom Navigation */}
            <div className="h-20 bg-gradient-to-t from-[#0a1428] to-transparent flex items-end justify-around px-2 pb-2 z-20">
              <NavButton icon="🏪" label="SHOP" onClick={() => setCurrentScreen('shop')} />
              <NavButton icon="📦" label="INVENTORY" onClick={() => setCurrentScreen('equipment')} />
              <NavButton icon="🛡️" label="CLAN" onClick={() => {}} />
              <NavButton icon="🗺️" label="STAGE" onClick={() => setCurrentScreen('missions')} />
              <button
                onClick={() => setCurrentScreen('game')}
                className="bg-gradient-to-b from-yellow-400 to-yellow-600 px-6 py-2 rounded-xl flex items-center gap-1.5 hover:scale-105 transition-transform shadow-lg"
              >
                <span className="text-2xl">⚔️</span>
                <span className="text-white text-lg">PLAY</span>
              </button>
            </div>

            {/* Right Side Menu */}
            <div className="absolute top-16 right-2 flex flex-col gap-2 z-10">
              <IconButton icon="💬" />
              <IconButton icon="🏆" label="Quest" />
              <IconButton icon="🎖️" label="Ranking" onClick={() => setCurrentScreen('champions')} />
              <IconButton icon="📧" label="Inbox" />
            </div>
          </>
        )}

        {/* Modals and Overlays */}
        {showDailyBonus && <DailyBonusModal onClose={() => setShowDailyBonus(false)} />}
        {showPause && <PauseModal onClose={() => setShowPause(false)} onQuit={() => { setShowPause(false); setCurrentScreen('lobby'); }} />}
        {showResult && <ResultModal onClose={() => { setShowResult(false); setCurrentScreen('lobby'); }} />}
      </div>
    </div>
  );
}

function ResourceDisplay({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="bg-blue-800/80 rounded-lg px-1.5 py-0.5 flex items-center gap-1">
      <span className="text-sm">{icon}</span>
      <span className="text-white text-xs">{value}</span>
      <button className="w-4 h-4 bg-green-600 rounded text-white text-[10px] flex items-center justify-center">+</button>
    </div>
  );
}

function NavButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform">
      <div className="w-11 h-11 bg-blue-700 rounded-xl flex items-center justify-center text-xl border-2 border-blue-500">
        {icon}
      </div>
      <span className="text-white text-[10px]">{label}</span>
    </button>
  );
}

function IconButton({ icon, label, onClick }: { icon: string; label?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform">
      <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-lg border-2 border-blue-500">
        {icon}
      </div>
      {label && <span className="text-white text-[9px]">{label}</span>}
    </button>
  );
}

function LobbyScreen({ onShowDailyBonus, onPlay }: { onShowDailyBonus: () => void; onPlay: () => void }) {
  return (
    <div className="h-full relative">
      {/* Background Scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-blue-950/80">
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-green-900/30 to-transparent" />
      </div>

      {/* Special Chest */}
      <div className="absolute top-4 left-4">
        <div className="relative" onClick={onShowDailyBonus}>
          <div className="w-16 h-16 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg transform hover:scale-110 transition-transform cursor-pointer border-4 border-yellow-300">
            🏆
          </div>
          <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">2x</div>
          <div className="text-white text-xs mt-1 text-center">SPECIAL</div>
          <div className="text-yellow-400 text-[10px] text-center">11h 32m</div>
        </div>
      </div>

      {/* Character */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="w-48 h-48 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-8xl shadow-2xl border-8 border-orange-300">
          🦝
        </div>
        <div className="mt-3 bg-blue-800/90 px-4 py-1.5 rounded-xl flex items-center gap-2">
          <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-white text-xs">9</div>
          <div className="h-3 bg-blue-900 rounded-full w-24 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: '8%' }} />
          </div>
          <span className="text-white text-xs">5/60</span>
          <span className="text-yellow-400 text-sm">🏆37</span>
        </div>
      </div>
    </div>
  );
}

function MissionsScreen() {
  const [activeTab, setActiveTab] = useState<'daily' | 'campaign' | 'challenge'>('daily');

  const dailyMissions = [
    { icon: '👑', title: 'Rule the Top', desc: 'Reach the top rank 3 times', reward: { type: 'coin', amount: 500 }, progress: null, canClaim: true },
    { icon: '📚', title: 'Knowledge Seeker', desc: 'Complete 5 lessons', reward: { type: 'gem', amount: 5 }, progress: { current: 3, max: 5 }, canClaim: false },
    { icon: '🏆', title: 'Claim Victory', desc: 'Win 4 matches', reward: { type: 'coin', amount: 500 }, progress: null, canClaim: true },
    { icon: '⚡', title: 'Power Up', desc: 'Recharge energy 5 times', reward: { type: 'energy', amount: 2 }, progress: { current: 2, max: 5 }, canClaim: false },
  ];

  return (
    <div className="h-full p-3">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <TabButton label="Daily" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
        <TabButton label="Campaign" active={activeTab === 'campaign'} onClick={() => setActiveTab('campaign')} />
        <TabButton label="Challenge" active={activeTab === 'challenge'} onClick={() => setActiveTab('challenge')} />
      </div>

      {/* Mission List */}
      <div className="space-y-2 mb-4">
        {dailyMissions.map((mission, i) => (
          <div key={i} className="bg-blue-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{mission.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-sm">{mission.title}</h3>
              <p className="text-blue-300 text-xs truncate">{mission.desc}</p>
              {mission.progress && (
                <div className="mt-1 bg-blue-900 rounded-full h-4 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: `${(mission.progress.current / mission.progress.max) * 100}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">{mission.progress.current}/{mission.progress.max}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="text-center">
                <div className="text-xl">{mission.reward.type === 'coin' ? '🪙' : mission.reward.type === 'gem' ? '💎' : mission.reward.type === 'energy' ? '⚡' : '🔑'}</div>
                <div className="text-white text-xs">{mission.reward.amount}</div>
              </div>
              <button className={`px-3 py-1.5 rounded-lg text-white text-xs ${mission.canClaim ? 'bg-gradient-to-b from-green-400 to-green-600' : 'bg-gray-600 opacity-50'}`}>
                Claim
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Mission Rewards Panel */}
      <div className="bg-blue-900/80 rounded-xl p-4">
        <h2 className="text-white text-base mb-2 text-center">DAILY MISSION REWARDS</h2>
        <p className="text-blue-300 text-xs text-center mb-3">Complete All Daily Mission</p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <RewardItem icon="🛡️" amount="3" />
          <RewardItem icon="🪙" amount="800" />
          <RewardItem icon="⚡" amount="+1" />
          <RewardItem icon="💎" amount="6" />
          <RewardItem icon="📦" amount="1" />
        </div>

        <div className="text-yellow-400 text-xs text-center mb-2">Resets in 11h 32m</div>
        <button className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 py-2 rounded-xl text-white text-sm">
          Claim
        </button>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-t-lg transition-colors text-sm ${active ? 'bg-blue-700 text-white border-b-2 border-cyan-400' : 'bg-blue-900/50 text-blue-400'}`}
    >
      {label}
    </button>
  );
}

function RewardItem({ icon, amount }: { icon: string; amount: string }) {
  return (
    <div className="bg-blue-800 rounded-lg p-2 flex flex-col items-center">
      <div className="text-2xl mb-0.5">{icon}</div>
      <div className="text-white text-xs">{amount}</div>
    </div>
  );
}

function ChampionsScreen() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'attack' | 'defense' | 'support'>('all');
  const [selectedChampion, setSelectedChampion] = useState<number>(1);

  const champions = [
    { id: 0, name: 'Lumi', level: 23, maxLevel: 60, stars: 2, emoji: '🦌', type: 'attack', attack: 120, defense: 35, health: 20 },
    { id: 1, name: 'Mochi', level: 25, maxLevel: 60, stars: 3, emoji: '🦝', type: 'attack', isMax: false, attack: 155, defense: 40, health: 25 },
    { id: 2, name: 'Porko', level: 30, maxLevel: 30, stars: 5, emoji: '🐷', type: 'defense', isMax: true, attack: 100, defense: 80, health: 50 },
    { id: 3, name: 'Fluffy', level: 15, maxLevel: 60, stars: 1, emoji: '🐶', type: 'support', attack: 90, defense: 30, health: 15 },
    { id: 4, name: 'Whiskers', level: 19, maxLevel: 60, stars: 2, emoji: '🐱', type: 'defense', attack: 85, defense: 60, health: 30 },
    { id: 5, name: 'Foxy', level: 21, maxLevel: 60, stars: 3, emoji: '🦊', type: 'attack', attack: 140, defense: 38, health: 22 },
  ];

  const selected = champions[selectedChampion];

  return (
    <div className="h-full p-3">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        <FilterButton label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
        <FilterButton label="Attack" active={activeFilter === 'attack'} onClick={() => setActiveFilter('attack')} />
        <FilterButton label="Defense" active={activeFilter === 'defense'} onClick={() => setActiveFilter('defense')} />
        <FilterButton label="Support" active={activeFilter === 'support'} onClick={() => setActiveFilter('support')} />
      </div>

      {/* Champions Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {champions.map((champ) => (
          <div
            key={champ.id}
            onClick={() => setSelectedChampion(champ.id)}
            className={`bg-gradient-to-b from-blue-600 to-blue-800 rounded-xl p-2 cursor-pointer hover:scale-105 transition-transform ${selectedChampion === champ.id ? 'ring-2 ring-yellow-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs">{champ.level}</div>
              <div className={`px-2 py-0.5 rounded-full text-[9px] text-white ${champ.isMax ? 'bg-yellow-500' : 'bg-green-500'}`}>
                {champ.isMax ? 'MAX' : `Lv.${champ.level + 1}`}
              </div>
            </div>
            <div className="w-full aspect-square bg-gradient-to-b from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-5xl mb-1">
              {champ.emoji}
            </div>
            <div className="text-white text-center text-xs mb-0.5">{champ.name}</div>
            <div className="flex justify-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-xs ${i < champ.stars ? 'text-yellow-400' : 'text-gray-600'}`}>⭐</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Champion Detail */}
      <div className="bg-blue-900/80 rounded-xl p-3 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2 w-full justify-between">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-sm">{selected.level}</div>
            <span className="text-white text-xs">Upgrade Lv.{selected.level + 1}</span>
          </div>
          <span className="text-yellow-400 text-sm">🏆37</span>
        </div>

        <div className="w-32 h-32 bg-gradient-to-b from-blue-700 to-blue-800 rounded-2xl flex items-center justify-center text-6xl mb-2 shadow-2xl">
          {selected.emoji}
        </div>

        <h2 className="text-white text-lg mb-1">{selected.name}</h2>
        <div className="flex gap-0.5 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-base ${i < selected.stars ? 'text-yellow-400' : 'text-gray-600'}`}>⭐</span>
          ))}
        </div>

        <div className="w-full space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚔️</span>
              <span className="text-white text-sm">ATTACK</span>
            </div>
            <span className="text-red-400 text-sm">{selected.attack}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="text-white text-sm">DEFENSE</span>
            </div>
            <span className="text-blue-400 text-sm">{selected.defense}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">❤️</span>
              <span className="text-white text-sm">HEALTH</span>
            </div>
            <span className="text-pink-400 text-sm">{selected.health}</span>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <button className="flex-1 bg-gradient-to-b from-green-400 to-green-600 py-2 rounded-xl text-white flex items-center justify-center gap-1 text-xs">
            <span className="text-lg">🪙</span>
            <span>Upgrade</span>
            <span>3000</span>
          </button>
          <button className="flex-1 bg-gradient-to-b from-yellow-400 to-yellow-600 py-2 rounded-xl text-white text-xs">
            Select
          </button>
        </div>

        {/* Locked Slots */}
        <div className="flex gap-2 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-12 h-12 bg-gray-700 rounded-lg flex flex-col items-center justify-center opacity-50">
              <span className="text-xl">🔒</span>
              <span className="text-white text-[9px]">Lv.{16 + i * 14}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg transition-colors text-xs ${active ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-400'}`}
    >
      {label}
    </button>
  );
}

function EquipmentScreen() {
  const items = [
    '⚔️', '🛡️', '📘', '🔨', '💀', '🍖',
    '🎁', '🍂', '⚔️', '🔑', '🧪', '🧪',
    '🧪', '🧪', '🧪', '🧪', null, null,
  ];

  return (
    <div className="h-full p-3">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-3">
        <FilterButton label="All" active={true} onClick={() => {}} />
        <FilterButton label="⚔️" active={false} onClick={() => {}} />
        <FilterButton label="🛡️" active={false} onClick={() => {}} />
        <FilterButton label="👟" active={false} onClick={() => {}} />
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-2xl ${item ? 'bg-blue-800 border-blue-500 hover:scale-110 cursor-pointer transition-transform' : 'bg-blue-900/30 border-blue-800/50'}`}
          >
            {item || ''}
          </div>
        ))}
        <div className="aspect-square rounded-lg border-2 border-cyan-400 bg-blue-700 flex items-center justify-center text-2xl hover:scale-110 cursor-pointer transition-transform">
          +
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button className="bg-gradient-to-b from-green-400 to-green-600 px-4 py-2 rounded-lg text-white text-sm flex-1">
          Smart Equip
        </button>
        <button className="bg-blue-700 px-3 py-2 rounded-lg text-white text-lg">
          🗑️
        </button>
      </div>

      {/* Character Equipment Panel */}
      <div className="bg-blue-900/80 rounded-xl p-3 flex flex-col items-center">
        <div className="flex gap-0.5 mb-2">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-sm ${i < 3 ? 'text-yellow-400' : 'text-gray-600'}`}>⭐</span>
          ))}
        </div>

        <div className="relative mb-3">
          <div className="w-32 h-32 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-6xl shadow-2xl">
            🦝
          </div>

          {/* Equipment Slots */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-10 bg-blue-700 rounded-lg border-2 border-cyan-400 flex items-center justify-center text-lg">
            ⚔️
          </div>
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-10 h-10 bg-blue-800 rounded-lg border-2 border-blue-600 flex items-center justify-center text-base opacity-50">
            +
          </div>
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-10 h-10 bg-blue-800 rounded-lg border-2 border-blue-600 flex items-center justify-center text-base opacity-50">
            +
          </div>
        </div>

        <h2 className="text-white text-lg mb-2">Mochi</h2>

        <div className="w-full bg-blue-800 rounded-lg p-2 mb-2 flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-full flex items-center justify-center text-xs">9</div>
          <div className="flex-1">
            <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full" style={{ width: '8%' }} />
            </div>
          </div>
          <span className="text-white text-xs">5/60</span>
          <span className="text-yellow-400 text-xs">🏆37</span>
        </div>

        {/* Locked Equipment Slots */}
        <div className="flex gap-2">
          <div className="w-14 h-14 bg-gray-700 rounded-lg flex flex-col items-center justify-center opacity-50">
            <span className="text-lg">🔒</span>
            <span className="text-white text-[9px]">Lv.16</span>
          </div>
          <div className="w-14 h-14 bg-gray-700 rounded-lg flex flex-col items-center justify-center opacity-50">
            <span className="text-lg">🔒</span>
            <span className="text-white text-[9px]">Lv.30</span>
          </div>
          <div className="w-14 h-14 bg-gray-700 rounded-lg flex flex-col items-center justify-center opacity-50">
            <span className="text-lg">🔒</span>
            <span className="text-white text-[9px]">Lv.37</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyBonusModal({ onClose }: { onClose: () => void }) {
  const rewards = [
    { day: 1, icon: '🪙', amount: '500', claimed: true },
    { day: 2, icon: '🔑', amount: '1', claimed: true },
    { day: 3, icon: '💎', amount: '15', claimed: false },
    { day: 4, icon: '🪙', amount: '1000', claimed: false },
    { day: 5, icon: '⚡', amount: '5', claimed: false },
    { day: 6, icon: '💎', amount: '25', claimed: false },
    { day: 7, icon: '🏆', amount: '1 Chest', claimed: false, special: true },
  ];

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-3xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white text-xl hover:bg-orange-600">
          ✕
        </button>

        <div className="relative mb-6">
          <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-2xl py-3 px-6 text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-3xl drop-shadow-lg">⭐</span>
              ))}
            </div>
            <h2 className="text-white text-2xl drop-shadow-lg">DAILY BONUS</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {rewards.slice(0, 6).map((reward) => (
            <div
              key={reward.day}
              className={`rounded-xl p-3 flex flex-col items-center ${reward.claimed ? 'bg-blue-700' : 'bg-blue-600'}`}
            >
              <h3 className="text-white text-sm mb-2">Day {reward.day}</h3>
              <div className="text-4xl mb-2">{reward.icon}</div>
              <div className="text-white text-base mb-1">{reward.amount}</div>
              {reward.claimed && <div className="text-3xl text-yellow-400">✓</div>}
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-xl p-4 flex flex-col items-center">
          <h3 className="text-white text-base mb-2">Day 7</h3>
          <div className="text-5xl mb-2">🏆</div>
          <div className="text-white text-lg">1 Chest</div>
        </div>
      </div>
    </div>
  );
}

function GameScreen({ onPause, onResult }: { onPause: () => void; onResult: () => void }) {
  return (
    <div className="h-full flex flex-col">
      {/* Top HUD */}
      <div className="h-14 flex items-center justify-between px-3 bg-gradient-to-b from-black/50 to-transparent z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-xl">👤</div>
          <div>
            <div className="text-white text-xs">Jon</div>
            <div className="h-2 bg-blue-900 rounded-full w-24 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '70%' }} />
            </div>
            <div className="text-white text-[10px]">3508 🏆</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-white text-2xl">05:38</div>
          <div className="text-red-500 text-sm">0</div>
        </div>

        <div className="flex items-center gap-2">
          <ResourceDisplay icon="🪙" value="54000" />
          <ResourceDisplay icon="💎" value="420" />
          <button onClick={onPause} className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white">
            ⏸
          </button>
        </div>
      </div>

      {/* Play Field */}
      <div className="flex-1 relative bg-gradient-to-b from-blue-900 via-blue-800 to-green-900">
        {/* Background */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(180deg, rgba(30,60,100,0.8) 0%, rgba(20,80,60,0.8) 100%)',
        }}>
          {/* Trees */}
          <div className="absolute inset-0 flex justify-around items-end pb-32">
            <div className="text-6xl">🌲</div>
            <div className="text-6xl">🌲</div>
            <div className="text-6xl">🌲</div>
          </div>
        </div>

        {/* Battle Arena */}
        <div className="absolute bottom-20 left-0 right-0 h-48 flex items-center justify-around px-4">
          {/* Enemy Team */}
          <div className="flex flex-col gap-2">
            <Character emoji="🐷" health={90} isEnemy />
            <Character emoji="🦌" health={75} isEnemy />
          </div>

          {/* Player Team */}
          <div className="flex flex-col gap-2">
            <Character emoji="🦝" health={100} />
            <Character emoji="🐶" health={60} />
            <Character emoji="🐶" health={80} />
          </div>

          <Character emoji="🦝" health={50} isEnemy large />
        </div>

        {/* Test button for result */}
        <button
          onClick={onResult}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white px-4 py-2 rounded-lg text-xs opacity-50"
        >
          Win Battle
        </button>
      </div>

      {/* Bottom HUD */}
      <div className="h-24 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between px-4">
        {/* Joystick */}
        <div className="w-20 h-20 bg-gray-800/60 rounded-full flex items-center justify-center border-2 border-cyan-400/50">
          <div className="w-10 h-10 bg-cyan-400/80 rounded-full" />
        </div>

        {/* Abilities */}
        <div className="flex gap-3">
          <AbilityButton icon="🥩" count={1} />
          <AbilityButton icon="💣" count={3} />
          <AbilityButton icon="🧪" count={2} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <ActionButton icon="👊" />
            <ActionButton icon="❤️" />
          </div>
          <div className="flex gap-2">
            <ActionButton icon="⬆️" />
            <ActionButton icon="🤜" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Character({ emoji, health, isEnemy, large }: { emoji: string; health: number; isEnemy?: boolean; large?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 bg-gray-800 rounded-full h-1.5 mb-1 overflow-hidden">
        <div className={`h-full rounded-full ${isEnemy ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${health}%` }} />
      </div>
      <div className={`${large ? 'text-6xl' : 'text-4xl'}`}>{emoji}</div>
    </div>
  );
}

function AbilityButton({ icon, count }: { icon: string; count: number }) {
  return (
    <div className="relative">
      <button className="w-14 h-14 bg-blue-700/80 rounded-full flex items-center justify-center text-2xl border-2 border-blue-400">
        {icon}
      </button>
      <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center border border-white">
        <span className="text-white text-xs">{count}</span>
      </div>
    </div>
  );
}

function ActionButton({ icon }: { icon: string }) {
  return (
    <button className="w-12 h-12 bg-gray-700/80 rounded-full flex items-center justify-center text-xl border-2 border-gray-500">
      {icon}
    </button>
  );
}

function PauseModal({ onClose, onQuit }: { onClose: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-full max-w-sm px-4">
        <h1 className="text-white text-6xl text-center mb-8 drop-shadow-lg">PAUSE</h1>
        <div className="grid grid-cols-2 gap-4">
          <PauseButton icon="▶" label="Continue" color="blue" onClick={onClose} />
          <PauseButton icon="🔄" label="Restart" color="blue" onClick={onClose} />
          <PauseButton icon="⚙️" label="Setting" color="blue" onClick={() => {}} />
          <PauseButton icon="🚪" label="Quit" color="orange" onClick={onQuit} />
        </div>
      </div>
    </div>
  );
}

function PauseButton({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  const bgColor = color === 'orange' ? 'from-orange-500 to-orange-600' : 'from-blue-600 to-blue-700';
  return (
    <button onClick={onClick} className={`bg-gradient-to-b ${bgColor} rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform`}>
      <div className="text-4xl">{icon}</div>
      <div className="text-white text-lg">{label}</div>
    </button>
  );
}

function ResultModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-full max-w-sm px-4">
        {/* Stage Clear Banner */}
        <div className="relative mb-6">
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-2xl py-4 px-6 text-center relative shadow-2xl">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-5xl drop-shadow-lg">{i === 2 ? '⭐' : '🌟'}</span>
              ))}
            </div>
            <h2 className="text-white text-3xl drop-shadow-lg">STAGE CLEAR!</h2>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bg-blue-800/90 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-white">5</span>
          </div>
          <div className="flex-1">
            <div className="h-6 bg-blue-900 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full" style={{ width: '26%' }} />
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs">132/500</span>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-blue-900/90 rounded-xl p-4 mb-4">
          <h3 className="text-white text-center mb-3">REWARDS</h3>
          <div className="flex items-center justify-around">
            <RewardIcon icon="🛡️" amount="3" />
            <RewardIcon icon="🪙" amount="800" />
            <RewardIcon icon="⚡" amount="+1" />
            <RewardIcon icon="💎" amount="6" />
            <RewardIcon icon="🏆" amount="1" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button className="flex-1 bg-gradient-to-b from-green-400 to-green-600 py-3 rounded-xl text-white text-lg">
            Claim
          </button>
          <button onClick={onClose} className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl">
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardIcon({ icon, amount }: { icon: string; amount: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl mb-1">{icon}</div>
      <div className="text-white text-sm">{amount}</div>
    </div>
  );
}

function ShopScreen() {
  const [activeTab, setActiveTab] = useState<'daily' | 'regular' | 'gold'>('regular');

  const shopItems = [
    { name: 'Bomb', icon: '💣', price: 10, currency: 'gem' },
    { name: 'Potion', icon: '🧪', price: 10, currency: 'gem' },
    { name: 'Potion', icon: '🧪', price: 20, currency: 'gem-green' },
    { name: 'Battery', icon: '⚡', price: 35, currency: 'gem' },
    { name: 'Vile', icon: '🧪', price: 50, currency: 'gem' },
    { name: 'Vile', icon: '🧪', price: 55, currency: 'gem-green' },
  ];

  const coinPacks = [
    { amount: 1000, price: 20 },
    { amount: 50000, price: 150 },
  ];

  return (
    <div className="h-full p-4">
      {/* Special Offer */}
      <div className="bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-2xl p-4 mb-4 relative">
        <div className="absolute -top-2 left-4 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">2x Value</div>
        <div className="text-white text-sm mb-2">Resets in 11h 38m</div>
        <div className="text-white text-xl mb-1">SPECIAL</div>
        <div className="text-6xl mb-2 text-center">🏆</div>
        <div className="text-white text-center mb-2">Chest</div>
        <div className="bg-red-500 text-white text-lg px-4 py-2 rounded-xl text-center">$8.99</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-blue-800 rounded-xl p-1">
        <ShopTab label="Daily" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
        <ShopTab label="Regular" active={activeTab === 'regular'} onClick={() => setActiveTab('regular')} />
        <ShopTab label="Gold" active={activeTab === 'gold'} onClick={() => setActiveTab('gold')} />
      </div>

      {/* Items Grid */}
      {activeTab === 'regular' && (
        <div className="grid grid-cols-3 gap-3">
          {shopItems.map((item, i) => (
            <div key={i} className="bg-blue-700 rounded-xl p-3 flex flex-col items-center">
              <div className="text-white text-xs mb-2">{item.name}</div>
              <div className="text-4xl mb-2">{item.icon}</div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-lg">{item.currency === 'gem' ? '💎' : '💚'}</span>
                <span className="text-white text-sm">{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'gold' && (
        <div className="space-y-3">
          {coinPacks.map((pack, i) => (
            <div key={i} className="bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-5xl">🪙</div>
                <div className="text-white text-2xl">{pack.amount.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl">💎</div>
                <div className="text-white text-xl">{pack.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-blue-300'}`}
    >
      {label}
    </button>
  );
}

function BattlePassScreen() {
  const freeRewards = [
    { tier: 1, icon: '⚡', amount: 2, claimed: true },
    { tier: 2, icon: '🍂', amount: 2, claimed: true },
    { tier: 3, icon: '🪙', amount: 2000, claimed: false, canClaim: true },
    { tier: 4, icon: '🏆', amount: 1, claimed: false },
  ];

  const premiumRewards = [
    { tier: 1, icon: '🪙', amount: 15000, locked: true },
    { tier: 2, icon: '🔑', amount: 1, locked: true },
    { tier: 3, icon: '💎', amount: 20, locked: true },
    { tier: 4, icon: '🧪', amount: 5, locked: true },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Season Progress */}
      <div className="p-4 bg-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-sm">Season Ends In:</span>
          <span className="text-yellow-400">28d 10h</span>
        </div>
        <div className="h-6 bg-blue-900 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: '30%' }} />
          <span className="absolute inset-0 flex items-center justify-center text-white text-xs">3/10</span>
        </div>
      </div>

      {/* Pass Types */}
      <div className="flex">
        <div className="flex-1 bg-gradient-to-b from-yellow-400 to-yellow-500 p-4 flex items-center gap-3">
          <div className="text-4xl">🎫</div>
          <div className="text-white">Golden Pass</div>
        </div>
        <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-700 p-4 flex items-center gap-3">
          <div className="text-4xl">🎫</div>
          <div className="text-white">Free Pass</div>
        </div>
      </div>

      {/* Premium Track */}
      <div className="bg-gradient-to-b from-yellow-500 to-yellow-600 p-3">
        <div className="flex items-center gap-2 mb-2">
          {premiumRewards.map((reward, i) => (
            <div key={i} className="flex-1 bg-yellow-400 rounded-xl p-2 border-4 border-yellow-300 relative">
              <div className="text-xs text-white mb-1 text-center">{reward.tier}</div>
              <div className="text-3xl text-center mb-1">{reward.icon}</div>
              <div className="text-white text-xs text-center">{reward.amount}</div>
              {reward.locked && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="h-2 bg-yellow-600 rounded-full relative">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 flex justify-between w-full px-2">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${tier <= 2 ? 'bg-yellow-400 text-white' : 'bg-gray-600 text-gray-400'}`}>
                {tier}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Free Track */}
      <div className="bg-gradient-to-b from-purple-600 to-purple-700 p-3 flex-1">
        <div className="flex items-center gap-2">
          {freeRewards.map((reward, i) => (
            <div key={i} className="flex-1 bg-blue-600 rounded-xl p-2 border-4 border-blue-400 relative">
              <div className="text-xs text-white mb-1 text-center">{reward.tier}</div>
              <div className="text-3xl text-center mb-1">{reward.icon}</div>
              <div className="text-white text-xs text-center">{reward.amount}</div>
              {reward.claimed && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <span className="text-3xl text-yellow-400">✓</span>
                </div>
              )}
              {reward.canClaim && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Claim
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Claim Button */}
      <div className="p-4">
        <button className="w-full bg-gradient-to-b from-green-400 to-green-600 py-3 rounded-xl text-white text-lg">
          Claim
        </button>
      </div>
    </div>
  );
}

function SettingsScreen() {
  const [settings, setSettings] = useState({
    pushNotification: true,
    tips: true,
    vibration: false,
    music: 60,
    soundFx: 80,
  });

  return (
    <div className="h-full p-6 flex flex-col justify-center">
      <div className="space-y-6">
        {/* Push Notification */}
        <div className="flex items-center justify-between">
          <span className="text-white text-xl">Push notification</span>
          <ToggleSwitch
            enabled={settings.pushNotification}
            onChange={(val) => setSettings({ ...settings, pushNotification: val })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white text-xl">Tips</span>
          <div className="bg-yellow-400 w-12 h-12 rounded-xl flex items-center justify-center text-2xl">
            ✓
          </div>
        </div>

        {/* Vibration */}
        <div className="flex items-center justify-between">
          <span className="text-white text-xl">Vibration</span>
          <ToggleSwitch
            enabled={settings.vibration}
            onChange={(val) => setSettings({ ...settings, vibration: val })}
          />
        </div>

        {/* Music Slider */}
        <div className="flex items-center justify-between">
          <span className="text-white text-xl">Music</span>
          <div className="flex-1 mx-6">
            <input
              type="range"
              min="0"
              max="100"
              value={settings.music}
              onChange={(e) => setSettings({ ...settings, music: parseInt(e.target.value) })}
              className="w-full h-2 bg-blue-900 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${settings.music}%, #1e3a8a ${settings.music}%, #1e3a8a 100%)`,
              }}
            />
          </div>
        </div>

        {/* Sound FX Slider */}
        <div className="flex items-center justify-between">
          <span className="text-white text-xl">Sound Fx</span>
          <div className="flex-1 mx-6">
            <input
              type="range"
              min="0"
              max="100"
              value={settings.soundFx}
              onChange={(e) => setSettings({ ...settings, soundFx: parseInt(e.target.value) })}
              className="w-full h-2 bg-blue-900 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #eab308 0%, #eab308 ${settings.soundFx}%, #1e3a8a ${settings.soundFx}%, #1e3a8a 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-16 h-8 rounded-full relative transition-colors ${enabled ? 'bg-yellow-400' : 'bg-gray-600'}`}
    >
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${enabled ? 'translate-x-9' : 'translate-x-1'}`}
      />
    </button>
  );
}