# Environment Tracking & QA Status

Last updated: 2026-04-11 (Europe/London)
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
| Arithmetic Acropolis | Prime Pop | qa-ipad-prime-pop.png | Verified | None observed |
| Arithmetic Acropolis | Rounding Rocket | qa-ipad-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-ipad-maths-vs-zombies.png | Verified | None observed |
| Fraction Forest | Take-Out Rush | qa-ipad-take-out-rush.png | Verified | None observed |
| Fraction Forest | Fraction Forge | qa-ipad-fraction-forge.png | Verified | None observed |
| Fraction Forest | Match-3 Equivalence | qa-ipad-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-ipad-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-ipad-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-ipad-angle-arena.png | Verified | None observed |
| Geometry Glacier | Polygon Palace | qa-ipad-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-ipad-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-ipad-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-ipad-coordinates-quest.png | Verified | None observed |
| Geometry Glacier | Chrono Dash: Time Trial | qa-ipad-chrono-dash-time-trial.png | Verified | None observed |
| Geometry Glacier | Conversion Canyon | qa-ipad-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-ipad-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-ipad-mean-machine.png | Verified | None observed |
| Data Desert | Graph Grabber | qa-ipad-graph-grabber.png | Verified | None observed |
| Data Desert | Line Graph Lab | qa-ipad-line-graph-lab.png | Verified | None observed |
| Data Desert | Data Detective | qa-ipad-data-detective.png | Verified | None observed |
| Operations Outpost | Factor Frenzy | qa-ipad-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-ipad-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-ipad-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-ipad-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-ipad-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-ipad-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-ipad-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-ipad-unit-mixer.png | Verified | None observed |
| Measurement Mountain | Change Counter | qa-ipad-change-counter.png | Verified | None observed |
| Ratio Rapids | Potion Panic | qa-ipad-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-ipad-share-splitter.png | Verified | None observed |
| Ratio Rapids | Ratio Fractions | qa-ipad-ratio-fractions.png | Verified | None observed |
| Ratio Rapids | Scale Builder | qa-ipad-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Tower Of Factors | qa-ipad-tower-of-factors.png | Verified | None observed |
| Cursed Colosseum | Crystal Core | qa-ipad-crystal-core.png | Verified | None observed |
| Cursed Colosseum | Mirror Gate | qa-ipad-mirror-gate.png | Verified | None observed |
| Cursed Colosseum | Scales Of The Sun | qa-ipad-scales-of-the-sun.png | Verified | None observed |
| Cursed Colosseum | Observatory Overload | qa-ipad-observatory-overload.png | Verified | None observed |
| Cursed Colosseum | Matrix Match | qa-ipad-matrix-match.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-ipad-reasoning-quest.png | Verified | None observed |
| Cursed Colosseum | Multi-Step Marathon | qa-ipad-multi-step-marathon.png | Verified | None observed |
| Cursed Colosseum | Strategy Survival | qa-ipad-strategy-survival.png | Verified | None observed |
| Cursed Colosseum | Mixed Mastery | qa-ipad-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-ipad-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-ipad-median-master.png | Verified | None observed |

---

## 3b) iPad Interaction Sweep

Date: 2026-04-11  
Report: D:\\BrainZilla\\SATsLegends\\reports\\interaction-sweep-ipad.md  
Method: Automated tap/click interaction per minigame (playfield + first enabled option).  
Status: Completed — all minigames passed interaction sweep with no console errors.

---

## 4) Smartphone Minigame Verification Log

All screenshots are stored in D:\\BrainZilla\\SATsLegends\\qa\\

Status notes:
- Captured (review pending) = screenshot captured, visual QA review not yet completed

| Island | Minigame | Screenshot | Status | Issues |
|---|---|---|---|---|
| Arithmetic Acropolis | Place Value Panic | qa-phone-place-value-panic.png | Verified | None observed |
| Arithmetic Acropolis | Number Line Ninja | qa-phone-number-line-ninja.png | Verified | None observed |
| Arithmetic Acropolis | Prime Pop | qa-phone-prime-pop.png | Verified | None observed |
| Arithmetic Acropolis | Rounding Rocket | qa-phone-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-phone-maths-vs-zombies.png | Verified | None observed |
| Fraction Forest | Take-Out Rush | qa-phone-take-out-rush.png | Verified | None observed |
| Fraction Forest | Fraction Forge | qa-phone-fraction-forge.png | Verified | None observed |
| Fraction Forest | Match-3 Equivalence | qa-phone-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-phone-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-phone-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-phone-angle-arena.png | Verified | None observed |
| Geometry Glacier | Polygon Palace | qa-phone-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-phone-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-phone-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-phone-coordinates-quest.png | Verified | None observed |
| Geometry Glacier | Chrono Dash: Time Trial | qa-phone-chrono-dash-time-trial.png | Verified | None observed |
| Geometry Glacier | Conversion Canyon | qa-phone-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-phone-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-phone-mean-machine.png | Verified | None observed |
| Data Desert | Graph Grabber | qa-phone-graph-grabber.png | Verified | Chart panel bottom-aligned in container. |
| Data Desert | Line Graph Lab | qa-phone-line-graph-lab.png | Verified | Question card anchored at top. |
| Data Desert | Data Detective | qa-phone-data-detective.png | Verified | Layout shifted upward; suspects row visible beneath chart. |
| Operations Outpost | Factor Frenzy | qa-phone-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-phone-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-phone-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-phone-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-phone-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-phone-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-phone-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-phone-unit-mixer.png | Verified | None observed |
| Measurement Mountain | Change Counter | qa-phone-change-counter.png | Verified | None observed |
| Ratio Rapids | Potion Panic | qa-phone-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-phone-share-splitter.png | Verified | Drag slice aligned with touch (see qa-phone-share-splitter-drag.png). |
| Ratio Rapids | Ratio Fractions | qa-phone-ratio-fractions.png | Verified | None observed |
| Ratio Rapids | Scale Builder | qa-phone-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Tower Of Factors | qa-phone-tower-of-factors.png | Verified | None observed |
| Cursed Colosseum | Crystal Core | qa-phone-crystal-core.png | Verified | None observed |
| Cursed Colosseum | Mirror Gate | qa-phone-mirror-gate.png | Verified | None observed |
| Cursed Colosseum | Scales Of The Sun | qa-phone-scales-of-the-sun.png | Verified | None observed |
| Cursed Colosseum | Observatory Overload | qa-phone-observatory-overload.png | Verified | None observed |
| Cursed Colosseum | Matrix Match | qa-phone-matrix-match.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-phone-reasoning-quest.png | Verified | None observed |
| Cursed Colosseum | Multi-Step Marathon | qa-phone-multi-step-marathon.png | Verified | None observed |
| Cursed Colosseum | Strategy Survival | qa-phone-strategy-survival.png | Verified | None observed |
| Cursed Colosseum | Mixed Mastery | qa-phone-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-phone-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-phone-median-master.png | Verified | None observed |

---

## 4b) Smartphone Interaction Sweep

Date: 2026-04-11  
Report: D:\\BrainZilla\\SATsLegends\\reports\\interaction-sweep-smartphone.md  
Method: Automated tap/click interaction per minigame (playfield + first enabled option).  
Status: Completed — all minigames passed interaction sweep with no console errors.

---

## 5) PC Minigame Verification Log

All screenshots are stored in D:\\BrainZilla\\SATsLegends\\qa\\

| Island | Minigame | Screenshot | Status | Issues |
|---|---|---|---|---|
| Arithmetic Acropolis | Place Value Panic | qa-pc-place-value-panic.png | Verified | None observed |
| Arithmetic Acropolis | Number Line Ninja | qa-pc-number-line-ninja.png | Verified | None observed |
| Arithmetic Acropolis | Prime Pop | qa-pc-prime-pop.png | Verified | None observed |
| Arithmetic Acropolis | Rounding Rocket | qa-pc-rounding-rocket.png | Verified | None observed |
| Arithmetic Acropolis | Maths vs Zombies | qa-pc-maths-vs-zombies.png | Verified | None observed |
| Fraction Forest | Take-Out Rush | qa-pc-take-out-rush.png | Verified | None observed |
| Fraction Forest | Fraction Forge | qa-pc-fraction-forge.png | Verified | None observed |
| Fraction Forest | Match-3 Equivalence | qa-pc-match-3-equivalence.png | Verified | None observed |
| Fraction Forest | Percent Power | qa-pc-percent-power.png | Verified | None observed |
| Fraction Forest | Simplify Sprint | qa-pc-simplify-sprint.png | Verified | None observed |
| Geometry Glacier | Angle Arena | qa-pc-angle-arena.png | Verified | None observed |
| Geometry Glacier | Polygon Palace | qa-pc-polygon-palace.png | Verified | None observed |
| Geometry Glacier | Area Architect | qa-pc-area-architect.png | Verified | None observed |
| Geometry Glacier | Rotation Station | qa-pc-rotation-station.png | Verified | None observed |
| Geometry Glacier | Coordinates Quest | qa-pc-coordinates-quest.png | Verified | None observed |
| Geometry Glacier | Chrono Dash: Time Trial | qa-pc-chrono-dash-time-trial.png | Verified | None observed |
| Geometry Glacier | Conversion Canyon | qa-pc-conversion-canyon.png | Verified | None observed |
| Geometry Glacier | Perimeter Path | qa-pc-perimeter-path.png | Verified | None observed |
| Data Desert | Mean Machine | qa-pc-mean-machine.png | Verified | None observed |
| Data Desert | Graph Grabber | qa-pc-graph-grabber.png | Verified | None observed |
| Data Desert | Line Graph Lab | qa-pc-line-graph-lab.png | Verified | None observed |
| Data Desert | Data Detective | qa-pc-data-detective.png | Verified | None observed |
| Operations Outpost | Factor Frenzy | qa-pc-factor-frenzy.png | Verified | None observed |
| Operations Outpost | Multiplication Mine | qa-pc-multiplication-mine.png | Verified | None observed |
| Operations Outpost | Division Dock | qa-pc-division-dock.png | Verified | None observed |
| Operations Outpost | Order Ops Arena | qa-pc-order-ops-arena.png | Verified | None observed |
| Operations Outpost | Formula Forge | qa-pc-formula-forge.png | Verified | None observed |
| Operations Outpost | Remainder Run | qa-pc-remainder-run.png | Verified | None observed |
| Measurement Mountain | Problem Pyramid | qa-pc-problem-pyramid.png | Verified | None observed |
| Measurement Mountain | Unit Mixer | qa-pc-unit-mixer.png | Verified | None observed |
| Measurement Mountain | Change Counter | qa-pc-change-counter.png | Verified | None observed |
| Ratio Rapids | Potion Panic | qa-pc-potion-panic.png | Verified | None observed |
| Ratio Rapids | Share Splitter | qa-pc-share-splitter.png | Verified | None observed |
| Ratio Rapids | Ratio Fractions | qa-pc-ratio-fractions.png | Verified | None observed |
| Ratio Rapids | Scale Builder | qa-pc-scale-builder.png | Verified | None observed |
| Cursed Colosseum | Reasoning Quest | qa-pc-reasoning-quest.png | Verified | None observed |
| Cursed Colosseum | Multi-Step Marathon | qa-pc-multi-step-marathon.png | Verified | None observed |
| Cursed Colosseum | Strategy Survival | qa-pc-strategy-survival.png | Verified | None observed |
| Cursed Colosseum | Mixed Mastery | qa-pc-mixed-mastery.png | Verified | None observed |
| Cursed Colosseum | Timed Test Trials | qa-pc-timed-test-trials.png | Verified | None observed |
| Cursed Colosseum | Median Master | qa-pc-median-master.png | Verified | None observed |

---

## 5b) PC Interaction Sweep

Date: 2026-04-11  
Report: D:\\BrainZilla\\SATsLegends\\reports\\interaction-sweep-pc.md  
Method: Automated tap/click interaction per minigame (playfield + first enabled option).  
Status: Completed — all minigames passed interaction sweep with no console errors.

Consolidated summary: D:\\BrainZilla\\SATsLegends\\reports\\interaction-sweep-summary.md

---

## 6) Issue Backlog (PC)

### High Priority
- None currently logged.

### Medium Priority
- None currently logged.

### Low Priority / Visual
- None currently logged.

---

## 7) Issue Backlog (Smartphone)

### High Priority
- None currently logged.

### Medium Priority
- None currently logged.

### Recently Resolved (2026-04-13)
- Graph Grabber chart panel bottom-alignment on smartphone.
- Line Graph Lab question card anchored to top of screen.
- Data Detective layout shifted up (chart above suspects, suspects on one row).
- Share Splitter drag slice aligned to touch.

### Low Priority / Visual
- None currently logged.

---

## 8) Issue Backlog (iPad)

### High Priority
- None currently logged.

### Medium Priority
- None currently logged.

### Low Priority / Visual
- None currently logged.

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

All wired minigames have iPad screenshots and have been reviewed.

---

## 11) Remaining Smartphone Verification

All wired minigames have smartphone screenshots and have been reviewed.

---

## 12) Remaining PC Verification

The following minigames are wired but not yet verified on PC:
- Boss Encounters (Tower Of Factors, Crystal Core, Mirror Gate, Scales Of The Sun, Observatory Overload, Matrix Match)
