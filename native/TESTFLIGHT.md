# Internal iPhone testing

App Store Connect record: `6825120444`; bundle ID: `com.smartelearning.satslegends`; Apple team: `D8L3PZ8Y72`. These were verified in the owner's Apple portal. The first unsigned Mac build passed; signed packaging and Apple processing are separate checks.

## Prepared upload path

The unsigned simulator workflow also runs `scripts/smoke-ios-simulator.mjs`: it installs and launches the packaged app in an available iPhone simulator, checks process survival and captures a screenshot and app logs. This is a startup smoke test, not an automated gameplay or payment test. It needs a cloud run before claiming a pass.

`.github/workflows/ios-testflight.yml` uses a macOS/Xcode 26 runner and the `ios-testflight` GitHub environment. It runs on manual dispatch or an explicit `ios/testflight-upload-*` branch push. It does not run on pull requests. Keep this environment restricted to those branches and require owner approval before credentials are released to a job.

The upload script authenticates to Apple's fixed API endpoint and verifies the exact app/bundle before allowing Xcode provisioning updates. Automatic signing may create signing certificates and provisioning profiles on the team. The proposed team API key has Admin access because cloud-managed distribution signing requires it. This is broad access across the Apple account, not an app-limited key; get explicit owner approval before generating or storing it. Do not paste keys into chat or source files. Revoke it in Apple if compromised or no longer needed.

Store these as environment secrets, available only to the archive/upload step:

- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_PRIVATE_KEY_P8` (raw P8 file content)

Store the existing public production configuration as environment variables:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_IOS_PRIVACY_URL`, `VITE_IOS_TERMS_URL`, `VITE_IOS_AUTH_ORIGIN`

Public account configuration is currently missing in this worktree; do not ship a build that opens an unusable account gate. The release-config checker deliberately blocks upload until valid settings exist. Never use service-role keys in public configuration. Legal URLs must point to actual published documents. The build keeps preview/paywall bypass disabled and Apple purchases still require the server's independent readiness check.

Update, 21 October: the owner supplied the existing project's public URL/publishable key; the public Auth settings endpoint accepted them and reported email sign-in enabled. These settings are stored as GitHub environment variables, not hardcoded in source. `VITE_IOS_AUTH_ORIGIN` retains the existing `https://satslegends.com` account-return origin.

The first internal package explicitly sets `VITE_IOS_INTERNAL_TESTING=true`, disabling new Apple purchases in its subscription screen, even if the server and products are ready. It retains normal account and entitlement checks: the tester needs an existing paid or complimentary Matharia account. This package uses the internal-test configuration validator (account URL/key and HTTPS auth origin required); missing published legal URLs do not block this purchase-disabled internal test. The public-release validator remains strict, requires legal links and rejects the internal-test flag. Billing testing needs a later configured sandbox build and a validated legal setup.

## Commands and behaviour

Latest update, 22 October 2026: version `1.0`, build **`100.5.1`**, uploaded successfully in [run 39605534556](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39605534556). Apple completed processing with no errors or warnings and reports `IN_BETA_TESTING`; assignment to the existing internal group is verified. It includes the pending rotation, portrait-game, dock, Prime Pop, zombie contrast/audio and Breath Bloom fixes. See `CURRENT_TESTFLIGHT_UPDATE.md` for validation scope, the old responsive-suite limitation, changed files and evidence. Physical iPhone testing remains outstanding. No public App Store submission was made.

Latest internal update: version `1.0`, build `100.3.1`, successfully uploaded in [run 39570085629](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39570085629). Apple reports `IN_BETA_TESTING`, and its assignment to the existing internal group is verified. This update introduces the independent app account interface, portrait account screens and landscape Matharia entry; see `APP_INTERFACE.md`. No new invitation or tester was created. Evidence is under `qa-artifacts/ios-independent-upload/`. Device rotation and updated gameplay still need the owner's iPhone test.

Next prepared update changes game entry to a visible turn-phone prompt instead of forcing landscape. Menus stay portrait; minigames permit physical rotation and use the existing paused/inert gameplay gate. Compiled browser checks pass for portrait → landscape → portrait and Back to island. No Swift or dependency changes are included in this pass; physical iPhone behaviour still needs the next TestFlight update. See `APP_INTERFACE.md` for changed files and validation scope.

The first archive attempt used development provisioning and Apple rejected it because the new team has no registered devices. The revised archive disables build-time code signing; the following automatic App Store Connect export performs distribution signing. This path successfully signed and uploaded version `1.0`, build `100.2.1`, in [run 39523706304](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39523706304) on 21 October 2026. No device UDID was collected or registered.

Apple's upload API confirms upload `37e6e00e-3336-416d-8000-55bc748b59c4` is `COMPLETE` and its build is `VALID`, with empty error and warning lists. The build audience is `INTERNAL_ONLY`. Following the owner's explicit approval, Apple accepted `usesNonExemptEncryption=false`. The build was successfully assigned to **SATs Legends Internal Testing** (`e330b57c-4426-4302-b59c-a5fcc26d97ee`), and Apple reports `READY_FOR_BETA_TESTING`. Evidence: `qa-artifacts/ios-testflight-upload/{build-result.json,apple-processing.json,encryption-declaration.json,beta-status.json}`. Following separate explicit approval to add the owner and send an invitation, Samantha's existing Account Holder identity was checked, a matching tester was created and group membership verified. Apple reports email invitation state `INVITED`; non-email evidence is in `owner-tester.json`. No other testers were added. Accept the TestFlight invitation on the iPhone and install build `100.2.1`. Successful physical-device installation and gameplay remain unverified.

Native launch testing also exposed `server.appStartPath: '/play'`: Capacitor checks for a physical bundled startup file, whereas `/play` is a React route. The package contains `index.html`; `initializeNativeApp` selects the initial React route after loading it (now `/parent` for the independent app interface). The native override has been removed. The smoke check captures the application console, screenshot and process status, and must pass on the Mac runner before retrying upload. The scene uses its storyboard-owned window and `GameViewController`, avoiding a second WebView. Compilation alone does not establish startup success.

The corrected native startup passed in [simulator run 39522832173](https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/39522832173), commit `84e08859c31e7e2b1975237f425c7504064b3fa1`, on iPhone 16 Pro. Evidence is in `qa-artifacts/ios-entry-fix/`: the process survived and the console confirmed WebView loaded. This unsigned compile workflow intentionally has no account configuration, so its screenshot shows the account-service-unavailable screen; the protected TestFlight workflow supplies the owner-provided public configuration. This establishes native startup, not authenticated gameplay or payment behaviour.

- `node scripts/verify-ios-testflight.mjs` tests packaging configuration and JWT signing without Apple credentials or external requests.
- `npm run ios:check:release` validates public settings without printing their values.
- `npm run ios:sync` builds and copies the web game into the native project.
- `npm run ios:package:testflight` archives and exports a signed internal-testing package on Mac; it does not upload.
- `npm run ios:upload:testflight` archives and uploads using Xcode's authenticated distribution flow.

`IOS_BUILD_NUMBER` is generated as `100.<workflow run number>.<attempt>`; the marketing version remains `1.0`. Temporary P8 files are deleted in a `finally` block. Credentials never enter artifacts. The workflow publishes only a non-secret build-result JSON; app archives stay on the ephemeral runner.

The export has `testFlightInternalTestingOnly=true`. It is intended for the owner's internal testing and cannot be used for public App Store submission. Xcode upload success is not Apple processing success. After upload:

1. Open the app's TestFlight tab and wait for processing. Address any Apple validation/export-compliance questions accurately.
2. Create/select an internal testing group and add the owner's App Store Connect user and processed build. Do not invite other people without explicit instruction.
3. Install Apple's TestFlight app on the iPhone, accept the owner's test invitation and install SATs Legends.
4. Test both landscape orientations, account creation/login/recovery, saved progress after restart, interrupted/offline saves, sound interruptions and background/foreground state.
5. When sandbox subscriptions are configured, test purchase, pending approval, cancellation, restore/reinstall and original-account ownership. Never treat fixture tests as a real payment test.

Account deletion, billing reconciliation, final app artwork, legal/privacy metadata and the other gates in `APP_STORE_PREPARATION.md` remain separate from this internal test upload. No App Review submission or public release is performed by this workflow.

Changed files in this pass: `.github/workflows/ios-testflight.yml`, `scripts/{ios-testflight-config.mjs,build-ios-testflight.mjs,verify-ios-testflight.mjs}`, `package.json`, this document and the preparation-document link. Assumptions: use the verified Apple team and existing app, internal testing first, and existing production account services. No external legacy assumptions were used.

Primary references: [Apple API keys and access](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api), [cloud signing](https://developer.apple.com/videos/play/wwdc2021/10204/), [upload builds and processing](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/).

Additional preparation changes: `scripts/ios-release-config.mjs` separates internal and public release validation; `src/platform/ios/IOSSubscriptionScreen.tsx` disables purchases in internal builds; `scripts/verify-ios-subscriptions.mjs` checks that behaviour; `.env.example` documents the flag. The ignored `.env.ios.local` holds only owner-supplied public settings. The Vite lockfile patch moves the build tooling to 6.4.4 after an audit finding; the production dependency audit reports no vulnerabilities. Existing moderate findings in development-only Capacitor tooling have no non-breaking automatic fix and were not force-upgraded.
