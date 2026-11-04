# Website refinement review

## Agreed process

Refine the current website before duplicating it for iPhone and iPad. Review the games first, beginning with Place Value Panic and following island/catalogue order. Review the complete experience one screen at a time, agree changes before editing gameplay, and obtain explicit user approval before advancing to the next game.

Desktop first: 1440 × 900 primary; 1280 × 720 short desktop. Website gameplay is landscape. Review mobile website layouts and surrounding player screens after the desktop games and SATs papers. Native orientation decisions, conversion, payments and physical-device certification remain later phases.

## Protected baseline — 28 October 2026

- Original branch: `codex/ios-app`.
- Working branch: `codex/website-refinement-2026-10-28`.
- Base HEAD: `fe35bdcf49b6a5c5a302e9582e486c742441e30d`.
- Recoverable source checkpoint: `refs/checkpoints/website-refinement-2026-10-28`, commit `caad813bdad97b57ee644ae9a1f8c40b5b6d9132`.
- The checkpoint contains the current source and existing native source, with generated/private candidates excluded. No credentials were added. Nothing was pushed. The existing working tree and user Git index were preserved.
- The existing native files were not edited. Website builds use normal production mode, rather than iOS mode or the development-only timer/unlock overrides.

The checkpoint is an additional local Git reference; it does not imply that the working tree is clean. Inspect it with `git show refs/checkpoints/website-refinement-2026-10-28`. Recover individual files into a separate checkout after checking local changes; do not reset the current working folder blindly.

## Review record and evidence

`baseline.json` records the protected source checkpoint. `review-inventory.json` is generated from the actual current catalogue and records routes, order, build identity and approval status. Successful tests never count as user approval. A changed build invalidates prior approved status until the affected screens are reviewed again.

The current build and screenshots are under `qa-artifacts/website-refinement-2026-10-28/`. `report.json` identifies the source checkpoint, compiled entry hash, viewports, captured states, layout diagnostics and interaction results. These captures use an isolated account fixture and do not certify real authentication, cloud saving, payment or native behaviour. Earlier capture attempts remain separate evidence.

To reproduce locally:

1. `npm run build` and `npm run lint`.
2. Start the normal website source server on 4187 and compiled preview on 4188.
3. Run `node scripts/capture-website-refinement.mjs`.
4. Run `node scripts/build-website-refinement-review.mjs`.
5. Open `/qa-artifacts/website-refinement-2026-10-28/index.html` on the source server. The compiled preview supplies the actual playable website; the source server serves the review artifacts and catalogue only.

## First review: Place Value Panic

Status: **awaiting user feedback; no gameplay or artwork changes agreed or implemented**.

Objective: read a number in words and construct it in the place-value slots. Digits can be tapped in order, dragged to slots or placed using the keyboard. Submit checks the arrangement. Correct submissions reduce the rhino's strength; ten correct submissions finish a run. Scored runs have a 90-second limit and the shared three-heart system. Practice is untimed. Difficulty progresses from two slots to seven slots, including numbers up to one million.

Initial observations to discuss, not automatically fix:

- The question is repeated in the visible question panel.
- Some short-desktop states have prompt/slot or slot/digit-panel overlap warnings. The precise screenshot and geometry audit must be reviewed together before deciding a fix.
- Review the size, spacing, visual hierarchy, disabled Submit styling, difficulty, explanation and rhino feedback with the user.

For this opening pass, the capture harness exercises help/pause, an incorrect and correct answer, a full level-1 completion, failure and retry. Practice and levels 1–5 are captured at both desktop sizes. Full runs at every tier, audible audio review, touch/mobile approval and broader regression remain required before game sign-off.

## Approval and later gates

Record the user's exact approved changes, build, states and date in the inventory/review notes. Do not mark approval from silence, screenshots or passing checks. Keep unresolved issues explicit. Shared changes require rechecking affected approved games.

After games and papers: surrounding player journey → mobile website adaptation → complete regression → explicit web freeze approval → separate copy of that exact revision → detailed iPhone/iPad native plan and testing. Do not duplicate the project before that gate.

## Changes in this implementation

Only added review documentation, a catalogue/capture script and a gallery builder. No gameplay, native files, backend, payments or public interface were changed. Assumptions: the user's current-project baseline and agreed desktop-first review order apply; isolated fixtures are evidence of local gameplay only. No external legacy assumptions were used.

Added files:

- `docs/website-refinement/README.md`
- `docs/website-refinement/baseline.json`
- `docs/website-refinement/review-inventory.json`
- `scripts/capture-website-refinement.mjs`
- `scripts/build-website-refinement-review.mjs`
