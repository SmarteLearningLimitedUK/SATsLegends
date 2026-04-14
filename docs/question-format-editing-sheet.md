# Question Format Editing Sheet

This is the working sheet for tightening question wording across SATs Legends.

Use `Potion Panic` as the current reference standard:
- question card sits directly under the shared HUD
- one short title line
- one short helper line if needed
- no long story block unless the game truly needs it
- keep the playfield readable first

If a prompt feels too wordy, edit the `Editable note` column first before changing gameplay logic.

## Question Writing Standard

All minigame questions should feel like a real game prompt, not a worksheet sentence.

### Tone

- Age-appropriate for Year 6
- Confident, clear, and a little playful
- Short enough to read quickly under pressure
- Never babyish, never overly formal
- Keep the challenge level SATs-accurate even when the wording is lighter

### Prompt Shape

Use this structure where possible:

1. short hook or task label
2. the actual maths question
3. one short helper line if the player needs a nudge

### Story Framework

Use the Matharia story to make prompts feel like part of the world:

- Matharia is the land where the games happen
- The Core of Calculation is the source of brainpower
- Monster Minds are the enemies stealing that brainpower
- Bran, Mochi, Barratt, and Vex are the heroes

Prompt style:

1. situation
2. maths task
3. outcome or small payoff

Example:

- `A Monster Mind is draining a villager's brainpower. Split 48 units evenly into 6 shields. How much goes in each shield?`
- `Correct: the village is restored.`
- `Wrong: the Monster Mind grows stronger.`

### What To Avoid

- long backstory before the maths begins
- repeating the same fact in multiple lines
- asking the player to read a paragraph before answering
- sentence fragments that sound vague or childish
- extra filler when the visual already shows the context

### Good Prompt Pattern

- `Task label`
- `What is 3/5 of 20?`
- `Use the bar model to help.`

### Better Than

- `In the magical garden, the wise fox has collected twenty shimmering apples and now needs your help to work out three fifths of them.`

### Editing Rule

If a prompt can be shortened without changing the maths, shorten it.
If the visual already explains the context, let the visual do that job.

## Shared Sources

- Shared challenge bank: `src/systems/content/satsInspiredQuestionBanks.ts`
- Ratio race deck: `src/games/ratioFractionsRace/questionSelector.ts`
- Ratio race question text: `src/games/RatioFractionsGame.tsx`
- Potion Panic recipe wording: `src/games/PotionPourGame.tsx`
- Angle Arena questions: `src/games/angleArena/questions.ts`
- Shared game scene metadata: `src/gameSceneMeta.ts`

## Game-by-Game Sheet

| Game | Source | Current format | Editable note |
| --- | --- | --- | --- |
| Angle Arena | `src/games/AngleArenaGame.tsx` + `src/games/angleArena/questions.ts` | Short angle prompt, 4 angle answers, optional helper | Keep the question to one sentence; move any explanation into helper text. |
| Area Architect | `src/games/AreaArchitectGame.tsx` | Area prompt with shape visual and answer choices | Keep the prompt direct; avoid extra scene-setting text. |
| Boss Encounter | `src/games/BossEncounterGame.tsx` | Mixed bank of SATs-style challenge prompts | Trim each prompt to one idea; let the boss art carry the drama. |
| Calculation Crash | `src/games/CalculationCrashGame.tsx` | Arithmetic prompt with multiple-choice answers | Use the shortest possible calculation wording. |
| Change Counter | `src/games/ChangeCounterGame.tsx` | Money prompt with a coin-change task | Keep the value sentence short and readable. |
| Cloud Collapse | `src/games/CloudCollapseGame.tsx` | Visual puzzle prompt with answer selection | Keep prompt text minimal and let the cloud board do the work. |
| Coordinate Translation | `src/games/CoordinateTranslationGame.tsx` | Movement / coordinate prompt | Keep the instruction to one line and one action. |
| Curriculum Challenge | `src/games/CurriculumChallengeGame.tsx` | Shared curriculum prompt bank | Edit the shared bank entry rather than each screen copy. |
| Data Detective | `src/games/DataDetectiveGame.tsx` | Case question plus short subtitle | Keep the case brief short; avoid repeating the same clue twice. |
| Data Dungeon | `src/games/DataDungeonGame.tsx` | Chart/data prompt with answer options | Keep the data question as a single sentence. |
| Decimal Sniper | `src/games/DecimalSniperGame.tsx` | Decimal prompt with rapid answer flow | Keep the target sentence compact and direct. |
| Division Dock | `src/games/DivisionDockGame.tsx` | Sharing prompt with crates/boats and a confirmation line | Keep the main question very short; use the dock visuals for context. |
| Factor Frenzy | `src/games/FactorFrenzyGame.tsx` | Factor prompt with timed pressure | Say exactly what kind of factor is needed; skip extra framing. |
| Formula Forge | `src/games/FormulaForgeGame.tsx` | Formula prompt with a large equation display | Keep the equation on one line and the wording short. |
| Fraction Forge | `src/games/FractionForgeGame.tsx` | Build/sort fraction prompt | Use short build instructions only. |
| Fraction Match | `src/games/FractionMatchGame.tsx` | Matching prompt with a board of values | Keep the match instruction short and repeat-free. |
| Line Graph Lab | `src/games/LineGraphLabGame.tsx` | Graph question plus helper line | Keep the question clear and the helper line short. |
| Maths Vs Zombies | `src/games/MathsVsZombiesGame.tsx` | Survival prompt with quick answer flow | Keep the question label short so the playfield stays open. |
| Mean Machine | `src/games/MeanMachineGame.tsx` | Mean/median/mode prompt with data card | Keep the ask to one statistic at a time. |
| Measurement Forge | `src/games/MeasurementForgeGame.tsx` | Unit conversion / measurement prompt | Keep units in the question, not repeated in every line. |
| Median Mountain | `src/games/MedianMountainGame.tsx` | Data set prompt with answer focus | One question sentence, one helper sentence at most. |
| Monster Market | `src/games/MonsterMarketGame.tsx` | Market / arithmetic prompt | Keep the trade prompt short and direct. |
| Multiplication Mine | `src/games/MultiplicationMineGame.tsx` | Multiplication prompt with target values | Shorten to the multiplication only; no extra story text. |
| Number Line Ninja | `src/games/NumberLineNinjaGame.tsx` | Number-line prompt with target landing | Keep the target instruction minimal. |
| Order Ops Arena | `src/games/OrderOpsArenaGame.tsx` | BIDMAS / operation-order prompt | Keep the expression readable on one line; avoid a long intro. |
| Percent Power | `src/games/PercentPowerGame.tsx` | Percentage prompt with a value target | Keep the prompt to the math statement itself. |
| Perimeter Path | `src/games/PerimeterPathGame.tsx` | Perimeter prompt with a shape visual | Use a short prompt and let the shape show the context. |
| Place Value Panic | `src/games/PlaceValuePanicGame.tsx` | Place-value prompt with digit/number cards | Keep the wording to one short sentence. |
| Polygon Palace | `src/games/PolygonPalaceGame.tsx` | Shape property prompt / sort prompt | Shorten the prompt; keep the property name prominent. |
| Potion Panic | `src/games/PotionPourGame.tsx` | Recipe card plus ratio and short instruction | This is the visual standard; keep it tight and top-docked. |
| Prime Pop | `src/games/PrimePopGame.tsx` | Prime/composite prompt with timer pressure | Keep the prompt concise so the wave timing stays readable. |
| Problem Pyramid | `src/games/ProblemPyramidGame.tsx` | Top-number prompt with a pyramid visual | One short instruction line only. |
| Ratio Fractions | `src/games/RatioFractionsGame.tsx` | Ratio prompt plus ratio line and answer buttons | Keep the wording to one sentence and one ratio line. |
| Ratio Rapids | `src/games/RatioRapidsGame.tsx` | Ratio / race prompt with motion feedback | Keep the prompt short and action-focused. |
| Reasoning Quest | `src/games/ReasoningQuestGame.tsx` | Word-problem prompt | Trim the story to the smallest version that still makes sense. |
| Remainder Run | `src/games/RemainderRunGame.tsx` | Division/remainder prompt | Keep the division statement short and clear. |
| Rotation Reflection | `src/games/RotationReflectionGame.tsx` | Transformation prompt | One instruction line, one visual cue. |
| Rounding Rocket | `src/games/RoundingRocketGame.tsx` | Rounding prompt with mission card | Keep the number and rounding target prominent. |
| RuneLock Dungeons | `src/games/RuneLockDungeonsGame.tsx` | Missing-number equation prompt | Prefer a single equation line over a paragraph. |
| Scale Builder | `src/games/ScaleBuilderGame.tsx` | Scale prompt with anchored central board | Keep the prompt short and avoid repeating the same scale clue. |
| Share Splitter | `src/games/ShareSplitterGame.tsx` | Sharing / fraction prompt with drag targets | Keep the prompt to a single line; let the table layout do the rest. |
| Simplify Sprint | `src/games/SimplifySprintGame.tsx` | Simplify-fraction prompt | One clean reduction prompt only. |
| Take-Out Rush | `src/games/TakeOutRushGame.tsx` | Fraction build prompt with target tray | Keep the target sentence short and direct. |
| Timekeeper Temple | `src/games/TimekeeperTempleGame.tsx` | Time-reading prompt | Avoid extra wording; keep the clock question compact. |
| Tower of Factors | `src/games/TowerOfFactorsGame.tsx` | Factor prompt with tower progression | Short factor instruction only. |
| Treasure Chart Cove | `src/games/TreasureChartCoveGame.tsx` | Chart-reading prompt with helper text | Keep the chart question to one line; helper only if needed. |
| Treasure Path | `src/games/TreasurePathGame.tsx` | Map / route prompt | Keep the route instruction short and visual. |
| Unit Mixer | `src/games/UnitMixerGame.tsx` | Unit conversion prompt from shared challenge bank | Keep the conversion sentence short and direct. |
| Volume Vault | `src/games/VolumeVaultGame.tsx` | Volume prompt with 3D shape visual | One volume question, one short helper if needed. |

## Editing Rules

- If the prompt can be shortened without losing the answer, shorten it.
- If a helper line repeats the prompt, delete the repeat.
- If the game already has a strong visual cue, let the visual do more of the explanation.
- Prefer title + helper line over a long paragraph.
- Use the same short-question style as `Potion Panic` whenever possible.

## Notes

- This sheet is meant to be edited directly in the repo.
- If you want, the next step can be a pass to rewrite the wordiest questions in the order they appear here.
