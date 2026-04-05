import { CosmeticShopItem, ShopCategory } from '../../types';

export const SHOP_CATEGORIES: Array<{ id: ShopCategory; label: string }> = [
  { id: 'outfit', label: 'Outfits' },
  { id: 'hat', label: 'Hats' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'handheld', label: 'Handheld' },
  { id: 'trail', label: 'Trails' },
  { id: 'skin', label: 'Skins' },
];

export const SHOP_CATALOG: CosmeticShopItem[] = [
  {
    itemId: 'starter-robe',
    name: 'Starter Robe',
    category: 'outfit',
    price: 0,
    rarity: 'Common',
    iconKey: 'star',
    unlockType: 'starter',
  },
  {
    itemId: 'sky-scarf',
    name: 'Sky Scarf',
    category: 'accessory',
    price: 120,
    rarity: 'Common',
    iconKey: 'gem',
    unlockType: 'currency',
  },
  {
    itemId: 'ember-hood',
    name: 'Ember Hood',
    category: 'hat',
    price: 180,
    rarity: 'Rare',
    iconKey: 'trophy',
    unlockType: 'currency',
  },
  {
    itemId: 'atlas-bag',
    name: 'Atlas Satchel',
    category: 'accessory',
    price: 220,
    rarity: 'Rare',
    iconKey: 'medal',
    unlockType: 'currency',
  },
  {
    itemId: 'signal-wand',
    name: 'Signal Wand',
    category: 'handheld',
    price: 260,
    rarity: 'Epic',
    iconKey: 'star',
    unlockType: 'currency',
  },
  {
    itemId: 'starlight-trail',
    name: 'Starlight Trail',
    category: 'trail',
    price: 300,
    rarity: 'Epic',
    iconKey: 'star',
    unlockType: 'currency',
  },
  {
    itemId: 'arcane-variant',
    name: 'Arcane Variant',
    category: 'skin',
    price: 420,
    rarity: 'Legendary',
    iconKey: 'trophy',
    unlockType: 'currency',
  },
];

export const getCategoryItems = (category: ShopCategory | 'all') => {
  if (category === 'all') return SHOP_CATALOG;
  return SHOP_CATALOG.filter((item) => item.category === category);
};

export const getStarterItemIds = () => SHOP_CATALOG.filter((item) => item.unlockType === 'starter').map((item) => item.itemId);
