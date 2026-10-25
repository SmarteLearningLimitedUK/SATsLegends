# KS2 content and wording review

> Superseded for coverage assurance by [the objective-level maths audit](maths-curriculum-audit.md). The earlier strand table is a route overview, not proof of complete SATs coverage. The new audit found and corrected two wrong shared arithmetic keys and distinguishes representative practice from partial or missing coverage.

Reviewed 20 October 2026. Target: England, end of KS2 / Year 6 mathematics SATs. Original questions with short optional game stories; no claim of official endorsement or that these games reproduce the papers' assessment conditions.

## Evidence and limits

- [Official mathematics test framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework): defines the assessed content. The landing page states the arrangements remain unchanged for 2026–27.
- [Framework PDF](https://assets.publishing.service.gov.uk/media/5a822bbded915d74e62362a2/2016_KS2_Mathematics_framework_PDFA_V5.pdf): used to check the boundaries for fractions, statistics, algebra and scale factors in particular.
- [2026 official papers and mark schemes](https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials): used for examples of clear instructions, complete word problems, labelled diagrams and explicit units. Questions here are original, not copied from the papers.
- Current BBC Bitesize pages blocked automated access. The desired plain, age-appropriate language has been applied, but a direct comparison with the current BBC bank was not possible.

A skill being within the framework does not mean it appears in every paper. Matching games, cooking, racing and combat are practice mechanics; their scored mathematics must remain within scope. The table records the assessed skill for each current game type, not certification of every possible random run. Broad strand names are intentional where no exact subcode has been independently verified.

## Current game coverage

Shared bank = `src/systems/content/satsInspiredQuestionBanks.ts`. Other paths below are relative to `src/games/`, except `satsAdventure.ts`, which is in `src/systems/content/`.

| Game | Question source inspected | Assessed skill |
| --- | --- | --- |
| Place Value Panic | `PlaceValuePanicGame.tsx` | Number and place value: write numbers in digits from words; positional value. |
| Number Line Ninja | `numberLineQuestions.ts` | Number and fractions: identify values on equally spaced number lines, including decimals and negative numbers. |
| Prime Pop | `PrimePopGame.tsx` | Multiplication and division: identify primes and use factors and multiples. |
| Rounding Rocket | `RoundingRocketGame.tsx` | Number: round whole numbers to the nearest 10, 100 or 1,000 in this game; decimal rounding is limited revision-bank content. |
| Maths vs Zombies | `MathsVsZombiesGame.tsx` | Calculation: arithmetic facts and calculations appropriate to each tier. |
| Take-Out Rush | `TakeOutRushGame.tsx` | Fractions: add fractions to reach a stated total; use common denominators. |
| Fraction Forge | `FractionForgeGame.tsx` | Fractions: addition/subtraction; proper-fraction multiplication and division by whole numbers (6F5a–b). |
| Match Mastery | `FractionMatchGame.tsx` | Fractions, decimals and percentages: recognise equivalent values. |
| Percent Power | `PercentPowerGame.tsx` | Fractions and ratio/proportion: find percentages of quantities and percentage changes. |
| Simplify Sprint | `SimplifySprintGame.tsx` | Fractions and factors: simplify using common factors. |
| Angle Arena | `angleArena/questions.ts` | Geometry: calculate missing angles, including angles on a straight line. |
| Polygon Palace | `PolygonPalaceGame.tsx` | Geometry: recognise and describe 2-D shapes and 3-D solids using their properties. |
| Area Architect | `AreaArchitectGame.tsx` | Measurement: count unit-square floor areas in rectangular and compound rectilinear models; triangle/parallelogram formula practice is in other sources. |
| Transformation Station | `rotationStationQuestions.ts` | Position and direction: translate and reflect shapes on a coordinate grid. |
| Coordinates Quest | `TreasurePathGame.tsx` | Position and direction: read coordinates and follow translations in four quadrants. |
| Conversion Canyon | `ConversionCanyonGame.tsx` | Measurement: convert between grams and kilograms; combine amounts to a required total mass. |
| Perimeter Path | `PerimeterPathGame.tsx` | Measurement: calculate a boundary length and convert units where required. |
| Mean Machine | `MeanMachineGame.tsx` | Statistics: calculate and interpret mean, including finding a missing value (6S3). |
| Graph Grabber | `GraphGrabberGame.tsx + shared bank` | Statistics: read bar charts; find totals, comparisons and differences. |
| Line Graph Lab | `LineGraphLabGame.tsx` | Statistics: read line graphs, compare changes and interpret values between points. |
| Data Detective | `DataDetectiveGame.tsx` | Statistics: interpret charts and compare quantities with the displayed data. |
| Factor Frenzy | `FactorFrenzyGame.tsx` | Multiplication and division: factors, common factors, prime factors and missing factors. |
| Multiplication Mine | `MultiplicationMineGame.tsx + multiplicationMineMath.ts` | Calculation: written multiplication, including up to four-digit by two-digit numbers. |
| Order Ops Arena | `OrderOpsArenaGame.tsx` | Calculation: order of operations, including brackets. |
| Formula Forge | `FormulaForgeGame.tsx` | Algebra and measurement: use simple formulae to calculate area, perimeter, volume and missing dimensions. |
| Remainder Run | `RemainderRunGame.tsx` | Calculation: division and interpreting remainders as whole-number or decimal answers in context. |
| Chrono Dash: Time Trial | `ChronoDashGame.tsx` | Measurement: read and convert clock times and calculate durations. |
| Problem Pyramid | `ProblemPyramidGame.tsx` | Calculation and algebra: addition and missing-number relationships. |
| Lava Path | `LavaPathGame.tsx + shared bank` | Measurement: convert standard units and combine measures. |
| Change Counter | `ChangeCounterGame.tsx` | Calculation and measurement: money totals, subtraction and change. |
| Potion Panic | `PotionPanicGame.tsx` | Ratio and proportion: scale quantities in a recipe using parts and multiples. |
| Share Splitter | `ShareSplitterGame.tsx` | Ratio and proportion: share quantities unequally using specified parts. |
| Ratio Racer | `RatioRacerGame.tsx + ratioFractionsRace/questionSelector.ts` | Ratio, proportion and fractions: express a part as a fraction of a whole and simplify it. |
| Scale Builder | `ScaleBuilderGame.tsx` | Ratio and proportion: calculate corresponding lengths in similar shapes using a scale factor (6R3). |
| SATs Paper 1: Arithmetic | `satsAdventure.ts: arithmeticMissions` | Mixed arithmetic: the existing mission bank carries per-question curriculum references. |
| SATs Paper 2: Reasoning | `satsAdventure.ts: reasoningMissions` | Mixed reasoning: number, calculation, fractions, ratio, algebra, measures, geometry and statistics. |
| SATs Paper 3: Reasoning | `satsAdventure.ts: reasoningMissions` | Mixed reasoning: the second reasoning selection uses the same assessed strands and per-question references. |

## Corrections

- Mean Machine now selects only mean and missing-value rounds. Median/mode entries in the shared data bank were replaced by mean questions. The older Data Dungeon fallback generator is also restricted to mean, numerical differences and bar-chart reading. A shared outlier-analysis question became a missing-total-from-mean question.
- Replaced a non-linear sequence with a constant-step linear sequence. Reworded symbolic missing-number questions as complete tasks or simple number-machine instructions.
- Fraction Forge uses proper-fraction pairs for multiplication, and proper fractions divided by whole numbers for division. Ingredient selection enforces these operand types. Addition and subtraction remain available.
- Made rounding accuracy, map-scale distances, recipe quantities, units, clock conventions and requested answers explicit in shared questions. Formula Forge now names the shape and measurements and gives cm, cm² or cm³ as appropriate; triangle/parallelogram height is identified as perpendicular.
- Line Graph Lab uses water temperature (°C) against time (minutes), with matching question and axis language. Graph Grabber's questions refer to boats, matching the chart.
- Take-Out Rush defines the whole meal represented by the portions. Remainder Run states the total, box capacity and both required answers. Factor Frenzy asks for factors using standard terminology.
- Removed automatic replacement of everyday vocabulary with fantasy terms. Corrected mean, place-value and order-of-operations learner help.
- Updated the writing standard and source index so future content follows the same scope and language rules.

## Verification

See `qa-artifacts/ks2-content-review/` for screenshots, captured question text, layout measurements and the final results report. Generator checks exercise the actual private builder functions with a reproducible random stream and independently recompute the answers:

- `node scripts/verify-ks2-content-generators.mjs`: 1,000 line-graph questions; 1,000 fallback statistics puzzles; 2,500 mean/missing-value rounds; 320 fraction-recipe combinations across all five tiers and offsets; 1,500 formula rounds covering 10 shape/target combinations.
- `npx tsx scripts/verify-sats-question-integrity.ts`: 70 shared challenge prompts, all 12 data puzzles, and unique measurement/time answer options. Explicitly rejects median/mode puzzles.
- `npm run lint` and `npm run build`: results recorded in the artifact report.

Screenshots sample the highest tier of each of the 37 game types; they do not exhaust every generated question or every end state. This is a content-and-language pass, not an external teacher accreditation or a full mock-paper equivalence claim.

## Files changed for this content pass

- Shared content: `src/systems/content/satsInspiredQuestionBanks.ts`, `src/systems/content/learnerGuides.ts`.
- Prompt formatters: `src/utils/fantasyPrompt.ts`, `src/utils/gameQuestionCopy.ts`.
- Games: `DataDungeonGame.tsx`, `CurriculumChallengeGame.tsx`, `MeanMachineGame.tsx`, `FractionForgeGame.tsx`, `FormulaForgeGame.tsx`, `FactorFrenzyGame.tsx`, `RemainderRunGame.tsx`, `ConversionCanyonGame.tsx`, `TakeOutRushGame.tsx`, `LineGraphLabGame.tsx`, `RatioRacerGame.tsx`, `PlaceValuePanicGame.tsx`, `GraphGrabberGame.tsx` (all under `src/games/`).
- Verification: `scripts/verify-sats-question-integrity.ts`, `scripts/verify-ks2-content-generators.mjs`, `scripts/verify-ks2-fraction-play.mjs`, optional question-text capture in `scripts/capture-current-game-screenshots.mjs`.
- Documentation: this file, `docs/question-format-editing-sheet.md`, `docs/question-wording-sources.md`.

## Assumptions

The target is England's KS2 mathematics SATs, normally taken at the end of Year 6. Existing game progression and scoring remain the basis for play; this pass does not rebuild the difficulty system or remove story settings. Only current repository content and the explicitly requested curriculum sources were used. No external legacy assumptions were used.
