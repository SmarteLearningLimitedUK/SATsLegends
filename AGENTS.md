# AGENTS.md - SATs Legends

## Source of truth
- This repository is SATs Legends only.
- Work only from:
  1. the current prompt
  2. current repository files
  3. explicitly opened or selected files
- Do not reference, infer from, or reuse prior projects, prior repositories, prior chats, or legacy SATs Hero/SATs Legends assumptions unless they already exist in this repository.

## Technical constraints
- Use the existing React + TypeScript + Vite stack.
- Keep changes modular and scoped to the requested feature.
- Reuse shared gameplay/container architecture when possible.
- Do not add final art, final polish, backend, analytics, or unrelated systems unless explicitly requested.

## Layout and device rules
- Treat the visual hierarchy in `docs/EXPERIENCE_SPEC.md` as mandatory for every gameplay screen.
- Required gameplay order is:
  1. shared top HUD
  2. question / mission strip
  3. interaction / playfield
  4. answers / response cluster
  5. shared bottom HUD
- Background art should fill through the gameplay area and meet the top edge of the shared bottom HUD, but must not extend under or past the bottom HUD.
- Answer containers should be tight, evenly spaced, and visually matched unless a screen is explicitly documented as a custom exception.
- Do not introduce layout changes that widen, loosen, or re-stack sections without a prompt-specific reason that is called out in the task notes.
- When a task touches gameplay layout, verify the result against all three target environments: PC, iPad A2HS, and smartphone A2HS.
- If a screen or minigame needs a custom layout, the exception must be explicit and scoped to that screen only.

## Prompt discipline
- Before editing:
  - summarize the task in 3-5 bullets
  - list exact files to inspect
  - list assumptions
  - flag anything that appears to come from outside the prompt/repo
- If ambiguity exists, prefer existing repository structure and naming over invention.
- If a task affects multiple islands or minigames, plan a full pass across the affected set instead of making isolated layout edits.

## Do-not rules
- Do not invent legacy systems or hidden dependencies.
- Do not add pizza-themed references.
- Do not add boss systems unless explicitly requested.
- Do not perform unrelated refactors.

## Done definition
- App remains buildable.
- Changes are limited to requested scope.
- Changed files are listed.
- Assumptions are listed.
- Explicit confirmation is provided that no external legacy assumptions were used.
- For layout or HUD work, confirm the required hierarchy and device-fit checks were applied.
