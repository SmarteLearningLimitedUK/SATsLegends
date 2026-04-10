# Environment Tracking & QA Status

Last updated: 2026-04-10 (Europe/London)
Build under review: https://satslegendsfinal.vercel.app/
Primary iPad viewport: 768x1024 (A2HS)
Primary smartphone viewport: 390x844 (A2HS)
Screenshot archive: D:\\BrainZilla\\SATsLegends\\qa\\

---

## 1) Feature Inventory

### Global UI
- Fixed game-stage shell (390x844) with uniform scaling
- Splash screen and start flow
- Profile setup (name entry)
- Avatar selection
- Unified top HUD (timer, lives, avatar)
- Unified bottom HUD / action dock
- Game load boundary + "mini-game incoming" transitions
- Daily Rewards modal
- Daily Quests modal
- Game Rules / How-To-Play modal
- Wellbeing hub, activities, completion modal
- Audio mute + help triggers

### Reporting Section
- Parent Dashboard
- Achievement Tracker
- Player stats in profile/reporting views

### Game Selection UI
- World Map screen
- Island Levels screen
- Level cards (Start/Play/Replay/Boss)
- Boss gating (coins requirement)

### Minigames
- Place Value Panic
- Number Line Ninja
- Prime Pop
- Rounding Rocket
- Factor Frenzy
- Median Master (Chart Challenge)
- Mean Machine
- Mode Miner
- Maths vs Zombies
- Take-Out Rush
- Fraction Forge
- Match-3 Equivalence
- Percent Power
- Simplify Sprint
- Angle Arena
- Polygon Palace
- Area Architect
- Rotation Station
- Coordinates Quest
- Chrono Dash: Time Trial
- Conversion Canyon
- Perimeter Path
- Graph Grabber
- Line Graph Lab
- Data Detective
- Multiplication Mine
- Division Dock
- Order Ops Arena
- Formula Forge
- Remainder Run
- Problem Pyramid
- Unit Mixer
- Change Counter
- Reasoning Quest
- Multi-Step Marathon
- Strategy Survival
- Mixed Mastery
- Timed Test Trials
- Potion Panic (Potion Pour)
- Share Splitter
- Ratio Fractions
- Scale Builder
- Boss Encounters: Tower of Factors, Crystal Core, Mirror Gate, Scales of the Sun, Observatory Overload, Matrix Match

---

## 2) Environment Coverage Matrix

Status legend:
- Implemented: present in code, not verified visually
- Verified: captured screenshot and reviewed on target environment
- Needs Work: verified and issues found
- Not Implemented: feature not present in repo

### Global UI Components

| Component | PC Browser | iPad A2HS | Smartphone A2HS | Notes |
|---|---|---|---|---|
| Fixed stage scaling (390x844) | Implemented | Implemented | Implemented | Uniform scale via CSS var |
| Splash screen | Implemented | Implemented | Implemented | |
| Profile setup | Implemented | Implemented | Implemented | |
| Avatar selection | Implemented | Implemented | Implemented | |
| Unified top HUD | Implemented | Implemented | Implemented | |
| Unified bottom HUD | Implemented | Implemented | Implemented | |
| Daily Rewards modal | Implemented | Implemented | Implemented | |
| Daily Quests modal | Implemented | Implemented | Implemented | |
| Game Rules / How-To-Play | Implemented | Implemented | Implemented | |
| Wellbeing hub / activity / completion | Implemented | Implemented | Implemented | |
| PWA manifest (A2HS) | Not Implemented | Not Implemented | Not Implemented | No manifest found in repo |

### Reporting Section

| Component | PC Browser | iPad A2HS | Smartphone A2HS | Notes |
|---|---|---|---|---|
| Parent Dashboard | Implemented | Implemented | Implemented | |
| Achievement Tracker | Implemented | Implemented | Implemented | |

### Game Selection UI

| Component | PC Browser | iPad A2HS | Smartphone A2HS | Notes |
|---|---|---|---|---|
| World Map | Implemented | Verified | Implemented | iPad screenshot exists |
| Island Levels | Implemented | Verified | Implemented | iPad screenshot exists |
| Level cards / Start-Play-Replay | Implemented | Implemented | Implemented | |
| Boss gating (coins) | Implemented | Implemented | Implemented | |

---

## 3) iPad Minigame Verification Log

All screenshots are stored in D:\\BrainZilla\\SATsLegends\\qa\\

| Island | Minigame | Screenshot | Status | Issues |
|---|---|---|---|---|
| Arithmetic Acropolis | Place Value Panic | qa-ipad-place-value-panic.png | Verified | None observed |
| Arithmetic Acropolis | Number Line Ninja | qa-ipad-number-line-ninja.png | Verified | None observed |
| Arithmetic Acropolis | Prime Pop | qa-ipad-prime-pop.png | Needs Work | IPAD-001 |
| Arithmetic Acropolis | Rounding Rocket | qa-ipad-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-ipad-maths-vs-zombies.png | Needs Work | IPAD-002 |
| Fraction Forest | Take-Out Rush | qa-ipad-take-out-rush.png | Needs Work | IPAD-003 |
| Fraction Forest | Fraction Forge | qa-ipad-fraction-forge.png | Needs Work | IPAD-004 |
| Fraction Forest | Match-3 Equivalence | qa-ipad-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-ipad-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-ipad-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-ipad-angle-arena.png | Verified | None observed |
| Geometry Glacier | Polygon Palace | qa-ipad-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-ipad-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-ipad-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-ipad-coordinates-quest.png | Needs Work | IPAD-005 |
| Geometry Glacier | Chrono Dash: Time Trial | qa-ipad-chrono-dash-time-trial.png | Needs Work | IPAD-006 |
| Geometry Glacier | Conversion Canyon | qa-ipad-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-ipad-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-ipad-mean-machine.png | Needs Work | IPAD-007 |
| Data Desert | Graph Grabber | qa-ipad-graph-grabber.png | Needs Work | IPAD-008 |
| Data Desert | Line Graph Lab | qa-ipad-line-graph-lab.png | Needs Work | IPAD-009 |
| Data Desert | Data Detective | qa-ipad-data-detective.png | Needs Work | IPAD-010 |
| Operations Outpost | Factor Frenzy | qa-ipad-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-ipad-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-ipad-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-ipad-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-ipad-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-ipad-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-ipad-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-ipad-unit-mixer.png | Needs Work | IPAD-011 |
| Measurement Mountain | Change Counter | qa-ipad-change-counter.png | Needs Work | IPAD-012 |
| Ratio Rapids | Potion Panic | qa-ipad-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-ipad-share-splitter.png | Verified | None observed |
| Ratio Rapids | Ratio Fractions | qa-ipad-ratio-fractions.png | Needs Work | IPAD-013 |
| Ratio Rapids | Scale Builder | qa-ipad-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-ipad-reasoning-quest.png | Needs Work | IPAD-014 |
| Cursed Colosseum | Multi-Step Marathon | qa-ipad-multi-step-marathon.png | Needs Work | IPAD-015 |
| Cursed Colosseum | Strategy Survival | qa-ipad-strategy-survival.png | Needs Work | IPAD-016 |
| Cursed Colosseum | Mixed Mastery | qa-ipad-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-ipad-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-ipad-median-master.png | Verified | None observed |

---

## 4) Smartphone Minigame Verification Log

All screenshots are stored in D:\\BrainZilla\\SATsLegends\\qa\\

Status notes:
- Captured (review pending) = screenshot captured, visual QA review not yet completed

| Island | Minigame | Screenshot | Status | Issues |
|---|---|---|---|---|
| Arithmetic Acropolis | Place Value Panic | qa-phone-place-value-panic.png | Needs Work | PHONE-001 |
| Arithmetic Acropolis | Number Line Ninja | qa-phone-number-line-ninja.png | Verified | None observed |
| Arithmetic Acropolis | Prime Pop | qa-phone-prime-pop.png | Needs Work | PHONE-002 |
| Arithmetic Acropolis | Rounding Rocket | qa-phone-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-phone-maths-vs-zombies.png | Needs Work | PHONE-003 |
| Fraction Forest | Take-Out Rush | qa-phone-take-out-rush.png | Needs Work | PHONE-004 |
| Fraction Forest | Fraction Forge | qa-phone-fraction-forge.png | Needs Work | PHONE-005 |
| Fraction Forest | Match-3 Equivalence | qa-phone-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-phone-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-phone-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-phone-angle-arena.png | Needs Work | PHONE-006 |
| Geometry Glacier | Polygon Palace | qa-phone-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-phone-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-phone-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-phone-coordinates-quest.png | Needs Work | PHONE-007 |
| Geometry Glacier | Chrono Dash: Time Trial | qa-phone-chrono-dash-time-trial.png | Needs Work | PHONE-008 |
| Geometry Glacier | Conversion Canyon | qa-phone-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-phone-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-phone-mean-machine.png | Needs Work | PHONE-009 |
| Data Desert | Graph Grabber | qa-phone-graph-grabber.png | Verified | None observed |
| Data Desert | Line Graph Lab | qa-phone-line-graph-lab.png | Needs Work | PHONE-010 |
| Data Desert | Data Detective | qa-phone-data-detective.png | Needs Work | PHONE-011 |
| Operations Outpost | Factor Frenzy | qa-phone-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-phone-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-phone-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-phone-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-phone-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-phone-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-phone-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-phone-unit-mixer.png | Needs Work | PHONE-012 |
| Measurement Mountain | Change Counter | qa-phone-change-counter.png | Needs Work | PHONE-013 |
| Ratio Rapids | Potion Panic | qa-phone-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-phone-share-splitter.png | Verified | None observed |
| Ratio Rapids | Ratio Fractions | qa-phone-ratio-fractions.png | Needs Work | PHONE-017 |
| Ratio Rapids | Scale Builder | qa-phone-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-phone-reasoning-quest.png | Needs Work | PHONE-014 |
| Cursed Colosseum | Multi-Step Marathon | qa-phone-multi-step-marathon.png | Needs Work | PHONE-015 |
| Cursed Colosseum | Strategy Survival | qa-phone-strategy-survival.png | Needs Work | PHONE-016 |
| Cursed Colosseum | Mixed Mastery | qa-phone-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-phone-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-phone-median-master.png | Verified | None observed |

---

## 5) PC Minigame Verification Log

All screenshots are stored in D:\\BrainZilla\\SATsLegends\\qa\\

| Island | Minigame | Screenshot | Status | Issues |
|---|---|---|---|---|
| Arithmetic Acropolis | Place Value Panic | qa-pc-place-value-panic.png | Verified | None observed |
| Arithmetic Acropolis | Number Line Ninja | qa-pc-number-line-ninja.png | Verified | None observed |
| Arithmetic Acropolis | Prime Pop | qa-pc-prime-pop.png | Needs Work | PC-001 |
| Arithmetic Acropolis | Rounding Rocket | qa-pc-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-pc-maths-vs-zombies.png | Needs Work | PC-002 |
| Fraction Forest | Take-Out Rush | qa-pc-take-out-rush.png | Needs Work | PC-003 |
| Fraction Forest | Fraction Forge | qa-pc-fraction-forge.png | Needs Work | PC-004 |
| Fraction Forest | Match-3 Equivalence | qa-pc-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-pc-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-pc-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-pc-angle-arena.png | Needs Work | PC-005 |
| Geometry Glacier | Polygon Palace | qa-pc-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-pc-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-pc-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-pc-coordinates-quest.png | Needs Work | PC-006 |
| Geometry Glacier | Chrono Dash: Time Trial | qa-pc-chrono-dash-time-trial.png | Needs Work | PC-007 |
| Geometry Glacier | Conversion Canyon | qa-pc-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-pc-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-pc-mean-machine.png | Needs Work | PC-008 |
| Data Desert | Graph Grabber | qa-pc-graph-grabber.png | Needs Work | PC-009 |
| Data Desert | Line Graph Lab | qa-pc-line-graph-lab.png | Needs Work | PC-010 |
| Data Desert | Data Detective | qa-pc-data-detective.png | Needs Work | PC-011 |
| Operations Outpost | Factor Frenzy | qa-pc-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-pc-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-pc-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-pc-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-pc-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-pc-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-pc-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-pc-unit-mixer.png | Needs Work | PC-012 |
| Measurement Mountain | Change Counter | qa-pc-change-counter.png | Needs Work | PC-013 |
| Ratio Rapids | Potion Panic | qa-pc-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-pc-share-splitter.png | Verified | None observed |
| Ratio Rapids | Ratio Fractions | qa-pc-ratio-fractions.png | Needs Work | PC-014 |
| Ratio Rapids | Scale Builder | qa-pc-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-pc-reasoning-quest.png | Needs Work | PC-016 |
| Cursed Colosseum | Multi-Step Marathon | qa-pc-multi-step-marathon.png | Needs Work | PC-017 |
| Cursed Colosseum | Strategy Survival | qa-pc-strategy-survival.png | Needs Work | PC-015 |
| Cursed Colosseum | Mixed Mastery | qa-pc-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-pc-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-pc-median-master.png | Verified | None observed |

---

## 6) Issue Backlog (PC)

### High Priority
- PC-002 (Maths vs Zombies): Playfield empty, no zombies visible.
- PC-014 (Ratio Fractions): Gameplay elements missing (karts/scene not visible).
- PC-010 (Line Graph Lab): Graph area empty (no line rendering).
- PC-017 (Multi-Step Marathon): Content clipped; answers not fully visible.
- PC-008 (Mean Machine): Timer bar missing; screen shows MODE prompt (verify correct game content).
- PC-011 (Data Detective): Suspect lineup area empty.

### Medium Priority
- PC-003 (Take-Out Rush): Blue order board still present; order not on backboard.
- PC-004 (Fraction Forge): Question card not using top-question standard.
- PC-005 (Angle Arena): Black bars/letterboxing within playfield.
- PC-007 (Chrono Dash): "Reset Clock" text overlaps behind submit.
- PC-009 (Graph Grabber): Chart labels overlap/garble.
- PC-015 (Strategy Survival): Bottom category labels clipped/overlap with restart button.
- PC-006 (Coordinates Quest): Top panel appears empty (verify intended).
- PC-001 (Prime Pop): Prompt/target missing; balls appear low near HUD.

### Low Priority / Visual
- PC-012 (Unit Mixer): Question text low contrast.
- PC-013 (Change Counter): Question text low contrast.
- PC-016 (Reasoning Quest): Question text low contrast.

---

## 7) Issue Backlog (Smartphone)

### High Priority
- PHONE-003 (Maths vs Zombies): Playfield empty, no zombies visible.
- PHONE-017 (Ratio Fractions): Gameplay elements missing (karts/scene not visible).
- PHONE-010 (Line Graph Lab): Graph area empty (no line rendering).
- PHONE-015 (Multi-Step Marathon): Content clipped; answers not fully visible.
- PHONE-009 (Mean Machine): Timer bar missing; screen shows MODE prompt (verify correct game content).
- PHONE-011 (Data Detective): Suspect lineup area empty.

### Medium Priority
- PHONE-004 (Take-Out Rush): Blue order board still present; order not on backboard.
- PHONE-005 (Fraction Forge): Question card not using top-question standard.
- PHONE-006 (Angle Arena): Black bars/letterboxing within playfield.
- PHONE-008 (Chrono Dash): "Reset Clock" text overlaps behind submit.
- PHONE-016 (Strategy Survival): Bottom category labels clipped/overlap with restart button.
- PHONE-002 (Prime Pop): Prompt/target missing; balls appear low near HUD.
- PHONE-007 (Coordinates Quest): Top panel appears empty (verify intended).

### Low Priority / Visual
- PHONE-001 (Place Value Panic): Question bar not using top-question standard.
- PHONE-012 (Unit Mixer): Question text low contrast.
- PHONE-013 (Change Counter): Question text low contrast.
- PHONE-014 (Reasoning Quest): Question text low contrast.

---

## 8) Issue Backlog (iPad)

### High Priority
- IPAD-002 (Maths vs Zombies): Playfield empty, no zombies visible.
- IPAD-013 (Ratio Fractions): Gameplay elements missing (karts/scene not visible).
- IPAD-009 (Line Graph Lab): Graph area empty (no line rendering).
- IPAD-015 (Multi-Step Marathon): Content clipped; answers not visible.

### Medium Priority
- IPAD-008 (Graph Grabber): Chart labels overlap/garble.
- IPAD-003 (Take-Out Rush): Blue order board still present; order not on backboard.
- IPAD-004 (Fraction Forge): Question card not using top-question standard.
- IPAD-016 (Strategy Survival): Bottom labels clipped/overlap with HUD.
- IPAD-006 (Chrono Dash): "Reset Clock" text overlaps behind submit.

### Low Priority / Visual
- IPAD-011 (Unit Mixer): Question text low contrast.
- IPAD-012 (Change Counter): Question text low contrast.
- IPAD-014 (Reasoning Quest): Question text low contrast.
- IPAD-001 (Prime Pop): Prompt/target missing; balls appear too low near HUD.
- IPAD-005 (Coordinates Quest): Top panel appears empty (verify intended).
- IPAD-007 (Mean Machine): Timer bar missing (verify intended).

---

## 9) Plan to Address Global Feedback Points

1. Environment baselines
   - Define fixed viewport targets: PC 1440x900, iPad 768x1024 (A2HS), Smartphone 390x844 (A2HS).
   - Confirm scaling bounds and safe-area strategy for each.

2. Global UI parity
   - Audit top HUD, bottom HUD, overlays, and modals per environment.
   - Ensure no overlap or off-screen elements.

3. Input parity
   - Verify touch + mouse + keyboard where relevant.
   - Confirm drag, tap, and hover behavior across targets.

4. Minigame layout normalization
   - Apply "top question standard" where required.
   - Fix iPad issues in order of priority (see Issue Backlog).

5. PWA readiness
   - Add web manifest, icons, and A2HS checks for iPad and smartphone.

6. QA validation pass
   - Re-run iPad capture on all minigames.
   - Run smartphone and desktop verification passes.

---

## 10) Remaining iPad Verification

The following minigames exist but have not yet been verified on iPad:
- Mode Miner
- Boss Encounters (Tower of Factors, Crystal Core, Mirror Gate, Scales of the Sun, Observatory Overload, Matrix Match)

---

## 11) Remaining Smartphone Verification

The following minigames exist but have not yet been verified on smartphone:
- Mode Miner
- Boss Encounters (Tower of Factors, Crystal Core, Mirror Gate, Scales of the Sun, Observatory Overload, Matrix Match)

---

## 12) Remaining PC Verification

The following minigames exist but have not yet been verified on PC:
- Mode Miner
- Boss Encounters (Tower of Factors, Crystal Core, Mirror Gate, Scales of the Sun, Observatory Overload, Matrix Match)
