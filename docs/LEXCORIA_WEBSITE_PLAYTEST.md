# Complete Lexcoria website playtest

## Source and scope

Owner request: upload the ready Lexcoria project to the website for testing. Used the latest local source at `D:/BrainZilla/GitHub/Lexcoria`, comparing it with the previously tested local snapshot. Six changed files were imported into the isolated release checkout: `src/App.tsx`, `src/app/AppRouter.tsx`, `src/screens/WelcomeScreen.tsx`, `src/screens/welcome-screen.css`, `qa/verify-welcome-screen.ts` and `docs/RESPONSIVE_WELCOME.md`. The original development folder was not modified.

The full game is pinned to `9a6740259128eb0bb556ae2f335ce82f2281f2ad` on `codex/lexcoria-full-website-testing` in the Lexcoria repository. This includes all earlier game content, artwork/audio and the first-time account-entry fix, plus the new responsive welcome. The latest local snapshot digest is recorded in `scripts/game-release-sources.json` and the Lexcoria release documentation.

## Website integration

`/english/play/` contains the complete embedded build and uses the existing same-origin parent session, selected child and English entitlement. This is a testing release: English access grants control entry and English/combined checkout remains unavailable. No backend migration, account permission change or real payment action was required.

Website changes are limited to `scripts/lexcoria.commit`, `scripts/game-release-sources.json`, the existing `scripts/verify-lexcoria-readiness.mjs` account fixture/checks, and this report. Assumption: “for testing” means the existing gated playtest release. No external legacy assumptions were used.

## Completed checks

- Lexcoria and website TypeScript checks passed; the combined production artifact built successfully.
- New welcome tested at 320×568, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080, 667×375 and 844×390 in Chromium: viewport bounds, no overlapping welcome blocks, 48px launch target, loaded artwork and Start → character selection.
- Saved-name greeting and keyboard launch passed. The desktop welcome was visually inspected.
- Combined-build account checks at 320, 390, 768 and 1440 px passed signed-out gates, website entry, disabled English checkout and no horizontal overflow.
- An isolated account fixture passed shared parent login, selected-child entry, responsive embedded welcome at phone/desktop sizes, character selection, English-scoped cloud save and restoration after clearing local game caches, and denial without English access.
- The fixture keeps saved rows and request IDs in memory, checks child/product scoping and save revisions, and makes no real account or progress writes.
- Current Matharia screenshot-source verification passed before release packaging.

Evidence is in ignored `.deploy/lexcoria-full-upload-*.log` and the isolated Lexcoria `qa-artifacts/start-screen` directory. These are Chromium emulation checks, not physical Safari/iOS/Android certification. Existing bundle-size warnings remain.


## Published and verified

Published website source `a934b14` with the complete Lexcoria package pinned to `9a6740259128eb0bb556ae2f335ce82f2281f2ad`. The combined artifact contains 781 files; 78 changed files (1.5 MB) were uploaded. The publisher completed verified FTPS publication and HTTPS checks.

Live `site-release.json` and `/english/play/game-release.json` both match the new Lexcoria revision. Fresh live checks passed the signed-out gate, phone/tablet/desktop entry pages, responsive embedded welcome, shared parent login, child-scoped English save/restoration, and denial without English access. Authentication and save operations were exercised through an isolated in-memory browser fixture; no real accounts or progress were altered.

Live logs: ignored `.deploy/lexcoria-full-upload-live-version.log` and `.deploy/lexcoria-full-upload-live-account.log`. Testing entry: `https://satslegends.com/english/play/?v=a934b14`. Existing game tabs should be reopened to load this release.
