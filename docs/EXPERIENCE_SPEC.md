# SATs Legends Experience Spec

## 1. Purpose
This document is the canonical visual and interaction specification for SATs Legends.

It exists to keep the product in "kids fantasy adventure game" territory and prevent drift into "revision app/dashboard" UX.

Use this spec together with:
- `docs/BUILD_SPEC.md` (island/game scope + hard constraints)
- current shell architecture in `src/app` + shared UI in `src/components` and `src/layout`

If there is conflict:
1. Repository behavior and hard rules in `docs/BUILD_SPEC.md` win.
2. This spec defines how that behavior should look and feel.

---

## 2. Product Feel (Non-Negotiable)

### Emotional target
SATs Legends should feel like:
- A magical adventure world
- Play-first learning
- Rewarding, tactile, and optimistic
- Clear enough for children at speed

SATs Legends should **not** feel like:
- A school worksheet UI
- A productivity dashboard
- A dense edtech control panel
- A muted enterprise app

### Core tone keywords
- Playful
- Heroic
- Warm
- Bright
- Supportive
- Fast-feedback

---

## 3. What Makes SATs Legends Feel Like a Kids Fantasy Game
The following must be present across screens:

1. **Single Hero Focus**
- One clear "main thing" per screen (map decision, puzzle, or answer action).

2. **Readable Magic**
- Rich fantasy color and glow used to guide, not clutter.
- Visual delight must never reduce clarity.

3. **Tactile Interactions**
- Buttons feel pressable.
- Selection states are obvious.
- Correct actions feel rewarding immediately.

4. **Adventure Progression**
- Next step is always obvious.
- Completion and unlock states feel meaningful.

5. **Child-Friendly Clarity**
- Large targets, strong contrast, minimal ambiguity.
- Fast understanding with little reading overhead.

---

## 4. Hard "Avoid" List
Do not introduce these tendencies:
- Dashboard-style multi-panel density with equal visual weight.
- Duplicate HUDs (top or bottom) inside game content.
- Competing primary CTAs on the same screen.
- Tiny text as primary instruction.
- Flat grayscale UI blocks that remove fantasy tone.
- Visual noise layers that reduce question/answer readability.
- Purple primary buttons/panels (per build hard rules).
- Legacy SATs Hero assumptions not present in this repo.

---

## 5. Ownership Rules (Shell vs Mini-Game)

### Shell-owned (single source of truth)
Implemented through app/session contract (`src/app/gameplaySessionContract.ts` and shell wiring):
- Session timer
- Lives
- Navigation utility chrome
- Global session reset/end conditions
- Top HUD and bottom utility dock framing

### Mini-game-owned
- Puzzle state
- Local answer/input state
- Local correctness feedback
- Puzzle completion triggers via contract callbacks/events

### Contract discipline
Mini-games must emit outcomes upward (correct/incorrect/complete/failed) and must not recreate shell-level HUD or utility chrome.

---

## 6. Gameplay Screen Hierarchy (Required)
Every mini-game screen should follow this order:

1. **Shared top HUD** (shell-owned)
2. **Mission/question strip** (single high-priority instruction zone)
3. **Hero playfield card** (main interaction focus)
4. **Answer cluster card** (input/answers)
5. **Primary CTA** (one clear action)
6. **Shared bottom utility dock** (shell-owned secondary controls)

Reference primitive roles in `src/layout/ScreenPrimitives.tsx`:
- `MissionStrip`
- `HeroPlayfieldCard`
- `AnswerClusterCard`
- `PrimaryActionCTA`
- `SecondaryUtilityButton`

Rule: if two adjacent blocks feel equally important, hierarchy is wrong.

---

## 7. Panel Usage Rules

### Allowed panel roles
Use panels only for these semantic roles:
- Mission/question strip
- Playfield container
- Answer/input cluster
- Overlay/modal surface

### Panel anti-patterns
Do not use panels as generic wrappers for every row.
Do not stack many similarly-styled cards with no priority contrast.

### Weight model
- Hero playfield = strongest visual weight
- Mission strip = medium-high
- Answer cluster = medium
- Utility info = light

---

## 8. CTA Rules

### Primary CTA
- One primary CTA at a time.
- Must be visually dominant over secondary controls.
- Label should be action-first and short (`Submit`, `Launch`, `Confirm`).

### Secondary controls
- Back / Sound / Help stay visually subordinate.
- Must remain fully tappable and readable.

### Disabled state
- Clearly disabled until valid input exists.
- Never ambiguous whether the player can proceed.

---

## 9. Answer Feedback Rules (Systemized)
Use consistent answer states across mini-games:

1. **Default**
- Calm, readable, tappable

2. **Hover/press**
- Quick tactile response

3. **Selected**
- Strongly visible selected state (outline/glow/elevation)

4. **Correct**
- Reward pulse + positive color cue + short celebratory motion

5. **Incorrect**
- Brief shake/red cue + supportive recovery
- Keep player momentum; avoid punitive lockouts

6. **Transition**
- Fast progression to next question after feedback
- No long modal interruption for routine right/wrong

---

## 10. Celebration Intensity Ladder
Use controlled intensity based on event significance:

- **Micro (every correct answer)**
  - Button pop, tiny sparkle, subtle glow
- **Medium (streak milestone, level complete)**
  - Wider burst, stronger color pulse, short banner feedback
- **High (boss completion / island milestone)**
  - Full-screen celebratory moment, but still brief and readable

Rule: do not use high-intensity effects for every correct answer.

---

## 11. Color and Saturation Guidance

### Palette behavior
- Use vibrant fantasy blues/cyans as base UI anchors.
- Use warm gold/yellow for rewards and primary action emphasis.
- Use red only for danger/life loss/error states.
- Keep saturation high enough to feel playful, not neon-chaotic.

### Contrast rules
- Question text and answer text must always pass strong readability against backgrounds.
- If background art is busy, darken/soften behind critical text only.

### Forbidden drift
- Avoid monochrome/flat study-app palettes.
- Avoid overusing purple for core controls/panels per build rules.

---

## 12. Surface-Specific Guidance

### World Map (`WorldMap`)
- Preserve full-screen adventure feeling.
- Make next recommended island obvious with subtle emphasis.
- Locked vs available vs complete states must be immediately distinguishable.
- Guidance should be clear but not intrusive (no dashboard overlays).

### Island Level Select (`IslandLevels`)
- Keep grouped mini-game progression.
- Strongly emphasize next playable node.
- Completed/locked/boss states should feel emotionally distinct.
- Should feel like a journey ladder, not a course catalog.

### Gameplay Screens (all mini-games)
- Single puzzle focal point.
- No duplicate top/bottom HUD chrome inside mini-game content.
- Inputs and CTA must stay inside viewport with no scrolling.
- Maintain fast answer-feedback-next cadence.

### Overlays/Modals
- Use only for meaningful interruptions (intro instruction, level result, rewards).
- Keep concise and action-oriented.
- Never block routine answer flow with excessive modal use.

---

## 13. Good vs Bad UI Tendencies (Prose)

### Good tendency
"I can instantly see the question, the puzzle, and what button I should press next."

### Bad tendency
"I see many similar cards and chips, and I am not sure what is interactive vs decorative."

### Good tendency
"When I answer correctly, the game celebrates quickly and moves me forward."

### Bad tendency
"Feedback is either too weak to notice or so heavy it interrupts pace."

### Good tendency
"The map makes me curious and clearly points to my next meaningful destination."

### Bad tendency
"The map feels beautiful but unclear; I can’t tell what to do next."

### Good tendency
"Controls are big, playful, and obvious for touch."

### Bad tendency
"Important controls are tiny or crowded by decorative UI."

---

## 14. Implementation Guardrails for Designers + Engineers
- Prefer shared primitives and shell contracts before adding custom layout wrappers.
- If a new component introduces a second top/bottom chrome, reject it.
- If a screen requires scrolling to complete normal gameplay, redesign layout.
- Keep one primary CTA visible in answer flow.
- Keep question/puzzle/input hierarchy obvious at first glance.

---

## 15. Acceptance Checklist (Use Before Merge)
- [ ] Uses shared shell HUD and shared bottom utility dock (no duplicate chrome)
- [ ] Main puzzle is visually dominant
- [ ] One clear primary CTA
- [ ] Correct/incorrect feedback is obvious and quick
- [ ] No viewport overflow for core gameplay actions
- [ ] Visual tone feels like kids fantasy adventure (not revision dashboard)
- [ ] Colors follow blue/gold fantasy guidance and build hard rules
- [ ] Next action is always clear (map, level select, and in-game)

---

## 16. Scope Note
This spec defines visual/interaction language and hierarchy behavior.
It does not replace content scope, island/game lists, or hard restrictions in `docs/BUILD_SPEC.md`.
