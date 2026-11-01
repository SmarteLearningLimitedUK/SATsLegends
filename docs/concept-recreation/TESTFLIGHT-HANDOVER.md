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

Current preparation stop: Codex automatic approval review rejected the first attempt to create the remote CI branch, upload the draft candidate and dispatch the workflow, because that exact storage/egress mechanism needed explicit approval. No part of that helper ran. Local preflight and package checks passed; native CI and Apple upload have not started. User approval for those concrete GitHub operations is pending. This is separate from the repository's existing signing-environment review.

GitHub draft visibility reference: https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization
