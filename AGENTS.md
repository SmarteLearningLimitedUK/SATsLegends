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

## Prompt discipline
- Before editing:
  - summarize the task in 3-5 bullets
  - list exact files to inspect
  - list assumptions
  - flag anything that appears to come from outside the prompt/repo
- If ambiguity exists, prefer existing repository structure and naming over invention.

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
