import React, { useMemo, useState } from 'react';
import { PlayerData, ShopCategory } from '../types';
import AssetIcon from '../components/AssetIcon';
import { FramedPanel, PrimaryActionButton, SecondaryActionButton } from '../layout/ScreenPrimitives';
import { SHOP_CATALOG, SHOP_CATEGORIES } from '../systems/progression/shopCatalog';

interface CharacterShopProps {
  player: PlayerData;
  onBack: () => void;
  onUpdatePlayer: (updater: (prev: PlayerData) => PlayerData) => void;
}

const ensureShopState = (player: PlayerData) => ({
  ownedItemIds: player.shopState?.ownedItemIds ?? [],
  equippedByCategory: player.shopState?.equippedByCategory ?? {
    outfit: null,
    hat: null,
    accessory: null,
    handheld: null,
    trail: null,
    skin: null,
  },
});

const CharacterShop: React.FC<CharacterShopProps> = ({ player, onBack, onUpdatePlayer }) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory | 'all'>('all');
  const shopState = ensureShopState(player);
  const currencyBalance = player.coins;

  const items = useMemo(() => (
    activeCategory === 'all'
      ? SHOP_CATALOG
      : SHOP_CATALOG.filter(item => item.category === activeCategory)
  ), [activeCategory]);

  const handlePurchase = (itemId: string, price: number) => {
    onUpdatePlayer((prev) => {
      const nextShop = ensureShopState(prev);
      if (nextShop.ownedItemIds.includes(itemId)) return prev;
      if (prev.coins < price) return prev;
      return {
        ...prev,
        coins: prev.coins - price,
        shopState: {
          ...nextShop,
          ownedItemIds: [...nextShop.ownedItemIds, itemId],
        },
      };
    });
  };

  const handleEquip = (itemId: string, category: ShopCategory) => {
    onUpdatePlayer((prev) => {
      const nextShop = ensureShopState(prev);
      if (!nextShop.ownedItemIds.includes(itemId)) return prev;
      return {
        ...prev,
        shopState: {
          ...nextShop,
          equippedByCategory: {
            ...nextShop.equippedByCategory,
            [category]: nextShop.equippedByCategory[category] === itemId ? null : itemId,
          },
        },
      };
    });
  };

  return (
    <div className="premium-page-root relative flex h-full w-full flex-col overflow-hidden licensed-shell-bg">
      <div className="absolute inset-0 bg-slate-950/50" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8 md:pb-4 md:pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="licensed-slice-orange-pill flex h-11 w-11 items-center justify-center rounded-full p-0 text-white md:h-12 md:w-12"
          >
            <AssetIcon name="back" className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div>
            <div className="text-aaa-micro text-white/55">Cosmetics</div>
            <div className="text-lg font-black tracking-tight text-white md:text-3xl">Character Shop</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-sm font-black text-amber-100">
          <AssetIcon name="coin" className="h-4 w-4" />
          {currencyBalance}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24 md:gap-4 md:px-8 md:pb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-full px-4 py-2 text-aaa-sm ${activeCategory === 'all' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-950/60 text-white/70'}`}
          >
            All
          </button>
          {SHOP_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`rounded-full px-4 py-2 text-aaa-sm ${activeCategory === category.id ? 'bg-cyan-300 text-slate-950' : 'bg-slate-950/60 text-white/70'}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {items.map(item => {
            const owned = shopState.ownedItemIds.includes(item.itemId);
            const equipped = shopState.equippedByCategory[item.category] === item.itemId;
            const canAfford = player.coins >= item.price;
            return (
              <FramedPanel key={item.itemId} className="rounded-[1.3rem] border border-cyan-100/20 bg-slate-950/55 p-3 text-white md:rounded-[2rem] md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <AssetIcon name={(item.iconKey as any) || 'star'} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-black md:text-lg">{item.name}</div>
                      <div className="text-aaa-micro text-white/50">{item.category}</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-amber-100">{item.price} coins</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {!owned ? (
                    <PrimaryActionButton
                      onClick={() => handlePurchase(item.itemId, item.price)}
                      disabled={!canAfford || item.price === 0}
                      className="flex-1"
                    >
                      {item.price === 0 ? 'Starter' : canAfford ? 'Buy' : 'Need coins'}
                    </PrimaryActionButton>
                  ) : (
                    <PrimaryActionButton onClick={() => handleEquip(item.itemId, item.category)} className="flex-1">
                      {equipped ? 'Unequip' : 'Equip'}
                    </PrimaryActionButton>
                  )}
                  <SecondaryActionButton className="flex-1" disabled>
                    {owned ? 'Owned' : 'Locked'}
                  </SecondaryActionButton>
                </div>
              </FramedPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CharacterShop;
