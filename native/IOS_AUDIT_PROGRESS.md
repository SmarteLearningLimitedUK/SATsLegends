# iOS audit progress and handoff

Audit baseline:22 October2026. **Implementation was subsequently authorised; current status is in [IOS_REMEDIATION_PROGRESS.md](IOS_REMEDIATION_PROGRESS.md).** The audit evidence below is historical and must not be mistaken for the latest code or verification. Do not deploy or upload to TestFlight. The user's release hold remains active.

## Deliverables

1. [Full audit and issue register](IOS_AAA_AUDIT.md)
2. [Every-game orientation matrix](IOS_ORIENTATION_MATRIX.md)
3. [Art direction and scene-specific findings](IOS_ART_DIRECTION.md)
4. [Current/proposed layout architecture](IOS_LAYOUT_ARCHITECTURE.md)
5. [Prioritised executable batches](IOS_IMPLEMENTATION_ROADMAP.md)
6. [QA and native validation plan](IOS_QA_TEST_PLAN.md)
7. This progress/handoff record
8. Supplemental [game/component/reachability inventory](IOS_GAME_INVENTORY.md)

## Completed investigation

- Inspected current repo instructions, Vite/React/TS entry, Capacitor config, native SceneDelegate/storyboard/plist/Xcode device family, account/game routing, pause/session, shell/HUD, safe-area/viewport scaling, shared dialogs, games and calm registry.
- Established actual architecture: bundled React DOM/CSS/SVG/canvas game in Capacitor's native bridge/WebView; not React Native or a remote website-only wrapper. Current target is iPhone only, minimum iOS16. Existing native orientation plugin is used, with serialized requests.
- Source/reachability ledger covers37 campaign experiences, all6 calm activities and additional registered/alias/dormant/source-only implementations. Registry count is not the same as user-visible game count.
- Visually reviewed fresh campaign contact sheets and selected full-size images; all37 current starting scenes represented. Art findings identify current evidence and do not repeat corrected historical Pyramid/Share/grounding defects.
- Inspected current interface contact sheets at390 and768 widths: splash/avatar/map/island/shop/achievements/profile/settings/account and all6 calm activities. Historical login/signup captures consulted; not presented as fresh native verification.
- Reviewed Apple's public layout and touch guidance, linked in audit/test plan. No invented native size/performance measurements.

## Executed browser checks

|Run|Actual result|Scope/limits|
|---|---|---|
|`node scripts/audit-ios-aaa-screens.mjs`|37/37 smoke cases passed|35 at844×390, Prime/Rocket390×844; current compiled iOS-mode preview. Start/Tips/help pause/focus/errors and button/dock clearance. One seeded initial question per game, reduced motion.|
|`LEGEND_AUDIT_TABLET=1 node scripts/audit-ios-aaa-screens.mjs`|37/37 smoke cases passed|35 at1024×768, Prime/Rocket768×1024. Exploratory browser geometry, not supported native iPad.|
|`node scripts/audit-ios-interfaces.mjs`|32 captures, zero recorded capture errors|10 routes+6 calm starts at390×844 and768×1024. Capture/route inventory, not a complete functional assertion suite.|
|`npm run lint`|Passed `tsc --noEmit`|Current local tree; not native compilation. Log `.tmp/ios-aaa-audit-typecheck.log`.|
|Compiled iOS baseline|Vite build passed before audit captures|`.tmp/lightbulb-tips-final-ios.log`,35.77s. Existing large-chunk warning; not a measured runtime performance failure. No production changes were made after this build for this audit.|

No fresh phone/game starting-state horizontal overflow, offscreen buttons or button/dock intersection was recorded. Those results exclude later states, labels drawn in canvas/SVG, non-button hit regions and nonzero native insets.

The same reports deliberately retain **open target-size findings**: phone Prime42px, Match≈38.16px, Coordinates≈26.47px, Unload22px high. Tablet-shaped Prime40px and Coordinates42px also screen below44px. A smoke PASS does not close these issues. Tips landscape scroll body measured224px high and first rule within viewport; remaining content requires scrolling. Scale's full-size Tips screenshot was visually checked readable.

## Evidence locations

- Gallery: `qa-artifacts/ios-aaa-audit/index.html`
- Phone rectangles/test outcomes: `qa-artifacts/ios-aaa-audit/results.json`
- Tablet rectangles/test outcomes: `qa-artifacts/ios-aaa-audit/tablet/results.json`
- Interfaces/calm route and capture outcomes: `qa-artifacts/ios-aaa-audit/interfaces/results.json`
- Phone gameplay originals: `<game-key>-play.png`; five additional Tips images.
- Art contact sheets: `art-contact-1.jpg` through `art-contact-7.jpg`; interface phone/tablet contact sheets under `interfaces/`.
- Capture logs: `.tmp/ios-aaa-audit-capture.log`, `.tmp/ios-aaa-tablet.log`, `.tmp/ios-aaa-interface.log`. Logs are local diagnostics and may be ignored by Git; persistent results are the JSON/images/docs.

## Unverified and deliberately not passed

- Additional source-only/dormant game implementations were not forced into navigation; source findings only.
- Every game's later questions/difficulty variants, longest prompt, drag/cancel, feedback, defeat/result/reward, workpad/keyboard and all assessment response types are not newly rendered by this audit.
- Login/recovery/deletion/product/loading/error/result dialogs not freshly captured remain source/historical evidence as labelled in inventory; bootstrap source is inspected, no new native cold-start recording.
- Native iPhone rotation locks, actual WKWebView safe insets/keyboard, both landscape directions, VoiceOver, audio interruptions, StoreKit sandbox and sustained performance/memory/thermal remain device tests.
- No native iPad validation. Device family must be deliberately expanded before claiming iPad support; mask/policy mismatch is future scope, not a current iPhone blocker.
- No new SATs content/marking audit was performed, and no educational content/scoring was changed.

## Outstanding decisions

No decision is required to start the bounded viewport pilot. Later decisions: whether to add native iPad support; whether adaptive portrait prototypes for square-board games earn a policy change; minimum supported device/text scale and measurable native performance budgets. Do not invent answers from previous projects or chats.

## Historical recommended next action — superseded

The pilot below is already implemented and verified. Read IOS_REMEDIATION_PROGRESS.md for current results and the native-validation boundary; do not repeat this historical assignment.

Execute B0/B1 only from IOS_IMPLEMENTATION_ROADMAP.md: deterministic baseline and one shared usable-viewport pilot on Place Value Panic and Coordinates Quest. Keep other games on existing layout, preserve bottom dock/Start/pause, verify input mapping. The exact copyable assignment is at the end of that roadmap. Do not begin wholesale styling or replace artwork.

## Follow-up brief — Phase3B and continuity

The user supplied a consolidated history of art-direction and implementation prompts ending with an audit-first staged plan and continuity rules. On22 October2026, the existing audit was reused rather than rerun. Four documentation files were extended:

- `IOS_ART_DIRECTION.md`: dedicated Phase3B protocol, per-scene evidence fields, least-destructive local correction sequence, scene-family priorities and focal/state acceptance criteria.
- `IOS_IMPLEMENTATION_ROADMAP.md`: mandatory session continuity, one bounded batch, before/after verification, two-failed-attempt diagnosis checkpoint and explicit B4↔Phase3B mapping.
- `IOS_QA_TEST_PLAN.md`: focal-hierarchy evidence gate, normal-motion/state/non-colour checks and supported-orientation distinction.
- `IOS_AUDIT_PROGRESS.md`: this delta and current next action.

No new product changes or screenshot/test reruns were required for this documentation delta. Existing116 captures remain baseline evidence; new focal-state checks are specified but not claimed executed. No scene is newly marked remediated. The next implementation remains B0/B1, followed by the documented sequence; Phase3B is not a shortcut around shared geometry work. No TestFlight upload/deployment or model-setting change was made.

Assumptions: the final staged audit-only instruction governs this follow-up; established artwork and local verified fixes remain intact. No external legacy assumptions were used.

## Change boundaries

This audit added8 documents,2 capture scripts and evidence under `qa-artifacts/ios-aaa-audit/`. Earlier local Start, grounding, Scale label and lightbulb edits predate this audit and were preserved, not reimplemented. No deployment workflow was triggered, no branch pushed, no TestFlight upload performed. Assumptions: current repo/local code is baseline, iPhone current native target, browser evidence is not native proof. No external legacy assumptions were used.
