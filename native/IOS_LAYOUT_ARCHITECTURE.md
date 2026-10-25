# iOS layout architecture audit

Audit date: 22 October 2026. Scope: repository inspection and incremental remediation design. This document does not certify native runtime behaviour, frame rate, thermal performance, accessibility, or App Store readiness. No deployment or app-code changes were performed for this document. Local source may differ from the current TestFlight binary.

## Verified architecture

| Layer | Current implementation and source evidence |
| --- | --- |
| Native container | Capacitor 8 dependencies in `package.json`; `capacitor.config.ts:3` sets the existing bundle ID and packages `dist-ios`, with mobile content mode and `contentInset: 'never'`. There is no remote `server.url` in this config. |
| iOS scene | `native/ios/App/App/SceneDelegate.swift:23` defines `GameViewController: CAPBridgeViewController`; it registers `LegendsStorePlugin`, prefers portrait at presentation, and hides the status bar. The storyboard owns the scene window; the delegate explicitly avoids creating a second bridge. This is a web-rendered React application in a Capacitor native container, not a React Native or SwiftUI game. Xcode target settings currently specify iPhone only (`TARGETED_DEVICE_FAMILY = 1`, `project.pbxproj:320,341`) and minimum iOS 16 (`:309,331`). |
| Build and entry | `vite.config.ts` selects iOS mode, separate output and `VITE_APP_TARGET`; `src/main.tsx:22` lazily selects `IOSAppRoot` versus `WebsiteRoot`. Only `VITE_` environment values are exposed by that build path. `src/platform/nativeApp.ts:25` marks the target, maps the root route to `/parent`, and listens for native app-state changes. |
| Navigation | `src/platform/ios/IOSAppRoot.tsx:19` wraps the shared family account provider and defines React Router account/subscription routes. The game is lazy-loaded behind the existing access gate. `src/App.tsx` owns the game's selected screen/level and delegates game routing to `src/app/AppRouter.tsx`. |
| State and pause | `src/app/gameplaySessionContract.ts:6` carries shared time/lives/paused state and normalized game outcomes. `src/app/useGameplaySession.ts` owns shared session clocks/lives. `src/App.tsx:351,391` combines native background, entry/orientation, tips, workpad, briefing and result pauses. Individual games also have local interaction state; a shell pause is not evidence that every local animation loop obeys it. |
| Rendering | React DOM and CSS are the primary UI; games also use SVG, sprite atlases and canvas. Examples: `src/games/AngleArenaGame.tsx:915` owns a canvas draw loop; `src/components/game-ui/ContinuousAtlasCharacter.tsx:65` advances atlas animation; `OriginalHeroCharacter.tsx:59` drives a mesh renderer. |
| Styling | Tailwind Vite plugin, global `src/index.css`, design themes and per-game CSS coexist. `src/main.tsx:9–20` establishes the global import order including multiple polish/readability override layers. MotionConfig respects user reduced-motion preference at `src/main.tsx:31`. Custom loops have their own reduced-motion checks. |

## Shared layout and safe areas

`index.html:5` uses `viewport-fit=cover`. With native content inset disabled, application layout must own safe areas.

* `src/App.tsx:63` reads VisualViewport dimensions (with an explicit zoom distinction); resize, orientation and VisualViewport listeners are registered around line 594. The outer viewport receives measured pixel height at line 1011.
* `src/index.css:120–210` supplies a fixed viewport, a transformed design stage, an optional scrollable stage and an unbounded responsive stage. It forcibly maps descendant viewport-sized utility classes back to the stage. `src/App.tsx:911–1008` decides which mode each screen uses and publishes stage dimensions and scale variables.
* `src/platform/native-app.css:8` removes left/right safe-area insets from the unbounded stage. This is implemented; correctness during rotation, keyboard display and nonzero hardware insets still requires native testing.
* `src/components/UnifiedMiniGameHUD.tsx:53` positions the top HUD absolutely, with safe-area top divided by stage scale. Its bottom wrapper similarly applies the home-indicator inset at line 86.
* `src/components/game-ui/gameplay-dock-layout.css:4–25` turns the gameplay HUD wrapper into `display:contents`, makes the bottom HUD a real flex row and gives remaining height to gameplay. This is a good existing direction: preserve it rather than reinstating an overlay dock.
* The top HUD still relies on a reserved-height formula: `src/index.css:5059–5083` computes a fixed row/padding budget, then applies it to structured layouts. Exceptions and descendant selectors follow it through line 5166.
* `src/app/AppRouter.tsx:550–565` wraps games in shell contract / structured layout / `GameplayContentViewport`. The latter measures `scrollWidth/scrollHeight` and scales the complete content down to fit (`src/components/GameplayContentViewport.tsx:16–60`).

## Orientation and entry

`src/app/gameOrientation.ts:5` explicitly selects portrait for Prime Pop and Rounding Rocket; all remaining gameplay defaults to landscape. This is an implementation default, not a game-by-game usability finding. Calm routes are not selected by that gameplay table.

`src/platform/ios/IOSAppRoot.tsx:29–37` serializes native requests: landscape games unlock orientation so the learner physically turns the phone; other routes lock portrait. `needsGameRotation` uses viewport thresholds (`width < 700` for portrait-to-landscape, and short/wide thresholds for portrait games). Large tablets can therefore bypass the phone rotation gate by design. `Info.plist` permits portrait and both landscape orientations on iPhone but lists landscape only under the iPad-specific key. The current target is iPhone-only (`project.pbxproj:320,341`), so this is a future iPad-support policy issue, not an established current iPhone defect.

`src/App.tsx:243,1017–1043` requires Start for a fresh round and does not mount the routed game until Start. `GameplayOrientationGate.tsx:16` renders its interruption as a body portal outside transformed content. Mid-round rotation pauses rather than starting a second round. Preserve this design and verify timer, input and sound pause for every local game loop.

## Findings and priorities

| ID / priority | Source-backed finding or risk | Incremental action and acceptance condition |
| --- | --- | --- |
| ARCH-01 / P1 | Layout has several sizing authorities: App design-stage scaling, content auto-scaling, global HUD reserves and game overrides. These are verified mechanisms; they are a plausible cause of repeated clipped or tiny controls, not proof that every screen currently fails. | Make the shell own usable bounds once. Migrate one representative game at a time to real layout rows; measure rendered button and label sizes after all transforms. Retain current output until each migrated game passes screenshot and interaction checks. |
| ARCH-02 / P1 | Top HUD is absolute and reserves an estimated height, while bottom dock now owns a real row. Formula-based top reserve cannot adapt automatically to title wrap, text zoom or changed HUD contents. | Give the top HUD an actual shell row too, or publish its measured height as the sole reservation. Long titles, practice, timed, assessment and larger text must remain clear of the question. Do not add another per-game offset. |
| ARCH-03 / P1 | `GameplayContentViewport` can scale everything, including touch targets and text, below its authored size without a readability floor. No minimum scale is enforced in its calculation. | Prefer reflow/compact composition for short screens; cap permitted whole-scene shrink and fail QA when targets/text fall below the approved rendered minimum. Controls should not be fixed by cropping or invisible overflow. |
| ARCH-04 / P1 | Global class-substring selectors and `!important` rules rewrite descendant padding/viewport behaviour (`src/index.css:178–210,5132–5166`). Several later global review layers depend on import order. | Establish explicit shell slots and opt-in layout attributes. Remove each old override only when the matching game migrates and regression images pass. Avoid a broad CSS deletion or redesign. |
| ARCH-05 / P1 verification | Safe-area ownership is split between native CSS, HUD inline styles, global formulas and per-game rules. Source inspection alone cannot prove that insets are applied exactly once. | Test both landscape directions with nonzero cutout/home-indicator insets, plus portrait, background/foreground and keyboard transitions on actual iPhone. Assert interaction bounds lie inside the shell's usable rectangle. |
| ARCH-06 / P3 future scope | Current target is iPhone-only. If iPad is added, its landscape-only plist declaration and phone-first gate thresholds need a coherent product policy. | Keep iPad outside current release claims. Before enabling iPad, decide its per-game orientations using interaction evidence and align the manifest, native declarations, gate logic and captures. |
| ARCH-07 / P1 verification | `PracticeIntroPopup.tsx:43–65` has fixed close/footer areas and a scrolling middle region. A short-screen panel can pass DOM-count tests while initially showing little readable instruction text. | Assert visible intersection of summary/first rule with the scrollport, close-button visibility and scroll reachability of the last rule at the smallest supported landscape size. Include safe-area padding for body portals. |
| PERF-01 / P2 risk | Continuous atlas actors decode all three sheets before ready and run individual requestAnimationFrame loops (`ContinuousAtlasCharacter.tsx:59–83`). Multiple actors can increase decode memory, callbacks and React frame updates. Compressed file bytes do not indicate decoded memory. | Measure decoded dimensions, active actor counts and frame timing on the oldest supported device. Share decoded assets; suspend offscreen/paused actors. Introduce shared animation scheduling only if measurement justifies it. |
| PERF-02 / P2 risk | `AngleArenaGame.tsx:922–923` allocates backing dimensions at full `window.devicePixelRatio`; drawing loops use that ratio again for logical coordinates. High-DPR full-screen canvases cost memory/fill rate. | Profile canvas buffer bytes and missed frames before applying any DPR cap. If capped, use one effective render ratio consistently for buffer, transform, hit-testing and resize. Preserve sharp diagrams. |
| PERF-03 / P2 risk | Responsive ambient art uses full-size blur and scale (`src/index.css:4892–4904`), and overlay blur is also used. Mesh animation redraws every visible frame; `OriginalHeroCharacter.tsx:66–68` already checks hidden/offscreen state. | Profile layer count/compositing and frame time with normal motion, not only reduced motion. Prefer preprocessed background variants when a measured GPU cost exists. Do not degrade all art speculatively. |

The hero mesh uses WebGL with antialiasing (`src/components/game-ui/originalHeroMesh.ts:24`) and already caps its square backing size at 1024 and effective DPR at 2 (`:86`). Preserve that existing bound; do not describe every renderer as unbounded. Device-loss recovery and simultaneous WebGL actor capacity remain native verification work.

Priorities distinguish observed architecture from unmeasured defects. No physical-iPhone, Instruments, thermal, memory-warning or VoiceOver run was performed in this audit workstream.

## Proposed incremental contract

Keep the current stack, state/event APIs, asset identity and navigation. Add a thin explicit contract around the existing shell rather than a new rendering framework:

1. **Screen policy:** one typed manifest keyed by existing game blueprint keys, declaring preferred orientation, allowed compact composition, and whether the scene is timed. Use it for native orientation, browser gate and capture tooling.
2. **Single safe rectangle:** viewport size minus insets, applied once by the outer shell. Full-bleed art may render outside that rectangle; questions, numbers, draggable objects, buttons and HUD must remain inside it.
3. **Physical rows:** top HUD, question, flexible interaction scene, answer/action area, utility dock. Each row has `min-height:0` only where shrinking is legitimate. A game may merge scene and answers intentionally, but must expose their measured bounds.
4. **Art-only absolute placement:** background, ambient effects, floor planes, character anchors and intended projectile paths can use scene-relative coordinates. Question/answer forms should use flow/grid. Character foot anchors must reference the same floor plane, not independent viewport percentages.
5. **Pause contract:** one shell pause reason set, forwarded to every timer, input handler, spawn loop, sound and animation. A tips modal pauses gameplay; decorative motion may use an explicit separate policy. Start is a user gesture before scored play.
6. **Readable scaling:** use reflow first. Any remaining whole-scene transform must report its effective scale and be included when checking hit targets, text, clearance and contrast. Do not certify authored CSS sizes alone.
7. **Explicit layers:** atmosphere, ground, actors/game objects, question/answers, HUD, portal dialogs. Avoid arbitrary z-index escalation across per-game styles; essential math always outranks decorative art.

## Verification strategy and existing tooling

The repo already contains Playwright-based captures and checks. Relevant entry points include `scripts/verify-ios-account-shell.mjs`, `verify-game-start-gate.mjs`, `verify-game-dock-clearance.mjs`, `verify-game-layout-overlaps.mjs`, `verify-critical-game-viewports.mjs`, `verify-full-game-screens.mjs`, `verify-game-tips.mjs`, and `capture-whole-game-review.mjs`. These are tooling availability findings, not claims that they passed during this audit. Inspect individual fixture scope before treating a result as end-to-end account or native proof.

For each changed game capture smallest supported phone landscape/portrait as appropriate, a current notched iPhone shape, larger phone and intended tablet/desktop shape. Include long questions, selected/dragging states, wrong/correct feedback, result, tips, rotation and resume. Record rendered rectangles and screenshot evidence together. Button intersection checks alone do not detect characters obscuring numeric SVG/canvas content. Add semantic scene exclusion zones and human image review for that case.

Maintain separate status labels: source verified, browser rendered, simulator verified, physical device verified, and untested. Performance acceptance should report actual device/OS, build, normal-motion frame timing, active actor count and test duration; do not infer it from a static screenshot or desktop browser.

## Change record and assumptions

Changed only `native/IOS_LAYOUT_ARCHITECTURE.md` in this workstream. No build was needed for a documentation-only change. Assumptions: the requested first stage is diagnosis/planning; local source is the audit target; final device support and measurable performance budgets require product decisions. No external legacy assumptions, prior-project systems, or undocumented dependencies were used. No TestFlight upload or deployment was initiated.
