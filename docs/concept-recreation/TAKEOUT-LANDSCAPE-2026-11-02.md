# Takeout Rush landscape service counter — 2 November 2026

The user's latest iPhone photograph and request supersede the earlier portrait composition for this game: use landscape, with each enemy coming to the counter for its order. The existing React/TypeScript renderer is the live iOS rendering path. The archived approved portrait image and all other games' references are retained.

## Checklist

| Item | Status / evidence |
| --- | --- |
| Current reference | Supplied iPhone 15 photo, `2D996D98-3DE0-41C6-874B-6730971F459F/1-Photo-1.jpg`; explicit landscape/sequential-customer request |
| Earlier reference | `variants/matharia/reference/approved/take_out_rush.png`, 853×1844 portrait; archived, not used as a flattened live screen |
| Rendering path | `variants/matharia/src/screens/TakeoutScene.tsx`, real source order state via the existing presentation adapter; routes `/game/2/6` through `/game/2/10`, plus practice |
| Orientation | Landscape composition; existing portrait rotate gate pauses the game |
| Assets | Existing clean 1116×628 wide tavern, independent customer/chef sprites, transparent stove, portion artwork and blank ornate frames; no generated or patched background |
| Customer service | One mounted customer; frozen identity and ticket through success feedback; departure before the next source order arrives; wrong answers retain the current customer |
| Queue | Original count, three initial customers and 20-second arrivals retained; empty queue leaves an empty counter |
| Motion | 600ms arrival, 420ms departure; existing character gait; pause freezes movement and steam; reduced motion uses still arrival/removal |
| Timer ownership | The existing Takeout controller completes its own 90-second shift. The shared HUD no longer races it to generic timeout failure. Duration, scoring and lives rules are unchanged. |
| Layout / text | Separate left service area and right order console; padded question, content-sized tray row and minimum 44px interactive controls. Ten final layouts, three 125% text cases and five live combo-HUD states pass; timer/combo text clears the inset gold border. |
| Functional / device checks | Chromium and WebKit full shifts, four sequential customer types, wrong/correct orders, empty queue, scheduled arrival, pause, results, progress return and retry pass; real-clock entry/departure pause and orientation checks pass; practice no-lives behaviour passes |
| Native bundle | All 840 copied public files match the production build; minimum iOS 16.4 and supported landscape orientations checked; native execution unavailable on this Windows host |

## Composition

The reference browser viewport is 852×393 landscape with simulated iPhone 15 safe areas of 59px at each side and 21px below. Its scene plane is 734×372. Major horizontal bounds are expressed in that scene coordinate system: ticket and queue bars x=3%, width=39%; customer x=1%, width=19%; chef x=22%, width=21%; order/question console x=45.5%, width=52.5%; bottom HUD centred at x=22.5%, width=43%. Header, question, tray and feedback have explicit height budgets. The illustrated actors use the same foot baseline, tied to the wide tavern's counter plane and the stove base. Aspect ratios are preserved.

The original educational controller, question generator, portion definitions, order constraints, queue formula, correct/incorrect handlers, score, rewards and feedback delays remain in place. Only one customer is drawn; the real queue has not been reduced to one. Customers can enter while the original controls are active; the animation introduces no input delay. The completed customer's ticket and identity remain stable until the existing 1.28-second feedback callback creates the next order.

## Verification and evidence

[Supplied photo versus running landscape screen](../../qa-artifacts/takeout-landscape/before-after.png), [running iPhone-size screen](../../qa-artifacts/takeout-landscape/landscape-phone.png), [actual customer-service animation](../../qa-artifacts/takeout-landscape/customer-service.gif), [final receipt](../../qa-artifacts/takeout-landscape/RESULT.json).

The final WebKit matrix checks basic and five-portion mastery layouts at 667×375, 852×393, 932×430, 1024×768 and 1194×834. It checks actor separation, header/question/console spacing, padded question text, unobstructed controls, reduced motion and no document scrolling. Browser safe areas are simulated, including the iPhone 15 landscape side insets and home-indicator clearance. Chromium checks at compact phone, iPhone 15 and iPad sizes enlarge live question, tray, portion and action text to 125%; an actually overfilled five-item tray remains contained and editable. This is browser text stress testing, not native Dynamic Type certification.

The source-driven flows solve the actual generated fractions and serve goblin, slime, jelly and rhino in order. At most one customer DOM node exists throughout. They exercise the initial queue of three, empty-counter/disabled-send state, original 20-second arrival, life loss, same-customer wrong-answer recovery, pause during success feedback, 90-second completion, saved completion on the correct mission group, failure and Retry. Normal-motion checks use the real clock and freeze both entry and departure midway; portrait shows the existing paused rotate gate. The animation preview uses actual compositor samples of a live service transition, including the next customer's completed arrival and rendered mesh. No movement was fabricated.

Testing found and reproduced an existing independent-countdown race: the generic HUD timeout could produce failure before Takeout's own shift controller completed. The Takeout-only timeout-ownership exception removes that race without changing either 90-second duration, the order controller or life depletion. Both final browser engines reach the original shift result. [Pre-fix reproduction](../../qa-artifacts/takeout-landscape/pre-fix-timer-race.png).

TypeScript and the production build pass. The original `TakeOutRushGame.tsx`, `DinerCookingStation.tsx` and presentation adapter hashes are unchanged. The other compositions and all remaining shared session code match their starting versions. Shared source contracts and all 37 archived reference hashes pass. Compiled Takeout CSS rules are flattened for the existing iOS target. Native public copies match all 840 production files; minimum iOS 16.4 is verified. Both iPhone landscape directions are present in the native supported-orientation list.

Detailed receipts: [layout](../../qa-artifacts/takeout-landscape/layout/checks.json), [gameplay](../../qa-artifacts/takeout-landscape/flow/checks.json), [motion/text/practice](../../qa-artifacts/takeout-landscape/interactions/checks.json), [live combo HUD](../../qa-artifacts/takeout-landscape/hud/checks.json), [source preservation](../../qa-artifacts/takeout-landscape/scope-checks.json), [native copy](../../qa-artifacts/takeout-landscape/native-copy.json), [shared/reference contracts](../../qa-artifacts/takeout-landscape/shared-contract.json).

Native device/simulator rendering, actual safe areas, orientation transitions, VoiceOver, Dynamic Type and device performance still need an iPhone/iPad pass on a Mac/device. Existing live authentication, purchase and account integrations were not exercised by the isolated browser fixtures. The existing large-chunk build warning remains. The current source/local native bundle includes this update; a new signed TestFlight build is still required. No deployment, upload or merge was performed.

## Changed source

- `variants/matharia/src/compositions.ts`: Takeout only — landscape and existing wide tavern asset.
- `variants/matharia/src/screens/TakeoutScene.tsx`: service-counter layout, one customer, keyed ticket presentation and live tray controls.
- `variants/matharia/src/screens/TakeoutCustomer.tsx`: scoped customer identity, walking/arrival/departure state and pause-aware cosmetic timer.
- `variants/matharia/src/screens/takeout-scene.css`: measured landscape regions, safe-area-aware HUDs, responsive padded panels, target sizes and motion states.
- `src/app/useGameplaySession.ts`: Takeout-only exception to generic HUD timeout, matching the existing ownership pattern for a game with its own completion timer. Other games' timer logic is retained.

Additional outputs: this checklist, WORKLOG entry, QA scripts/captures/receipts, and generated native public files. No publishing, upload, merge or account changes are part of this update.

Assumptions: keep the existing wide tavern and cast; show the current customer at the counter and represent waiting customers numerically; let the original shift controller award its original result. No external legacy assumptions were used.
