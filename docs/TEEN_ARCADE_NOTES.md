# Teen arcade, calm breaks and Parent Snapshot

## Task

- Shift the existing cartoon game toward young teens with urgency, comic risk, cheeky humour, slime and purposeful animation.
- Make food orders feel like a restaurant shift, shop orders feel like a real counter with shelves/till, and racing feel like a motor-racing event with spectators.
- Use the available screen space better while retaining the required shared HUD, mission, playfield, responses and bottom HUD order.
- Upgrade all six calm breaks with rich, slow visual scenes, clear explanations and positive affirmations.
- Make Parent Snapshot fit and scroll on PC, iPad A2HS and smartphone A2HS, preserving the current character/control repairs and accurate round results.

## Visual and interaction thesis

Cinematic cartoon arcade: physical props, clear silhouettes, teal/amber light, comic menace and calm spaces to read. Keep the existing hero aesthetic. The question has one job, the scene has one primary interaction, and the response cluster stays tight. Pressure is expressed through the existing timer, lives and combo rather than a second clock or arbitrary penalty. Animation communicates presence, action and progress. Calm breaks use open landscape scenes and slow environmental layers instead of an inset generic card.

## Exact inspection set

- `src/App.tsx`, `src/app/AppRouter.tsx`, `src/app/screenConfig.ts`, `src/app/useGameplaySession.ts`, `src/app/gameplaySessionContract.ts`, `src/index.css`
- `src/constants.ts`, `src/gameSceneMeta.ts`, `src/assets/characters/index.ts`, `src/utils/fantasyPrompt.ts`
- `src/layout/ScreenPrimitives.tsx`, `src/components/game-ui/GameUiKit.tsx`, `src/components/game-ui/GameScreenLayout.tsx`, `src/components/UnifiedMiniGameHud.tsx`, `src/design/legend-theme.css`
- `src/games/TakeOutRushGame.tsx`, `src/games/ChangeCounterGame.tsx`, `src/games/RatioRacerGame.tsx`, `src/components/FoodGameShell.tsx`, `src/games/ratioFractionsRace/ratio-racer.css`
- `src/games/MonsterMarketGame.tsx` for route audit only: the current checkout levels use the `change_counter` blueprint and ChangeCounterGame; the canonical game-name table calls this Monster Market, while the live HUD currently shows Change Counter. AppRouter retains a separate `monster_market` component case with no current level route. Upgrade the active checkout screen.
- `src/games/PlaceValuePanicGame.tsx`, `src/games/NumberLineNinjaGame.tsx`, `src/games/FactorFrenzyGame.tsx`, `src/games/OrderOpsArenaGame.tsx`, `src/games/BossEncounterGame.tsx`, `src/components/game-ui/MonsterMindActor.tsx`
- `src/screens/ParentDashboard.tsx`, `src/systems/progression/reporting.ts`
- `src/wellbeing/WellbeingShell.tsx`, `src/wellbeing/WellbeingHub.tsx`, `src/wellbeing/WellbeingCompleteModal.tsx`, `src/wellbeing/data.ts`, `src/wellbeing/types.ts`
- `src/wellbeing/activities/BreathingBloom.tsx`, `src/wellbeing/activities/PeacefulPond.tsx`, `src/wellbeing/activities/CandleCalm.tsx`, `src/wellbeing/activities/ConstellationConnect.tsx`, `src/wellbeing/activities/LeafDrift.tsx`, `src/wellbeing/activities/ThoughtSort.tsx`
- `src/wellbeing/integration/config.ts`, `src/wellbeing/integration/wellbeingRewards.ts`, `src/wellbeing/integration/wellbeingSuggestion.ts` for existing integration constraints; preserve rewards and IDs.
- `docs/EXPERIENCE_SPEC.md`, `docs/BUILD_SPEC.md`, current repository AGENTS instructions.

## Assumptions and scope constraints

- Young teens means approximately 11–14; danger is stylised comic peril, slime and tension within the current cartoon world.
- Use current characters as visual references. New raster environments are explicitly requested and will be generated with the built-in image tool, saved into this repository and inspected before integration.
- Existing curriculum, answer pools, point formulas, rewards and shared gameplay session contract remain. Correct final result accounting is part of the functional repairs.
- Screen-width/layout exceptions are justified by the explicit request to use screen real estate: scope them to Parent Snapshot, wellbeing and the restaurant/shop/racing scenes after device checks. Do not blindly widen every fixed-coordinate game.
- Preserve the top HUD → mission → playfield → answers/responses → bottom HUD hierarchy. Environment art ends at the dock and stays behind reading/input controls.
- Wellbeing copy is descriptive and encouraging, with comfortable pacing and optional pauses; do not add medical claims or required breath holds.
- No new boss systems, backend, analytics, pizza references or unrelated refactors.
- No external legacy assumptions are used. Keep existing unrelated work and the current repository state.

## Validation

Retain existing passing verification with provenance where the corresponding surface is unchanged. Recheck every changed gameplay layout in PC, iPad A2HS and smartphone A2HS simulations, with normal/reduced motion. Exercise actual inputs, correct/incorrect recovery, final result persistence, scene assignments, all six calm activity completions/exits and Parent Snapshot overflow/scrollability. Physical installed-device behaviour is not inferred from simulation.

Final combined validation, exact changed files and art-prompt provenance are recorded in `docs/GAMEPLAY_REFINEMENT_NOTES.md`. Per-row provenance distinguishes unchanged wellbeing/Parent evidence from fresh checks of later game, framing and difficulty edits.

## Composition and motion plan

- Restaurant/shop/race: one themed playfield, with the single mission above and compact responses below. Physical tray/receipt/course communicates progress. Ambient steam, customer reactions and slime feedback bring the scene to life; car boost/exhaust and flags communicate a correct racing answer. Respect reduced motion.
- Calm Grove: landscape first, title and one instruction, purposeful central interaction, visible progress/status and a positive affirmation, with an accessible exit. Slow water/light/sky movement supports a pause rather than adding pressure.
- Parent Snapshot: compact header, four factual summary values, strongest/practice context, game usage and expandable detailed history. Use one native scroll region rather than a long scaled portrait report.

## Implemented layout exceptions

Parent Snapshot and wellbeing use the actual viewport on all profiles. The active restaurant, checkout and Ratio Racer use the actual viewport when width is at least 700px and height at least 600px; narrow/short views retain the established portrait stage. The food exception excludes Fraction Forge; the ratio exception excludes Share Splitter and Maths vs Zombies. No other fixed-coordinate game is widened. Parent Snapshot and the wellbeing hub permit vertical panning. Activity gestures retain control of their own playfield.

Parent Snapshot retains the current report data, converts stored topic/game accuracy fractions to percentages, labels session pace explicitly, and shows all earned achievements in expandable detail. This is a display/layout repair, with no new reporting system.

Short wide restaurant and checkout screens compact their mission strips to reserve room for the customer and readable receipt. Restaurant tray totals sit beside the physical tray; checkout receipts use two item columns and labelled cost/paid totals. This is confined to the existing wide-screen/short-height CSS breakpoint, with the shared HUD, playfield, responses and dock order retained. A separate short-wide Worry Balloon composition places feeling words/actions beside the full balloon; taller and narrow activity layouts retain their existing composition.

## Generated art

Ten final environments were created using the built-in `image_gen` tool and inspected. The six calm scenes were refined once with current Barratt and Mochi artwork to match bold cartoon outlines and cel-painted forms. Final images are optimized WebP assets in `src/assets/maps/teen` and `src/assets/wellbeing/scenes`; project code does not reference images outside the workspace. Exact prompts and selected output paths are saved in `docs/TEEN_ART_PROMPTS.json`.

## Earlier functional repairs retained

The original Number Stones/Monster Mind pass has 88/88 passing verification rows with historical report provenance retained. This includes native mobile taps, stable enemy identity during damage, measured Ninja flights, all 12 scored full-level victories, exact final score/accuracy persistence and one completion save. The expanded visual and wellbeing pass uses separate verification so these results are not misrepresented as coverage of later edits.

## Integration repairs

- The short desktop restaurant mission is compacted within the existing wide/short breakpoint so the ticket rail, speaking customer and tray have distinct visible space. Answer targets, section order and dock bounds remain.
- Existing shell pause state is exposed as an optional session-state field for the restaurant's current 90-second shift. Its local timer must stop behind Help or a result overlay and resume afterward; this retains the existing duration and score formulas.
- Calm completion must cancel as soon as navigation starts, including the shared dock and retained AnimatePresence exit. A reward must not arrive after leaving an activity; optional microphone work must also stop at that boundary.
- The same presence boundary guards delayed results in the three themed games and stops their owned timers/schedulers immediately when leaving. Existing feedback delays and score formulas remain; a retained exit animation must not finish a run on another screen.

These venue/wellbeing lifecycle repairs use only current repository lifecycle and state and preserve their existing rewards and scoring. The separately requested later five-tier route and curriculum refinement is documented in `docs/GAMEPLAY_REFINEMENT_NOTES.md`.

## Parent recording correction found during verification

- Keep per-game and per-topic answer totals consistent with the existing overall totals.
- Prevent a replayed React state updater from mutating the previous player's nested stat records.
- Clone existing stat records before the current event updater changes them; retain event names, fields, scoring and reporting formulas.
- Verify repeat evaluation from the same previous player is stable, then recheck actual completed rounds and Parent Snapshot.

Exact inspection files: `src/systems/progression/telemetry.ts`, `src/systems/progression/reporting.ts`, `src/types.ts`, `src/App.tsx` and `scripts/verify-legend-expanded-experience.mjs`. The source repair is scoped to `telemetry.ts`. Assumptions: existing stats are the flat records defined in current types, and prior stored history is retained. No new analytics, event system or external legacy assumptions are introduced. The browser check reproduced one correct/one wrong overall becoming two correct/one wrong inside a game because the previous nested record was shared; an isolated replay of the current helper confirmed the same mutation.

## Calm entry and tablet hierarchy correction

- Compute the existing calm-break suggestion before building a failure result, so the result and signal state use the same decision.
- Retain current suggestion thresholds, cooldowns, practice behavior, failure counts and rewards.
- Use supportive failure copy that is accurate for all existing suggestion reasons.
- Reserve 80px for the shared top HUD in tablet wellbeing views (widths 700–1100px); keep the existing PC, phone and short desktop layouts.

Exact inspection files: `src/App.tsx`, `src/wellbeing/integration/wellbeingSuggestion.ts`, `src/wellbeing/integration/config.ts`, `src/wellbeing/wellbeing.css` and `scripts/verify-legend-expanded-experience.mjs`. Source changes are limited to `App.tsx` and `wellbeing.css`. The current queued signal updater assigned a local suggestion variable after the failure result had already read it. The iPad simulation also measured a 1.91px overlap between the transparent activity header container and the shared HUD, despite readable copy remaining clear. Assumptions: use the current signal snapshot in the current callback, and preserve all existing return/reward behavior. No outside systems or legacy assumptions are used.
