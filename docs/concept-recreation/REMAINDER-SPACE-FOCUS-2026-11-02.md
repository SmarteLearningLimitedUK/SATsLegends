# Remainder Run — landscape space and consistency

Request: correct poor screen usage and inconsistent presentation in the supplied iPhone image. Assumptions: retain the approved landscape orientation, current dock assets, saved hero and every original division problem, answer, batch, score, timer, life and destination. No external chat or project is a source.

Visual thesis: one readable shipment problem above a clear cargo workspace and compact, aligned controls, using the existing sapphire, gold and timber materials. Content order: shared HUD, padded question/feedback, live cargo counters and loading illustration, choices or seven batch controls with Unload/Ship, shared footer. Interaction thesis: retain the existing loading flight and shipment departure, preserve active-time pause and reduced motion, and use the established press/selected/disabled feedback without delaying answers.

The approved reference is `variants/matharia/reference/approved/remainder_run.png`, 1844×853. Its main proportional regions are top HUD (31%,1.8%,40%,9.3%), question (5.5%,13%,89%,16%), guide (1%,34%,24%,53%), loading console (59.5%,31.3%,39%,46.9%) and bottom HUD (centred,32% width). The latest request authorises rebalancing these proportions to fix clipping and inconsistent spacing. Independent conveyor, crates, rope, panels and controls already exist and are reused.

| Screen | Rendering path | Status | Evidence |
| --- | --- | --- | --- |
| Remainder Run, all five tiers and three answer modes | Original `src/games/RemainderRunGame.tsx` via existing presentation transform → `variants/matharia/src/screens/RemainderScene.tsx` | Implemented and browser verified; native execution outstanding | `qa-artifacts/remainder-space-focus/` |

Task-start hashes and source copies are saved before editing. Native iOS execution is unavailable on Windows; browser checks will be labelled accordingly. No push, merge, publication or TestFlight upload is included.

## Implementation and changed files

- [RemainderScene.tsx](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/src/screens/RemainderScene.tsx): measured live question/feedback container; bounded workspace; real counters, choices and working history; compact seven-batch/Unload/Ship board. Original callback arguments and answer strings remain intact. Simple answer labels now separate boxes and leftovers onto two lines, with singular/plural presentation.
- [remainder-scene.css](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/src/screens/remainder-scene.css): removes the duplicate landscape safe margin, defines shared header/question/footer anchors and grid regions, sizes counters to their content, retains padding and 44px targets, and gives the foreman the same 20% column in both modes. The compact guided yard narrows deliberately to keep all loading controls available.
- [verify-remainder.mjs](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/scripts/verify-remainder.mjs): configurable preview/output, authenticated mission-board entry and discovery of the actual highest-tier route. Independent arithmetic, original timing/score/life and failure/Retry assertions remain.
- [verify-remainder-motion.mjs](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/scripts/verify-remainder-motion.mjs): same entry/configuration repair and simulated safe areas applied through the actual environment-dependent CSS, rather than changing only the scene variables.

Supporting files are this handover, the Remainder Run entry in `WORKLOG.md`, and diagnostic scripts/screenshots under `qa-artifacts/remainder-space-focus/`. The ignored Capacitor public copy is regenerated from the built variant. No production asset or dependency is added.

The header, question and footer use one safe-area coordinate system. The question starts eight pixels below the header; its own content is measured after the shared portal mounts and on text wrapping changes. The workspace follows it with an eight-pixel gap. The same shared circular portrait, sapphire/gold dock tiles and readable type hierarchy are used throughout the screen. Pause shares the header height and stays clear of the question.

Simple rounds have two clear counters, the independent cargo/rope illustration and four answers in one row. The duplicate local clock, empty non-loading progress bar and repeated captions are removed. Guided rounds retain all seven batches and the original subtraction invariant; Unload sits beside a double-width Ship control. The most recent four working steps sit below the board instead of competing with the cargo image. Feedback and original arithmetic explanations occupy the question's padded secondary line.

Button artwork presses inward while the actual button remains at least 44px. Loading and departure retain their original 650ms animation; pause stops their Web Animations timeline. Reduced motion omits the decorative flying crate, which previously remained visible without its hiding animation. Loaded counters/history remain immediate and live. All props retain their aspect ratios, and no defect-concealing mask, flattened screen or duplicate artwork control is introduced.

## Comparisons and receipts

- [Basic before/after](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/remainder-space-focus/before-after.jpg)
- [Guided loading before/after](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/remainder-space-focus/loading-before-after.jpg)
- [Approved concept versus running layout](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/remainder-space-focus/reference-comparison.jpg)
- [Compact phone and iPad](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/remainder-space-focus/device-coverage.jpg)
- [Aggregate receipt and protected source hashes](D:/BrainZilla/GitHub/SATsLegends/qa-artifacts/remainder-space-focus/RESULT.json)

Comparisons use actual pre-edit and final running captures at 852×393 with simulated iPhone landscape safe areas. Whether the generated numbers match is recorded in the receipt and image captions. The latest request intentionally changes the concept proportions; the comparison is not a claim of pixel matching.


At 852×393, the basic console changes from 286×180px to a wider, shallow answer row; the guided console widens to keep all nine controls visible. The basic comparison has different generated problems at the same tier and viewport; the guided comparison has the identical problem. Buttons outside the safe width or obstructed at task start fall from 2 to zero in the basic example and from 3 to zero in the guided example.

## Device and interaction coverage

| Browser viewport | Engine | Tier and checks |
| --- | --- | --- |
| 852×393 | Chromium | Tier 1; 59px side and 21px home-indicator safe areas |
| 667×375 | Chromium | Tier 5; 125% question/feedback typography throughout |
| 1024×768 | Chromium | Tier 3; 24px top / 20px bottom |
| 852×393 | WebKit | Tier 4 decimal questions; simulated phone safe areas |
| 932×430 | Chromium | Tier 2; simulated phone safe areas |
| 1366×1024 | Chromium | Tier 5; large iPad layout |

The six functional sweeps use accelerated clocks and reduced motion. Finite exit animations are finished after the real Map action to settle the synthetic clock; they do not change routing or game data. Separate real-time Chromium/WebKit checks exercise normal and reduced motion, active pause/resume, both phone sizes, 20px/24px root-font settings and rotation without losing the loaded shipment. A separate 3× iPhone practice run uses normal motion and real time through five independently solved answers, victory and visible island navigation. Saved Vex, Bran and Mochi identities are also checked.

Account requests use isolated fixtures; no live account, subscription or purchase is exercised. Test scripts solve from displayed dividend/divisor values, check every batch gate and the quotient×divisor+remaining invariant, reset with Unload, prevent duplicate activation, send exact shipments, verify original wrong-answer point/time/life penalties and explanations, pause/resume, and exercise timed victory, failure/Retry and Map navigation.

The screenshots are inspected as well as measured. Rejected iteration captures are retained under `diagnostics/`; final passing states are under `after/`. The original approved art and controller, shared renderer/layout/session/progression/audio and earlier Formula Forge work are among the eighteen protected files checked against task-start hashes.


Final validation: all six profiles pass, with 124 measured states, 50 independently solved correct submissions, 6 wrong-answer checks and 32 batch geometry/invariant checks. Both highest-tier failure/Retry regressions, all four real-time motion regressions and all three saved-character checks pass. Build and TypeScript checks pass; the existing large-bundle advisory remains. All 851 final build files match the prepared Capacitor copy by SHA-256, and iOS 16.4 is verified. Eighteen protected source/reference files are unchanged.

## Remaining production work

Native iOS execution, real Dynamic Type/accessibility, audio/haptics, sustained performance and hardware safe-area/orientation behaviour remain unverified on this Windows host. Browser viewports and simulated safe areas are not native device tests. The final web bundle is prepared in Capacitor with minimum iOS 16.4; no signed archive or TestFlight upload is made here.

Before production, run the prepared variant on native iPhone/iPad and review those behaviours, then archive/upload through the existing release process when requested. This checklist covers Remainder Run only and makes no completion claim about other games.

No external legacy assumptions were used.
