# iOS QA test plan

22 October 2026. This defines acceptance work, not completed tests. Executed evidence is recorded separately in IOS_AUDIT_PROGRESS.md. No release/upload is authorised.

## Test environments and provenance

1. Browser: compiled `npm run build:ios`, served with `npx vite preview --mode ios --host 127.0.0.1 --port 3024`. Current scripts target `http://127.0.0.1:3024`. Browser screenshots test React/CSS, not WKWebView native behaviours. Account fixture is synthetic and must intercept account traffic; do not use real child data.
2. Simulator: exact signed/unsigned native build, device/OS identifiers, WebView bounds and native orientation logs. Exercise actual ScreenOrientation bridge, keyboard and safe areas.
3. Physical iPhone: smallest supported compact phone and current notched/Dynamic Island shape. Both landscape-left/right, portrait, home indicator, screen edge gestures, display zoom/larger accessibility text and keyboard.
4. iPad: future support only. Current Xcode device family is1. Before promising iPad support reconcile plist masks, portrait account/calm policy, multitasking and resizable windows; browser1024×768 is exploratory.

Apple baseline references: [44-point hit targets and legibility](https://developer.apple.com/design/tips/), [safe areas and adaptive layout](https://developer.apple.com/design/human-interface-guidelines/layout). Use44×44 rendered CSS pixels as browser screening at unzoomed viewport, then verify effective hit areas in the native app. Do not turn dense grid cells into mutually overlapping invisible targets.

## Screenshot matrix

|Group|Required sizes/states|Evidence requirement|
|---|---|---|
|All37 campaign games|Current preferred orientation; compact667×375 landscape or375×667 portrait, default844×390/390×844, larger932×430/430×932|Initial scored and practice; title/difficulty/question ID; complete question and controls. Current audit only captures one initial campaign question each.|
|Dense boards|Match, Coordinates, Transformation, Core diagrams; compact/default + exploratory tablet|Selected tile/point/corner, drag/hover ghost, full equation/fraction/axis labels, wrong/correct feedback; rendered bounds and hit-test neighbours.|
|Dynamic games|Prime, Zombies, Rocket, race, Takeout, Angle|Beginning, peak active objects, imminent line crossing, hit/defeat/build/launch; normal-motion recording. Capture after known progress, not arbitrary wall-clock only.|
|Assessment papers|All3 identities; every response widget type|Long prompt, hundred-square/equivalent fraction, combination diagram, tables, geometry, answer pad, workpad, keyboard, saved/skipped/revisited task and finish dialog. Initial arithmetic screenshot is not coverage of all widgets.|
|HUD/interruptions|All37 lightbulb; representative workpad/briefing/results|Short landscape, long title, larger text, timed/untimed, practice/mock; fixed close/back, scroll to final rule, focus restoration.|
|Account|Login/signup/forgot/reset/callback/learners/subscriptions|Compact/default portrait; keyboard open, error, loading, zero/multiple learner, pending/cancelled/restore, internal-testing versus release branch.|
|Navigation/progression|Splash/avatar/map/each island/expanded missions/shop/profile/achievements/settings/parent report|Portrait, long name, sparse/rich progress, locked/completed/claimable and bottom-of-scroll states.|
|Calm|All6 initial/active/intermediate/completion|Compact/default portrait, no top gameplay HUD, no required document scrolling, pause and return, reduced motion. Calm hub itself may scroll.|
|Recovery|Bootstrap/chunk/account/offline/runtime failure|Readable branded state, usable retry/back, no crash loop or lost active round without explanation.|

Store screenshots as `<game>__<state>__<question-id>__<width>x<height>__<motion>.png`, alongside JSON build/viewport/DPR/inset/state metadata. Keep baseline art immutable during a comparison. Record any crop/mask and why.

## Assertions beyond screenshot diffs

- Every required question, unit, fraction denominator, axis value and answer must remain visible and distinguishable. Static instruction removal is allowed only with equivalent rules available in Tips; essential task information is not a tooltip.
- Intersect actual rendered rectangles with safe viewport and relevant container; text range rectangles detect clipping that parent bounds miss. SVG/canvas labels require screenshot/semantic scene checks rather than button-only tests.
- Bottom dock is a physical row; top HUD must not occupy question/diagram bounds. Intentional actor/scenery layering is allowed, actor/number or actor/answer obscuration is not.
- Measure transformed hit areas, including nearby targets and pointer-events. Test centre and near-edge taps. Small targets identified in T01–T04 remain open even though smoke report says PASS.
- Document width must not exceed viewport. Game document height must not require scrolling; intentional dialog/menu scroll needs reachable final content and return controls. Overflow-hidden alone is not a pass.
- Validate focus containment, focus return, accessible names, keyboard exit and native VoiceOver order. Explicitly test result/dialog stacking and inert background.

## Functional regression checklist

1. Entry wrong-way: Start disabled, game not mounted, no timer/spawn/action sound. Correct-way: Start enabled; only tap begins round. Retry/new level requires Start.
2. Rotation mid-round: preserve question/selection/progress, pause timer/input/spawn while blocked, resume once; no duplicate listeners/audio or fresh timer. Repeat rapid route changes to test native lock queue.
3. Tips/workpad/briefing: shared time and local game clocks pause; no penalties behind dialog; focus returns; selected answer/drag state recovers safely. Touch-scroll final rule, then close. Test rules with longest guide.
4. Prime: composites cross harmlessly, missed prime exactly one penalty, wrong tap rule, sufficient opportunities and target completion; no line/label/character obstruction. Repeat dense spawn cluster.
5. Zombies: enemies/hero feet share floor in cast/walk, target selection works, equation and answers clear, defeat groan each kill, sound mute respected, scene motion does not change answer-panel height.
6. Place Value/Takeout/Share/Scale/Forge: tap/drag/pointercancel, correct source/target coordinates after resize, all options inside containers, no visual state displaces action controls; existing marking/scoring results unchanged.
7. Chart/geometry: plot/tick/axis hit tests, boundary endpoints, negative coordinates, corner selection, transform, numeric keypad and label readability. Resize before interaction.
8. Core: each input model accepted/rejected as intended, save/later/revisit/finish, workpad non-destructive, paper timers and summary, restore pending run. Content coverage audit is not rerun by this visual task.
9. Outcomes: fail/timeout/victory/practice/mock, retry/map/next reachability, zero/large XP, level-up, duplicate callback protection, reward once, background during animation. Test via real play where practical; synthetic callback fixtures must be labelled.
10. Native: lock/unlock and both physical rotations; keyboard viewport; background/foreground, interruption/headphones/mute; offline/cold start, memory pressure, sustained normal-motion session; StoreKit sandbox and return flow. No live purchases or deployment needed for browser work.

## Existing tooling and gaps

- Use `scripts/audit-ios-aaa-screens.mjs` and `audit-ios-interfaces.mjs` for initial evidence; `LEGEND_AUDIT_TABLET=1` selects exploratory tablet shapes. Capture scripts report small targets but do not currently fail on them.
- Reuse `verify-game-start-gate.mjs`, `verify-game-dock-clearance.mjs`, `verify-game-tips.mjs`, `verify-zombie-hero-grounding.mjs`, `verify-zombies-contrast-audio.mjs`, `verify-prime-pop-playability.mjs`, and game-specific tests named in inventory. Read base URL, fixture and Start assumptions before running older scripts.
- Old tests using React internals or direct callback invocation test settlement/presentation, not a child's actual interaction. Preserve that distinction.
- Add deterministic visual baselines with thresholded image comparison and human approval; mask only intentional animated pixels, never question/answer/HUD regions. Pair image review with target/semantic bounds.
- Run normal-motion clips separately from reduced-motion stills. Measure native frame-time/memory with device/OS, duration, actor count and thermal state; no invented FPS target achievement.

## Release gates

### Phase3B focal-hierarchy evidence gate

For each affected scene, retain same-question/state before/after full-size captures and, where useful, reduced-size/grayscale review aids. Record intended versus observed focal point, immediate background competition, character/interaction silhouette, support/contact, state cues and necessary maths visibility. Inspect both supported compositions separately; a turn-gated orientation is not an adaptive gameplay pass. For dynamic scenes include normal-motion peak-action clips; reduced-motion stills cannot certify action readability.

Verify selected/disabled/correct/incorrect/drag/drop states with cues beyond colour. Check local background treatment has not spilled onto text, controls or unrelated scenes. Compare local focal readability and surrounding scene richness; reject uniform darkening, indiscriminate blur/halos or character enlargement that crowds the educational task. Use IOS_ART_DIRECTION.md Phase3B's explicit per-scene completion criteria.

These checks are newly specified, **not newly executed**. The existing106 main captures and10 Tips captures remain baseline evidence. Stop speculative corrections after two failed attempts at the same issue and record a new root-cause diagnosis before further editing.

No open demonstrated P0/P1. Each fix has before/after same-state evidence and functional checks. Every unverified native item remains explicitly unchecked until performed on the exact candidate. Compile and TypeScript checks are necessary but insufficient. Do not label exploratory iPad or browser fixtures as native passes. User's TestFlight hold persists until separately lifted.

No external legacy assumptions were used.
