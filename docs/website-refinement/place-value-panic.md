# Place Value Panic — reference and grounding revision

## Agreed changes

The user requested that the enemy stand on the ground, supplied a blue-and-gold stone/castle reference, and required independently movable assets for future iPhone/iPad layouts. This authorizes the reference treatment for this game; it is not approval of the whole game or permission to advance to another game.

## Layer contract

- Existing castle scenery is a decorative background only.
- Existing rhino remains a separate animated actor with its existing contact shadow.
- `src/assets/place_value/scene/stone-ledge-v1.png` is a separate transparent foreground ledge, extracted/reconstructed from the supplied reference with the built-in image generation tool. Its prompt and rendering bounds are documented beside the asset.
- The rhino and ledge share a ground variable in their own workspace; background cropping does not determine their location.
- Question, place-value labels, target slots, source buttons and Submit remain independently positioned DOM elements. All instructions, labels and digits are live text. Existing stone art is reused for the blue-and-gold tiles and border treatment.
- Desktop scene changes apply to this game only. Existing native mode and compact portrait layouts are excluded from the new composition rules.

## Validation and review

Fresh proposed screens and the compiled build identity are recorded at `qa-artifacts/website-refinement-2026-10-28/place-value-reference-v4/`. Baseline captures and earlier attempts are retained separately. `grounding-checks/report.json` records actual anchor geometry and target/digit reachability across practice and all five tiers at both desktop sizes; a portrait check guards existing phone behaviour.

`node scripts/verify-place-value-grounding.mjs` runs the focused checks. `npm run build` and `npm run lint` check the website build and TypeScript. The review capture harness exercises help/pause, wrong/correct answers, level-1 completion, failure and retry. This does not certify audible sound, every-tier completion or physical iOS behaviour.

Status: proposed revision; user approval pending. Native conversion and project duplication remain deferred.

All 12 desktop opening layouts (practice and five tiers at both sizes) passed the geometry audit with no overlap warnings. The 13 focused grounding/reachability cases passed, including the unchanged portrait behaviour. The sequential capture attempt timed out reopening the route after victory in a reused fixture context; its raw report is retained as `sequential-navigation-attempt.json`. Failure and the real Retry button passed in a separate fresh-context recheck. Navigation sign-off remains pending; these visual checks do not constitute complete game approval.

## Changed files for this revision

- `src/games/PlaceValuePanicGame.tsx`
- `src/games/place-value-panic.css`
- `src/assets/place_value/scene/stone-ledge-v1.png`
- `src/assets/place_value/scene/README.md`
- `scripts/verify-place-value-grounding.mjs`
- `scripts/capture-website-refinement.mjs` (separate output folders preserve baseline evidence)
- `scripts/build-website-refinement-review.mjs` (distinguishes proposed revisions from untouched baseline)
- `docs/website-refinement/place-value-panic.md`
- `docs/website-refinement/review-inventory.json` (current build and pending review notes)

Assumptions: the reference's composition is adapted to the agreed landscape website, with the existing rules and selected character preserved. Separate foreground assets, not a flattened mockup, own the playable scene. No external legacy assumptions were used.
