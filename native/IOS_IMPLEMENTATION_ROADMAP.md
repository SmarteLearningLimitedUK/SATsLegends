# iOS implementation roadmap

Plan created22 October2026; implementation subsequently authorised by the user's “go ahead until completion” and23 October “make the remaining changes left”. Read IOS_REMEDIATION_PROGRESS.md for current completed/open batches, then IOS_AAA_AUDIT.md and the relevant inventory rows. Current working tree contains unrelated/unreleased work: do not reset, overwrite or stage it indiscriminately. Preserve assets, educational meaning, scoring and account flows. TestFlight/deployment remain on hold.

## Sequencing

Run B0→B1→B2 before changing many individual games. B3 informs B5; art B4 can be specified in parallel but should use final scene bounds. B6 follows board composition. B7 follows interaction correctness. B8 is incremental throughout. B9 is required before release claims. Do not change every game at once.

## Continuity and change control — every subsequent session

1. Read IOS_AUDIT_PROGRESS.md, this roadmap and the relevant architecture/art/inventory sections. Identify the next incomplete batch; do not repeat documented discovery without new evidence.
2. State the batch objective, exact files to inspect/change, assumptions and acceptance criteria before editing. Keep unrelated work intact and preserve verified Start, dock, label, grounding and content fixes.
3. Capture the intended current state before the change. Work on one bounded batch; record build/question/viewport so after images are comparable.
4. Diagnose the actual visible layer and geometry owner. If an attempted fix fails twice for the same issue, stop speculative edits, record both attempts/evidence and reassess the root cause before proceeding. This is a diagnosis checkpoint, not an instruction to abandon useful investigation.
5. Render the changed state, visually inspect it and run relevant functional/regression checks. A bounds pass alone does not close an art-direction finding.
6. Update progress and this roadmap with files/why, before/after paths, executed tests/results, failed criteria, remaining native checks and the next incomplete task. No batch is complete until its intended improvement is verified and relevant regressions are clear.
7. Never infer whole-app completion from one batch. Keep source, browser, native build, simulator and physical-device verification separate. Do not push/deploy or upload TestFlight while the user's hold remains active.

The original follow-up brief ended with an audit-first instruction; that stage is complete. The user's later explicit implementation requests authorise the local B0–B8 work, with B9 device verification still requiring the actual native environment. A batch is complete only when its evidence is recorded in IOS_REMEDIATION_PROGRESS.md. No model or reasoning setting is silently changed.

## B0 — Baseline and state coverage

- Objective/root cause: prevent the starting-state smoke pass being treated as whole-app certification (S08).
- Files: `scripts/audit-ios-aaa-screens.mjs`, `scripts/audit-ios-interfaces.mjs`, existing `scripts/qa/release-account-fixture.mjs`, `qa-artifacts/ios-aaa-audit/`.
- Changes: freeze deterministic question/time/random fixtures in tests; identify actual active source/build, record viewport/DPR/insets/reduced-motion and game/difficulty/question ID. Add longest question, active selection, wrong/correct feedback, tips, workpad and result cases without changing production content or scores. Keep account requests isolated.
- Dependencies: none. Risk: stale browser binary, screenshots of Start/briefing instead of gameplay, random content causing false diffs.
- Acceptance: each screenshot proves intended screen/state; no skipped case silently passes; raw rectangles and test failures retained. Screenshot all37 phones, plus state representatives below.
- Tests: Start gate, no live service calls, stable fixture output, runtime errors. Complexity S–M; reasoning high for fixture boundary, medium thereafter.

## B1 — One usable viewport contract (first implementation)

- Objective/root cause: centralise safe bounds before fixing scene offsets (S01/S03).
- Inspect/change only as required: `src/App.tsx` viewport/style logic, `src/components/GameplayContentViewport.tsx`, `src/platform/native-app.css`, relevant `src/index.css` shell rules. Add a small typed layout helper under `src/app/`; use existing naming after inspection.
- Changes: calculate viewport and safe insets once; publish safe width/height and measured shell slots. Keep scenery full-bleed. Prototype only Place Value Panic + Coordinates Quest; keep other games on current contract. Do not remove old rules until consumers migrate.
- Dependencies: B0. Risks: double padding, keyboard resize, design-scale coordinate conversion, rotation bounce.
- Acceptance: identical inset ownership with zero and nonzero test insets; no dock/question overlap, no document scroll during play; no unintended size change in unmigrated games. Controls inside safe rectangle. State preserved on resize/background.
- Screenshots:390×844 pre-entry,844×390 and667×375 active, both landscape inset directions, long prompt and help open; exploratory768/1024.
- Tests: existing start gate, dock clearance, coordinate selection corners/centre, Place Value select/drag/check, resize/no timer reset. Native safe-area validation remains B9.
- Complexity M; reasoning high. Stop after two games and evidence; do not fold B2–B7 into this change.

## B2 — Measured shell/HUD rows

- Objective/root cause: remove estimated top reserve and prevent independent game inset calculations (S04).
- Files: `src/components/UnifiedMiniGameHUD.tsx`, `src/components/game-ui/gameplay-dock-layout.css`, `src/app/AppRouter.tsx`, `src/components/GameActionDock.tsx`, matched `src/index.css` reserves.
- Changes: keep bottom dock a physical row. Make top HUD a real row or publish measured height as the single reserve. Separate question, scene, answers and utility slots with explicit optional slots for assessment/calm. Eliminate only migrated duplicate reservations. Retain lightbulb/Start/pause contracts.
- Dependencies: B1. Risks: double top padding, long title, assessment timer height, calm HUD reappearance.
- Acceptance: long title/larger text cannot cover question; both HUDs reserve their actual occupied space; no decorative hero covers answers; calm retains no top gameplay bar.
- Screenshots: Place Value, Line Graph, Scale, all three Core identities, calm, long title in short landscape.
- Tests: all37 dock/start/Tips, workpad/focus, practice/scored result navigation. Complexity M; reasoning high.

## B3 — Per-game orientation and typography policy

- Objective/root cause: replace implicit size/title assumptions with a capability manifest (S05/S09).
- Files: `src/app/gameOrientation.ts`, `src/platform/ios/IOSAppRoot.tsx`, `src/components/GameplayOrientationGate.tsx`, `src/components/game-ui/GameUiKit.tsx`, `viewport-question.css`, `src/design/legend-theme.css`.
- Changes: follow IOS_ORIENTATION_MATRIX.md. Preserve current phone portrait Prime/Rocket/calm and portrait account/map. Prototype square-board adaptive composition separately, never silently switch all games. Establish rendered question/label/answer floors after transforms; keep maths constraints on screen. Test thresholds699/700/701 and tablet-shaped windows. Do not change native device support incidentally.
- Dependencies: B1/B2. Risks: rotation loop, unwanted portrait lock, text floor creating overflow.
- Acceptance: orientation rationale matches mechanics; return-to-map restores portrait; no Start bypass, state/timer preserved mid-round; long fractions/units remain readable.
- Screenshots: each proposed composition plus wrong-way Start. Tests: orientation unit checks, native call ordering via fixture, long text/zoom. Complexity M–L; reasoning high.

## B4 — Targeted art separation and floor anchors

This is **Phase3B** from the follow-up brief. Use the dedicated protocol and per-scene evidence record in IOS_ART_DIRECTION.md; retain the existing B0–B9 numbering to avoid breaking handoffs.

- Objective/root cause: strengthen scene focus without flattening rich environments (S06/S07).
- Files: specific scene CSS listed in IOS_ART_DIRECTION.md, `src/games/MathsVsZombiesGame.tsx`, `maths-vs-zombies.css`, `RoundingRocketGame.tsx`, `rounding-rocket.css`, shared character/stage components only when a reusable anchor is demonstrated.
- Changes: local low-detail/tonal region behind actors; maintain saturation away from focal region. Tie feet/contact shadows to scene floor. Make incomplete Rocket readable. Vary existing activity-relevant poses; no new art unless evidence proves need.
- Dependencies: stable shell scene bounds. Risks: halo, muddy art, actor hiding diagrams, filters affecting text/performance.
- Acceptance: character identifiable at actual phone size, feet visually grounded in idle/action, interaction visually dominant, no loss of scene richness. See scene-specific table, including corrected Pyramid/Share states that must not regress.
- Screenshots: normal/grayscale thumbnails, full-size idle/action, all avatars where crops differ. Tests: hero ground bounds, zombie audio/mute, prime clearance, reduced motion. Complexity M; reasoning high art decisions.

## B5 — Game composition batches

- Objective/root cause: repair actual activity budgets, not globally shrink content (S02/S05).
- Files: corresponding `.tsx` and local CSS from IOS_GAME_INVENTORY.md; common kit only for demonstrated shared need.
- Batch order: (a) Coordinates Quest + Match Mastery dense boards; (b) Remainder Run control and Prime targets; (c) Chrono/Angle/Perimeter/Line Graph essential instruments/labels; (d) Scale/Forge/container labels and actions; (e) Core papers all response types; (f) remaining scenes and menus one group at a time.
- Required changes: reclaim decorative and redundant panel space before enlarging meaningful board/label/target; preserve task maths and active feedback. Charts/grid bounds must follow available scene, not independent viewport percentages. Do not use overlapping expanded hitboxes on adjacent cells.
- Dependencies: B2/B3, B4 where scene anchor changes. Risks: changed input mapping, answer order, drag bounds, timer/scoring regressions.
- Acceptance:≥44px rendered touch-screening targets where practical, clear alternatives for dense grids, legible labels, questions and active answers fully present, no unwanted document scrolling. Define and justify any exception with edge-tap testing.
- Screenshots: before/after same question, selection/drag, incorrect feedback, complete/fail, shortest phone and default phone. Tests: per-game scripts named in inventory, mathematical/scoring suites unchanged. Complexity M each group, L assessment; reasoning high initially, medium repeat migrations.

## B6 — Touch, coordinate and accessibility correction

- Objective/root cause: geometric pass is not input usability (T01–T04).
- Files: `src/games/CoordinatesQuestGame.tsx` (re-exports `TreasurePathGame.tsx`), board/drag handlers in affected games, `src/components/game-ui/GlobalWorkpadDialog.tsx`, answer widgets and dialog focus utility. Coordinate handler changes belong in `TreasurePathGame.tsx`, not a new duplicate component.
- Changes: use bounding-rect conversion consistently for touch coordinates; pointer capture/cancel handling; no scroll gesture conflict; offer a discrete alternative where dense spatial targets cannot safely enlarge. Scope changes to measured failures.
- Dependencies: B5 board geometry. Risks: neighbour selection, off-grid drops, keyboard state loss.
- Acceptance: centre/edge taps hit intended target; drag release/cancel/rotation recovers; VoiceOver names convey action/value and focus stays in dialogs. Do not mark browser keyboard checks as VoiceOver proof.
- Screenshots/recordings: pressed/dragged/cancelled/focus states. Tests: corner/centre selection at DPR1/2/3, resize then drag, touch and mouse parity, native VoiceOver B9. Complexity M; reasoning high.

## B7 — Cohesion and micro-polish

- Objective: unify hierarchy after geometry works, not decorative effects for their own sake.
- Files: common icon/button/panel tokens and migrated game CSS; account/calm maintain distinct appropriate presentation.
- Changes: consistent pressed/disabled/loading feedback and focus; simplify duplicate framing only where it wastes space; use existing art/material language. Keep helper text in lightbulb and necessary feedback visible.
- Dependencies: B4–B6. Risks: specificity regressions, excessive motion.
- Acceptance: consistent icons/control states; no hidden mathematical information; normal/reduced-motion parity; screenshots still rich. Tests: all visual baselines and sound/mute checks. Complexity S–M; reasoning medium.

## B8 — Automated regression and performance evidence

- Files: existing Playwright scripts, capture catalog, native screenshot/smoke tooling, affected canvas/atlas renderers only after profiling.
- Changes: consolidate a manifest of games/states/viewports and explicit assertions; add approved pixel baselines with masks for animation only, region/target checks and artifact links. Record real frame-time/memory data on representative device before changing filters/atlas lifecycle.
- Dependencies: starts B0, stabilises after B7. Risks: flaky randomness, masks hiding defects, desktop performance mistaken for mobile.
- Acceptance: failure shows exact state/device/build; no silent skips; baseline approval human-reviewed; performance report includes device/OS/duration/normal motion. Screenshots all37 and non-game states. Tests: repeat deterministic run and intentional overlap failure demonstration. Complexity M; reasoning high setup, medium maintenance.

## B9 — Native iPhone release validation

- Files: native iOS project/config, test scripts, release checklist; changes only for reproduced failures.
- Required: build locally/cloud when separately authorised, simulator plus physical smallest-supported and current-notched iPhone. Both landscape directions, keyboard, rotation/background, audio interruption, safe areas, purchases in sandbox, memory pressure, offline recovery, sustained normal-motion play.
- Dependencies: B1–B8 and user release authorisation. Risks: native-only orientation/insets, StoreKit access or credentials, TestFlight differs from local tree.
- Acceptance: IOS_QA_TEST_PLAN.md native checklist evidenced against exact build; no unresolved P0/P1, no claimed iPad support without device-family/policy work. No upload merely because checks pass.
- Complexity L for coverage; reasoning high on failures, medium execution.

## Historical first assignment — completed locally

The pilot below was completed and expanded to the37 reachable campaign games. It is retained for provenance, not the next task. Current outcomes and the remaining native-only boundary are in IOS_REMEDIATION_PROGRESS.md. Do not repeat the pilot or revert the migration.

> Read native/IOS_AUDIT_PROGRESS.md, IOS_AAA_AUDIT.md, IOS_LAYOUT_ARCHITECTURE.md and B0/B1 of IOS_IMPLEMENTATION_ROADMAP.md. Preserve unrelated work and do not deploy. Implement only the first shared usable-viewport contract, piloted on Place Value Panic and Coordinates Quest. First freeze deterministic current screenshots and bounds. Make safe-area ownership explicit once, preserve the existing physical bottom dock row and Start/orientation/pause behaviour, and expose usable scene dimensions without silently shrinking controls. Keep other games on the existing contract. Do not change maths, scoring or artwork. Test844×390,667×375,390×844 entry and both nonzero landscape inset directions; verify coordinate input after resize and Place Value interaction. Save comparison evidence and list remaining native-only checks. Stop after this bounded pilot, before broad CSS removal or additional game migration.

Suggested model: an available workhorse coding model with medium/high reasoning for fixture work; use high reasoning for B1 geometry and native failures. Do not hardcode a model name that may become unavailable.

## Current next assignment

After the user explicitly authorises a new app build, validate B9 against that exact native candidate. Use IOS_QA_TEST_PLAN.md and IOS_REMEDIATION_PROGRESS.md. Prioritise real iPhone safe areas in both landscape directions, portrait-game entry/return, keyboard/workpad, VoiceOver, audio interruptions, cold launch/resume and sustained normal-motion play. Preserve the browser-verified layouts, existing maths/scoring and artwork. Reproduce and capture a defect before changing code. Do not infer native success from browser fixtures, add iPad support incidentally, or upload without the user's release instruction.

No external legacy assumptions were used. This roadmap authorises no deployment.
