# Layout and orientation contract

The generated `game-inventory.json` lists all 37 campaign games, current routes, available levels and their orientation from the actual policy. It is generated from current repository constants, not a historical route catalog.

## Ownership

- The native app is React/TypeScript/Vite in Capacitor. `IOSAppRoot.tsx` serializes native screen-orientation requests. Account, welcome and map screens request portrait; landscape games unlock the native view so the learner can physically turn it.
- `App.tsx` and `GameplayOrientationGate.tsx` own the Start/turn interruption. Start is disabled until orientation is suitable. Rotation during play pauses the session instead of remounting the game.
- `GameplayContentViewport.tsx` owns resize observation, available scene dimensions and reflow/scaling. Its observer and pending animation frame are disposed on exit.
- The shared HUD owns navigation, Help, Board and audio controls. Mini-games own their question, interaction and feedback.
- Reference scenes place those regions within the same shared stage. Their safe-area insets are applied once by the content/HUD anchors; entry and account views have their own single safe-area owner.
- Map and account management intentionally scroll. Gameplay must fit its viewport. An expanded parent-settings form is not a gameplay overflow defect.

## Orientation decisions

| Games | Preferred orientation | Reason |
|---|---|---|
| Place Value Panic | Portrait | Vertical question, place slots, digit bank and Submit. Seven places reflow into two rows on compact phones. |
| Prime Pop | Portrait | Vertical rising targets and danger boundary. The existing scored round remains 60 seconds. |
| Rounding Rocket | Portrait | Vertical assembly/launch subject with an answer rail. |
| Take-Out Rush | Portrait | Kitchen above a tray workspace; larger question band leaves all controls visible. |
| Mean Machine | Portrait | Question above the scanner, followed by four answers. Compact phones get a full-width strip of the same live readings and a single answer row; larger phones retain the machine readout and two answer rows. Feedback has its own layout row. No gameplay scrolling. |
| Number Line Ninja; Maths vs Zombies; Ratio Racer | Landscape | Horizontal scale, defended lane or race track. |
| Fraction Forge; Match Mastery; Percent Power; Simplify Sprint | Landscape | Side-by-side subject and recipe/board/answers. |
| Remaining geometry, measurement, data, operations, reasoning and core-paper games | Landscape | Graphs, grids, construction surfaces or multi-field answers need horizontal room. Individual keys are listed in the JSON matrix. |
| Potion Panic; Share Splitter; Scale Builder | Landscape | Vessel/party/blueprint beside the response workspace. |
| Breath Bloom; Peaceful Pond | Landscape | Current activity-owned wide scene and physical-turn gate. |
| Candle Calm; Constellation Connect; Leaf Drift; Thought Sort | Adaptive | Existing activity layout follows the usable view. |

Fraction Forge previously inherited Take-Out Rush's portrait policy because they share a legacy renderer identifier. Its explicit blueprint identity now takes priority. Mean Machine was subsequently changed to portrait at the owner's explicit request. These presentation-only policy decisions are recorded with before/after hashes in `visual-source-exceptions.json`; the protected baseline itself was not replaced. Questions, scoring and gameplay implementations did not change. Native orientation requests use the same policy through `IOSAppRoot.tsx`; physical-device validation of the new Mean Machine amendment remains outstanding.

## Device targets and limits

Browser checks cover compact stress sizes (320×568 portrait / 667×375 landscape), standard (390×844 / 844×390), large (430×932 / 932×430), and tablet (768×1024 / 1024×768).

The Xcode project currently targets iPhone only. Tablet browser checks are adaptive stress tests, not native iPad certification. Browser emulation cannot validate the Dynamic Island, physical rotation lock, home-indicator behaviour, VoiceOver, Dynamic Type, iOS texture memory or native GPU frame pacing. These remain explicit device-validation gates.

Coordinates Quest has densely spaced optional direct grid targets. Its labelled Increase/Decrease x/y controls and Choose point action provide the full interaction through targets at least 44px tall. Axis text intersecting transparent grid hit regions is intentional; it must not be treated as overlapping opaque controls.
