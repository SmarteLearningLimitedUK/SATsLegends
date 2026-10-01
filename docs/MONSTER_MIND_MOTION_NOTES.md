# Number Stones and Monster Mind motion

## Requested scope

Make the attached Place Value Panic Number Stones panel clearer, more purposeful and playful; give the existing Monster Minds a natural moving presence; prevent damage reactions from showing another enemy or a briefly disappearing frame, especially in Number Line Ninja.

## Visual and interaction direction

One readable blue-and-gold stone per place, with its label separated from the digit. Solid surfaces, a small bevel and a brief placement response replace layered socket artwork, orbit rings, blur halos and transparent nested panels. The target row, digit bank and shared HUD footprint stay within the existing screen layout. The row is tighter because the redundant inner glass panel was removed; this is scoped to Place Value Panic. Check feedback uses the digit bank's status line so a floating translucent message cannot obscure the digits. Retry guidance remains until the next digit move, rather than disappearing after the short shake. Digits switch size and colour immediately in reduced-motion mode, including the first frame after placement.

Layout repairs are scoped to Place Value Panic: its shell wrappers keep the logical stage height instead of limiting the already-scaled stage a second time with `100dvh`, its normal character width is capped at 46%, and two-row digit banks use 36%. These repairs retain the existing panel widths and section anchors, while keeping the question, stones, health, character and responses apart on phones, in short windows and on dense boards. Source digit spans stay mounted during pickup, with the button owning pointer input. Removing the original span under a finger caused WebKit to lose capture without delivering a release or cancellation; the stable touch surface retains tapping and dragging through release.

The existing character keeps one image node and one identity during idle, damage and recovery. Gentle breathing and independently paced sway are anchored near the feet. A short recoil conveys a hit, a small weight shift conveys a taunt, and the existing defeat event settles the character. Easing applies between poses on a linear timeline, so the hit reaches its intended peak at 88 ms rather than compressing that movement into the first few milliseconds. Idle motion pauses during a reaction and resumes from its previous phase. Reduced motion disables body motion while leaving state feedback visible.

Number Line Ninja now measures the actual question card and converts its rendered bounds into stage coordinates. Its track reserves enough height for the axis, ticks and labels, so they cannot intersect its own heading. The existing row width and response footprint remain; bottom padding is reduced from 5.2 rem to 3 rem because the shared shell already reserves the utility dock. These changes are scoped to this screen and keep the line and character below the mission, above the responses. The next question waits for both the minimum feedback time and that answer's actual flight completion: a delayed animation frame cannot replace the target before the number arrives. A keyed pending callback is cleared on reset, end and unmount; reduced-motion and no-flight paths retain the existing 760 ms feedback time.

In the existing encounters, answer choices are limited before shuffling. Shuffling a larger choice pool before truncation could discard the correct answer and create an unsolvable question. The correction preserves four unique choices and random answer positions without changing the question pools or scoring.

Place Value Panic passes the final score, correct count and attempt count explicitly into its delayed victory path, so the final correct answer is included. Both Place Value Panic and Number Line Ninja invoke the latest victory callback after their feedback delay, allowing the shared result to include final session accuracy. The existing point and reward formulas are retained.

## Changes

- `src/games/PlaceValuePanicGame.tsx` and `src/games/place-value-panic.css`: clear Number Stones/place labels, text-only slots, solid digit bank and drag preview, stable touch pickup, single actor, readable health semantics, guarded submission and round-timer cleanup.
- `src/games/NumberLineNinjaGame.tsx`: stable original enemy identity, single actor, reaction lifecycle separate from question advance, stage-local flying-number coordinates, question advance after landing, measured question clearance and readable track geometry.
- `src/components/game-ui/MonsterMindActor.tsx`, `src/components/game-ui/monster-mind-actor.css` and `src/utils/staticEnemyFrame.ts`: reusable animated actor and cached preparation of the existing sprite frame. Source-tagged async preparation prevents a late frame from replacing a new identity; the raw animation is never used as a startup/error fallback.
- `src/games/FactorFrenzyGame.tsx` and `src/games/OrderOpsArenaGame.tsx`: apply the same character presence and reaction approach to their current Monster Minds.
- `src/games/BossEncounterGame.tsx` and `src/components/BossPortrait.tsx`: repair repeated keyed/faded pose images in the existing encounter and portrait, and keep the correct answer among the displayed choices. No new encounter or boss system is added.
- `scripts/verify-legend-monster-motion.mjs`: targeted visible-interface, interaction, identity, motion and device checks.
- This note records scope, assumptions and results.

At the time of this original motion pass, the audit found no same-enemy image swap in Multiplication Mine's rock states, Take-Out Rush's new customers, separate zombie lifecycles or Angle Arena's changing canvas targets; those systems were outside that pass. The later explicitly requested enemy/Mine/framing refinement is recorded in `docs/GAMEPLAY_REFINEMENT_NOTES.md`. Unused viewport/result enemy components remain outside the scope.

## Assumptions and constraints

- Use the current attached panel, repository character artwork and current gameplay rules. No new raster art is required for the stone controls.
- Preserve the React/TypeScript/Vite stack, current question pools, scoring formulas, shared gameplay shell and existing encounters.
- Keep top HUD → mission/question → playfield → answers/responses → bottom HUD. Background art stops above the dock; labels and character reactions must not cover reading or input controls.
- Verify PC Chromium, iPad WebKit A2HS and smartphone WebKit A2HS simulations, including reduced motion. Physical installed-device behaviour is not inferred from simulation.
- No external legacy assumptions are used. Existing unrelated changes and `ios/` work are preserved.

## Verification

The original motion pass completed 88/88 passing rows in `qa-artifacts/legend-monster-motion/report.json`, with screenshots alongside it. These historical checks cover the original route set, actual digit tap/drag/cancel/wrong-check/correct progression, repeated Number Line Ninja hits and completion, one persistent enemy image/source, actor idle/reaction/reduced motion, affected encounter screens and the mandatory HUD/device-fit boundaries.

The later coherent enemy art, four-stage ore, five-tier route set, readable label floors and Ninja pending-exit repair have separate current verification under `qa-artifacts/gameplay-refinements/monster-current`. Final current results, exact changed files, art prompts and device-fit evidence are consolidated in `docs/GAMEPLAY_REFINEMENT_NOTES.md`; the original88 rows are not presented as tests of those later edits.
