# Mission-card padding — 1 November 2026

The supplied image shows Next Mission copy and the Mission Board heading too close to the ornate edges. The correction applies to the shared island-selection presentation.

## Changed files

- `variants/matharia/src/shared/shared-adventure.css`: increases internal spacing for Next Mission and Mission Board at portrait, landscape and tablet sizes. On iPhone 15, Next Mission copy/button side insets are 32px instead of 22px; the Mission Board heading has 32px side insets and 34px top clearance instead of 17px/24px. Header text previously also had an extra 2px horizontal inset. Tablet gutters are 44px with 52px top clearance. Fonts and frame artwork retain their existing sizes and style.
- The scenic region, island identity clearance and small portrait guide position reserve space for the taller padded card. The mission list retains its bounded scrolling area.
- This document, `docs/concept-recreation/shared-adventure-checklist.json` and `docs/concept-recreation/WORKLOG.md` record the correction.
- Generated native web assets refreshed with Capacitor sync.

No React controllers, educational content, progression, locks, callbacks, subscriptions or purchase logic were edited. No new artwork or background covers were introduced.

## Evidence and checks

The actual compiled application was checked with the repository's isolated account fixture. This fixture does not call live account services.

| Case | Browser viewport | Checks |
|---|---|---|
| iPhone 15 portrait | 393 × 852, 3× | Padding, readable title, identity/card clearance, scrolling and live controls |
| Compact portrait | 320 × 568, 3× | Same, including available mission-list height |
| Phone landscape | 852 × 393, 3× | Same |
| iPad landscape | 1024 × 768, 3× | Same |
| iPad portrait | 768 × 1024, 3× | Same |
| Second island | 320 × 568, 3× | Same, with Takeout Rush's real title and destination |
| Long-title layout stress | 320 × 568, 3× | Longest existing game name temporarily placed in the Next Mission title; original text restored before functional checks |

For each actual route, Parent account opens/closes, game groups expand/collapse, and Continue reaches the original game. The compact list remains intentionally scrollable. There is no page overflow.

The long-title stress uses a temporary DOM-only copy substitution from the existing game-name list. It is layout evidence rather than a changed production title or fabricated game state. Its metadata is explicit in `after-long-title/checks.json`.

TypeScript, the iOS-mode production build and existing shared source contracts passed. All 37 approved reference hashes remain unchanged. Capacitor sync preserves minimum iOS 16.4; the native web copy is hash-checked against the compiled bundle.

Evidence beneath `qa-artifacts/mission-padding/`:

- `before-after.png`, `before-cards.png`, `after-cards.png`: comparison and focused crops of actual phone captures.
- `before/`, `after/`: full captures and geometry/control records.
- `after-long-title/checks.json`: separately identified title stress.
- `typecheck.log`, `build.log`, `source-contract.log`, `ios-sync.log`, `native-copy.json`, `RESULT.json`.

## Assumptions and remaining verification

The request concerns the two shared island-selection cards in the image. Existing typography and sapphire/gold artwork are authoritative; the correction gives their content more room. The fixture shows Level 1 rather than the photographed Level 2 because it uses a fresh isolated player state.

These are WebKit browser viewport checks with reduced motion, not native iPhone/iPad tests. Native execution, Dynamic Type and device performance remain unverified on this Windows host. The local iOS bundle is updated; this patch has not been uploaded to TestFlight, deployed or merged.

No external legacy assumptions were used. The changes use the supplied image and current repository files.
