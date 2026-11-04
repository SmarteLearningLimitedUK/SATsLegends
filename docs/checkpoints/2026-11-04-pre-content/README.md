# Official checkpoint — before content changes

Date: 4 November 2026

Git tag: `checkpoint/pre-content-2026-11-04`

This checkpoint preserves the complete current repository working state before the next content-editing phase: the independent Matharia iOS presentation, shared game source and content, artwork, native project, release workflow, tests and documentation. It includes work already present in the working tree, rather than only the most recent readability changes.

## Validation recorded at this checkpoint

- Matharia iOS web build passed: `npm run build --prefix variants/matharia`.
- Matharia TypeScript check passed: `npm run typecheck --prefix variants/matharia`.
- WebKit readability audit: 104 sampled game/menu layouts, including all 37 game groups and all eight islands at compact-phone and tablet sizes.
- Reasoning-paper audit: all 25 questions in each of Papers 2 and 3 at both sizes, giving 100 question layouts.
- Calm Grove and results: 16 layouts.
- These 220 final layout samples had no detected text-boundary, clipping or minimum frame-inset violations after the recorded fixes and rechecks.
- All eight island carousels cycled and swiped successfully at compact-phone, standard iPhone and iPad sizes.
- Correct Takeout orders could be selected and submitted at three sizes.
- Signed-in parent-account text/button spacing passed at 320 × 568, 402 × 874 and 768 × 1024 using isolated account and store fixtures through the current parent-check flow.
- Compact answer-pad controls entered a value and teaching-model viewers opened and closed at phone and tablet sizes.

The retained `readability-review.json` contains the measured evidence and the readability change list. Full screenshots and intermediate diagnostics remain in the ignored local `qa-artifacts/` directory. They are not required to build or restore this checkpoint.

## Content baseline and restoration

`content-baseline.sha256.json` records SHA-256 hashes for the current content sources and game TypeScript files. Compare later changes against this checkpoint with:

```sh
git diff checkpoint/pre-content-2026-11-04 -- src/systems/content src/games
```

To inspect or build the checkpoint without altering later work, create a separate worktree:

```sh
git worktree add ../SATsLegends-pre-content checkpoint/pre-content-2026-11-04
```

`files.txt` lists the paths included in this checkpoint commit.

## Limits and assumptions

This is a source checkpoint, not a new TestFlight deployment or App Store approval. The latest validation is browser WebKit, build and TypeScript validation. Native iOS Dynamic Type and physical-device behaviour remain unverified by this audit. Every generated question, saved-answer length and device setting has not been exhaustively tested.

The user's request is interpreted as preserving the complete current local state before further content changes. Generated build output, dependency folders, environment files, QA scratch artifacts and Python caches remain excluded by `.gitignore`. No external legacy assumptions were used.
