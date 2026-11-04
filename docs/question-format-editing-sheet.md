# Question Format Editing Sheet

## KS2 question-writing standard (20 October 2026)

The target is England's end-of-key-stage-2 mathematics assessment, normally taken in Year 6. Each scored question must assess knowledge or a skill in the official test framework. A game can practise a smaller step within an objective; this does not make it a complete mock paper.

1. State the mathematical task in ordinary, age-appropriate English: “Work out”, “Write”, “How many”, “What is”, “Complete” or “Find”. Use the precise mathematical term where it matters: numerator, denominator, factor, multiple, perimeter, perpendicular height and mean.
2. Supply all information needed, either in the question or in a clearly labelled visual. State units, the required rounding accuracy, the whole represented by a fraction, the order of a ratio and what a graph's axes measure.
3. A short story can give the problem a purpose. Put the actual question immediately after it. Do not require knowledge of the fantasy world or unfamiliar vocabulary to understand the calculation. Familiar school, shop and transport contexts are welcome.
4. Write original questions. Use official papers as examples of language and structure, without copying their question bank or claiming official endorsement. Do not claim a particular objective appears in every year's paper.
5. Keep helper text separate from the task. Explain controls without revealing the answer. Difficulty should come from the mathematics, not vague wording or unnecessary reading.
6. Check the marked answer independently, require distinct answer options, and verify the visual shows the same values as the question. Check generated variants and every difficulty tier, not only one screenshot.
7. Check the question fits on desktop and landscape iPhone layouts. Do not truncate essential mathematical information to make a panel fit.

### Examples

- “Write three hundred and forty-five thousand in digits.”
- “On a map, 1 cm represents 5 km. What distance does 7 cm on the map represent?”
- “A rectangle has length 12 cm and width 5 cm. What is its perimeter?”
- “The mean of four scores is 12. What is the total of the four scores?”
- “There are 48 supplies to share equally between 6 guards. How many supplies does each guard receive?”

### Curriculum boundaries

- Statistics: assess mean and graph/table interpretation. Do not add median, mode or outlier-analysis rounds.
- Fraction multiplication: simple pairs of proper fractions. Fraction division: a proper fraction divided by a whole number (6F5a–b).
- Algebra: simple formulae, missing values and linear sequences. Do not replace these with quadratic, exponential or other non-linear sequence rules.
- Scale factors and proportional reasoning must use the framework's similar-shape and relative-size objectives. Do not assume all scale factors must be integers.
- Keep arithmetic, money, time, measurement, geometry, coordinates, fractions, percentages and ratio within the relevant KS2 objectives.

See [the content audit](ks2-content-review.md) for the source references, game coverage, changes and test limits. This standard supersedes earlier instructions to make the maths question sound less like a worksheet or to replace everyday vocabulary with fantasy terminology.

## Editing sources

- Shared bank: `src/systems/content/satsInspiredQuestionBanks.ts`.
- Local generators and their assessed skills: [current game coverage](ks2-content-review.md#current-game-coverage).
- Learner help: `src/systems/content/learnerGuides.ts`.
- Shared prompt formatting: `src/utils/fantasyPrompt.ts` and `src/utils/gameQuestionCopy.ts`.
- Source index: [question-wording-sources.md](question-wording-sources.md).

Use the actual renderer and generator for the selected route. Do not assume a historical display name identifies the current question bank.

## Coverage and answer assurance

Use [the objective-level audit](maths-curriculum-audit.md), not strand labels alone, for coverage claims. Every new scored question needs an independent answer calculation, unique mathematically valid choices, an accurate objective reference, complete givens and units, and marking that honours explicit instructions such as simplest form. Foundation groups G1, M3 and P1 are not year-specific KS2 objectives. Keep guided practice distinct from authentic unprompted assessment; providing an equation or intermediate answer can reduce the reasoning demand.
