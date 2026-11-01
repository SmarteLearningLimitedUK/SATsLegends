# Matharia on the existing SATs Legends TestFlight app

The user selected the existing App Store Connect record and a GitHub macOS build on 1 November 2026. The separate source/native project retains Matharia presentation and display name. Its upload identity is `com.smartelearning.satslegends`; minimum iOS/iPadOS is 16.4. The original native project is unchanged.

## Existing repository configuration

The repository's successful upload at commit `98a0bbd6c705647bcc5e228cf94bda4bcb31eaba` supplies app ID `6825120444`, team `D8L3PZ8Y72` and the automatic-signing/export method. The existing `ios-testflight` environment already contains `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_PRIVATE_KEY_P8`. Values are never retrieved locally. Its required reviewer and `ios/testflight-upload-*` branch restriction are preserved. The release branch follows that required repository naming. No merge or public App Store submission is part of this task.

## Repeatable candidate build

1. Build and sync the separate variant in the source checkout. Run TypeScript and `ios:check`.
2. Run `python variants/matharia/scripts/prepare-testflight-handoff.py --tag matharia-ci-YYYYMMDD-vN` from the repository. It verifies all compiled web files against the native copy, the bundle identity, all four OS minimums and the local Swift dependency. It produces a ZIP under ignored `qa-artifacts/testflight/` and a checksum manifest under `variants/matharia/release/`.
3. Keep the candidate ZIP on a **draft** GitHub release. Do not publish the release. The workflow downloads this exact checksum-pinned artifact. Draft releases require write-role access to view, so the runner token needs `contents: write` to read the draft; the workflow does not publish or modify a release. CI scripts/manifest committed to the public repository are publicly visible; the candidate ZIP remains in the unpublished draft. The ZIP contains native source, the local Swift plugin and compiled web assets. This is a native compilation of the current local frontend bundle, not a clean-source npm rebuild on CI. The local source checkout remains the frontend editing source.
4. The release branch contains the workflow, its supporting scripts and candidate manifest. A separate Git tree/commit is created remotely; the local branch/index and unrelated pending changes are preserved. The default branch is not changed.
5. Run `.github/workflows/ios-testflight.yml` on that branch. The macOS 26 runner verifies package integrity, compiles the actual native source using Xcode 26+, installs/launches it on iPhone and iPad simulators and captures screenshots/process evidence.
6. After native checks, the existing GitHub environment requires the designated reviewer's approval before the upload job receives Apple credentials. No policy is removed or bypassed.
7. The upload job verifies the live existing Apple app record, reads its build history, retains the current marketing version and chooses an incremented build number. It verifies the archive identity/minimum OS, signs through the existing Xcode automatic-signing method and exports **internal TestFlight only**. It polls Apple for processing and records the outcome.

The workflow's `matharia-native-checks` artifact contains native launch screenshots and diagnostics. `matharia-testflight-result` contains upload/processing evidence. Temporary private keys and exported packages remain outside artifact folders and are removed on script exit. API credentials are used only in the protected runner.

## Verification limits

Simulator launch/process survival does not certify native gameplay, StoreKit, physical devices or an iOS 16.4 runtime. Browser gameplay coverage is separately recorded in `SHARED-SCREENS-HANDOVER.md`. A successful upload command is not proof that Apple processing has finished or that export-compliance/tester requirements have been satisfied. Read the CI result and verify the build in TestFlight before installation claims.

Scoped source changes: `.github/workflows/ios-testflight.yml`; `variants/matharia/capacitor.config.ts`; its native `project.pbxproj`; `variants/matharia/scripts/prepare-testflight-handoff.py`, `run-native-ci.mjs`, `ios-testflight-config.mjs`; `variants/matharia/release/candidate.json`; the variant README and concept handover/worklog documents. Generated native config and ZIP/evidence are build outputs.

Assumptions: existing SATs Legends app; Matharia display name retained; internal beta upload only; existing reviewer policy retained. All identities/signing behaviour come from this repository's opened successful workflow, then are verified against Apple in CI. No external legacy assumptions were used.

The user explicitly approved the CI branch, draft candidate upload and Mac build. The isolated branch is `ios/testflight-upload-matharia-20261101-v1`, initially at `9b8199ca7e834eea4310facc501f0692c95578f8`. The checksum-verified candidate is stored on unpublished draft release `matharia-ci-20261101-v1`. Native CI started at https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/41336267261 . Apple upload remains gated by successful native checks and the existing signing-environment review. See local `qa-artifacts/testflight/github-run-status.json` for the latest captured state. The initial automatic approval rejection was resolved by the explicit user authorization; no review policy was bypassed.

GitHub draft visibility reference: https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization


Native run 41336267261 compiled with Xcode 26.6 but caught a real startup failure: `server.appStartPath=/play` referred to a missing bundled file. The variant now uses Capacitor’s default bundled index. Existing `initializeNativeApp` synchronously selects the React `/play` route before rendering. The packager rejects nonexistent startup files. Candidate v2 preserves all 856 compiled web files; native simulator checks are rerun before signing. The original project remains unchanged.


Run 41336929647 compiled successfully and verified install, launch and process survival on iPhone 17 Pro and iPad Pro 13-inch (M5). Native screenshot inspection rejected its iPhone account header because the Dynamic Island covered the signup control. The waiting upload was cancelled before signing. Added variant-only `src/native-account.css`, imported by `src/main.ts`, to inset account header controls and footer content using native safe areas. Six browser profiles with simulated insets passed header bounds, menu interaction, signup navigation and footer clearance. Candidate v3 reruns the actual native check and screenshot review. Gameplay logic/content and the original project remain unchanged. Native gameplay, StoreKit and an iOS 16.4 runtime remain unverified.


Current candidate v3: SHA-256 `c1084c884d59ab0266769b68dde09145fc0574c3199a359afc0048b77389c6d9`; CI commit `3774b4fb51df38a962c8b6a97890d28d261e668a`. Native run https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/41338330116 passed on Xcode 26.6. iPhone 17 Pro and iPad Pro 13-inch (M5) both installed, launched and survived. Captures were inspected: iPhone header controls now clear the Dynamic Island; the iPad account layout is retained. Evidence: `qa-artifacts/testflight/native-run-41338330116/`. Six simulated-inset browser profiles also passed. These checks establish native startup and the captured account layout, not native gameplay, StoreKit, physical-device behaviour or iOS 16.4 runtime compatibility. Original project/root package hashes still match.

The signed upload job is waiting at the existing `ios-testflight` environment review. On the run page select **Review deployments**, select **ios-testflight**, then **Approve and deploy**. Apple credentials have not been accessed by the waiting job and no Apple upload has started. After approval, verify `matharia-testflight-result/result.json` and Apple processing; do not infer upload success from this native-check pass. No external legacy assumptions were used.


## Verified upload — 1 November 2026

The user approved the existing GitHub environment review. Run https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/41338330116 completed successfully. Apple confirmed the existing **SATs Legends** record (`6825120444`, `com.smartelearning.satslegends`). The Matharia reskin uploaded as **1.0 (100.10.1)** with minimum iOS/iPadOS **16.4**. The signed archive identity/minimum OS were verified before upload. Apple build ID: `4e37f290-4edc-4f31-97c0-608638bfac29`; processing state **VALID**; not expired. Export was **internal TestFlight only**. No public App Store submission or source merge occurred.

Authoritative receipt: `qa-artifacts/testflight/upload-run-41338330116/result.json`. The receipt reports `usesNonExemptEncryption: null`. The pipeline did not query tester eligibility or confirm export-compliance completion; upload/processing success must not be described as verified tester installation. Review the build in App Store Connect/TestFlight. Physical-device gameplay, StoreKit and actual iOS 16.4 runtime checks remain unverified. Native startup/account captures on the runner and the separately documented browser gameplay checks passed.

### Source for this uploaded build

- Frontend editing source: `D:/BrainZilla/GitHub/SATsLegends/variants/matharia/`, using the current shared React/TypeScript engine under the same repository's `src/`.
- Native project: `D:/BrainZilla/GitHub/SATsLegends/variants/matharia/native/ios/App/App.xcodeproj`.
- Exact packaged native/compiled-web snapshot: `qa-artifacts/testflight/matharia-mac-testflight-candidate.zip`, also retained on unpublished draft release `matharia-ci-20261101-v3`.
- Candidate SHA-256: `c1084c884d59ab0266769b68dde09145fc0574c3199a359afc0048b77389c6d9`.
- Source checkout base HEAD: `fe35bdcf49b6a5c5a302e9582e486c742441e30d`, plus the current working-tree reskin snapshot. This was not a clean frontend rebuild from that commit alone.
- CI commit: `3774b4fb51df38a962c8b6a97890d28d261e668a` on `ios/testflight-upload-matharia-20261101-v1`. That isolated branch contains CI support and the pinned artifact manifest; the local checkout remains the complete frontend editing source.

Additional scoped presentation fix: `variants/matharia/src/native-account.css` and its import in `variants/matharia/src/main.ts`. Other changed files are listed above. The original native project, root package and local branch/index were preserved. No external legacy assumptions were used.


## Export compliance and install availability follow-up

The user requested export compliance completion and verified TestFlight install availability. The current build remains **1.0 (100.10.1)**; no replacement binary is needed. Source/installed-SDK review found HTTPS networking, OS WebCrypto hashing/signature verification and UUID generation, with no custom encryption implementation. Apple documents OS-only cryptography as requiring no encryption documentation: https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/ . The reviewed declaration is `usesNonExemptEncryption: false`, not a claim that HTTPS/authentication use no cryptography. Reassess it if the app's encryption dependencies change.

Added an API-only `enable-existing-build` operation to the existing protected workflow. It verifies the exact app/build, records the exemption when unanswered, checks existing internal group memberships, respects automatic all-build access, adds the build to eligible existing internal groups if needed, and requires Apple's `IN_BETA_TESTING` state plus actual tester membership before reporting install availability. It does not create testers/groups, invite users, enable public links or submit external testing. The private Apple key remains in the existing GitHub environment. Its existing reviewer requirement remains intact.

The variant `Info.plist` now declares `ITSAppUsesNonExemptEncryption=false` for future binaries, and the local packager checks it. The uploaded snapshot c1084c884d59ab0266769b68dde09145fc0574c3199a359afc0048b77389c6d9 is immutable and predates this plist edit; the current build is updated through Apple's metadata API. Future upload runs use the same availability verification after Apple processing.

Scoped files: `.github/workflows/ios-testflight.yml`; `variants/matharia/scripts/testflight-availability.mjs`, `enable-testflight-build.mjs`, `testflight-availability.test.mjs`, `run-native-ci.mjs`, `prepare-testflight-handoff.py`; `variants/matharia/release/testflight-build.json`; `variants/matharia/native/ios/App/App/Info.plist`; this handover and operation evidence under ignored `qa-artifacts/testflight/`. Seven local checks cover correct/wrong build identity, idempotency, automatic internal groups, conflicting encryption declarations, exclusion of external groups and empty-group handling. Live status is recorded only after the protected operation runs. No external legacy assumptions were used.


API maintenance commit `7eae291d7fed990217f194a4b1984715f483361a` is queued at https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/41341912056 . Native checks and the binary-upload job are skipped for this operation. It is waiting for the existing `ios-testflight` reviewer before Apple credentials can be used. No Apple metadata or tester membership has been changed by this waiting job.


Maintenance run 41341912056 verified build 100.10.1 was MISSING_EXPORT_COMPLIANCE and successfully saved `usesNonExemptEncryption=false`. Its following tester-association read failed with HTTP 403 because the implementation used GET on the build betaGroups relationship. Corrected those reads to Apple’s documented `/v1/betaGroups?filter[app]=...&filter[builds]=...&filter[isInternalGroup]=true` endpoint. POST assignment still uses the documented write relationship. The tests now reject the unsupported GET route and validate the app/build/internal filters. Seven checks pass. The same already approved build and internal-testing scope is retried; no replacement binary, new testers or external distribution.


Retry 41342725780 confirmed `usesNonExemptEncryption=false` and `READY_FOR_BETA_TESTING`, but the live API rejected the combined global betaGroups filter with HTTP 400 despite its documented parameters. Changed verification to read the supported related-builds collection for each existing internal group. Tester counts are now persisted before association queries. Existing all-builds group access is respected; no users, groups or invitations are created. Seven regression checks pass, including rejection of both failed read forms. The same approved operation for 100.10.1 is retried.
