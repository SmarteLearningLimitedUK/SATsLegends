# SATs curriculum and revision-depth playtest audit

Reviewed 23 October 2026 against the current repository. This is a SATs revision companion audit, not a proposal to teach the whole curriculum. No new games are justified by the evidence in this pass.

## Verdict

All nine tested maths strands have reachable Core representatives. Recent additions already supply calendar facts, equal-area fraction shading, independent combinations, scale-factor reasoning, pictogram construction and contextual rounding. There is **no newly established wholly missing topic strand**. The app does not yet demonstrate exhaustive coverage of every tested objective, context or response strategy. Its main remaining content weakness is depth and variety of independent reasoning, rather than another list of topic names.

The most concrete accessibility-to-content regression was extra practice becoming unreachable after Help was replaced by Tips. Existing content was still in source, but a `kind='help'` branch had no caller. The authorised repair restores it inside a closed-by-default **Practise SATs questions** disclosure in Tips. Rules remain first; the workshop loads only on request. Compiled browser verification passed, as recorded below.

## Official reference set

The [STA KS2 mathematics framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework), PDF V5 (STA/15/7342/e), is the scope reference. Its content table and sections 4.3, 5 and 6 distinguish assessed content, practical limitations, cognitive demand and paper specifications. The [current framework collection](https://www.gov.uk/government/collections/national-curriculum-assessments-test-and-assessment-frameworks) confirms unchanged 2026–27 arrangements.

The latest published comparison is the [2026 test materials](https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials), published 22 May 2026: Paper 1 STA/26/9017/e, Paper 2 STA/26/9018/e, Paper 3 STA/26/9019/e, mark schemes STA/26/9020/e. A single year's papers are comparison examples, not an exhaustive topic checklist. Local PDFs/text and selected rendered pages are in `qa-artifacts/full-playtest/official/`. The mark-scheme domain table, Paper 2 Q20 and Paper 3 Q20 were visually inspected.

Useful demand checks in those papers are Paper 2 Q20 (open coin combinations), Q23 (recover an unknown whole from pie information), Paper 3 Q17 (multiple correct equivalence statements), Q19 (different valid pairs), Q20 (linked isosceles deductions), and Q21 (composite area and method credit). These examples were compared with existing original missions; no paper questions were copied into the game.

## What was actually checked

- Current 37-game registry, shared banks, Core selection, guides, objective ledger and curated evidence were inspected. Historical named gallery folders were absent at the start; their previous prose was not accepted as current proof.
- `scripts/export-full-playtest-curriculum.ts` enumerated **202 mission families over 250 seeds** (50,500 generated mission instances), checking their own expected answers self-mark for full credit. This is internal consistency, not an independent mathematical oracle.
- **200 families appeared in a Core selection** in that sample. `ext-capacity` and `ext-regular-polygon` did not; they belong to existing Unit Mixer and Angle Arena practice banks. Their restored Tips route is important. A generator's `game` property alone never proves the main game's rounds contain that family.
- The local framework ledger has **195 rows**. After verified tag corrections, **113 distinct codes** have directly tagged Core representatives. The other 82 have curated source evidence; absence of an exact tag is not proof of missing content. The curated file has 182 records (93 representative, 89 partial), which is not the same measure as 195 objectives or 202 families.
- `verify-sats-content.ts` passed 600 generated paper variants, marks/timings/strands, valid alternatives and its independent arithmetic checks. `verify-sats-topic-gaps.ts` passed 10 families over 1,000 seeds. Its phrase “island practice” denotes a bank/guide join, not browser reachability; the new Tips test addresses that distinction.
- Core matches 40/35/35 marks and 30/40/40 minutes. It anchors all nine strands and separates Paper 2/3 family sets. These structural checks do not calibrate difficulty with children or make the game an official mock examination.

## Coverage and depth assessment

| Area | Current evidence | Remaining revision limitation |
| --- | --- | --- |
| Number/place value | Place Value Panic; shared number tasks; Core ordering, sequences, Roman numerals and larger numbers | Main Place Value Panic caps generated values at 1,000,000. Larger end-of-KS2 numbers rely on the bank/Core. More independently reordered lists and changing representations would improve recall transfer. |
| Calculation | Four operations, operation order, factors/primes, remainders, larger written calculations and independent-context missions | Many main games provide the operation or an intermediate plan. Increase variety of unprompted multi-step selection within existing banks, rather than add another arithmetic game. Automated working credit is bounded. |
| Fractions/decimals/percentages | Equivalence, above-one/mixed forms, ordering, operations, fraction shading, decimal precision and percentages | Small recurring structures cannot certify all equivalence/ordering contexts. Add varied multi-correct statements and changes of representation to existing revision banks if expanding depth. |
| Rounding | Main Rocket targets 10/100/1,000; Core has large-place, decimal and contextual accuracy tasks | Main Rocket is narrower than its associated bank. Do not describe Rocket alone as full decimal/large-place rounding practice. |
| Ratio/proportion | Sharing, mixtures, scaling and independently inferred scale factor | The games can signal the method. More independently selected proportional versus non-proportional contexts would deepen exam practice. |
| Algebra | Formulae, sequences, missing values, valid pairs and exhaustive possibilities | Preserve genuinely open valid solutions. Multiple-choice formula identification alone cannot stand for independent algebraic expression. |
| Measures/time/money | Change, units, scales, elapsed/overnight times, Roman clocks, calendar facts, area/volume and conversions | Broaden measure comparisons and unfamiliar scale divisions. Physical ruler/protractor handling is not a required app teaching feature; digital interpretation can support revision without claiming to replace practical assessment. |
| Geometry | Properties, nets, symmetry, transformations, coordinates and Core angle deductions | Angle Arena's main generator is straight-line focused. Isosceles/crossed-line/regular polygon bank content must remain accessible. Broader diagram orientations and multi-stage deductions provide useful depth. |
| Statistics | Bar/line/pie, tables, mean, scaled/half pictograms and graph-building controls | Supplied digital axes and constrained construction are narrower than unrestricted paper drawing. Add unfamiliar combined data/unknown-total contexts within existing banks if expanding depth. |

These are depth recommendations, not claims that the entire corresponding topic is absent. Changing numbers is useful fluency practice but does not create an independent reasoning structure. The machine matrix preserves family IDs, sample prompts, representation, answer fields, source game, code, Core appearance counts and variant counts so these claims can be reviewed.

## Verified metadata corrections

Only objective references changed; questions, answers, diagrams and scoring remained unchanged.

| Family | Before | After | Reason |
| --- | --- | --- | --- |
| `ext-valid-pairs` | 6A5 | 6A4 | Requests two valid pairs satisfying a two-unknown equation. |
| `depth-all-possibilities` | 6A4 | 6A5 | Requests exhaustive possibilities. |
| `depth-decimal-context` | 6F10 | 5F10 | Exact contextual three-decimal calculation; it does not request rounding. |
| `depth-imperial-reverse` | 6M6 always | 6M6 for miles; 5M6 otherwise | Inches, pounds and pints use the wider approximate-equivalence objective. |
| `depth-decimal-round-varied` | 4F7 | 6F10 | Variable specified accuracy on three-decimal inputs exceeds the narrower year-four rounding description. |
| `ext-mixed-improper`, `ext-mixed-to-improper` | 5F2b | 5F2a | Converting improper and mixed numbers; equivalent shaded fractions remain covered separately. |
| `fraction-whole` | 6F10 | 6R1 | Recovering a relative quantity, without requested rounding. |
| `imperial` | 5M6 | 6M6 | Fixed miles-to-kilometres conversion. |
| `depth-imperial` | 5M6 always | 6M6 for miles; 5M6 otherwise | Forward conversion has the same mixed imperial-unit branches as reverse conversion. |

The corrected 6F10 contextual-rounding family already exists, so the decimal retag does not remove all evidence for rounded contextual answers. `G1` and `P1` in source are foundational group labels; they are not year-specific KS2 objective codes and must not be counted as such.

## Language and scope

Reviewed prompts generally use short commands, explicit units and clear answer format. Story wrappers should preserve that pattern. Examples such as a request for the greatest common factor of “both locks” would be clearer if the two numbers were named directly. Do not replace the tested operation with fantasy terminology. Avoid redundant instructions that already appear in the question or answer label.

No reachable scored requirement for probability, negative multiplication/division, median/mode or a circumference formula was established in the current registry/bank audit. Dormant `MedianMountainGame.tsx` and legacy-looking type alternatives exist in this repository, but a dormant component is not evidence of learner exposure. Circle vocabulary/radius/diameter and calendar facts are within the test-framework scope. Do not add non-tested topics to make the product look more comprehensive.

## Difficulty and assurance limits

Five scored tiers and optional practice exist. The current five-tier report checks source generator properties over seeded samples; it did not open browsers. Core sorts by internal difficulty and includes higher-demand tails, but labels 1–5 are author estimates. Fast animation, working-memory load and unfamiliar representation can make an otherwise simple calculation harder. Actual pupil completion/error timing is still needed before claiming a calibrated difficulty curve.

The appropriate next content investment is independent response/context variety inside existing games and banks, especially operation selection, multiple valid answers and mixed representation reasoning. It is not a new teaching curriculum. Do not advertise exhaustive SATs coverage or school-paper equivalence solely from this matrix.

## Repair and verification status

Production changes in this workstream: `PracticeIntroPopup.tsx` (existing practice access), `satsAdventure.ts`, `satsDepthMissions.ts`, `satsExtendedMissions.ts` (ten reference corrections). Export/test/report files are evidence only. Compiled Tips checks passed 2/2 profiles: 667×375 Unit Mixer capacity and 844×390 Angle Arena regular-polygon. Both gave correct-answer feedback, loaded only after disclosure, held the timer for 2.1 seconds, contained focus, restored Tips focus with Escape and reset closed on reopening. No page errors; browser closed. Evidence: `qa-artifacts/full-playtest/workshop/results.json`; reproducible script: `scripts/verify-full-playtest-workshop.mjs`.

No deployment or TestFlight upload was performed. No live account data was used. No external legacy assumptions were used.

## Complete objective-level crosswalk

The [195-row semantic ledger](../qa-artifacts/full-playtest/objective-ledger.md) supplies every official code, framework page, status, actual family or main-generator evidence, and limitation. The [machine matrix](../qa-artifacts/full-playtest/curriculum-matrix.json) additionally includes prompts and Core selection counts. All **82 rows without an exact Core tag were crosswalked semantically**; a tag was not used to declare their absence. The final review records **114 supported representatives, 81 thin objectives, 0 wholly unevidenced objectives**. Supported still means one matched practice demand, not mastery or complete depth.

The `depth-measure-order` generator already varies lengths, masses and capacities. An initial mass-only sampled prompt was insufficient evidence to classify 3M1c as absent; reading the complete generator established actual mixed litre/ml comparison. No content expansion or author provenance is inferred from that correction.

Thin tested objectives are: 3N2a, 4N2a, 5N2, 3N4, 5N4, 3N6, 4N6, 5N6, 3C3, 4C3, 5C3, 6C3, 3C4, 4C4, 5C4, 6C4, 6C5, 5C5b, 5C5c, 5C5d, 5C6a, 6C6, 5C6b, 4C6c, 5C7b, 6C7b, 3C8, 4C8, 5C8a, 6C8, 5C8b, 5C8c, 3F1a, 4F1, 3F1b, 5F2a, 6F2, 3F3, 4F6a, 5F6a, 6F6, 4F6b, 5F6b, 4F7, 4F8, 4F9, 6F9b, 6F9c, 3F10, 4F10a, 5F10, 4F10b, 5F11, 6F11, 3M2a, 3M2b, 3M2c, 3M4a, 5M4, 3M4d, 3M4f, 5M7b, 5M8, 3M9a, 4M9, 5M9a, 6M9, 5M9b, 5M9c, 5M9d, 5G2a, 4G2b, 3G3a, 6G3b, 3G4a, 4G4, 5G4a, 3G4b, 5G4c, 3M1a, 6G3a. Each row identifies limited breadth or response demand. Many are older-year prerequisites represented within harder questions; they do not require separate games. Priority weaknesses are unprompted multi-step strategy, unfamiliar representations, full written-method response assessment, independent diagram construction and exact numerical-range variety.

Framework section 4.3 limits are attached to affected ledger rows: mental method cannot be inferred from a final answer; physical modelling and water-based capacity estimation require practical equipment. Those aspects are not missing revision-game features. Numerical/diagram-based parts of the same objectives remain assessable, which is why no entire objective was classified outside-written-assessment. This avoids asking a revision companion to become a teaching curriculum.
