// This flag is compiled only into an explicitly requested internal-test bundle.
// Normal builds retain the original progression and subscription requirements.
export const TESTFLIGHT_ALL_GAMES = import.meta.env.VITE_MATHARIA_TESTFLIGHT_ACCESS === true;
// Previews exercise the same timing rules as the app. Untimed revision is an
// explicit parent setting, rather than a development-only hidden behaviour.
export const LEVEL_TIMERS_DISABLED = false;
export const UNLOCK_ALL_LEVELS = import.meta.env.DEV || TESTFLIGHT_ALL_GAMES;
