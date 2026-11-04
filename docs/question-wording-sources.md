# Question Wording Sources

This repo does not use one single generator for every game. Question wording comes from a mix of shared content banks and per-game builders.

## Best starting points

| Area | File | Notes |
| --- | --- | --- |
| Shared SATs-style challenge wording | `src/systems/content/satsInspiredQuestionBanks.ts` | Central shared bank for curriculum challenge games. Includes reusable prompt text, options, and answer shuffling. |
| Ratio race questions | `src/games/ratioFractionsRace/questionSelector.ts` | Picks the ratio-race question tier and source question for the race game. |
| Ratio race question content | `src/games/RatioRacerGame.tsx` | Contains the ratio question list, prompts, options, and explanation text. |
| Angle arena question bank | `src/games/angleArena/questions.ts` | Contains the angle question prompts and answer data for Angle Arena. |
| Potion Panic recipe wording | `src/games/PotionPanicGame.tsx` | Builds the recipe card title, prompt, and flavor text for Potion Panic. |
| Data Detective case wording | `src/games/DataDetectiveGame.tsx` | Builds the suspect/evidence prompt text for the detective screen. |

## Question-position reference

Use `Potion Panic` as the current visual reference for top-docked question positioning:

- question card sits directly below the shared HUD
- no negative top offset
- centered and width-limited
- spacing stays tight and consistent

## Notes

- `src/systems/content/islandBlueprint.ts` describes game purpose and question types, but it is not the wording generator itself.
- `src/utils/questionShuffle.ts` handles answer ordering and repeat-avoidance for the shared challenge banks.
- Several games still build wording inside their own `.tsx` files, so if you are editing a specific minigame, search that game first.

## Curriculum and language references

Use [the KS2 mathematics test framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework) as the assessment-scope authority and [the 2026 official papers](https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials) as examples of pupil-facing language and structure. The framework landing page states that the arrangements are unchanged for 2026–27.

BBC Bitesize was requested as an additional language reference. Automated access to the current BBC subject pages was blocked during this audit, so no direct comparison with their current wording is claimed. Do not use unofficial Bitesize mirrors as evidence.

The [question-writing standard](question-format-editing-sheet.md) and [content audit](ks2-content-review.md) apply to shared banks, local generators, fallback generators, learner guides and prompt formatters. `src/utils/fantasyPrompt.ts` must preserve familiar nouns; it must not automatically turn pupils into apprentices, shops into market stalls or trains into airships.
