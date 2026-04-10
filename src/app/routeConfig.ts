import { GameScreen } from '../types';

export type RouteState = {
  screen: GameScreen;
  islandId?: number;
  levelId?: number;
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

export const parseRoute = (pathname: string): RouteState => {
  const normalized = normalizePath(pathname);
  if (normalized === '/') return { screen: 'splash' };

  const segments = normalized.split('/').filter(Boolean);
  const [root, first, second] = segments;

  switch (root) {
    case 'profile-setup':
      return { screen: 'profile_setup' };
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
      return '/profile-setup';
    case 'avatar_selection':
      return '/avatar';
    case 'world_map':
      return '/map';
    case 'island_levels':
      return islandId ? `/island/${islandId}` : '/map';
    case 'gameplay':
      return islandId && levelId ? `/game/${islandId}/${levelId}` : '/map';
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
