# Independent iPhone interface

The iOS target now boots its own `IOSAppRoot`, rather than the website router. Account screens and the learner picker use the app's own scenery, layout and navigation. The website continues to use `WebsiteRoot`.

Accounts are shared, not duplicated: both clients use the existing Supabase email/password flow, FamilyAccount provider, entitlement checks and saved-progress GameGate. Existing website credentials, learners and progress remain the source of truth. No database or authentication settings were changed.

The iPhone starts in portrait. Sign-in, account creation, password recovery, learner selection and subscription screens request portrait. Entering Matharia with an authenticated, entitled learner requests landscape; returning to account screens requests portrait again. The native controller no longer forces landscape and the app declares support for portrait and both landscape orientations. The official Capacitor Screen Orientation plugin applies route-driven locks. Physical iPhone rotation still needs verification after installation.

Account email confirmation and password-reset links retain the existing hosted HTTPS return mechanism, then the parent signs back into the app. Native email deep links and social sign-in are not introduced by this change.

Internal TestFlight purchases remain disabled. The normal subscription and saved-progress protections remain active. The app keeps the existing profile-creation RPC, progress-email preference and account-deletion-request workflow; no automatic account deletion was added.

Validation: `node scripts/verify-ios-account-shell.mjs` uses isolated account fixtures at 390×844, 375×667, 430×932 and 844×390. It checks absence of website navigation, account-route transitions, invalid/valid credentials, learner selection and orientation bridge requests. Screenshots/results are under `qa-artifacts/ios-independent-account/`. These fixtures do not certify live credentials or physical device rotation. TypeScript, iOS sync, website build and native Mac compilation must also pass before rollout.

Changed implementation files: `src/main.tsx`, `src/platform/nativeApp.ts`, `src/platform/ios/{IOSAppRoot.tsx,IOSAccountLayout.tsx,IOSFamilyScreen.tsx,ios-account.css,IOSSubscriptionScreen.tsx}`, `src/website/{ParentAccount.tsx,GameGate.tsx}`, `native/ios/App/App/{Info.plist,SceneDelegate.swift}`, the generated native Capacitor configuration/SPM dependency files, `package.json`, `package-lock.json`, `scripts/{verify-ios-account-shell.mjs,verify-ios-testflight.mjs}`.

Assumptions: “portrait until the games begin” means account screens and learner selection stay portrait, then the Matharia game world uses landscape. This remains an iPhone internal-test build. No external legacy assumptions were used.
