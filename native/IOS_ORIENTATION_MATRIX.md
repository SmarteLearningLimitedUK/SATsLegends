# iOS orientation matrix — 22 October 2026

Audit and recommendations only. No orientation or gameplay code was changed for this document. Recommendations preserve the current fantasy art and mechanics; they are not claims that alternative compositions already work.

## Evidence and policy

Current policy is `src/app/gameOrientation.ts`: Prime Pop and Rounding Rocket request portrait; every other maths level defaults to landscape. `src/platform/ios/IOSAppRoot.tsx` locks non-landscape routes to `portrait-primary`, but **unlocks** landscape routes rather than forcing landscape. `GameplayOrientationGate.tsx` controls the turn-and-Start flow. The current gate is dimension-based, not a complete device/window capability policy. Calm routes are non-gameplay routes and therefore request portrait.

Specifically, `needsGameRotation` only gates a landscape game when width is below 700 CSS pixels and height exceeds width. A 768-pixel-wide portrait iPad can therefore enter a landscape-preferred composition. Portrait games are gated in landscape only when height is below 700 and width below 1100. This may intentionally leave larger windows adaptive, but that adaptation is not encoded per game. Document/test these threshold boundaries; replace accidental exemptions with explicit supported layout capabilities before claiming iPad readiness.

**P3 future iPad scope/configuration decision:** `native/ios/App/App/Info.plist` allows portrait and both landscape orientations on iPhone, but its iPad array allows only landscape. The Xcode project currently has `TARGETED_DEVICE_FAMILY = 1` (iPhone only), so this is not a current supported-device release blocker. If iPad support is enabled, native portrait requests for account screens, calm activities and portrait games need reconciliation and actual iPad verification. Do not infer correct iPad behaviour from browser resizing. Inspect the orientation plugin bridge and supported mask together before changing either.

The 37 campaign experiences below are evidenced by `src/constants.ts`, `src/systems/content/island1NumberBaseCamp.ts`, `src/app/AppRouter.tsx`, and `qa-artifacts/game-dock-clearance/catalog.json`. Planning blueprints and the 48-entry registry are broader than the reachable campaign; they are listed separately rather than silently counted as shipped games. Component source paths are expanded in [IOS_GAME_INVENTORY.md](IOS_GAME_INVENTORY.md).

Evidence codes: **F** means the fresh browser screenshot was visually inspected in `qa-artifacts/ios-aaa-audit/art-contact-1.jpg` through `art-contact-7.jpg`, with individual `<key>-play.png` and measurements in `results.json`; **S** means source inspected, no new visual judgement claimed. All 37 campaign initial-play screens now have F evidence. Earlier direct reviews also used the following historical evidence codes: **V** means an individually viewed screenshot. V-old = existing `qa-artifacts/game-dock-clearance/phone-<key>.png`; V-local = existing `qa-artifacts/lightbulb-tips/<key>-play.png`. These are browser renders, not native iPhone screenshots, and some predate current local changes. Fresh capture results, when present, are indexed by the main audit.

Implementation codes:

- **L:** retain landscape preference; question above a bounded play region, answers beside/below it, reserved utility-dock row. Wrong-way entry waits for explicit Start. Preserve state and recalculate local pointer geometry after resizing.
- **P:** retain existing portrait preference; central tall play region, answers below it, dock safe area reserved. Landscape alternative needs a distinct two-column composition, not stretching.
- **A:** candidate adaptive layout; retain existing landscape until an explicit portrait composition is implemented and tested. A square board must remain square, controls must reflow below, and decorative character space must yield first. No automatic orientation-policy change just from this document.
- **M:** assessment-specific adaptive candidate; use one task/response column in portrait and split task/response in landscape. Keyboard, construction, mission navigation and long-answer states all need dedicated tests. Keep landscape in the interim.

## Current campaign: every experience

| Experience / stable key | Current | Recommendation | Mechanical justification and alternative requirements | Evidence |
|---|---|---|---|---|
| Place Value Panic / `place_value_panic` | Landscape | Landscape preferred (L) | Seven place-value slots plus digit bank need horizontal comparison. Portrait would require a clearly grouped two-row place-value board without breaking digit-to-column mapping. | F |
| Number Line Ninja / `number_line_ninja` | Landscape | Landscape preferred (L) | Labelled intervals, unknown marker and answer orbs share a horizontal bridge. Portrait compresses tick spacing; alternative would require a separate zoomable/tappable line with stable label placement. | F |
| Prime Pop / `prime_pop` | Portrait | Portrait preferred (P) | Rising bubbles benefit from travel height and time-to-danger visibility. Landscape requires fewer concurrent bubbles and a separately tuned trajectory region. | F |
| Rounding Rocket / `rounding_rocket` | Portrait | Portrait preferred (P) | Vertical rocket/build progression leaves question and answer controls in a readable stack. Landscape alternative can place build state beside answer controls. | F |
| Maths vs Zombies / `maths_vs_zombies` | Landscape | Landscape preferred (L) | Horizontal approach lanes and targeting need separation between hero, enemies and answer console. Portrait would need a different arena/camera; do not crop the current lane. | F |
| Take-Out Rush / `take_out_rush` | Landscape | Landscape preferred (L) | Order/portion tray, selectable pieces and diner scene need simultaneous visual access. Portrait is feasible only as a stacked worktop with a smaller decorative dining area. | F |
| Fraction Forge / `fraction_forge` | Landscape | Landscape preferred (L) | Anvil operands and ingredient rack are two active work zones. Portrait needs rack below anvil with result/strike controls retained. | F |
| Match Mastery / `match3_equivalence` | Landscape | Adaptive candidate (A), portrait preferred on phones after validation | Actual 6-column matching board is near-square. Existing landscape screenshot spends substantial width on character/scenery while cells are small. Portrait can enlarge board, with goal above and progress below; retain swipe coordinates and animation grid bounds. | F |
| Percent Power / `percent_power` | Landscape | Adaptive candidate (A) | Central percentage mechanism and answer selection can stack; no essential horizontal trajectory. Confirm longest mixed representations and output choices before enabling portrait. | F |
| Simplify Sprint / `simplify_sprint` | Landscape | Landscape preferred (L) | Three selectable gates are a comparative horizontal scene. Portrait would need gate cards stacked without implying a changed route/order. | F |
| Angle Arena / `angle_arena` | Landscape | Landscape preferred (L) | Launcher, central angle diagram and target have spatial meaning. Keep angle figure large; portrait alternative must retain the full angle rays and target, not zoom scenery. | F |
| Polygon Palace / `polygon_palace` | Landscape | Adaptive candidate (A) | Naming, property and sorting rounds use a central shape with controls. Portrait can stack shape and options; sorting rounds require a separate destination layout. | F |
| Area Architect / `area_architect` | Landscape | Adaptive candidate (A) | Tiled shape/grid can remain square with a task above and choices below. Composite shapes need readable dimensions; landscape remains useful for wider figures. | F |
| Transformation Station / `rotation_relay` | Landscape | Landscape preferred (L) | Coordinate graph and transformation/cursor controls must be visible together. Portrait could use square graph above a compact control sheet, but all grid labels and corner selections need hit testing. | F |
| Coordinates Quest / `coordinates_quest` | Landscape | Adaptive candidate (A) | Cartesian grid is square, and taps can work with portrait graph plus lower action row. Preserve negative axes, origin, point labels and visible routes. | F |
| Conversion Canyon / `conversion_canyon` | Landscape | Landscape preferred (L) | Weights, scale pan and controls form a wide workbench. Portrait needs a larger central scale and two-row inventory; check drag reach and units. | F |
| Perimeter Path / `perimeter_path` | Landscape | Adaptive candidate (A) | Bounded shape plus dimension/answer controls can stack. Portrait must not compress long labelled edges or multiline units. | F |
| Mean Machine / `mean_machine` | Landscape | Landscape preferred (L) | Multiple number inputs/number tokens feed a machine with answer console. Stacking is possible but changes simultaneous comparison; validate largest sets first. | F |
| Graph Grabber / `graph_grabber` | Landscape | Landscape preferred (L) | Chart categories, axes and multiple-value questions need width. Portrait would need a board above two-column options, with tick/category readability preserved. | F |
| Line Graph Lab / `line_graph_lab` | Landscape | Landscape preferred (L) | Graph slopes and multiple time labels need width; current chart/answer split is structurally appropriate. Portrait only with full-width chart and answers below. | F |
| Data Detective / `data_detective` | Landscape | Landscape preferred (L) | Data evidence and candidate questions/answers must be compared. Portrait would use task/evidence stack; do not hide essential evidence behind a tip. | F |
| Factor Frenzy / `factor_frenzy` | Landscape | Landscape preferred (L) | Factor mission, multi-select rune rack, loaded set and Fire action benefit from side-by-side stage/console. Portrait must retain all factors without scrolling a timed selection. | F |
| Multiplication Mine / `multiplication_mine` | Landscape | Adaptive candidate (A) | Written multiplication columns are vertical; portrait could put method above answers while reducing decorative mine width. Test carry/digit labels and all written-method steps. | F |
| Order Ops Arena / `order_ops_arena` | Landscape | Adaptive candidate (A) | Expression and a small choice set can stack; character/action stage is secondary. Long nested expressions need mathematical wrapping rules, not arbitrary font shrinking. | F |
| Formula Forge / `formula_forge` | Landscape | Landscape preferred (L) | Formula/visual apparatus and choice console use separate work zones; two-variable/long-label rounds need width. Portrait requires a defined apparatus/control stack. | F |
| Remainder Run / `remainder_run` | Landscape | Landscape preferred (L) | Cargo grouping board and division working are multi-zone. Portrait only with mode-specific composition: grouping versus decimal/interpretation answer modes differ. | F |
| Chrono Dash: Time Trial / `time_keeper_cove` | Landscape | Adaptive candidate (A), portrait preferred on phones after validation | Clock is square; landscape screenshot makes it relatively small beside large Restore/Reset controls. Portrait can feature clock centrally, hour/minute controls below. Test Arabic/Roman dial and Roman question combinations. | F |
| Problem Pyramid / `problem_pyramid` | Landscape | Landscape preferred (L) | Three base tablets need width for four-digit entries; pyramid/hero balance and answer row are already horizontal. Portrait alternative requires a smaller decorative hero and full readable three-tablet base. | F |
| Lava Path / `unit_mixer` | Landscape | Landscape preferred (L) | Horizontal crossing/stepping progression is mechanically spatial. Portrait needs a different path layout, not clipping endpoints. | F |
| Change Counter / `change_counter` | Landscape | Landscape preferred (L) | Receipt and till are simultaneous reference/input surfaces. Portrait would need a compact persistent total/paid header and receipt disclosure without losing required item data. | F |
| SATs Paper 1: Arithmetic / `crystal_core` | Landscape | Adaptive candidate (M) | One calculation plus answer field is portrait-friendly, but arithmetic layouts and keypad/working board need independent constraints. Preserve paper identity. | F |
| SATs Paper 2: Reasoning / `mirror_gate` | Landscape | Landscape preferred initially; adaptive candidate (M) | Diagrams, tables, construction and multipart fields vary widely. Portrait must be decided per mission renderer and tested across the full visual-type bank. | F |
| SATs Paper 3: Reasoning / `matrix_match` | Landscape | Landscape preferred initially; adaptive candidate (M) | Same heterogeneous renderer set as Paper 2, different identity. Shared composition capability must be mission-based rather than an assumed all-paper orientation flip. | F |
| Potion Panic / `potion_panic` | Landscape | Landscape preferred (L) | Cauldron, ratio recipe, ingredient grid and Brew/Reset are simultaneous work zones. Portrait can stack recipe/cauldron/ingredients only with retained full ingredient labels. | F |
| Share Splitter / `share_splitter` | Landscape | Landscape preferred (L) | Five guest plates and ratio comparison are horizontally organised; dragging one source to multiple plates needs target separation. Portrait requires a semicircle or grid table composition, not tiny plates. | F |
| Ratio Racer / `ratio_fractions` | Landscape | Landscape preferred (L) | Two race actors, fuel representation and answers benefit from horizontal track. Portrait would need a vertical race/overlay design beyond a minor responsive change. | F |
| Scale Builder / `scale_builder` | Landscape | Landscape preferred (L) | Blueprint grid and length/width keypad form a two-panel workbench. Portrait feasible only as square blueprint above a compact keypad, preserving draggable handles. | F |

No current game needs a physically fixed orientation for mathematical correctness; preferences above are usability/composition decisions. Keep the present turn gate until a validated alternative actually exists. On sufficiently large iPad windows, permit a capable alternative instead of demanding physical rotation solely because of aspect ratio.

## Calm activities — all six

Current composition: `WellbeingShell.tsx`, `wellbeing.css`, activity-specific flow; native portrait requested; no maths HUD. All six are **portrait preferred**, with adaptive landscape/iPad alternatives rather than an essential fixed orientation.

| Activity / key | Source (`src/wellbeing/activities/`) | Mechanic and alternative requirement | Evidence |
|---|---|---|---|
| Breath Bloom / `breathing_bloom` | `BreathingBloom.tsx` | Central breathing object plus pace/start/check-in controls. In landscape place controls beside object, preserving no-scroll session flow and motion reduction. | S; existing `native/BREATH_BLOOM_REVIEW.md` and `qa-artifacts/breath-bloom-portrait/` |
| Peaceful Pond / `peaceful_pond` | `PeacefulPond.tsx` | Guide lily pads to destinations; portrait keeps reach compact. Landscape must resize both source and target coordinates while a drag is cancelled or safely remapped. | S |
| Lantern Camp / `candle_calm` | `CandleCalm.tsx` | Scene observation, packing and lantern adjustment. Landscape can use scene beside tuning controls; controls and observation text remain readable. | S |
| Star Path / `constellation_connect` | `ConstellationConnect.tsx` | Trace constellation and alternating focus targets. Preserve normalized stars/edges and distinct hitboxes in both aspect ratios; do not distort the constellation. | S |
| Leaf Drift / `leaf_drift` | `LeafDrift.tsx` | Guide leaves downstream plus brief observation prompts. Preserve path/target coordinate mapping when viewport changes. | S |
| Thought Release / `thought_sort` | `ThoughtSort.tsx` | Feeling-word selection, balanced thought and balloon release. Portrait gives readable text choices; landscape must retain complete wording and Release affordance. | S |

## Additional registered or source-discovered experiences

These are not silently assigned a campaign route. `AppRouter.tsx` contains branches for many, but the current `ISLANDS` may not instantiate their game type/blueprint. Establish reachability before allocating implementation effort. All inherit landscape when entered as ordinary maths levels under the current default policy, except an explicitly mapped Prime/Rocket key.

| Source / implementation | Reachability and recommendation | Alternative / validation requirement |
|---|---|---|
| `CalculationCrashGame.tsx` | Registry/router arithmetic fallback; landscape preferred initially | Adaptive vertical calculation/choices candidate; establish actual routed levels and local session contract. |
| `CloudCollapseGame.tsx` | Registered, but router `cloud_collapse` currently renders FractionMatchGame | Near-square matching board: adaptive candidate. Do not test this component and claim router coverage. |
| `CurriculumChallengeGame.tsx` | Registry/router fallback for transform/scale/mean/rule variants | Landscape initially; orientation must follow `visualData` capability, not theme/title. |
| `DataDungeonGame.tsx` | Registry/router default data branch; current Data Detective overrides it | Landscape initially for data/puzzle comparison; portrait requires evidence above answers. |
| `DecimalSniperGame.tsx` | Registry/router default place-value fallback | Landscape for target spread; portrait candidate only after actual pointer/target mechanics verified. |
| `MedianMountainGame.tsx` | Registry/router chart/median variants; not one of current 37 catalog keys | Adaptive candidate: number ordering/data comparison can stack. Largest set and drag order must remain readable. |
| `MonsterMarketGame.tsx` | Registry/router `monster_market` | Landscape for trader/product/till comparison; portrait requires shop task stack. |
| `ReasoningQuestGame.tsx` | Registry/router `reasoning_quest` | Adaptive candidate: source uses question plus 2-column choices. Long story prompts and completion state need bounds testing. |
| `TowerOfFactorsGame.tsx` | Registry/router non-Factor-Frenzy fallback | Landscape initially; factor tower and selection must fit without stage scaling touch targets. |
| `TreasurePathGame.tsx` | Registry and actual implementation re-exported by CoordinatesQuestGame | Same adaptive square-grid recommendation as Coordinates Quest; one implementation, not a second shipped game. |
| `ReasoningGame.tsx` | Router wrapper for `logic_sort` / non-assessment `matrix_match` | Delegate orientation capability to actual child; wrapper framing must not reduce already constrained work area. |
| `reasoning/LogicSort.tsx` | Registered directly and rendered by ReasoningGame | Adaptive candidate if sorting destinations fit; test dragging across all categories. |
| `reasoning/MatrixMatch.tsx` | Registered directly and rendered by non-assessment ReasoningGame | Square matrix adaptive candidate. Current Paper 3 goes to BossEncounterGame, not this implementation. |
| `VolumeVaultGame.tsx` | Source exists; not in current registry/router | Landscape initially for cuboid/build/count modes; portrait candidate needs 3D board + dimensions/control stacking. Blueprint `volume_vault` is not proof of reachable gameplay. |
| `CoordinateTranslationGame.tsx` | Source alias exports TreasurePathGame | Same as Coordinates Quest; no independent orientation policy required. |

The `BossEncounterGame` registry entry is fully accounted for by all three paper rows. Registry count is implementation count (48), not count of independent playable campaign experiences. `MiniGame.tsx` is an adapter contract, not an extra game.

## Required orientation acceptance sequence

1. Record supported iPhone/iPad/window policy alongside each game key in a single capability map. Resolve aliases through actual route data, including `blueprintKey`, rather than broad `gameType` overrides that can incorrectly rotate sibling games.
2. Keep native orientation requests serialized and handle failure visibly/safely. Test actual plugin result and app orientation mask on hardware; a mocked promise is insufficient.
3. Wrong orientation on entry: no mounted round/timer/enemy movement, disabled Start; correct orientation: enabled Start; Start alone begins play. Test repeated entry/retry as well as first launch.
4. Mid-round rotation: pause state without restarting or granting a new outcome. Cancel/resolve active pointer capture; rebuild board measurements once; resume with identical question, remaining time, lives and positions.
5. Test notched and short phones, both landscape directions, iPad full screen, split/resized window, modal open during rotation and software keyboard open during rotation.
6. A visual alternative is accepted only when its task/answer targets meet readable size and clearance checks. A browser portrait screenshot does not certify the native portrait request, and a no-overlap result does not certify readable text.

Assumptions: the currently reachable campaign is the one generated by current repository constants; source/planning-only games are not newly exposed. No external legacy assumptions were used. No app deployment or TestFlight upload was performed.
