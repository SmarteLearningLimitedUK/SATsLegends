# Matharia map logo and scroll affordance — 2 November 2026

The supplied iPhone photo requests a much larger Matharia logo and a flashing Scroll arrow under each island. The actual React map renderer now reserves space for the enlarged existing artwork and gives every island a live Scroll control. Existing island names, order, artwork, completion calculations, access checks and Explore callbacks are retained. No external legacy assumptions were used.

## Checklist

| Item | Status and evidence |
| --- | --- |
| Logo | Existing transparent 1192×600 logo, aspect preserved; 265px wide instead of 120px at the 393×852 reference viewport, about 2.2 times wider |
| Scrolling cue | Gold double chevrons below each island's Explore panel, with a persistent Scroll label; 1.6-second opacity pulse and restrained vertical movement |
| Interaction | Tap advances to the next island; final page points upward and returns to the previous island; focus moves to the destination title |
| Existing navigation | Touch/arrow, wheel and PageDown scrolling keep one-island snapping; Explore still uses the original callback |
| Reduced motion | Chevrons remain still and fully visible; programmatic scrolling uses the instant browser behavior |
| Viewport budget | Map owns its full viewport and reserves safe areas and bottom-HUD space once; compact controls compensate for the existing stage scale |
| Device checks | All eight pages pass at each of six browser sizes: 320×568, 375×667, 393×852, 430×932, 768×1024 and 1024×768; 48 checked island states |
| Local native bundle | All 840 native public files match the final production build; minimum iOS 16.4 checked; native execution remains unverified |

[Supplied photo versus running screen](../../qa-artifacts/map-scroll/before-after.png), [actual flashing-arrow capture](../../qa-artifacts/map-scroll/scroll-arrow.gif), [normal-motion interaction receipt](../../qa-artifacts/map-scroll/motion/checks.json).

## Source and layout

- [WorldMap.tsx](../../variants/matharia/src/WorldMap.tsx): scroll-container ref, adjacent-page controls, downward/upward icons and destination-heading focus. Navigation follows the repository's actual `ISLANDS` array, whose final IDs are 8 then 7. The existing percentage, unlock logic and Explore action are unchanged.
- [matharia.css](../../variants/matharia/src/matharia.css): map-scoped viewport budget, larger aspect-preserving wordmark, padded gold/teal cue, pulse and reduced-motion states. Compact portrait screens place progress beside Explore to preserve room for the island. Existing other-screen styles remain outside this scope.

The logo uses `branding/logo_matharia@2x.png`, with alpha bounds approximately (3,2)–(1190,598). Its width follows the available horizontal space, viewport height and account-button clearance. Layout leaves at least 8px between its bounding box and the parent-account control at the reference size. Scrolling is limited to the island container, so it does not move the logo or bottom HUD. Header and footer clearance and the new controls account for `--game-stage-scale` on compact devices.

The map scenery and island sprites remain independent existing assets. No new raster assets, background patches, masks, dependencies or backend changes were introduced. New chevrons use the existing Lucide icon system. Their label stays visible throughout the pulse, and all new controls have at least a 44px physical target in the verified layouts.

## Verification and limits

The browser tests use isolated account fixtures. Safe areas are simulated, including iPhone 15 top 59px/bottom 34px. The final viewport matrix checks all eight pages, the logo/account separation, heading and artwork containment, cue/Explore targets, reduced-motion state, final upward arrow, destination focus and original Explore navigation. Normal Chromium checks use the real clock and actual wheel, keyboard and touch interactions. The matrix follows the actual catalog order, IDs 1, 2, 3, 4, 5, 6, 8, 7. The final upward arrow therefore returns from Ratio Rapids to the preceding catalog entry.

The Flash preview contains 31 actual browser compositor samples over 3.34 seconds, with capture timing retained. It is not a native device recording. The after screenshot uses an isolated empty QA save, which accounts for the displayed 0% progress; the user's saved progress has not been reset.

Receipts: [final result](../../qa-artifacts/map-scroll/RESULT.json), [48 island states](../../qa-artifacts/map-scroll/layout/checks.json), [motion and interaction](../../qa-artifacts/map-scroll/motion/checks.json), [native copy](../../qa-artifacts/map-scroll/native-copy.json), [shared contracts and reference hashes](../../qa-artifacts/map-scroll/shared-contract.json).

Windows WebKit captures show a dark rectangle in the upper-left corner that is absent from Chromium captures. The supplied photo also has no such rectangle. This browser difference is recorded for native verification; the comparison and motion preview use unaltered Chromium captures.

TypeScript and production build pass. The existing large-chunk warning remains. Native iOS rendering, real safe areas, VoiceOver, Dynamic Type, orientation and native performance remain unverified on this Windows host. No TestFlight upload, deployment or merge was performed.

Assumptions: retain the current logo, scenery, island order, vertical snapping and original progress/access behavior; use a gentle flashing arrow and make it tappable; point the last page upward to an available island. No external legacy assumptions were used.

Additional outputs: this checklist, WORKLOG entry, captures/scripts/receipts in `qa-artifacts/map-scroll`, and generated native public files. The active branch and unrelated work are preserved.
