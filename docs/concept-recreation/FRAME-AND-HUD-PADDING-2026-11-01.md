# Question-frame and footer padding corrections — 1 November 2026

The attached Number Line Ninja image showed scenery leaking between the hollow gold frame and its teal backing. The three-button footer image showed labels against the bottom gold rim.

## Changes

- `variants/matharia/src/ArtworkFrame.tsx`: the 1600 × 533 hollow question frame's backing now uses measured source-pixel insets and the same scale as its corner slices. The material extends beneath the inner rim; it is a real panel backing, not an overlay concealing background artwork. Other frame materials retain their existing rendering. This shared frame serves Number Line Ninja, Place Value Panic, Rounding Rocket and Simplify Sprint.
- `variants/matharia/src/hub-hud.css`: menu/footer button height 48 → 58px, with 20px icon and 18px text rows, a 3px gap and deliberate internal padding. The existing 14px menu caption is preserved. Menu footer and map footer containers reserve the required height. Three-button label bottom clearance increased from 1px to 11.5px; map labels have 12.5px clearance.
- `variants/matharia/src/wellbeing-scene.css`: content reserves the matching extra 10px above the taller footer. Peaceful Pond remains landscape and its content clears the footer.
- This document and `docs/concept-recreation/WORKLOG.md`; generated native web assets updated by Capacitor sync.

## Verification

TypeScript check and production build passed. Ten WebKit layout/control cases passed against the compiled bundle, using real routes with the repository's isolated account fixture. Tested iPhone 15 fullscreen dimensions (393 × 852 and 852 × 393, at 3×), plus iPad. Gameplay cases use simulated safe-area insets. These are browser checks, not native device tests.

All five frame-fill cases passed pixel checks: thirty samples just inside the transparent frame opening show the intended teal material, including both sides at multiple heights. The original Number Line Ninja samples showed scenery instead. Waits ensure entrance transitions finish before frame pixels and screenshots are compared.

Footer labels remain contained and controls retain at least 44px targets. Sound and Music toggles change and restore their real UI state. Peaceful Pond's main content remains above the footer. Existing gameplay/question-bank code was not edited; the existing source-contract check passed with all 37 original approved references unchanged.

| Screen/case | Browser viewport | Result |
|---|---|---|
| ninja | 852 × 393 | Pass |
| settings | 852 × 393 | Pass |
| profile | 393 × 852 | Pass |
| pond | 852 × 393 | Pass |
| pvp | 393 × 852 | Pass |
| rocket | 393 × 852 | Pass |
| sprint | 852 × 393 | Pass |
| ninja-ipad | 1024 × 768 | Pass |
| settings-ipad | 768 × 1024 | Pass |
| map | 393 × 852 | Pass |

Evidence: `qa-artifacts/frame-padding/before-after.png`, `after/checks.json`, `surfaces/pixels.json`, `build.log`, `typecheck.log`, `source-contract.log`, `ios-sync.log` and `RESULT.json`.

## Assumptions and remaining verification

The first image reports the gap inside the question-frame aperture; the second reports the shared three-button menu footer. The current approved blue/gold artwork and caption sizes are retained. No new art or gameplay systems were needed.

iOS minimum remains 16.4. The corrected bundle is synced into the native project. Native simulator/device checks and a new signed TestFlight upload remain pending for this patch.

No external legacy assumptions were used. The corrections use the supplied images and current repository files.
