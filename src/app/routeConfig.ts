import { GameScreen } from '../types';
import { ISLANDS } from '../constants';
import { getLevelGameTitle, getLevelGroupKey } from '../utils/gameNames';

export type RouteState = {
  screen: GameScreen;
  islandId?: number;
  levelId?: number;
  preservePath?: boolean;
};

const normalizePath = (pathname: string) => {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

const parseNumericSegment = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const slugify = (value: string | undefined | null) => (
  (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const buildMiniGameRouteEntries = () => {
  const entries = new Map<string, { islandId: number; levelId: number }>();

  ISLANDS.forEach((island) => {
    island.levels.forEach((level) => {
      const route = { islandId: island.id, levelId: level.id };
      [
        level.displayName,
        level.blueprintKey,
        level.miniGameKey,
        level.gameType,
        getLevelGroupKey(level),
        getLevelGameTitle(level),
      ].forEach((candidate) => {
        const slug = slugify(candidate);
        if (slug && !entries.has(slug)) {
          entries.set(slug, route);
        }
      });
    });
  });

  return entries;
};

export const MINI_GAME_ROUTE_ENTRIES = buildMiniGameRouteEntries();

export const getMiniGameRouteSlugs = () => Array.from(MINI_GAME_ROUTE_ENTRIES.keys()).sort();

const parseMiniGameRoute = (slug: string | undefined): RouteState | null => {
  const route = MINI_GAME_ROUTE_ENTRIES.get(slugify(slug));
  return route ? { screen: 'gameplay', ...route, preservePath: true } : null;
};

export const parseRoute = (pathname: string): RouteState => {
  const normalized = normalizePath(pathname);
  if (normalized === '/') return { screen: 'splash' };

  const segments = normalized.split('/').filter(Boolean);
  const [root, first, second] = segments;

  switch (root) {
    case 'profile-setup':
      return { screen: 'avatar_selection' };
    case 'avatar':
      return { screen: 'avatar_selection' };
    case 'map':
      return { screen: 'world_map' };
    case 'island': {
      const islandId = parseNumericSegment(first);
      if (!islandId) return { screen: 'world_map' };
      return { screen: 'island_levels', islandId };
    }
    case 'game': {
      const islandId = parseNumericSegment(first);
      const levelId = parseNumericSegment(second);
      if (!islandId || !levelId) return { screen: 'world_map' };
      return { screen: 'gameplay', islandId, levelId };
    }
    case 'minigame':
      {
        const miniGameRoute = parseMiniGameRoute(first);
        if (miniGameRoute) return miniGameRoute;
      }
      if (first === 'ratio-racer' || first === 'ratio_racer') {
        return { screen: 'ratio_racer' };
      }
      if (first === 'scale-builder' || first === 'scale_builder') {
        return { screen: 'scale_builder' };
      }
      if (first === 'share-splitter' || first === 'share_splitter') {
        return { screen: 'share_splitter' };
      }
      return { screen: 'world_map' };
    case 'ratio-racer':
    case 'ratio_racer':
      return { screen: 'ratio_racer' };
    case 'scale-builder':
    case 'scale_builder':
      return { screen: 'scale_builder' };
    case 'share-splitter':
    case 'share_splitter':
      return { screen: 'share_splitter' };
    case 'wellbeing':
      return { screen: first === 'activity' ? 'wellbeing_activity' : 'wellbeing_hub' };
    case 'shop':
      return { screen: 'shop' };
    case 'achievements':
      return { screen: 'achievements_tracker' };
    case 'parent':
      return { screen: 'parent_dashboard' };
    case 'profile':
      return { screen: 'profile' };
    case 'settings':
      return { screen: 'settings' };
    case 'results':
      return { screen: 'level_result' };
    default:
      return { screen: 'splash' };
  }
};

export const buildRouteForScreen = (
  screen: GameScreen,
  islandId?: number | null,
  levelId?: number | null,
): string => {
  switch (screen) {
    case 'splash':
      return '/';
    case 'profile_setup':
      return '/avatar';
    case 'avatar_selection':
      return '/avatar';
    case 'world_map':
      return '/map';
    case 'island_levels':
      return islandId ? `/island/${islandId}` : '/map';
    case 'gameplay':
      return islandId && levelId ? `/game/${islandId}/${levelId}` : '/map';
    case 'ratio_racer':
      return '/minigame/ratio-racer';
    case 'scale_builder':
      return '/minigame/scale-builder';
    case 'share_splitter':
      return '/minigame/share-splitter';
    case 'wellbeing_hub':
      return '/wellbeing';
    case 'wellbeing_activity':
      return '/wellbeing/activity';
    case 'shop':
      return '/shop';
    case 'achievements_tracker':
      return '/achievements';
    case 'parent_dashboard':
      return '/parent';
    case 'profile':
      return '/profile';
    case 'settings':
      return '/settings';
    case 'level_result':
      return '/results';
    default:
      return '/';
  }
};
