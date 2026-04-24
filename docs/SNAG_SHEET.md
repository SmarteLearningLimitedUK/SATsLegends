# SATs Legends Snag Sheet

Use this checklist during design/QA review passes to catch visual, UX, and consistency drift early.

## How To Use
- Review one screen at a time.
- Mark each check as `PASS`, `FAIL`, or `N/A`.
- If a check fails, log:
  - screen
  - issue
  - expected behavior
  - owner
- Prioritize fixes in this order:
  1. Playability and viewport fit
  2. Hierarchy and clarity
  3. Shell consistency
  4. Tone/polish

---

## Naming

### Review Questions
- Is the screen/game name aligned with current SATs Legends naming in repo docs and UI?
- Is the displayed title consistent across map, island levels, intro card, and gameplay?
- Are old/legacy names removed from user-facing text?

### Pass/Fail Checks
- [ ] PASS if one canonical name is used consistently across all entry points.
- [ ] PASS if labels match game intent (no misleading names).
- [ ] PASS if no deprecated names appear in UI copy.

### Common Snags
- Game renamed in one screen but old name remains in intro modal.
- Island label and game card title do not match.
- Debug/internal blueprint names exposed to players.

---

## Island Structure

### Review Questions
- Is the game placed on the correct island/theme?
- Is progression clear (locked, available, complete, boss/goal where applicable)?
- Is the next recommended action obvious?

### Pass/Fail Checks
- [ ] PASS if game placement matches island curriculum/theme intent.
- [ ] PASS if state differences (locked/available/complete) are visually distinct.
- [ ] PASS if user can identify what to do next within 2 seconds.

### Common Snags
- Game appears under wrong island theme.
- Completed and locked states look too similar.
- No clear recommended next level/island emphasis.

---

## Assets

### Review Questions
- Are backgrounds full-wrap and thematically correct for the island?
- Are image assets crisp, correctly cropped, and free of visible checkerboard/placeholder artifacts?
- Are banned style elements avoided (e.g., purple primary buttons/panels)?

### Pass/Fail Checks
- [ ] PASS if all major art assets fit screen intent and are correctly rendered.
- [ ] PASS if no unwanted color-theme violations (purple primary controls/panels).
- [ ] PASS if no missing-image icons, white boxes, or unresolved asset references.

### Common Snags
- Asset has visible background box when transparency expected.
- Wrong background used (theme mismatch by island).
- Old or duplicate asset variants still showing in runtime.

---

## Layout

### Review Questions
- Does everything fit in viewport (no required scrolling during gameplay)?
- Is hierarchy clear and docked in this order: top HUD -> question -> interaction -> answers -> bottom HUD?
- Is there exactly one top HUD and one shared bottom utility dock (except map rules)?
- Are backgrounds contained to the gameplay frame and not extending under the shared bottom HUD?

### Pass/Fail Checks
- [ ] PASS if all gameplay-critical elements are visible simultaneously in portrait.
- [ ] PASS if no duplicate top HUD or pseudo-HUD inside game content.
- [ ] PASS if spacing communicates clear priority (no equal-weight panel stacking).
- [ ] PASS if answer containers are tight, even, and consistently aligned.

### Common Snags
- Submit/confirm button hidden behind bottom dock.
- Puzzle rendered under top HUD.
- Two timer/lives areas present (shell + game duplicate).
- Overlapping cards/labels causing unreadable content.

---

## Controls

### Review Questions
- Are primary and secondary controls visually distinct?
- Are tap targets large and reliable on mobile?
- Are control labels action-oriented and unambiguous?

### Pass/Fail Checks
- [ ] PASS if one primary CTA is clearly dominant.
- [ ] PASS if back/sound/help are present in shared dock and remain secondary.
- [ ] PASS if disabled states are obvious and justified.

### Common Snags
- Multiple competing "primary" buttons.
- Tiny tap targets or cramped controls.
- Ambiguous button text (player unsure what happens next).

---

## Game Clarity

### Review Questions
- Is the puzzle objective understandable in one glance?
- Is the question text readable and constrained to its intended container?
- Is the answer method obvious (tap/select/drag/input)?

### Pass/Fail Checks
- [ ] PASS if players can explain the objective after 3 seconds of viewing.
- [ ] PASS if question text never overflows/clips outside its box.
- [ ] PASS if answer affordances are clear and non-overlapping.

### Common Snags
- Question text spills outside mission strip/banner.
- Puzzle has decorative clutter masking the interaction path.
- Input method changes without clear cue.

---

## Feedback

### Review Questions
- Is selected state immediately obvious?
- Is correct/incorrect feedback clear, quick, and supportive?
- Is celebration intensity scaled correctly (micro vs major moments)?

### Pass/Fail Checks
- [ ] PASS if selected answers feel distinct before submit.
- [ ] PASS if incorrect feedback helps recovery without stalling flow.
- [ ] PASS if transitions to next prompt are fast and consistent.

### Common Snags
- Correct/incorrect feedback visually too subtle.
- Overpowered effects on every action creating noise/fatigue.
- Long interruption after each answer, breaking pacing.

---

## Meta Systems

### Review Questions
- Is shell-owned session state (timer/lives/run state) respected by the game?
- Are mini-games emitting outcomes to shell cleanly (no local duplicate session systems)?
- Are intro/help overlays consistent with current flow?

### Pass/Fail Checks
- [ ] PASS if timer/lives appear only in shared shell HUD.
- [ ] PASS if game over/retry/next-level flow behaves consistently.
- [ ] PASS if intro instructions are concise and styled consistently.

### Common Snags
- Mini-game has its own timer in addition to shell timer.
- Lives decremented inconsistently between games.
- Intro overlays differ wildly in layout/tone or block play unnecessarily.

---

## Drift Watch (Quick Gate)
Run this 20-second drift check before approving:

- [ ] Does this feel like a kids fantasy adventure game, not a revision dashboard?
- [ ] Is the next action obvious?
- [ ] Is there visual breathing room (not cluttered)?
- [ ] Is shell chrome consistent with product rules?
- [ ] Does the screen remain playable on mobile portrait without scrolling?

If any answer is "No", do not approve without follow-up fixes.
