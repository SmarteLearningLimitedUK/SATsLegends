# Portrait games — local review, 21 October 2026

Rounding Rocket and Prime Pop now request portrait orientation in the iOS shell. The shared orientation policy uses blueprint keys, so Place Value Panic (which shares Rounding Rocket's underlying game type) keeps its landscape requirement. Other games retain their existing orientation behaviour. Desktop gameplay remains available without a portrait gate.

Portrait games use the full available viewport, with the shared utility dock reserving its own row. On mobile browsers, an upright-phone prompt pauses and disables the game if held sideways, and play resumes after turning upright. The prompt's icon animation matches the required orientation. Native iOS requests portrait-primary for these games and menus; other games keep the existing unlock-and-turn workflow.

Prime Pop uses the portrait width above the character floor area, with fewer simultaneous bubbles and a capped bubble size for narrow screens. The warning rail now shares the bubble field's coordinate system, preserving its collision boundary. Repeated portrait instructions are removed. Rounding Rocket temporarily hides its build status while feedback is displayed, preventing those labels from overlapping.

Verification: the orientation-policy regression checks pass. The compiled iOS app passes browser checks at 375×667, 390×844 and 430×932 for both games: mocked native portrait lock, usable answer controls, dock clearance with a 21px bottom inset, upright prompt on sideways rotation, and return to play in portrait. TypeScript, website build and iOS build pass. Native API calls were mocked in browser QA; physical-device rotation still needs checking in the next authorised TestFlight build.

Changed files: `src/app/gameOrientation.ts`, `src/App.tsx`, `src/platform/ios/IOSAppRoot.tsx`, `src/components/GameplayOrientationGate.tsx`, `src/components/gameplay-orientation.css`, `src/games/PrimePopGame.tsx`, `src/games/prime-pop.css`, `src/games/rounding-rocket.css`, `scripts/verify-game-orientation.ts`, `scripts/verify-portrait-games.mjs`, this document and evidence under `qa-artifacts/portrait-games/`.

Assumptions: the portrait requirement applies to phones; desktop layouts stay available. All other game orientation requirements remain unchanged. No external legacy assumptions were used. No deployment or TestFlight upload was performed. Wait for the owner to say **“update build”**.
