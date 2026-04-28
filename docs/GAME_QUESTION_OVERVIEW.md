# SATs Legends: Game and Question Overview

This file is a plain-English overview of each SATs Legends minigame and the kinds of SATs-style questions/skills it is designed to test.

Source of truth for names + learning focus: `src/gameMeta.ts`.

## Games (What Each One Tests)

| Game Key | In-Game Name | What It Tests |
|---|---|---|
| `angle_arena` | Angle Arena | Angles, missing angles and angle reasoning |
| `area_architect` | Area Architect | Area and perimeter of composite shapes |
| `calculation_clash` | Calculation Cup | Arithmetic race under pressure |
| `change_counter` | Change Counter | Money, totals, and giving change |
| `cloud_collapse` | Crystal Match | Equivalent values match-3 play (fractions/decimals equivalence) |
| `coordinate_quest` | Coordinates Quest | Coordinates, direction and movement reasoning |
| `crystal_core` | Arithmetic Showdown | Arithmetic paper boss duel (mixed arithmetic fluency) |
| `data_dungeon` | Data Dungeon | Tables, sets and summary statistics (mean/median/mode/range) |
| `equation_grove` | Order Ops Arena | Missing numbers, simple algebra and inverse operations (incl. order of operations) |
| `formula_forge` | Formula Forge | Algebra substitution and formula use |
| `fraction_match` | Crystal Match | Equivalent values match-3 play (fractions/decimals equivalence) |
| `graph_grabber` | Graph Grabber | Bar charts, line graphs and table interpretation |
| `logic_sort` | Logic Sort | Classification and reasoning (rule finding, grouping) |
| `matrix_match` | Reasoning Summit | Reasoning paper boss duel (pattern/rule reasoning) |
| `mean_machine` | Mean Machine | Mean and averages (including missing value / target mean) |
| `measurement_forge` | Conversion Canyon | Mass, volume and unit conversion |
| `mirror_gate` | Reasoning Trial | Reasoning paper boss duel (multi-step reasoning/patterns) |
| `monster_market` | Monster Market | Money, totals and exact change (multi-item totals, change) |
| `observatory_overload` | Data Observatory | Statistics and data reasoning |
| `percent_power` | Percent Power | Percentage of amount and reverse percentage |
| `place_value_peaks` | Decimal Sniper | Decimals, place value and rounding |
| `polygon_palace` | Polygon Palace | Shape properties (classification, sides/angles/symmetry) |
| `potion_pour` | Potion Panic | Ratios (building ratios, scaling, part/whole) |
| `prime_pop` | Prime Pop | Prime numbers (primes vs composites, factor checks) |
| `quiz` | Quiz | Mixed SATs fluency (multi-topic) |
| `ratio_fractions` | Ratio Racer | Ratio to fraction and part-to-whole reasoning |
| `ratio_rapids` | Ratio Racer | Ratios, scaling and proportional reasoning |
| `reasoning_quest` | Reasoning Quest | Multi-step reasoning across key topics |
| `remainder_run` | Remainder Run | Division and decimal remainders |
| `rule_runner` | Rule Runner | Input-output rules and function patterns |
| `scale_safari` | Scale Builder | Architectural scaling, proportions and dimension precision |
| `scales_of_the_sun` | Scale Master | Measure and proportion |
| `take_out_rush` | Take-Out Rush | Fractions, equivalence and exact composition |
| `timekeeper_temple` | Chrono Dash: Time Trial | Time (digital-to-analogue conversion, minutes past/to) |
| `tower_of_factors` | Factor Forge | Factors and multiples |
| `transform_temple` | Rotation Station | Transformations and movement rules (rotations/translations/reflections depending on level) |
| `unit_mixer` | Lava Path | Mixed unit conversions (length/mass/capacity) |

## Question Banks (JSON)

SATs Legends includes external-style question banks in:

`src/systems/content/externalQuestionBanks/`

Current files:

- `angleArenaQuestions.json`
- `calculationClashQuestions.json`
- `factorFrenzyQuestions.json`
- `graphGrabberQuestions.json`
- `monsterMarketQuestions.json`
- `numberLineNinjaQuestions.json`
- `potionPanicQuestions.json`
- `rangeRodeoQuestions.json`
- `scaleBuilderQuestions.json`
- `shareSplitterQuestions.json`

The bank selection + option shuffling/normalisation is orchestrated in:

`src/systems/content/satsInspiredQuestionBanks.ts`

