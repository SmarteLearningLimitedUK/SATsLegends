> Historical first-pass notes. Current results and release blockers are recorded in [release-readiness-2026-11-04.md](release-readiness-2026-11-04.md).

# iOS release readiness â€” working checklist

Status: IN PROGRESS. This is not a submission approval.

## Target and baseline
- Matharia Capacitor target: variants/matharia; app ID com.smartelearning.satslegends.
- iOS 16.4 minimum, iPhone and iPad enabled, portrait and landscape in Info.plist.
- Web release build: 867 files, 351,132,654 bytes (2026-11-04). This is not an IPA or App Store upload size.
- After excluding an unused reference contact sheet: 866 files, 350,234,919 bytes (897,735 bytes saved). The source remains in public/reference-assets. This is web output, not IPA size.
- Eager runtime asset glob in variants/matharia/src/assets.ts includes a broad library; audit runtime reachability before exclusions.

## Verified
- Matharia TypeScript check: pass.
- Matharia production web build: pass; Vite reports large chunks.
- iOS minimum configuration check: pass.
- verify-ks2-content-generators.mjs: pass.
- verify-five-tier-difficulty.mjs: 28/28 checks pass; qa-artifacts/five-tier-difficulty/report.json.
- verify-educational-integrity.ts: pass.
- verify-learning-systems.ts: pass.
- verify-revision-targets.ts: pass.
- verify-calendar-pictogram.ts: pass (5,000 questions in each category).
- Release output no longer contains preview-contact-sheet.png; original retained.

## Outstanding
- Browser gameplay checks attempted with WebKit, but the browser could not connect to the local development server; no browser gameplay or screenshot coverage is claimed. Chromium executable was unavailable.
- Complete per-game and screen coverage matrix, layout contracts and screenshots, including all tiers, practice, feedback and navigation.
- Review all shipped question stems and generator variants for age-appropriate language and assessment integrity.
- Reproduce and regression-test Prime Pop spawn and danger-line behaviour over the complete timer.
- Exercise pause, retry, backgrounding, progress, purchases, account and offline paths.
- Trace dynamic and static asset references, exclude proven unused assets only from release, rebuild and compare sizes.
- Verify icons, launch presentation, privacy declarations, App Store metadata, review access, and production purchase configuration.
- Build and test the native archive and upload size with Xcode and representative iPhone/iPad devices. Xcode is not available in this Windows environment.
- Review Apple requirements: https://developer.apple.com/app-store/review/guidelines/ .

## Assumptions
- The Matharia Capacitor target is the release app based on the repository configuration.
- No external legacy assumptions were used.
