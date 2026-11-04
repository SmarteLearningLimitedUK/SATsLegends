# Breath Bloom floating garden and breeze — 2 November 2026

Implemented the supplied iPhone photo feedback in the Matharia React rendering path: separate floating crystal lotuses, room to breathe, gentle breeze and magical detail. The current repository art and source breathing controller remain the basis. No external legacy assumptions were used.

## Screen and state checklist

| Region/state | Implementation and verification | Evidence |
| --- | --- | --- |
| Supplied reference | User's 1280×531 iPhone garden crop shows overlapping blooms and rigid stems; this is feedback evidence, not a replacement background | [Supplied photo versus running game](../../qa-artifacts/bloom-garden/before-after.png) |
| One bloom | Centred hero, with its own water ring and space for the original breathing scale | [Phone](../../qa-artifacts/bloom-garden/layout/phone-1.png) |
| Two/three blooms | Hero retains its centre position; companions grow into separate front-row slots | [Two](../../qa-artifacts/bloom-garden/motion/two-flowers.png), [three](../../qa-artifacts/bloom-garden/motion/three-flowers.png) |
| Four/five blooms | Smaller rear row creates depth without overlapping the front flowers | [Four](../../qa-artifacts/bloom-garden/motion/four-flowers.png), [five](../../qa-artifacts/bloom-garden/motion/five-flowers.png) |
| Breeze and magic | Slow independent sway, gold leaves, cyan/gold glints, flowing light trails, water shimmer and a brief arrival sparkle; actual real-time movement verified | [Animation preview](../../qa-artifacts/bloom-garden/breeze-preview.gif), [recording receipt](../../qa-artifacts/bloom-garden/recording-evidence.json) |
| Pause/resume | Source progress and scale, plus every decorative animation, freeze and resume together | [Real-clock checks](../../qa-artifacts/bloom-garden/motion/checks.json) |
| Reduced motion | Static blossoms, water rings and small glints; no sway, drifting leaves, arrival animation or moving trails; all three trail opacities verified at zero | [Final six-size checks](../../qa-artifacts/bloom-garden/layout/checks.json) |
| Device layouts | All five actual growth stages and an additional maximum-scale/sway geometry stress case at six viewport sizes | [Geometry receipt](../../qa-artifacts/bloom-garden/layout/checks.json) |
| Enlarged text/resize | Five-bloom layout at 125% browser text, resize to a wide viewport and return to phone; HUD text retains at least 8px vertical clearance | [Phone capture](../../qa-artifacts/bloom-garden/stress/phone-text-125.png), [receipt](../../qa-artifacts/bloom-garden/stress/checks.json) |
| HUD text budget | 72px tall header and a corresponding 94px content inset retain the original 14px header/content gap without shrinking text | Normal and enlarged-text captures inspected |
| Existing interactions | All three paces, pause/resume, four user-started cycles, progress, Tips, finish/reward and navigation pass | [Four full flows](../../qa-artifacts/bloom-garden/flow/checks.json) |
| Local native bundle | All 840 Capacitor public files match the final production output; minimum iOS 16.4 checked | [Native receipt](../../qa-artifacts/bloom-garden/native-copy.json) |

## Composition and rendering

The original scene is `src/assets/wellbeing/matharia/bg_bloom_portrait@2x.png`. The independent transparent blossom is `src/assets/wellbeing/matharia/prop_breath_bloom@2x.png`: 956×730, with alpha bounds approximately (2,2)–(954,727). It has clean separation and no baked controls. The existing lily-pad asset was inspected but contains an additional pink flower, so it was unsuitable as an independent base. Aspect-preserving crystal artwork and separate SVG water rings are used instead.

The garden occupies the existing measured region between pace choices and the breathing console. A ResizeObserver measures that region; layout is recalculated when its size or flower count changes. Measured slots use an explicit aspect ratio, common water lines, 6–16px outer margins and 8–18px gaps. The centre blossom is 1.45 times a companion's width; rear blossoms are 0.72 times its width. A 1.2 envelope reserves space for the controller's maximum scale of 1.12 and the ±1.2° sway. Counts four/five use separate front/rear rows with a reserved vertical gap. No arbitrary per-device flower offsets are used.

Existing flowers move to their measured positions over 500ms; a new flower appears after that move, with a short glint. The original source still supplies flower count and the breathing scale. The breeze runs independently of inhale/exhale; it never forces another breath or blocks input. The decorative subtree is hidden from assistive technology and cannot intercept touches; the original live cue and progress remain accessible.

All new motion uses CSS. The fixed breeze markup is memoized, with a unique SVG gradient ID. The layout observer disconnects on unmount. No additional JavaScript animation loop, raster asset, library, background mask, patch or flattened screen was introduced. The compiled garden CSS has no remaining nested rules.

## Verification

- WebKit browser viewports: 320×568, 375×667, 393×852, 430×932, 768×1024 and 1024×768. Safe areas are simulated, including iPhone 15 top 59px/bottom 34px. These are browser checks, not native iOS tests.
- Each profile exercises counts one through five through the actual source controls: 30 actual growth states plus six explicitly labelled maximum-scale/sway geometry stress cases. Actual real-time inhale peaks are separately checked. There is no gameplay scrolling or intersecting blossom image bound in the measured cases. The minimum measured gap across the matrix, including stress, is 11.60px; the minimum across eight real-motion observations is 16.14px.
- Four complete flows use WebKit compact/phone/iPad and Chromium phone. Easy remains 3s/4s, Steady 4s/5s and Unhurried 5s/6s; check-ins remain user-paced. Four cycles grow five flowers; progress remains 25/50/75/100%; explicit Finish reset reaches the existing reward/completion flow and Choose another activity returns to Calm Grove.
- 36 live-state cue-padding and action-alignment observations pass across inhale, pause and check-ins. The existing illustrated controls were not edited in this pass.
- A real-clock Chromium run verifies all five decorative motion layers changing, held source/animation values while paused, resumed movement, and all four original Easy cycles. Eight normal-motion geometry observations include actual inhale peaks and the fully grown garden, with no page errors.
- The motion preview samples 85 of 509 actual compositor frames over 8.52 seconds. GIF timing follows capture timestamps; no positions or animation speeds were fabricated. It is a cropped browser recording, not a native device recording.
- Three enlarged-text/resize cases retain all five flowers, positive separation, usable controls and no page scrolling. Reviewing the synthetic text capture exposed an existing cramped HUD; this pass increases its height from 60px to 72px and reserves the matching content space. Measured HUD text has a minimum 8px vertical gutter. Browser text stress does not verify native Dynamic Type.
- TypeScript and production build pass. The existing large-chunk build warning remains. Shared rendering contracts and all 37 approved game-reference hashes pass. The original Bloom controller, shell, completion hook and previously polished control component hash-match their pre-pass versions.

## Changed files and handover

- [BloomGarden.tsx](../../variants/matharia/src/BloomGarden.tsx): measured flower slots, water contact, layered sway/arrival rendering and source scale binding.
- [BloomBreeze.tsx](../../variants/matharia/src/BloomBreeze.tsx): independent vector breeze, leaves and magical motes.
- [bloom-garden.css](../../variants/matharia/src/bloom-garden.css): scoped layout, animation, paused state and reduced-motion presentation.
- [breath-bloom.css](../../variants/matharia/src/breath-bloom.css): imports the garden presentation, removes the obsolete flower-size variable and reserves a taller HUD/content budget for enlarged text.
- [presentation-transform.ts](../../variants/matharia/presentation-transform.ts): guarded replacement of the original garden markup, passing the existing count, artwork, phase, scale and pause state.

Additional outputs are this checklist, a WORKLOG entry, scoped evidence/scripts/receipts under `qa-artifacts/bloom-garden`, and generated native public files. The active branch and unrelated work are preserved. [Final result and file hashes](../../qa-artifacts/bloom-garden/RESULT.json).

Assumptions: retain the repository's current scenery, crystal lotus artwork, sapphire/gold interface, original breathing instructions, paces and four-cycle completion rules; interpret the stems as unsuitable for floating lotuses and replace them with independent water rings. No external legacy assumptions were used.

Native iOS execution, real safe areas/orientation, Dynamic Type and native performance remain unverified on this Windows host. Browser flows use an isolated account fixture; live authentication and purchases were not exercised. A native run and a new TestFlight upload are required before this pass can be installed from TestFlight. No deployment, merge or upload was performed.
