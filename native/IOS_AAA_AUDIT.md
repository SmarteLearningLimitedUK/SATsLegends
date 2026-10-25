# SATs Legends iOS AAA audit

22 October 2026. Baseline: current local working tree, including unreleased UI work. Diagnosis and planning only. No deployment, artwork replacement, educational-content or scoring change during this audit.

## Executive assessment

Preserve the rich fantasy identity and existing stack. The main quality problem is inconsistent allocation of space to the interaction: competing size calculations, dense targets below comfortable touch size, uneven scene hierarchy, and regression coverage concentrated on starting states. A framework or artwork replacement is not justified.

Fresh browser checks passed for all 37 catalogued maths game types: Start, lightbulb, hidden optional helpers, rules dialog, shared pause, focus return, no page errors, no gameplay-button/bottom-dock intersection. This is **not** an all-state or native quality pass. Additional measurements reveal issues that these smoke assertions do not reject.

## Evidence and limitations

- `qa-artifacts/ios-aaa-audit/results.json` and `*-play.png`: current compiled iOS-mode browser captures; 35 games at844×390 and two at390×844.
- `qa-artifacts/ios-aaa-audit/tablet/`: exploratory tablet-shaped browser layouts. The Xcode target is iPhone-only; these do not establish iPad support.
- `qa-artifacts/ios-aaa-audit/interfaces/results.json`: fresh390×844 and768×1024 interface/calm captures, with actual rendered route/screen recorded. Six calm activities entered through the hub.
- Historical evidence remains in `game-dock-clearance`, `portrait-games`, `ios-independent-account`, `game-start-gate`, `zombie-hero-grounding`. These were not all rerun here and may predate local fixes.
- [Game inventory](IOS_GAME_INVENTORY.md) distinguishes37 screenshot-catalog games from additional registered/dormant/source-only implementations. Do not count unrendered sources as visually passed.
- No simulator, physical iPhone, hardware safe-area, VoiceOver, StoreKit purchase, thermal or Instruments session ran here. Synthetic account fixtures prove browser rendering only. No production data was changed.

## Top 10 systemic issues

| Rank / ID | Priority | Finding and cause | Required response |
|---|---|---|---|
|1 S01|P1|Competing size authorities: App design transform, content shrink-to-fit, HUD reserves and game overrides. `App.tsx:911–1008`, `GameplayContentViewport.tsx:16–60`, `index.css:5059–5166`.|One measured safe rectangle and shell rows; migrate representative games first.|
|2 S02|P1|Targets shrink below authored size. Coordinates targets≈26.47px, Match Mastery≈38.16px, Unload52×22px.|Recompose dense boards; enforce rendered-size floors without overlapping invisible targets.|
|3 S03|P1 verification|Safe-area ownership split across native CSS, inline HUD and global formulas; ordinary browser insets are zero.|Single inset owner; verify both notched landscape directions on hardware. No hardware violation is claimed yet.|
|4 S04|P1 risk|Top HUD is absolute with estimated reservation, while bottom dock already occupies a real row.|Preserve bottom row; flow or measure top HUD instead of per-game offsets.|
|5 S05|P1/P2|Geometric fit can leave diagrams, labels and dense interactions too small.|Game-specific composition; prioritise coordinate/equivalence/assessment boards.|
|6 S06|P1|Rocket's inactive portrait rocket is extremely faint, with substantial unused vertical scenery.|Keep inactive assembly recognisable and arrange progress around the activity.|
|7 S07|P1/P2|Zombies separation now relies on broadly muted scenery; repeated static hero staging creates sameness elsewhere.|Local focal separation and shared floor anchors; preserve the colourful scene. Current foot alignment is verified, not an open floating-hero claim.|
|8 S08|P1 verification|One starting question and reduced-motion screenshots miss long tasks, drag, feedback, results and animated collisions.|Deterministic state fixtures, region assertions, normal-motion clips and human review.|
|9 S09|P2|Global override layers and broad descendant selectors make fixes import-order dependent. `main.tsx:9–20`, `index.css`.|Explicit opt-in shell slots; retire overrides incrementally after regression checks.|
|10 S10|P2 risk|Large art, full-scene filters, atlas decode and multiple render loops may increase GPU/memory costs.|Profile native scenes before optimising. Preserve existing renderer backing-size/DPR caps.|

No P0 was demonstrated in the new starting-state captures. Untested states remain unclassified, not implicitly passed.

## Confirmed measurement register

Browser rectangles are CSS pixels after transforms, **not** measurements of native UIKit points. They screen for touch risks. Apple recommends44×44-point controls: [UI design tips](https://developer.apple.com/design/tips/); safe/resizable layout guidance: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), checked22 October2026.

|ID|Evidence in phone results.json|Priority|Acceptance|
|---|---|---|---|
|T01|Coordinates Quest49 sampled targets≈26.47×26.47|P1|Coordinate selection without neighbouring ambiguity; enlarge interaction or offer explicit selected-point/step controls. Preserve coordinate maths.|
|T02|Match Mastery30 tiles≈38.16×38.17|P1|Reflow board/decorative hero budget for≥44px rendered targets, then native edge-tap tests.|
|T03|Remainder Run Unload52×22; button font10px|P1|≥44px effective height, readable label, clear crate/quantity.|
|T04|Four sampled Prime Pop bubbles42×42|P2|≥44px effective non-overlapping targets; verify moving/spawn/line-edge states.|
|T05|Landscape tips scrollport224px high; rules exceed it|P2 verification|First rule visible immediately; all rules touch-scrollable; fixed close/return reachable. Current first-rule bounds intersect scrollport; native swiping unverified.|

Random bubble content/count varies. PASS in the capture report refers to the script's smoke assertions, not T01–T05 compliance.

## Exploratory larger-window findings

The native target is currently iPhone-only. These findings matter before supporting larger/resizable windows and must not be presented as reproduced iPhone defects:

- At768×1024, all six calm activities put Good to Know prose in a narrow, often single-word column inside a much wider panel. Reflow the tip copy/control track; do not reduce font size. See `interfaces/contact-tablet.jpg`.
- Tablet-shaped Change Counter over-occludes its merchant behind the counter; only eyes/ears remain prominent. Recompose the actor/counter relationship while retaining the credible shop.
- Transformation's side controls wrap corner labels awkwardly and truncate Check image; give its control area an intrinsic width and reflow below the graph when necessary.
- Place Value's task appears twice in the tablet capture. Resolve duplicated task presentation through explicit shared/local question ownership, not by hiding arbitrary text globally.
- Larger Clock/graph instruments gain meaningful readable area, supporting the diagnosis that short-phone allocation is the underlying problem rather than inadequate illustration detail.

These are P2 adaptive-layout/art issues for future larger-window support. Tablet-shaped targets still screen small: sampled Prime40px and Coordinates42px. Native iPad support requires a deliberate device-family decision first.

## Non-game screen inventory

Source paths below are under `src/`. B=current browser capture; H=historical evidence; S=source only. Scroll menus are intentional; document scrolling during scored play is not.

|Screen/state|Component/source and dependencies|Layout/orientation|Findings, test and priority|
|---|---|---|---|
|Native launch/bootstrap|`main.tsx`, `platform/nativeApp.ts`, native storyboard/SceneDelegate|Native bridge + lazy DOM, portrait initial|S. Cold/offline/background launch unverified; P1 verification.|
|Login|`website/ParentAccount.tsx`, `platform/ios/IOSAccountLayout.tsx`, `ios-account.css`|iOS account presentation, shared credentials, portrait|H. Preserve independent app chrome; test keyboard/home indicator/long errors.|
|Signup, forgot/reset/callback|Same plus `nativeAuthReturn.ts`, `IOSAppRoot.tsx`|Form flow/callback|H signup; S recovery. Test expired links and return-to-app with keyboard.|
|Learners/parent settings|`platform/ios/IOSFamilyScreen.tsx`|Portrait max420px column|B `/parent`. Clear compact account; zero/multiple children, deletion confirmation/loading/retry need rendering.|
|Subscription/restore|`platform/ios/IOSSubscriptionScreen.tsx`|Embedded account status/product flow|S. Native and internal-testing branches differ. Sandbox cancelled/pending/restore/error, no live purchase for visual QA.|
|Adventure splash|`app/AppRouter.tsx`, `design/desktop-welcome.css`|Full scene/low CTA, portrait|B `/play`. Strong art; test long player name and hardware clearance.|
|Avatar/profile-setup alias|`screens/AvatarSelect.tsx`|Character stage, portrait|B `/avatar`. Strong focal hero; keyboard/name/arrows require tests.|
|World map|`screens/WorldMap.tsx`|Scrollable map + dock, portrait|B `/map`. Strong overview; verify island hit regions, lower destinations and scroll return.|
|Island/level selection|`screens/IslandLevels.tsx`|Expandable mission list, portrait|B `/island/1`. Nested panels consume room; expand longest group/locked/completed states. P2.|
|Character shop|`screens/CharacterShop.tsx`|Filters + scroll list, portrait|B `/shop`. Dense filter/panel header. Verify long item, equipped/locked state and final row. P2.|
|Profile|`screens/PlayerProfile.tsx`|Stats/actions/recommendations, portrait|B `/profile`. Competing panels; verify empty/rich progress and clear next action. P2.|
|Achievements tracker|`screens/AchievementTracker.tsx`|Scroll list, portrait|B `/achievements`. Check final item above dock and completed state.|
|Settings|`screens/AdventureSettings.tsx`|Nested flow controls, portrait|B `/settings`. Upper-half content and extra frame; simplify later P3. Verify persisted independent sound/music.|
|Parent progress report|`screens/ParentDashboard.tsx`, `/play/parent`|Scrollable report|S. Native `/parent` is account, not this report. Capture sparse/dense data. P2 verification.|
|Daily quests|`components/modals/DailyQuestsModal.tsx`|Fixed modal/scroll|S. Long quest, completed/claimable state, short landscape, close/focus tests.|
|Achievement reward|`components/modals/AchievementsModal.tsx`|Fixed modal|S. Long reward name, focus/scroll tests.|
|Rotate + Start|`components/GameplayOrientationGate.tsx`|Portal interruption|H local Start report. Wrong-way Start disabled; no timer/spawn/audio before Start; mid-round preserves state.|
|Practice/mock/Tips|`components/game-ui/PracticeIntroPopup.tsx`|Portal + separate scroll body|B Tips5 images, DOM37. Test first meaningful rule, swipe to last, pause local loops. Keep mathematical constraints on screen.|
|Working/answer board|`components/game-ui/GlobalWorkpadDialog.tsx`, `SatsTapWorkpad.tsx` and assessment widgets|Dialog/canvas/input|S. Rotated/scaled drawing, keyboard, safe area and answer pad require interaction tests.|
|Victory/failure/practice/mock result|`components/results/LevelResultsModal.tsx`, `level-results.css`|Dialog with XP/stars/stats|S. Zero XP, level-up, long bonuses, short landscape. Retry/map/next reachable. `/results` redirects to profile; it is not result evidence.|
|Rewards/progression|`progression/*`, `components/CelebrationSplash.tsx`|Result overlay/animation|S. Normal/reduced motion; award once across retry/background; preserve reward math.|
|Calm hub|`wellbeing/WellbeingHub.tsx`|Scrollable illustrated list, portrait|B. Strong previews; verify final card and exit.|
|Six calm activities|`wellbeing/activities/{BreathingBloom,PeacefulPond,CandleCalm,ConstellationConnect,LeafDrift,ThoughtSort}.tsx`|Dedicated portrait scenes, no top gameplay HUD|B both shapes. Breath Bloom fits sampled portrait. Other calm scenes vary in empty space/tips density; test each phase and completion.|
|Calm completion|`wellbeing/WellbeingCompleteModal.tsx`|Modal|S. Token, restart/return route and safe area.|
|Chunk/missing game/runtime failure|`components/GameLoadBoundary.tsx`, `platform/ios/IOSAppBoundary.tsx`, `main.tsx`|Centered fallback/bootstrap status|S. Branded bootstrap P3. Force lazy-load failure; retry/back reachable and no crash loop.|

The per-game inventory is integral to this document. Some source-only and error/result states cannot honestly be marked visually verified; they are explicit work in the QA plan.

## Boundaries and handoff

Preserve stack, bundled native shell, assets, mathematical meaning/marking, scoring/progression, shared credentials and Start gate. Do not add systems to solve spacing symptoms. Fix shell allocation before tuning individual scenes. Absolute placement is appropriate for scenery/actors; essential form controls should use measured flow/grid. Units, required task constraints and active feedback must never disappear into Tips.

Assumptions: current local code is the audit target; iPhone is native scope; tablet captures are exploratory. No external legacy assumptions were used. Pre-existing local edits remain intact. Audit additions are the seven requested documents, supplemental inventory, two capture scripts and `qa-artifacts/ios-aaa-audit/` evidence. See [progress](IOS_AUDIT_PROGRESS.md) for exact completion and outstanding validation.
