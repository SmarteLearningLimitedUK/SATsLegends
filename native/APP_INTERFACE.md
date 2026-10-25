# Independent iPhone interface

The iOS target now boots its own `IOSAppRoot`, rather than the website router. Account screens and the learner picker use the app's own scenery, layout and navigation. The website continues to use `WebsiteRoot`.

Accounts are shared, not duplicated: both clients use the existing Supabase email/password flow, FamilyAccount provider, entitlement checks and saved-progress GameGate. Existing website credentials, learners and progress remain the source of truth. No database or authentication settings were changed.

The iPhone starts in portrait. Account screens and game menus request portrait. Only a Matharia minigame route with an authenticated, entitled learner unlocks device rotation. The existing shared gameplay gate asks the learner to turn the phone sideways while the viewport is portrait, pauses the session and makes game controls inert. Turning sideways clears the prompt; turning back restores it. Leaving gameplay locks the menus to portrait again. The native controller no longer forces landscape and the app declares support for portrait and both landscape orientations. Physical iPhone rotation still needs verification after installation.

The rotation gate is portalled above the game stage so briefing/help overlays cannot obscure it or intercept its Back button. Briefing, help and working-board dialogs are suspended while rotation is required, without clearing their state. The gate uses the shared keyboard-focus handling and includes a rotation-lock reminder. GameGate also waits for restored account settings before checking access, avoiding an early redirect during session restoration.

Account email confirmation and password-reset links retain the existing hosted HTTPS return mechanism, then the parent signs back into the app. Native email deep links and social sign-in are not introduced by this change.

Internal TestFlight purchases remain disabled. The normal subscription and saved-progress protections remain active. The app keeps the existing profile-creation RPC, progress-email preference and account-deletion-request workflow; no automatic account deletion was added.

Validation: `node scripts/verify-ios-account-shell.mjs` uses isolated account fixtures at 390×844, 375×667, 430×932 and 844×390. It checks absence of website navigation, account-route transitions, invalid/valid credentials, learner selection and orientation bridge requests. Screenshots/results are under `qa-artifacts/ios-independent-account/`. These fixtures do not certify live credentials or physical device rotation. TypeScript, iOS sync, website build and native Mac compilation must also pass before rollout.

Completed validation: TypeScript, packaging checks, iOS sync, iOS build and website build passed. All four account-fixture viewport checks passed. [Mac simulator run 39569062725](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39569062725) compiled and launched commit `2a0de1bafaeecb79c112b074eb5d724097c61bde`; its screenshot confirms the independent account screen in portrait on iPhone 16 Pro. Native evidence is in `qa-artifacts/ios-independent-native/`. This unsigned workflow omits account settings by design; the protected upload supplies them. Physical game-entry rotation still needs testing on the owner's iPhone.

TestFlight rollout: [signed upload run 39570085629](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39570085629) succeeded for version `1.0`, build `100.3.1`. Apple completed processing without reported errors or warnings. The previously approved no-non-exempt-encryption declaration was applied, and assignment to the existing internal group was verified. Apple reports `IN_BETA_TESTING` as of 21 October 2026. Evidence: `qa-artifacts/ios-independent-upload/{build-result.json,apple-processing.json,testflight-ready.json}`. The owner can update through TestFlight; physical-device installation, portrait-to-landscape game entry and return-to-account rotation remain to be checked.

Changed implementation files: `src/main.tsx`, `src/platform/nativeApp.ts`, `src/platform/ios/{IOSAppRoot.tsx,IOSAccountLayout.tsx,IOSFamilyScreen.tsx,ios-account.css,IOSSubscriptionScreen.tsx}`, `src/website/{ParentAccount.tsx,GameGate.tsx}`, `native/ios/App/App/{Info.plist,SceneDelegate.swift}`, the generated native Capacitor configuration/SPM dependency files, `package.json`, `package-lock.json`, `scripts/{verify-ios-account-shell.mjs,verify-ios-testflight.mjs}`.

Latest rotation-prompt validation: compiled iOS account/navigation checks passed at all four viewport sizes, including portrait gate visibility, inert game controls, removal in landscape, restoration in portrait and Back to island. The test uses release output (set `LEGEND_IOS_QA_URL` to the compiled preview). Source-development StrictMode and reloads during a pending fixture save can exercise the separate save-conflict flow; these were not bypassed in production code. The isolated fixture retains saved progress and the rotation test uses client-side navigation as the app does. Evidence: `qa-artifacts/ios-independent-account/*-turn-phone.png` and `results.json`.

Rotation-prompt changed files: `src/platform/ios/IOSAppRoot.tsx`, `src/components/GameplayOrientationGate.tsx`, `src/App.tsx`, `src/website/GameGate.tsx`, `scripts/verify-ios-account-shell.mjs`, this document and `TESTFLIGHT.md`.

Assumptions: menus stay portrait; the existing landscape requirement applies to Matharia minigames, while other screens keep their existing layouts. This remains an iPhone internal-test build. No external legacy assumptions were used.

### Local gameplay dock clearance — 21 October 2026

Orientation exception added after the shared rotation work: Prime Pop and Rounding Rocket are portrait phone games. Their native lock, browser prompt and portrait layout checks are documented in [PORTRAIT_GAMES_REVIEW.md](PORTRAIT_GAMES_REVIEW.md). Other games keep their existing landscape requirement. These changes are local and awaiting the owner's “update build” instruction.

The shared gameplay utility dock now occupies a separate flex row, including its safe-area inset. Gameplay receives the remaining height instead of extending underneath the dock. Place Value Panic's phone digit bank is raised and arranged in one row on wider landscape phones; small-phone target slots are compacted. Perimeter Path uses two answer columns on landscape phones, and Scale Builder removes excess control spacing on short screens.

Validation: TypeScript, iOS build and website build passed. Browser geometry checks passed for all 37 game types at 844×390, 667×375 and 1440×900 (111 checks). Phone profiles simulate a 21px bottom inset. Failed introductory-dialog automation was corrected and affected cases rerun. These checks cover visible button bounds and dock overlap, not every gameplay state or physical-device safe-area behaviour. Screenshots and merged results: `qa-artifacts/game-dock-clearance/index.html` and `results-final.json`.

Changed files for this task: `src/components/UnifiedMiniGameHud.tsx`, `src/components/game-ui/gameplay-dock-layout.css`, `src/main.tsx`, `src/games/place-value-panic.css`, `src/games/review-polish.css`, `src/games/scale-builder.css`, `scripts/verify-game-dock-clearance.mjs`, `scripts/report-game-dock-clearance.mjs`, this document, and generated QA evidence in `qa-artifacts/game-dock-clearance/`.

Assumption: the existing shared utility bar remains available during gameplay; the play area should reserve its actual height at every screen size. No external legacy assumptions were used. All changes remain local. Do not upload to TestFlight until the owner says **“update build”**.
