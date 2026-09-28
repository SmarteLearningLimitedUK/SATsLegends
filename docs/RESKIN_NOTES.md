# SATs Legends visual and experience overhaul

The subsequent cartoon environment replacement and final question/input repairs are recorded in [CARTOON_SCENE_NOTES.md](CARTOON_SCENE_NOTES.md).

## Direction

Keep the repository's illustrated fantasy worlds and heroes as the main attraction. Frame them with a consistent deep-blue material, pale cyan edges, warm gold actions, mint success, and clear rounded typography. Reduce competing banners and heavy decorative borders. Use the same visual language in the welcome screen, character selection, map guidance, island missions, shared HUD, instructions and results.

This is a cohesive implementation on the existing React, TypeScript and Vite build. It does not claim to replace every illustration with final studio artwork or to complete a production certification process.

## Experience changes

- Returning players continue to the map without repeating hero setup.
- The map recommends an unfinished island. Island selection highlights the next mission, shows environment thumbnails and clearly distinguishes progress.
- The shared HUD names the mission and shows answer streaks. Back, Help and Sound have visible labels. Help preserves the puzzle and supports keyboard focus trapping, Escape and focus restoration.
- Practice mistakes no longer consume shared lives. Retry resets both the puzzle and shared session. The shell timer pauses while help or results are open, and while the document is hidden.
- Instructions cannot accidentally start from a backdrop tap. Their action remains available when longer instructions scroll.
- Results keep navigation available during reward animations, distinguish practice from scored play, remove the duplicate Map action, and respect reduced motion.
- Place Value Panic has visible digit controls, tap and keyboard alternatives to dragging, measured drop targets, cancellation recovery, supportive feedback and shared correct/incorrect events. Feedback cannot intercept another input.
- Place Value Panic uses the shell's timer in shared gameplay instead of running a hidden competing countdown.
- Angle Arena uses its existing geometry environment at the correct aspect ratio. Fragmented sprite-sheet dressing and the unrelated logo layer were removed; cannon, aiming, projectiles and targets remain intact.
- Scale Builder has a visible, bounded blueprint and response cluster. Both dimensions reset between projects. Its triangle/L-shape projects now offer both increase and decrease controls for each dimension; feedback reports the actual rebuilt size, and answers feed shared streaks.
- Maths vs Zombies presents the sum above the arena and answers below it. Matching and the existing SATs paper encounters use their already assigned environment artwork.

## Layout constraints and scoped exceptions

The existing scaled 390 × 844 stage, shell bounds and safe-area calculations are preserved. Gameplay retains the required top HUD → mission/question → interaction → response controls → bottom HUD hierarchy. The gameplay viewport ends before the opaque bottom dock; scenery does not extend beneath it.

Place Value Panic is the explicit screen-specific exception. Its original percentage-height controls sat in a heightless row and were not usable. Its question and trays now size to the game stage; targets have real dimensions. Levels with more than six source digits use a compact two-row, five-column tray with 44 px base-height buttons, so later levels do not squeeze nine digits into one row. Target trays widen only for six/seven place-value slots. This changes this game's internal placement and does not alter other game layouts.

Scale Builder has a second explicit, screen-specific repair: keep its question in normal grid flow so the blueprint and controls occupy their intended rows, size its blueprint to the available stage space, and use two rows of independent dimension controls for its last two projects. Maths vs Zombies moves its existing question from the answer panel to the shared question strip above the playfield, to comply with the mandatory hierarchy. These are repairs to those screens, not changes to shared stage bounds.

The existing SATs paper encounters also keep their question in normal flow, reserving space above the character panels. This repairs a question/character overlap without introducing a new encounter or boss system.

## Assumptions

- Use the current repository's actual island names, level data, curriculum, art and shared architecture. Retain its current mobile-shaped desktop presentation.
- Reuse current artwork and improve its presentation rather than inventing new worlds, characters, bosses or dependencies.
- Keep the existing QA flags that unlock levels and disable the global timer. Individual games may still have their own puzzle rules; the shared practice treatment does not redefine those rules.
- Preserve concurrent repository work, including the earlier cleanup and the separate untracked `ios` directory. Neither is part of this change.
- No external legacy SATs Hero, SATs Legends, or prior-project assumptions were used.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/design/legend-theme.css`, `src/main.tsx` | Shared materials, color, control states, focus and reduced motion |
| `src/App.tsx`, `src/app/AppRouter.tsx`, `src/app/useGameplaySession.ts` | Welcome flow, help, streaks, practice results and session lifecycle |
| `src/components/UnifiedMiniGameHud.tsx`, `src/components/GameActionDock.tsx` | Mission HUD and labeled utilities |
| `src/components/game-ui/PracticeIntroPopup.tsx`, `src/components/game-ui/useDialogFocus.ts` | Accessible instructions and focus management |
| `src/components/results/LevelResultsModal.tsx` | Consistent results and immediate navigation |
| `src/screens/AvatarSelect.tsx`, `src/screens/WorldMap.tsx`, `src/screens/IslandLevels.tsx` | Hero naming, map guidance and mission journey |
| `src/games/PlaceValuePanicGame.tsx` | Digit layout, input and session integration |
| `src/games/AngleArenaGame.tsx` | Coherent environment rendering |
| `src/games/ScaleBuilderGame.tsx` | Blueprint fit, independent dimensions, project resets and feedback |
| `src/games/MathsVsZombiesGame.tsx` | Correct question/playfield/answer order and full-stage scenery |
| `src/games/FractionMatchGame.tsx`, `src/games/BossEncounterGame.tsx` | Existing environment artwork; remove broken matching placeholder |
| `src/gameSceneMeta.ts`, `src/games/LavaPathGame.tsx` | Fix duplicate import and impossible tuple check that blocked baseline TypeScript |
| `scripts/verify-legend-reskin.mjs`, `scripts/verify-legend-interactions.mjs`, `scripts/verify-legend-scale-builder.mjs` | Repeatable device and interaction checks |
| `docs/RESKIN_NOTES.md` | Direction, scope, assumptions and validation record |

## Validation

Run `npm run lint` and `npm run build`. Start Vite with `npm run dev`, then run `node scripts/verify-legend-reskin.mjs`, `node scripts/verify-legend-interactions.mjs`, and `node scripts/verify-legend-scale-builder.mjs`.

The visual script discovers games from current repository level data, checks both practice/scored variants and all ten Place Value layouts, and captures welcome, hero, map and all eight island screens. It checks runtime errors, shared HUD presence, question visibility, question/HUD collisions, Place Value tray collisions, stage/dock boundaries, broken images and document overflow.

Target environments are PC Chromium at 1440 × 900, iPad WebKit at 768 × 1024, and smartphone WebKit at 390 × 844. Mobile tests set standalone/A2HS signals. These are browser simulations; physical installed-device testing remains outstanding. The scripts do not assert that every round of every minigame has been completed or balanced.

Reports and screenshots are written to ignored `qa-artifacts/legend-reskin`. Final outcomes are recorded below after verification.

### Completed checks — 28 September 2026

- `npm run lint`: passed (TypeScript).
- `npm run build`: passed. Vite retains its warning about the main bundle exceeding 500 kB; bundle restructuring is outside this visual/gameplay pass.
- `git diff --check`: passed.
- Full visual pass: 52 gameplay layouts plus 10 menu screens per device profile, 186 screen checks and 189 screenshots including welcome screens. No recorded runtime errors, broken images, zero-sized visible gameplay buttons or geometry failures.
- Targeted reruns after the final changes passed for Scale Builder, Maths vs Zombies, matching and all three existing SATs paper encounters across PC, iPad A2HS and smartphone A2HS. Encounter checks additionally verify that the question, both character panels and answers do not overlap.
- Place Value interaction suite: passed on all three profiles. Checks cover instructions, trapped keyboard focus, focus restoration, persistent sound settings, tap/keyboard/drag input, forgiving practice, full practice completion, streaks, scored life loss and retry restoring the session.
- Scale Builder interaction suite: passed on all three profiles. Completed all five projects, checked both dimensions and their resets, verified recoverable incorrect answers, and reached practice results with a five-answer streak.
- Fresh agent-browser session: welcome screen and primary action rendered; no browser errors recorded.

The required gameplay hierarchy and background/dock boundaries were applied and checked across the three simulated target environments. Physical PC/iPad/phone device testing and broader minigame balance playtesting remain unverified. No backend, analytics, new boss systems or external legacy assumptions were introduced.
