# Question Wording Sources

This repo does not use one single generator for every game. Question wording comes from a mix of shared content banks and per-game builders.

## Best starting points

| Area | File | Notes |
| --- | --- | --- |
| Shared SATs-style challenge wording | `src/systems/content/satsInspiredQuestionBanks.ts` | Central shared bank for curriculum challenge games. Includes reusable prompt text, options, and answer shuffling. |
| Ratio race questions | `src/games/ratioFractionsRace/questionSelector.ts` | Picks the ratio-race question tier and source question for the race game. |
| Ratio race question content | `src/games/RatioFractionsGame.tsx` | Contains the ratio question list, prompts, options, and explanation text. |
| Angle arena question bank | `src/games/angleArena/questions.ts` | Contains the angle question prompts and answer data for Angle Arena. |
| Potion Panic recipe wording | `src/games/PotionPourGame.tsx` | Builds the recipe card title, prompt, and flavor text for Potion Panic. |
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
