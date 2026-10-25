# Data Detective evidence touch correction

23 October2026. Local presentation only; release hold remains active.

## Reproduced findings and bounded change

The final all-game sweep found four pie-evidence pins at132x28px in short landscape. Their containing dock actually provided210px at844x390 and203px at667x375. Four44px rows,3px gaps and the retained heading fit that space.

`src/games/data-detective.css` now uses44px minimum height,14px item labels with17px line-height, and16px totals in the existing short-landscape rules. Item names, amounts, colours, chart geometry, selection, dossier and scoring code are unchanged. The two-line Magic Cookies label remains inside its44px row.

An exploratory1024x768 check found the pre-existing48px desktop rows painted8px beyond their224px dock. A local medium-landscape rule uses4px dock padding/gaps and44px rows; it retains16px labels/19px totals. After the measured prototype, the last row ends452.1px within the dock's458.2px bottom. No chart, question, heading or actor offset was added.

## Verification and evidence

`scripts/verify-ios-data-touch.mjs` uses a seeded existing case (seed739), an isolated account fixture, explicit Start and ready-state/briefing dismissal. It captures pie evidence before/after, pin selection and dossier. Checks: four real44px targets, label/total font floors, dock containment, no question/navigation overlap or document scroll, selected/unpinned state, actual chart dimming/recovery, dossier close and page errors. The final profiles are844x390,667x375,1024x768 and1440x900.

Prototype checks passed at the two phones and1024 after the measured spacing correction; prototype screenshots/geometry JSON are labelled as such in `qa-artifacts/ios-data-touch/`. A final compiled run is still required after the parent rebuild; do not treat the prototype files as compiled verification.

## Assumptions and limits

44 CSS pixels screen touch usability but do not certify native UIKit points, physical taps or VoiceOver. Maths, question bank, suspect matching, chart data and artwork were preserved. No external legacy assumptions were used. No deployment or TestFlight upload occurred.

## Final compiled verification — 23 October2026

**4/4 PASS**, exit0, browser closed: `DATA_TOUCH_PHASE=after node scripts/verify-ios-data-touch.mjs`, final evidence log `.tmp/ios-data-touch-stable-dialog.log`. The earlier identical4/4 run is `.tmp/ios-data-touch-final.log`; the second run adds a readiness check for effective opacity before taking modal screenshots. No CSS is injected in the final runs.

|Profile|Real pin target|Label / total size|Dock containment|
|---|---|---|---|
|844x390|132x44px|14 /16px|All four rows inside210px dock|
|667x375|132x44px|14 /16px|All four rows inside203px dock|
|1024x768|197.5x44px|16 /19px|Last row bottom452.1, dock bottom458.2|
|1440x900|284.4x48px|16 /19px|All four rows inside356.2px dock|

All profiles passed explicit Start/ready, four-target minimum-size/font/containment checks, zero question or navigation intersection, no document scrolling, pin selected/unpinned state, actual three-sector dimming/recovery, dossier open/Close and zero page errors. Final667 ready and opaque dossier images were visually inspected. Stable modal captures avoid treating an entrance-animation frame as the finished UI.

[Browse before/ready/selected/dossier evidence](../qa-artifacts/ios-data-touch/index.html) or [read the raw4-case results](../qa-artifacts/ios-data-touch/after.json). The only production file changed by this batch is `src/games/data-detective.css`; verification/report/gallery files are additional evidence. No production edits followed this batch's successful compiled run. The parent Tooltip styling follow-up is separately verified in its own batch. These cases do not certify all viewport sizes, every later case, native touch or VoiceOver.
