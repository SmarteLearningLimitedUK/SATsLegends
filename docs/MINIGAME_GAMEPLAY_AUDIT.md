# Minigame gameplay identity audit

Reviewed 29 September 2026 against the current repository. This is a design proposal, not an implemented gameplay change or a claim of measured player enjoyment.

## Scope prepared before writing

- Audit every ordinary game in the current campaign for repetitive actions, predictable content and limited player decisions.
- Give each game a recognisable signature action tied to its existing maths objective.
- Suggest variation within practice plus five scored tiers, without changing campaign routes or progression.
- Prioritise improvements that make the learner manipulate, investigate or decide something meaningful in the playfield.
- Produce this review document only; preserve all existing source changes and concurrent website work.

Assumptions: early levels remain guided and gentle; later levels introduce one new decision at a time. The existing three SATs paper encounters retain their assessment format. Shared top HUD, mission, playfield, responses and bottom dock remain the screen hierarchy; any future implementation must preserve readable text, large controls, pause/exit cancellation, reduced motion and PC/iPad/phone fit. No external legacy assumptions, new boss system, backend or analytics are proposed.

## Findings from the current implementation

The current catalog evaluates to 34 ordinary campaign groups, each with one practice entry and five scored tiers, plus three existing fixed SATs papers. The router, rather than every file in the game registry, determines this audit's coverage. For example, Coordinates Quest routes through `CoordinatesQuestGame.tsx`, which re-exports `TreasurePathGame.tsx`; Median Mountain is not an additional active campaign group.

Several games select a displayed answer and then play a scene reaction. That can support fluency, but it leaves limited room for different decisions in Mine, Percent Power, Remainder, Order Ops, Area and Change Counter. These are the strongest candidates for a change in interaction.

There are also concrete content patterns worth fixing:

- Fraction Forge's tier1 pool is exactly `1/2`, `1/3`, `1/4`, with three cards drawn per round. Their positions shuffle, but the mathematical ordering repeats. Preserve simple fractions while varying the comparison task and its representation.
- Area Architect's tier1 deck contains two rectangles while a run requires five correct answers. It necessarily cycles a small set. A shape generator should vary position, orientation and area; construction rounds would add a further kind of decision.
- Graph Grabber's bar template uses values `base`, `base+3`, `base+1`, `base-2` for the same four caravans. Eden always leads and Ivy always trails. Randomising the base does not change that ranking. Generate constrained data with varied winners, differences and truth values, and validate that the requested answer is unambiguous.
- Line Graph Lab's basic-reading prompt consistently asks for the value at time4. Vary the queried point and highlighted interval within the same numbered-axis scaffold.
- Multiplication Mine currently ends after four correct strikes against one ore block. New art makes the strikes satisfying, but the learner has little choice about the encounter.
- Maths vs Zombies currently selects the closest eligible enemy automatically after a correct answer. Player target selection is an opportunity for tactical decisions at later tiers; retain automatic targeting in guided play.
- Perimeter Path already lets the learner mark edges, but marking is optional bookkeeping and does not itself build or change the boundary. Its existing interaction can support a more purposeful fence-building activity.

These observations concern the current source. They do not establish that a child will find a proposed replacement more enjoyable; that needs a playable prototype and observation.

## Highest-value first pass

| Priority | Game | Proposed prototype | Why start here |
|---|---|---|---|
| 1 | Remainder Run | Load equal-capacity cargo pods and place the leftover cargo in a remainder bay. | Division and remainder become visible actions; the current long-division/answer loop has little scene agency. |
| 2 | Order Ops Arena | Select the next legal operation in an expression and collapse it step by step. | Order of operations determines the player's action, rather than only the final answer. |
| 3 | Change Counter | Assemble change from a visible till and hand it to the customer. | Money becomes tactile and different coin combinations create replayable solutions. |
| 4 | Area Architect | Lay floor tiles to satisfy an area brief, then repair gaps or obstacles. | Builds on the existing grid and gives different valid constructions. |
| 5 | Percent Power | Set a percentage allocation and route the resulting energy to a machine. | Makes the reactor playable, with a clear relationship between whole, percentage and amount. |
| 6 | Graph Grabber / Line Graph Lab | Repair predictable content first, then give charts distinct interactions. | Avoids memorising positions or rankings while preserving the approachable first levels. |

Prototype a small early-level version and one later-level variation before expanding any mechanic across all five tiers. No new raster art is required to test these decisions.

## Complete campaign pass: 34 distinct identities

The proposals below extend existing mechanics where those are already strong. They are alternatives for implementation planning, not a requirement to add every listed feature simultaneously.

| Game | Current action | Signature mechanic to develop | Variation that adds decisions |
|---|---|---|---|
| Place Value Panic | Arrange digit stones to rebuild a number written in words. | **Repair a number mechanism:** place and replace stones in labelled columns. | Alternate missing-stone repairs, rebuilding a spoken/written value and making the greatest or least allowed number. Keep zero-place traps explicit. |
| Number Line Ninja | Choose a missing value; its tile flies to a number-line slot. | **Plan a landing:** select a marked number-line destination and watch the ninja land there. | Vary the start, step size and missing position; later compose two labelled jumps. A precise numeric/keyboard alternative must make dexterity optional. |
| Prime Pop | Pop moving prime-number bubbles while avoiding composites. | **Clear a moving prime field:** scan and choose prime targets. | Short, clearly announced rule waves can focus on a prime range or remove composite decoys. Later safe composites can reveal a factor explanation; do not make colours reveal correctness. |
| Rounding Rocket | Choose a rounded-value launch pad and trigger a launch reaction. | **Choose an orbit:** send the rocket to the correct rounded destination. | Vary the rounding place and show neighbouring destination bounds. Later repair a wrong fuel estimate or choose the nearest safe rounded amount; keep this about rounding rather than free steering. |
| Maths vs Zombies | Solve arithmetic; a shot damages the closest eligible advancing enemy. | **Defend lanes:** choose which approaching enemy receives an earned shot. | Guided tiers auto-target one slow enemy; later introduce two lanes and a meaningful target choice. A slowing shot can be a later optional tactic. Reading the maths must not be interrupted by moving answer buttons. |
| Take-Out Rush | Combine fraction portions on a tray; exact valid orders resolve automatically or through Send order. | **Run a service counter:** assemble and dispatch fractional food orders. | Later tiers can present two visible orders with different constraints, allowing the learner to choose which to prepare first. Keep stock shortages solvable and customer humour brief. Retain one order in guided play. |
| Fraction Forge | Drag fraction cards into ascending order. | **Forge an ordered bridge:** position fraction pieces along a magnitude track. | Repair one misplaced piece, fill an ordering gap or compare different visual representations. Correct arrangements should assemble a persistent bridge section. Expand tier1 task variety without adding harder fractions abruptly. |
| Match Mastery | Swap adjacent equivalent-value gems, clear matches and trigger cascades. | **Plan equivalence cascades:** choose swaps that clear a board objective. | Vary objectives: clear marked cells, free a blocked row or match a requested equivalent value. Generate a legal useful move; shuffle safely when none exists. Preserve mathematical equivalence as the match rule. |
| Percent Power | Select a percentage answer; reactor visuals show progress and vent mistakes. | **Allocate reactor power:** choose a percentage of a labelled whole and route the resulting amount. | Early guided charge cells show the whole clearly; later use different wholes, missing percentages or two allocations. A numeric input alternative should accompany physical controls. No hidden/random overheating penalty. |
| Simplify Sprint | Select a common factor repeatedly until the fraction is fully simplified. | **Choose a reduction route:** each valid factor opens a lock on the same fraction. | Show multiple legal chains and let the learner choose one. Later optional efficiency challenges reward a shorter chain, while every valid chain remains correct. Finish with a visible irreducible state. |
| Angle Arena | Choose an angle answer; the cannon aims and fires automatically. | **Aim a measured shot:** set a labelled cannon angle and confirm firing. | Use a large stepped dial with numeric/keyboard adjustment. Later infer the target angle from the existing geometric clues. Keep the solved angle authoritative; do not add wind or random misses to a correct maths answer. |
| Polygon Palace | Answer name, property, count and classification prompts about shapes. | **Inspect and sort geometry artefacts:** examine a shape and place it in the correct collection. | Turn a shape, mark parallel/equal sides and classify rotated examples. Later use a clear intersection of two property sets. Preserve the distinction between a shape's appearance and its defining properties. |
| Area Architect | Read a shaded grid and choose its area. | **Lay a floor:** place unit tiles to satisfy an area brief. | Start with a guided rectangle; later allow several arrangements with the same area, missing floor repairs and compound rooms. Keep area coverage distinct from Perimeter's outside boundary. |
| Rotation Station | Rotate a shape to match, predict its result or identify the turn. | **Align rotating mechanisms:** turn a shape around an explicit centre until it fits a target. | Repair an incorrect turn or compose a short turn sequence at later tiers. Retain visible clockwise/anticlockwise controls and show why the centre matters. Do not introduce rotation-speed tests. |
| Coordinates Quest | Tap a grid target derived from a coordinate or movement prompt. | **Plot a treasure expedition:** set destinations on the numbered grid. | Start with one coordinate; later plan a short waypoint sequence using allowed translations. Reveal the journey after confirmation. Obstacles must not obscure axes or demand pathfinding knowledge unrelated to the selected skill. |
| Conversion Canyon | Add/remove weight tokens and balance a target mass. | **Balance a freight lift:** load labelled weights until converted masses balance. | Keep tactile balancing; later change available denominations or leave a missing labelled weight to infer. Use varied solvable loads and show actual balance feedback. Do not duplicate Percent's energy-routing controls. |
| Perimeter Path | Mark edges as considered, then choose a perimeter answer. | **Secure an outside boundary:** place measured fence sections around a shape. | Guided play can trace the complete outline; later repair a missing edge or choose an exact fence budget for a compound boundary. Retain considered-edge colour states. An automatic running sum should be a guided scaffold, not reveal every scored answer. |
| Mean Machine | Spin number reels, read the displayed statistic and choose an answer. | **Rebalance the machine:** distribute a fixed total evenly across its compartments. | Show mean through equal sharing in early rounds; later replace a faulty reel to reach a target statistic. If the existing tier includes median/mode, give it its own explicit repair instruction. Avoid an extra spin action that adds no decision. |
| Graph Grabber | Read bar/line/pie charts and choose single, multiple or true/false responses. | **Rebuild a supply chart:** inspect or adjust bars against a manifest. | Early play claims the matching labelled bar; later repair one missing bar or construct a chart from a table. Randomise data rankings and truths, not just magnitudes. Chart creation is the signature; investigations belong to Data Detective. |
| Line Graph Lab | Read a point, coordinate, threshold or increase and choose an answer. | **Trace a changing signal:** select time points and intervals on a line. | Start with varied labelled points; later highlight the largest rise, locate a threshold or repair one missing point from given data. A moving signal replay should explain the time sequence without rushing the answer. |
| Data Detective | Compare an evidence chart with suspect stashes, inspect a suspect and accuse. | **Build an evidence case:** pin a relevant chart clue and eliminate inconsistent suspects. | Early play uses one direct match; later combine two explicit clues and let suspects give short humorous statements checked against the chart. Require sufficient evidence for an accusation, not repeated random guesses. |
| Factor Frenzy | Select all correct factors/multiples and submit to damage an enemy. | **Break factor-pair shields:** link two values whose product matches a shield number. | Guided pairs show arrays; later find a missing partner or all distinct factor pairs. Factors and multiples must remain clearly named if the existing tier mixes them. Keep Prime Pop's rapid prime scanning distinct. |
| Multiplication Mine | Pick multiplication answers; four correct strikes open one ore block. | **Choose and crack a vein:** use a multiplication fact to select a labelled mining tool or array charge. | Give two visible vein choices with different within-tier facts, then a short series of satisfying cracks. Later missing-factor seams or array decomposition add strategy. Never turn success into repeated tapping or a random damage roll. |
| Order Ops Arena | Evaluate a mixed-operation expression and select its final value. | **Dismantle an expression:** choose the next legal operation and collapse that part. | For `2 + 3 × 4`, collapse `3 × 4` first, then add2. Later brackets and equally ranked operations create sequencing decisions. Accept every valid independent first operation; explain an invalid choice without silently changing the rules. |
| Formula Forge | Read a measurement diagram and choose a calculated or missing value. | **Assemble a calculation machine:** select the appropriate existing formula and place measurements into its slots. | Early guided area formulas; later triangle/volume formulas and a missing measurement repair. Animate the correct calculation's effect on the object. Keep this a measurement-formula activity, distinct from Order Ops' precedence sequencing. |
| Remainder Run | Answer a timed long-division problem, with remainder/decimal formats depending on tier. | **Pack cargo pods:** divide a labelled load into equal capacities and identify what remains. | Early small loads use countable objects and leftovers0–1; later compressed groups avoid hundreds of tiny tokens. Keep quotient, remainder and decimal conversion explicitly separate when existing tiers change format. No running precision requirement. |
| Chrono Dash: Time Trial | Adjust hour/minute controls to match a requested time and confirm. | **Operate a departure clock:** set the clock to open a departure gate or schedule an arrival. | Keep the current whole-hour, half-hour, quarter-hour, five-minute and one-minute progression, with varied visible departures. Elapsed-time/rollover puzzles would be a separate future curriculum extension, not an existing mechanic assumed by this audit. Story motion happens after confirmation, with no penalty for hand dexterity. |
| Problem Pyramid | Read a number pyramid and select its top total. | **Rebuild a number structure:** place missing blocks satisfying the two-below rule. | Start with one guided top block; later repair a middle block or infer a missing base value. Build one persistent structure during a run and give mathematically meaningful feedback at the incorrect joint. |
| Lava Path | Answer unit conversions to advance along ten fixed stones. | **Plan a unit-safe crossing:** choose a labelled stable route through a fork. | Early one obvious guided conversion route; later compare equivalent lengths/capacities across two routes. Preview the consequence before committing. Slime splashes and wobbling stones signal mistakes; never require a twitch jump or hide unit labels. |
| Change Counter | Read a receipt and choose a money answer. | **Work the till:** assemble and hand over the exact change. | Early unlimited familiar coins; later multiple valid coin sets or a limited, guaranteed-solvable till. Undo coins before confirming. An optional fewest-coins challenge belongs to later mastery, with a clear brief. |
| Potion Panic | Add ingredient drops to exact recipe targets and brew; mistakes can require resetting. | **Repair a ratio mixture:** tune the recipe and see its resulting transformation. | Develop the existing partial recipes into reversible adjustments: add or remove a measured amount, scale a recipe or identify the missing ingredient. Keep two ingredients in guided play; humorous effects follow a checked brew. |
| Share Splitter | Drag/tap slices onto plates to meet a ratio allocation and check. | **Negotiate a fair split:** allocate one visible supply according to named shares. | Early equal sharing or a simple ratio; later restore an already unequal allocation or handle a leftover explicitly. Support moving a slice back or between plates. Keep sharing relationships distinct from Take-Out's target portion sums. |
| Ratio Racer | Solve fuel-mixture fractions to earn a forward boost; mistakes stall the kart. | **Manage earned boosts:** correct fuel maths earns a boost that the learner decides when to use. | Early automatic boost preserves clarity; later one visible overtaking opportunity and a single stored boost add tactics. Keep races turn based while reading. Rival progress should depend on clear game rules, with no hidden catch-up penalty. |
| Scale Builder | Adjust uniform scale or width/height controls, verify and move to the next blueprint. | **Fit a scaled blueprint:** resize a plan so corresponding lengths satisfy the given scale. | Early uniform scaling; later repair one wrongly scaled dimension, shrink a plan or compare valid similar blueprints. Show proportions changing immediately. Keep exact numeric/step controls alongside any resize handles. |

## Variation and progression rules

Use the current Guided / Basic fluency / Multi-step / Constraint / Mastery structure:

1. **Practice:** demonstrate the signature action with generous recovery and a clear worked example.
2. **Level1:** one action, one goal, explicit labels and small manageable values.
3. **Level2:** new arrangements and representations at the same familiar interaction; avoid relying on a memorised position.
4. **Level3:** a two-step task or one additional player decision.
5. **Level4:** a visible constraint such as limited stock, a missing value or a choice between valid routes.
6. **Level5:** combine learned decisions into a mastery challenge with more than one valid strategy where the maths allows it.

Do not introduce every new mechanic in the first level or raise difficulty midway through a selected-tier run. Pressure should differ by game: service prioritisation in Take-Out, target selection in Zombies, resource allocation in the reactor, and deliberate route choice in Lava. A timer added everywhere would reproduce the same feel.

Within a run, preserve some world state: the repaired bridge, completed floor, packed cargo or restored machine. Use a short varied sequence of tasks that serves that goal. Reward animation should follow an actual state change and keep essential instructions visible; reduced motion must show the same outcome clearly.

For generated tasks, vary mathematical structure as well as the skin. Avoid consecutive identical prompts, recurring correct-answer positions, fixed chart rankings and predictable true/false answers. Test feasible construction/stock/route tasks and accept mathematically equivalent solutions. Do not pre-reveal an answer through colour, enemy type or chart position.

## Prototype validation before rollout

For each prototype, compare its early and later versions with the current interaction. Observe whether a learner understands the goal, makes an actual decision, can explain the relevant maths, recovers from an error, and chooses to replay. These are proposed observation questions, not results already obtained.

Check native touch and keyboard alternatives, readable instructions, shared hierarchy, contained artwork above the dock, normal/reduced motion, and PC/iPad/phone fit. Verify restart, pause, leaving during feedback, accurate scoring and exactly one completion save. Add focused tests for new mathematical rules and feasible puzzle generation; avoid tests that merely mirror component markup.

## Exact inspected source files

Catalog, routing and constraints:

- `AGENTS.md`
- `docs/EXPERIENCE_SPEC.md`
- `src/constants.ts`
- `src/app/AppRouter.tsx`
- `src/App.tsx`
- `src/gameSceneMeta.ts`
- `src/systems/content/gameDifficulty.ts`
- `src/systems/content/island1NumberBaseCamp.ts`
- `src/games/miniGameRegistry.tsx`
- `src/games/MiniGame.tsx`
- `scripts/verify-five-tier-difficulty.mjs` (current-source loader, used without running its test suite)

Routed gameplay components, including the coordinate alias implementation:

- `src/games/PlaceValuePanicGame.tsx`
- `src/games/NumberLineNinjaGame.tsx`
- `src/games/PrimePopGame.tsx`
- `src/games/RoundingRocketGame.tsx`
- `src/games/MathsVsZombiesGame.tsx`
- `src/games/TakeOutRushGame.tsx`
- `src/games/FractionForgeGame.tsx`
- `src/games/FractionMatchGame.tsx`
- `src/games/PercentPowerGame.tsx`
- `src/games/SimplifySprintGame.tsx`
- `src/games/AngleArenaGame.tsx`
- `src/games/PolygonPalaceGame.tsx`
- `src/games/AreaArchitectGame.tsx`
- `src/games/RotationStationGame.tsx`
- `src/games/CoordinatesQuestGame.tsx`
- `src/games/TreasurePathGame.tsx`
- `src/games/ConversionCanyonGame.tsx`
- `src/games/PerimeterPathGame.tsx`
- `src/games/MeanMachineGame.tsx`
- `src/games/GraphGrabberGame.tsx`
- `src/games/LineGraphLabGame.tsx`
- `src/games/DataDetectiveGame.tsx`
- `src/games/FactorFrenzyGame.tsx`
- `src/games/MultiplicationMineGame.tsx`
- `src/games/OrderOpsArenaGame.tsx`
- `src/games/FormulaForgeGame.tsx`
- `src/games/RemainderRunGame.tsx`
- `src/games/ChronoDashGame.tsx`
- `src/games/ProblemPyramidGame.tsx`
- `src/games/LavaPathGame.tsx`
- `src/games/ChangeCounterGame.tsx`
- `src/games/PotionPanicGame.tsx`
- `src/games/ShareSplitterGame.tsx`
- `src/games/RatioRacerGame.tsx`
- `src/games/ScaleBuilderGame.tsx`

The saved fit report was consulted for its catalog list, then the 34-group/three-paper inventory was re-evaluated from the current `src/constants.ts` and its actual content helpers using the repository's inert TypeScript loader. No game component was mounted, and this review did not repeat browser tests or assert new device-fit results.

Changed file in this review: `docs/MINIGAME_GAMEPLAY_AUDIT.md` only. Existing runtime and website edits were preserved. No external legacy assumptions were used.
