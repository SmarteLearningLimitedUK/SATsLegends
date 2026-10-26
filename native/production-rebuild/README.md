# SATs Legends visual rebuild candidate

This is an implemented local presentation upgrade with a protected educational baseline and actual rendered review evidence. It is held for native device validation; it has not been uploaded to TestFlight.

## Delivered

- New purpose-composed portrait and landscape welcome art; a live, unobscured brand mark and primary action.
- New sign-in/learner garden, real shared mascot imagery, readable native-style account forms and a cohesive sound-settings screen.
- Shared semantic presentation tokens, emerald/brass controls, lightbulb Help, restrained entry/press motion and a matching Start/turn gate.
- Larger question and supporting text; optional helpers remain available verbatim in Help.
- Explicit landscape policy for Fraction Forge; compact seven-place reflow, larger Match Mastery targets, corrected Rotation Relay action columns, Mean Machine hit area and Polygon Palace line spacing.
- Four device profiles for all 37 games, answer interactions, complete core papers, calm completions and Start/Help/focus/rotation/exit checks.

The existing world map and suitable game-specific scenes remain the art foundation. They were inspected as compositions rather than replaced for novelty.

## Review

Open `qa-artifacts/production-rebuild/index.html` through `node scripts/serve-production-review.mjs` for the desktop gallery. Images are also standalone PNGs, including ten game contact sheets. Localhost serves this computer only; use the PNG files for review on another device.

- [Design system](DESIGN_SYSTEM.md)
- [Layout contract and orientation matrix](LAYOUT_AND_ORIENTATION.md)
- [Per-game validation](VALIDATION.md)
- [Protected content hashes](content-baseline.json)
- [Asset inventory and provenance](asset-inventory.json)
- [Exact orientation exception](visual-source-exceptions.json)

## Product files changed in this rebuild

- Entry/routing: `src/components/AdventureWelcome.tsx`, `src/app/AppRouter.tsx`, `src/main.tsx`, `src/index.css`.
- Design: `src/design/production-tokens.css`, `src/design/production-entry.css`, `src/design/legend-theme.css`.
- Account: `src/platform/ios/IOSAccountLayout.tsx`, `IOSFamilyScreen.tsx`, `ios-account.css`; `src/website/ParentAccount.tsx`.
- Shared controls: `src/components/GameActionDock.tsx`, `GameplayOrientationGate.tsx`, `gameplay-orientation.css`; `src/app/gameOrientation.ts`.
- Game presentation: `src/components/game-ui/reference-screen-layout.css`, `reference-batch-two.css`, `reference-batch-three.css`, `reference-takeout-portrait.css`; `src/games/vision-compositions.css`, `vision-instrument-compositions.css`, `polygon-palace.css`, `rotation-station.css`, `mean-machine.css`.
- Settings/results: `src/screens/AdventureSettings.tsx`, `adventure-settings.css`; `src/components/results/level-results.css`.
- Exported art: `src/assets/production-entry/welcome-portrait.webp`, `welcome-landscape.webp`, `account-portrait.webp`. The Maths vs Zombies replacement is `src/assets/production-scenes/zombies-arena.webp`. Source PNGs and prompts are retained in this directory.

QA/tooling additions: `scripts/production-content-guard.mjs`, `export-production-inventory.mjs`, `capture-production-rebuild.mjs`, `capture-production-entry.mjs`, `production-asset-inventory.mjs`, `verify-production-states.mjs`, `verify-production-visuals.mjs`, `verify-production-performance.mjs`, `build-production-review.mjs`, `serve-production-review.mjs`.

Existing QA adapters updated to current routes/orientation and UI controls: `scripts/verify-game-orientation.ts`, `verify-ios-account-shell.mjs`, `full-campaign-playtest.mjs`, `playtest-fraction-interactions.mjs`, `playtest-full-calm.mjs`.

## Assumptions and exclusions

The current repository is the source of truth for all 37 games, artwork identities and game rules. Existing account handlers and shared credentials are retained. The learner-card portrait represents the shared guide, not an inferred personal avatar. iPhone remains the native target; tablet browser coverage does not add native iPad support.

No external legacy assumptions, prior-project systems or unrelated backend changes were used. The protected baseline was established before this rebuild. Questions, answers, generators, scoring, XP, timers, lives and progression retain their source hashes. Only the explicitly recorded orientation policy exception changes a protected source file.

## Release hold

See the exact outstanding native gates in VALIDATION.md. This Windows host cannot run Xcode, iOS Instruments, physical safe-area/rotation checks, VoiceOver or native accessibility-size testing. The WebKit runtime could not be installed because Windows rejected its executable write. Chromium checks are not described as Safari or native iOS verification.

Do not treat this candidate as App Store certified. No TestFlight upload or signing operation is part of this rebuild.
