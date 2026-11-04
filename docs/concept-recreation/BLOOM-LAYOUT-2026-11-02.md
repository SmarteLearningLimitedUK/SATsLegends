# Breath Bloom readability and viewport layout — 2 November 2026

Implemented against the supplied iPhone 15 photo and the existing production artwork. This screen is React rendered inside the Matharia Capacitor app. The original breathing controller, shell source, completion logic, pace durations, cycle count and content remain unchanged on disk. No external legacy assumptions were used.

## Screen checklist

| Region/state | Implementation | Verification/evidence |
| --- | --- | --- |
| Shared top HUD | Shows the actual activity name, Breath Bloom; removed the overlapping centre crest on this screen | Six final layouts; label/title clear at compact widths |
| Introduction | Full original instructions in a padded solid panel below the HUD; duplicate heading retained for assistive technology | iPhone 15 HUD overlap changed from 47px to 14px clearance |
| Pace selection | Opaque surfaces, larger text, clear selected border, stable disabled state, minimum 44px controls | All three original paces exercised through real controls |
| Flower/garden | Takes the remaining grid row; artwork keeps its aspect ratio; original five-flower progression and breathing scale retained | Initial, paused and four completed-cycle captures inspected; small viewport no longer collapses the flower |
| Live cue and action | Padded solid cue panel, readable supporting text, full-width action | Six layouts; 125% browser text stress; original pause/resume and user-started cycles |
| Status/progress/Tips | Anchored above the bottom dock; progress uses available width; larger Tips target | iPhone 15 unused gap reduced from 67.6px to an intentional 8px; original fact and keep-tip control work |
| Short viewport | Below 621px height, introduction remains in the document and is available inside Tips; live comfort guidance stays visible | 320×568 browser case passes, with a visible flower and accessible controls |
| Completion/navigation | Original four-cycle finish and reward dialog; Choose another activity returns to Calm Grove; shared Back keeps its original adventure-map destination | Four full flows and a separate real-clock Back check passed |
| Native preparation | Production bundle copied through Capacitor; minimum iOS 16.4 retained | 840 public files hash-verified; native execution and TestFlight upload pending |

## Layout and evidence

Reserve the shared 60px HUD at safe-top + 8px. Main content begins at safe-top + 82px, giving 14px clearance. It ends at safe-bottom + 86px, giving 8px above the existing 70px bottom dock. The main column is at most 720px wide, with 16px phone gutters.

The shell has introduction, flexible activity and footer rows. The activity has pace, flexible garden, cue and action rows with explicit gaps. The garden uses its own size container; the main flower is constrained by 68% of width, 78% of height and a 300px maximum. This keeps the original smaller flowers proportional and avoids arbitrary viewport offsets. The final iPhone 15 garden is 246.1px tall. Text has intentional line heights and padding; essential guidance uses solid teal surfaces instead of sitting directly over bright water.

- [Supplied photo versus final running browser screen](../../qa-artifacts/bloom-layout/before-after.png)
- [Final iPhone 15](../../qa-artifacts/bloom-layout/after/iphone15.png)
- [Compact phone](../../qa-artifacts/bloom-layout/after/compact.png)
- [320×568 stress viewport](../../qa-artifacts/bloom-layout/after/small.png)
- [Portrait iPad](../../qa-artifacts/bloom-layout/after/ipad.png)
- [Wide iPad](../../qa-artifacts/bloom-layout/after/ipad-wide.png)
- [Actual four-cycle garden](../../qa-artifacts/bloom-layout/flow/webkit-phone-cycle-4.png)
- [Normal-motion paused state](../../qa-artifacts/bloom-layout/normal-paused.png)
- [125% browser text](../../qa-artifacts/bloom-layout/text-125.png)

These are actual compiled-application captures. The comparison labels identify the supplied native photo separately from the browser rendering. Earlier failure screenshots are diagnostic iterations, not final evidence; final receipts are below.

## Checks

Six final WebKit layouts: 320×568, 375×667, iPhone 15 393×852, large phone 430×932, portrait iPad 768×1024 and wide iPad 1024×768. Insets were explicitly simulated: iPhone 15/large phone 59px top and 34px bottom; smaller phones 20/0px; iPad 24/20px. All pass non-overlap, minimum garden size, 44px target/hit checks, dock clearance and no document scrolling.

Four full activity flows: WebKit compact/phone/iPad and Chromium phone. Each exercises Easy 3s/4s, Steady 4s/5s and Unhurried 5s/6s; disabled pace controls during a cycle; pause/resume without progress loss; check-ins between user-started cycles; 25/50/75/100% progress; five flowers after four cycles; explicit Finish reset; the completion dialog; and return to Calm Grove. Tips retains the full introduction, original calming fact, keep-tip toggle and Escape dismissal.

A separate real-clock Chromium run verifies flower growth, held scale/progress on Pause, resumed growth, shared Back navigation to the existing adventure map, and no delayed completion after leaving a live cycle. Text was enlarged to 125% in the actual browser DOM; measured text stayed inside its panels/controls, the flower remained visible and the page did not scroll. This is a browser stress check, not native Dynamic Type verification.

Variant TypeScript, production build, shared source contracts and all 37 approved game-reference hashes pass. The original Bloom controller, WellbeingShell and useWellbeingCompletion match pre-change hashes. The final native web copy has 840 matching files; four Xcode deployment settings and the Swift package retain iOS 16.4.

Receipts: [RESULT](../../qa-artifacts/bloom-layout/RESULT.json), [layout geometry](../../qa-artifacts/bloom-layout/after/checks.json), [full flows](../../qa-artifacts/bloom-layout/flow/checks.json), [motion/text/navigation](../../qa-artifacts/bloom-layout/motion-text.json), [source preservation](../../qa-artifacts/bloom-layout/source-preservation.json), [native copy](../../qa-artifacts/bloom-layout/native-copy.json).

## Changed files and assumptions

- [breath-bloom.css](../../variants/matharia/src/breath-bloom.css) — new scoped layout, type, readable panels, responsive garden and compact presentation.
- [wellbeing-scene.css](../../variants/matharia/src/wellbeing-scene.css) — imports the scoped stylesheet.
- [WellbeingGuidance.tsx](../../variants/matharia/src/WellbeingGuidance.tsx) — optional original instructions inside the existing Tips disclosure; other activities retain the same output.
- [presentation-transform.ts](../../variants/matharia/presentation-transform.ts) — passes Bloom instructions to Tips and binds its HUD title to the existing active-activity state during the build.

No new art or dependencies. Reused the existing clean `bg_bloom_portrait@2x.png` scenery and transparent `prop_breath_bloom@2x.png` flower. Scenery is independent from live text, controls and the animated flower. No screenshot backgrounds, baked controls, scenery masks or patches were introduced.

Additional outputs: this checklist, the WORKLOG entry, scoped scripts/captures/receipts in `qa-artifacts/bloom-layout`, and the generated Capacitor public bundle. Assumptions: retain existing portrait-phone composition and artwork; adapt deliberately to iPad dimensions; preserve all breathing and completion behaviour. No external legacy assumptions were used.

## Remaining verification

Native iPhone/iPad execution, actual safe areas/orientation, Dynamic Type and native animation performance remain unverified on this Windows host. Browser checks use the repository's isolated release-account fixture and do not test live account/purchase integrations. Other wellbeing activities were not redesigned in this pass. No TestFlight upload, deployment or merge was performed.
