# Explicit game start — local review, 22 October 2026

All maths gameplay routes now wait for a shared **Start** action. On phones held the wrong way, Start is disabled while the rotation prompt remains visible. After turning correctly, the game title and enabled Start button appear; rotating alone does not begin the round. Desktop entry also waits for Start.

Before Start, the shared session is paused and the game component/lifecycle is not mounted, so local clocks, enemies and game effects cannot begin behind the screen. The game stage is inert and other briefing/help/working-board portals are withheld. Existing practice and assessment briefings remain available after Start where applicable. Every new entry or retry requires Start. Rotating mid-round pauses the existing mounted game; turning back resumes without resetting or asking Start again. Calm activities retain their existing activity-specific Begin controls.

Validation: all 37 game types passed checks for an inert stage and no mounted game before Start, followed by a visible game after Start. Detailed Place Value Panic, Prime Pop and Rounding Rocket checks passed disabled Start in the wrong orientation, unchanged timers while waiting before and after rotation, timer progression after Start, mid-round pause/resume preservation and Start on re-entry. Compiled iOS account/navigation checks passed at four viewport sizes. The short portrait prompt is also checked at 320×568. TypeScript, website build and iOS build passed. This is browser verification; physical iPhone testing remains for a future authorised build.

Changed files: `src/App.tsx`, `src/components/GameplayOrientationGate.tsx`, `src/components/gameplay-orientation.css`, `scripts/verify-ios-account-shell.mjs`, `scripts/verify-game-start-gate.mjs`, this document and evidence under `qa-artifacts/game-start-gate/`.

Assumptions: one explicit Start per new round, including retry; returning to the proper orientation during an active round preserves progress. No external legacy assumptions were used. No TestFlight upload was performed. Build `100.5.1` does not contain this new change; wait for the owner's next update-build request.
