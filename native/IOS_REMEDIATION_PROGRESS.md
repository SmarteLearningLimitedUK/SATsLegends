# iOS remediation progress

Completed local remediation:23 October2026. **No TestFlight upload, deployment, signing or release action was performed or is authorised by this record.** Preserve unrelated dirty files. This record supersedes the historical audit's “next pilot” instruction; do not redo completed discovery. The remaining release boundary is native device validation, not another speculative styling pass.

## Implemented changes

|Batch|Actual implementation|Verification status|
|---|---|---|
|B0 evidence|Seeded isolated-account capture harness, raw bounds, question/HUD exclusion checks, initial/selected/correct/incorrect/completion captures.|111/111 campaign bounds/Tips cases passed; all74 phone openings visually reviewed with14 full-size priorities. The two further visual defects found were corrected and reverified. Combined gallery179 screenshots, including labelled before/after views. A starting-state pass does not certify every random question.|
|B1/B2 shared layout|Explicit37-campaign migration manifest; physical top/bottom HUD rows; one safe rectangle; measured scene dimensions; campaign content does not shrink. A scale(1) containing block preserves legacy fixed-prompt coordinates without scaling.|Final12/12 compiled flow checks passed, including both simulated landscape insets, coordinate step/confirm and explicit full guide/plot exclusion. Standard37/37, compact37/37 and desktop37/37 campaigns passed. After the final three local corrections,9/9 affected-game screen/Tips cases passed again.|
|B3 orientation|Existing portrait Prime/Rocket/calm and portrait menus preserved; landscape games retain explicit turn/Start flow. No speculative portrait conversion of other games or native iPad enablement.|Final three detailed rotation/timer/reentry cases and small-phone turn prompt passed. Independent account shell4/4 browser fixture profiles passed. Pure orientation tests passed previously.|
|B4 focal separation|Readable incomplete Rocket with next-part preview, including antenna; Zombies rich backdrop restored with local combat-region separation and existing feet/contact alignment.|23Oct: scene12/12, grounding9/9 and final-candidate groan/mute2/2 passed. Normal/reduced motion and action frames included. Original startup/visibility failures and successful reruns retained. See IOS_SCENE_REMEDIATION.md.|
|B5 dense interaction|Match board uses real frame budget and its own question column; mature Prime bubbles44px; Unload44px. Coordinates has44px step/confirm alternative and visible cursor. Data Detective evidence pins now44px minimum with readable names/totals and contained medium-window rows.|Final compiled6/6 dense-touch cases passed. Coordinate safe-area12/12 passed. Data4/4 compiled profiles passed: target/font/containment, actual pin/unpin chart focus and stable dossier close. Direct dense coordinate markers remain smaller, with the tested large alternative.|
|B5 instruments|Larger clock/angle; readable graph/perimeter labels; wider Scale keypad; receipt and multiplication working reclaim decorative space. Single full Place Value prompt. Graph Grabber now preserves complete three-digit ticks and readable real hover values.|23Oct compiled: instrument10/10 with26 states, PVP5/5 tiers, working surfaces6/6 and receipt last-row reachability3/3. Final Graph axis/hover/correct-answer3/3 passed. Mine desktop required a successful visibility recheck; original failure preserved.|
|B5 assessment|More diagram height, semantic combination-choice lists with12px floor, all given items/counts/pairing retained;44px workpad summary. Wide choice model/narrow single-number response only for short-landscape combinations. Placeholder keeps its full wording.|20/20 final compiled cases passed: six response types × three viewports, plus busiest6/4 combinations at both phone sizes. Real input, Save, Finish/review and full marks checked. All choices/labels visible; no bank or marking changes.|
|B6 access/state|Coordinates44px step/confirm alternative; Polygon property aria-pressed and compact stack corrected; Perimeter44px next-edge/reset alternative preserves direct SVG input.|Perimeter2/2 full eight-edge cycle/reset/correct-answer cases passed. Polygon4/4 selected/deselected and correct/incorrect submission cases passed. Native VoiceOver remains unverified.|
|B7 calm/consistency|Calm note column repaired; short-phone activity scene minima now fit footer above dock; existing pacing and no-top-HUD policy preserved.|Compiled18 calm activity cases passed23Oct, including ready/active/selected/completion coverage. See IOS_CALM_REMEDIATION.md.|
|B8 regression|Reusable local capture scripts, before/after comparisons, state-specific input/marking/bounds checks and review gallery.|Final iOS build1m16s, website build1m14s, TypeScript exit0. Final affected-game9/9 and guide/flow12/12 passed. Gallery179 files, three37-game filters, comparisons and lightbox checked. Final asset hashes in qa-artifacts/ios-remediation/build-hashes.json. Native performance remains B9.|
|B9 native|No native project/device-family changes.|Not performed on this Windows host. Actual iPhone safe areas, keyboard, VoiceOver, interruption behaviour and sustained performance remain native validation. Browser fixtures are not native proof.|

## Completion and remaining boundary

All reproduced local defects from this implementation/review are corrected in the tested coverage. Source is frozen; the final build includes the graph-tooltip colour correction. No further source change followed the final builds. Maths, answers, scoring and existing artwork were preserved. No upload or release workflow was triggered.

Review: `http://127.0.0.1:3023/qa-artifacts/ios-remediation/index.html`. This worktree's gallery is served on3023; the user's pre-existing3018 server did not serve the new gallery and was left untouched. Screenshots were captured from the compiled iOS-mode preview on3024. The gallery defaults to compact phones and keeps older failed layouts only in explicitly labelled comparisons.

Next required work is B9 against a separately authorised native candidate: actual iPhone safe areas, keyboard/workpad, VoiceOver, both landscape directions, cold launch/resume, audio interruptions, StoreKit sandbox and sustained performance. No native release-readiness, iPad support or every-question/all-state certification is claimed from these browser checks.

### Final verification ledger

|Check|Actual result|Evidence|
|---|---|---|
|Campaign opening/Tips/HUD bounds|37/37 standard,37/37 compact,37/37 desktop; no failures/retries|IOS_FINAL_CAMPAIGN_QA.md; final-default/,final-compact/,final-desktop/|
|Final corrected games|9/9 across3 games ×3 profiles|final-corrections/results.json and profile results-focused.json|
|Guide/flow/simulated insets|12/12 compiled;6 coordinate cases include full guide/plot exclusion|flow-contract/results.json; IOS_COORDINATE_GUIDE_REMEDIATION.md|
|Final interaction suite|5 suites/30 cases passed: Polygon4, dense touch6, flow12, rotation/small prompt4, account4|final-interactions.json; the flow12 cases were repeated after the guide correction|
|Assessment|20/20, including real answer submission and full marks|IOS_CORE_RESPONSE_REMEDIATION.md|
|Calm/PVP/instruments|18/18 calm,5/5 PVP tiers,10/10 instruments,2/2 large perimeter edge cycles|IOS_CALM_REMEDIATION.md; IOS_INSTRUMENT_REMEDIATION.md|
|Final additional touch/graph checks|Data4/4; Graph3/3 including actual hover/value/colour and answer|IOS_DATA_TOUCH_REMEDIATION.md; IOS_GRAPH_AXIS_REMEDIATION.md|
|Scene/ground/audio/surfaces|Scene12/12; grounding9/9; groan/mute2/2; surfaces6/6; receipt reachability3/3|IOS_SCENE_REMEDIATION.md; IOS_WORKING_SURFACES_REVIEW.md; original transient failures retained|
|Gallery|179 existing image files; filters/lightbox/Escape passed|gallery-check.json; gallery-manifest.json|

Artifact paths without directories in the ledger are relative to `qa-artifacts/ios-remediation/`; named reports are in `native/`. These counts overlap by purpose and should not be added into a fabricated unique-test total. The111-wide run predates the final Data/Coordinates/Graph fixes; the final9 and dedicated interaction tests prove those scoped corrections. Unaffected games were not repeatedly rerun after isolated selectors/props changed.

### Startup evidence

Some earlier test runs timed out on the opening/visibility wait. Originals are retained; successful reruns do not erase them. Ten dedicated fresh-context cold starts reached Start in1.239–1.343s with no pending/failed requests or console/page errors. The cause of intermittent stalls remains unconfirmed; no speculative production patch or timeout increase was applied. See [cold-start diagnostic](IOS_COLD_BOOT_DIAGNOSTIC.md) and the scene/working-surface reports. Physical cold starts and interruption/resume still require native testing.

## Production files in this remediation scope

- Shared: `src/App.tsx`, `src/app/AppRouter.tsx`, new `src/app/gameLayoutPolicy.ts`, `src/components/GameplayContentViewport.tsx`, `src/components/game-ui/gameplay-dock-layout.css`, `src/games/vision-compositions.css`.
- Coordinates: `TreasurePathGame.tsx`, `CoordinateGrid.tsx`, `coordinates-quest.css`, coordinate rules in `companion-staging.css` and `review-layout-fixes.css`.
- Scene: `RoundingRocketScene.tsx`, `rounding-rocket.css`, `maths-vs-zombies.css`.
- Touch: `FractionMatchGame.tsx`, `fraction-match.css`, `PrimePopGame.tsx`, `remainder-run.css`.
- Instruments: `ChronoDashGame.tsx`, new `chrono-dash.css`, `AngleArenaGame.tsx`, `angle-arena.css`, `PerimeterPathGame.tsx`, new `perimeter-path.css`, `LineGraphLabGame.tsx`, `line-graph-lab.css`, `GraphGrabberGame.tsx`, `scale-builder.css`.
- Working surfaces: `change-counter-shop.css`, `multiplication-mine.css`.
- Assessment: `SatsRevisionGapVisual.tsx`, `core-paper-presentation.css`.
- Calm/remaining: `src/wellbeing/wellbeing.css`, `PlaceValuePanicGame.tsx`, `PolygonPalaceGame.tsx`, `polygon-palace.css`, `data-detective.css`.

Paths without directories above are under `src/games/`, except the named shared game-ui assessment components and staging stylesheet. Pre-existing unrelated edits remain untouched. Test tools, reports and screenshot evidence are also added; individual remediation reports list their exact files.

## Evidence and assumptions

See IOS_SCENE_REMEDIATION.md, IOS_TOUCH_REMEDIATION.md, IOS_INSTRUMENT_REMEDIATION.md, IOS_CORE_RESPONSE_REMEDIATION.md, IOS_CALM_REMEDIATION.md and IOS_WORKING_SURFACES_REVIEW.md. Raw evidence lives under the corresponding `qa-artifacts/ios-*` directories. Source-server/HMR failures and interrupted runs are retained separately; do not count them as passes or silently replace their provenance.

Assumptions: current native target remains iPhone; tablet-shaped browser checks are exploratory; mathematical content/scoring/assets remain established repository versions. No external legacy assumptions were used. No deployment or TestFlight upload performed.
