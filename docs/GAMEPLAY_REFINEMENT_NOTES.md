# Gameplay framing, interaction and difficulty refinement

## Task before editing

- Show complete game environments, including shop counter/characters, and make gameplay text clear and consistent across browser, iPad and phone layouts.
- Replace Lava Path's plain line with a dangerous-looking crossing; make Perimeter Path edges selectable with a persistent colour and non-colour confirmation of consideration.
- Reduce Conversion Canyon's scale, upgrade Multiplication Mine's rock and setting, replace Percent Power's orb with a powered reactor, and separate Chrono Dash's clock from the scenery.
- Provide practice plus five scored difficulty levels per mini-game, with a consistent arc and gentler first levels for Remainder Run and Maths vs Zombies; number early graphs completely.
- Use one coherent cartoon enemy art direction and shared animation/reaction behavior while retaining distinct characters and the earlier functional repairs.

## Exact inspection files

- `src/App.tsx`, `src/constants.ts`, `src/types.ts`, `src/app/AppRouter.tsx`, `src/app/gameplaySessionContract.ts`, `src/app/useGameplaySession.ts`, `src/app/testingFlags.ts`
- `src/app/useScreenFlow.ts`, `src/systems/content/gameDifficulty.ts`; proposed shared contained-image helper `src/components/SceneEnvironment.tsx`
- `src/screens/IslandLevels.tsx`, `src/utils/gameNames.ts`, `src/systems/content/island1NumberBaseCamp.ts`, `src/systems/content/islandBlueprint.ts`, `src/systems/content/satsInspiredQuestionBanks.ts`
- `src/components/game-ui/GameUiKit.tsx`, `src/components/game-ui/GameScreenLayout.tsx`, `src/components/GameplaySceneBackdrop.tsx`, `src/layout/ScreenPrimitives.tsx`, `src/components/UnifiedMiniGameHud.tsx`, `src/design/legend-theme.css`, `src/index.css`, `src/gameSceneMeta.ts`
- `src/games/LavaPathGame.tsx`, `src/games/PerimeterPathGame.tsx`, `src/games/ConversionCanyonGame.tsx`, `src/games/PercentPowerGame.tsx`, `src/games/ChronoDashGame.tsx`
- `src/games/MultiplicationMineGame.tsx`, `src/games/RemainderRunGame.tsx`, `src/games/MathsVsZombiesGame.tsx`
- `src/games/ChangeCounterGame.tsx`, `src/games/monster-market.css`, `src/games/TakeOutRushGame.tsx`, `src/games/take-out-rush.css`, `src/games/RatioRacerGame.tsx`, `src/games/ratioFractionsRace/ratio-racer.css`, `src/components/FoodGameShell.tsx`, `src/components/food-game-shell.css`
- `src/games/GraphGrabberGame.tsx`, `src/games/LineGraphLabGame.tsx`, `src/games/CoordinatesQuestGame.tsx`, `src/games/CoordinateTranslationGame.tsx`, `src/games/DataDetectiveGame.tsx`, `src/games/MeanMachineGame.tsx`, `src/games/MedianMountainGame.tsx`
- `src/games/RoundingRocketGame.tsx`, `src/games/FractionForgeGame.tsx`, `src/games/SimplifySprintGame.tsx`, `src/games/PolygonPalaceGame.tsx`, `src/games/RotationStationGame.tsx`, `src/games/AreaArchitectGame.tsx`, `src/games/ScaleBuilderGame.tsx`, `src/games/ShareSplitterGame.tsx`, `src/games/ProblemPyramidGame.tsx`, `src/games/PotionPanicGame.tsx`, `src/games/FractionMatchGame.tsx`, `src/games/PrimePopGame.tsx`, `src/games/FormulaForgeGame.tsx` for the five-tier generator audit, preserving existing controls/scoring/round structure and using current question types
- `src/components/game-ui/MonsterMindActor.tsx`, `src/components/game-ui/monster-mind-actor.css`, `src/utils/staticEnemyFrame.ts`, `src/components/BossPortrait.tsx`, `src/games/BossEncounterGame.tsx`, `src/games/NumberLineNinjaGame.tsx`, `src/games/PlaceValuePanicGame.tsx`, `src/games/FactorFrenzyGame.tsx`, `src/games/OrderOpsArenaGame.tsx`, `src/assets/characters/index.ts`
- `src/games/AngleArenaGame.tsx` for its current canvas enemy consumer
- Current game/environment/enemy assets referenced by those files; remaining active game generators through the existing registry for the difficulty audit.
- `docs/EXPERIENCE_SPEC.md`, `docs/BUILD_SPEC.md`, `AGENTS.md`, `scripts/verify-legend-expanded-experience.mjs`, `scripts/verify-legend-monster-motion.mjs`

## Assumptions and boundaries

- Continue the current young-teen cartoon direction (approximately ages 11–14), using comic peril rather than gore or realistic violence.
- Five levels means five scored levels after a separate practice entry for ordinary mini-games. Existing fixed SATs paper encounters remain their current papers; no new boss system is introduced.
- Difficulty must be the game's own level/tier, not its numerical position in an island. Route IDs and progress identifiers must not accidentally determine question complexity.
- Preserve usable existing saved progress and actual reporting/session contracts; do not delete history to simplify the new level structure.
- Complete-background framing is explicit user authorization for scoped composition changes. Preserve asset proportions, keep interactive foreground elements readable, and stop artwork at the shared bottom HUD. Any wide-screen or short-screen exceptions must be recorded.
- Perimeter selection is a reading aid, not a new punitive gate: show checked segments with colour plus a visible/accessible state.
- Use current characters and assets as the art reference. Generated replacements are explicitly requested; keep production assets inside this workspace and record prompts.
- Keep the required top HUD → mission/question → interaction/playfield → answers/responses → bottom HUD order and tight matched answer clusters. Verify PC, iPad A2HS and smartphone A2HS simulations with normal/reduced motion.
- No external legacy assumptions, backend, analytics, unrelated systems, new pizza references or new boss systems are used.

## Verification transition

The earlier expanded QA partitions were stopped and every owned browser/runner process was closed before this source pass. Saved passing rows retain their provenance. The pending Market follow-up failure was a multi-call test read spanning two coherent receipt commits; its strict arithmetic checks need an atomic snapshot/readiness repair before rerunning. Earlier results are not represented as verification of newly edited screens or level generation.

Final changed files, art prompts, difficulty decisions, layout exceptions and device-fit results will be recorded after implementation.
