# SATs Legends: production UI and art rebuild

Act as a senior iOS game art director, game UI designer and game developer. Implement the changes below in the existing SATsLegends project.

Use the current fantasy world, characters, teal/gold identity and established atmosphere. Recompose screens and recreate graphical assets where necessary. Do not assemble incompatible images or solve overcrowding by shrinking everything.

## 1. Protect the educational content

Preserve all existing:

- Questions, explanations, numbers, answer options, fractions and units.
- Mathematical diagram relationships, graph data and calculation steps.
- Gameplay rules, scoring, lives, timers, difficulty and progression.
- Learner data and saved progress.

Separate educational data from presentation changes. If an educational value appears inconsistent, report it and preserve it pending clarification.

## 2. Rebuild the shared screen structure

Use three distinct regions on each gameplay screen:

1. **Top:** compact HUD and full question.
2. **Middle:** the primary playable object, board, diagram or scene.
3. **Bottom:** answer controls and primary action.

Give each region reserved space. Background artwork may extend behind them; interactive elements must not overlap them.

Implement these shared changes:

- Replace the persistent five-button Back/Help/Board/Sound/Music toolbar with compact pause/menu access and contextual Help/working-board controls. Keep every existing function accessible. Move sound and music controls into pause/settings.
- Use opaque or nearly opaque reading surfaces behind questions, graphs, diagrams and calculations.
- Reduce background contrast and detail specifically behind working areas. Preserve rich scenery around the edges.
- Use a readable text face for instructions and mathematical notation. Keep decorative typography for short headings.
- Use tabular numerals in calculations, totals, timers and aligned numeric columns.
- Start with 18–22pt questions, 16–18pt supporting text and 24pt or larger main mathematical values. Adjust composition before reducing these sizes.
- Use interactive targets of at least 44×44pt; aim for 48–56pt primary controls.
- Give selected controls a persistent outline/check/shape change. Colour alone is insufficient.
- Keep disabled controls readable and clearly unavailable.
- Respect native safe areas, sensor housing, rounded corners and the home indicator.
- Fit ordinary gameplay without scrolling. Preserve complete educational content. Allow appropriate accommodation for keyboard and accessibility states.

These are layout requirements, not permission to remove controls or shorten questions.

## 3. Fix these blockers first

### World map

The suggested-game panel and Brainpower token count obscure the top island.

Implement:

- A reserved compact top HUD band, with Brainpower balance in one corner.
- A compact suggested-game dock above bottom navigation.
- A collapsible recommendation panel that does not cover destinations.
- Map camera padding based on the actual unobstructed viewport between those regions.
- Enough camera bounds to reveal both the highest and lowest islands.

The top island, its label, route marker and touch region must be unobstructed. Do not merely move the map down and clip the lowest island. Do not rely on transparent overlays.

Test long suggestion names, large token balances, restored camera positions and the smallest supported phone.

### Match Mastery

The tablet board extends beyond the right edge.

- Keep all six columns and all rows fully visible.
- Calculate board dimensions from available viewport space.
- Include board padding and borders in the size calculation.
- Reserve HUD and control space before sizing tiles.
- Remove the oversized character allocation from the board’s working area.
- Resolve the competing timer displays using the existing timing rules.

### Place Value Panic

The compact layout wraps place-value columns into separate rows.

- Keep all seven columns in one continuous horizontal row.
- Align every label with its digit socket.
- Never wrap numerical place-value structure.
- Recover space by reducing decoration, gaps and utility chrome.
- Preserve the digit tray and complete question.

### Player summary

The “Your next practice” section is cut off.

- Reduce the height of the identity card.
- Compact the statistics into an aligned grid.
- Place the complete next-practice action above reserved navigation.
- Move secondary destinations into separate navigation/detail views as needed.
- Preserve the displayed statistics and underlying data.

## 4. Rebuild each entry screen

### Welcome — portrait

- Keep the logo, character face and Continue button as the three focal points.
- Quiet the scenery behind the Continue panel.
- Keep the button inset from screen edges and clear of the home indicator.
- Refine the character’s contact shadow so it sits convincingly on the platform.
- Test long learner names without shrinking the button text.

### Learner selection — portrait

- Reduce logo/scenery height.
- Make learner cards the primary content.
- Use consistent avatar crops and clear pressed/selected states.
- Keep parent settings and sign-out readable and accessible.
- Test multiple learners and long names.

### Sign-in — portrait

- Keep full field labels visible.
- Increase secondary-link touch areas.
- Support appropriate email/password keyboards and autofill.
- Keep the focused field and Log in action accessible when the keyboard opens.
- Use intentional scrolling when necessary; do not compress the form into unreadable controls.

### Settings — portrait

- Use clearly labelled sound/music switches with explicit state.
- Remove duplicate sound/music controls from the bottom of this screen.
- Keep one clear Back/Return navigation hierarchy.
- Reduce unused scenic space and align card margins.

## 5. Apply these screen-specific game changes

The orientations below are the intended phone layouts. Build a deliberate iPad layout rather than stretching the phone screen. For orientation changes, preserve in-progress state and avoid unnecessary rotation between short rounds.

| Screen | Orientation | Required implementation |
|---|---|---|
| **Place Value Panic** | Portrait | Put the question above one aligned seven-column place-value board. Simplify gem borders. Move the digit tray directly beneath the board and keep Submit below it. |
| **Number Line Ninja** | Landscape | Replace the visually buried wooden line with a broad, quiet board. Enlarge ticks, labels and target marker. Put four equal answer controls below. Reduce the character’s space allocation. |
| **Prime Pop** | Portrait | Create a low-detail central bubble lane. Make numbers crisp against solid bubble centres. Keep the danger threshold distinct. Prevent characters and foreground decoration from entering the playable lane. |
| **Rounding Rocket** | Portrait | Recreate the realistic shuttle in the game’s fantasy art style. Integrate parts progress into the launch platform. Enlarge three answer controls and shorten decorative gaps. |
| **Maths vs Zombies** | Landscape | Give combat a clearly bounded lane with readable actor silhouettes and selected-target feedback. Keep a stable answer dock beneath it. Use one authoritative timer presentation. |
| **Take-Out Rush** | Portrait | Divide the screen into customer/ticket, preparation scene and tray controls. Recreate food icons consistently. Enlarge fraction labels and make selected portions obvious. Group queue/ticket status into one readable region. |
| **Fraction Forge** | Landscape | Connect target, operand slots, anvil and Strike visually. Place operands on the anvil workspace and the fraction palette alongside it. Keep target text prominent and selected fractions unmistakable. |
| **Match Mastery** | Portrait preferred | Centre the complete board and use most of the width for tiles. Put task/HUD above it. Reduce character art to a small guide. Validate full six-column fit at 320px width before approving this orientation. |
| **Percent Power** | Portrait | Stack question, crystal/reference display and a large 2×2 answer grid. Integrate charge state into the device. Remove the detached small side-panel composition. |
| **Simplify Sprint** | Landscape | Combine question, fraction and checkpoint into one compact upper region. Centre the fraction above three equal portals. Enlarge divisor labels and remove foliage behind them. |
| **Angle Arena** | Portrait | Make the angle diagram the dominant object on a large opaque board. Preserve exact geometry. Keep vertex, rays, arc and labels clear. Put answers in a 2×2 grid below. |
| **Polygon Palace** | Portrait | Put the polygon on a neutral diagram board. Present six readable property options with persistent selection marks. Keep full wording and a separate Submit button. |
| **Area Architect** | Portrait | Present the countable grid orthographically so cells have equal visible size. Separate it from perspective scenery. Keep unit explanation adjacent and use a 2×2 answer grid. |
| **Transformation Station** | Landscape | Allocate most space to a large square grid. Put corner controls in a compact inspector. Enlarge vertex labels and current-corner state. Clearly distinguish original and placed shapes. |
| **Coordinates Quest** | Portrait | Use a large square graph, followed immediately by the coordinate readout, directional controls and Choose point. Keep this order consistent across device sizes. |
| **Conversion Canyon** | Portrait | Centre the scale with readable target, total and tray contents. Put weight choices in a large bank below. Keep Reset secondary and Submit primary. |
| **Perimeter Path** | Landscape | Put the irregular polygon on a large quiet board. Position measurements consistently beside their edges. Highlight the current checked edge on the diagram and in the progress display. Prevent label collisions. |
| **Mean Machine** | Portrait | Keep the current portrait direction. Shorten the question card. Make Scan the obvious first action. Display six readings clearly. Make unused device slots visibly decorative. Keep the answer bank readable. |
| **Graph Grabber** | Landscape | Increase plot area by simplifying its frame. Enlarge axis labels and category names. Keep values unchanged. Ensure tooltips stay within bounds and do not obscure neighbouring data. |
| **Line Graph Lab** | Landscape | Prioritize the plot with readable axes, units and markers. Use a fixed-width 2×2 answer panel. Combine recovery/progress information into one small region. |
| **Data Detective** | Landscape | Enlarge the donut and its legend. Keep category names paired with values. Add non-colour category cues. Give suspect cards consistent portraits, names and selected states. |
| **Factor Frenzy** | Portrait | Replace the oversized mostly empty panel with a centred rune grid. Put unchanged targets above, compact sentinel feedback nearby and the action below selections. |
| **Multiplication Mine** | Landscape | Use a wide arithmetic board with exact column alignment, tabular digits and distinct carry/result rows. Highlight the active cell. Move character art outside working bounds. Preserve every working step. |
| **Order Ops Arena** | Portrait | Enlarge the expression and active operation. Reduce the combat vignette. Put full answer expressions in a 2×2 grid. Animate existing resolution without changing precedence. |
| **Formula Forge** | Portrait | Stack question, large formula/diagram board, values/hint and 2×2 answers. Use opaque surfaces. Make the perpendicular-height indicator precise and readable. |
| **Remainder Run** | Landscape | Create three zones: complete question; dock/loaded/remaining totals; batch controls and Ship. Align numeric totals and enlarge two-line batch choices. |
| **Chrono Dash: Time Trial** | Portrait | Centre a large clock with distinct hands. Put labelled hour/minute adjustment rows beneath it. Make Restore time primary and Reset secondary. |
| **Problem Pyramid** | Portrait | Enlarge and centre the three-tier pyramid. Use consistent block sizes and aligned values. Make the missing value distinct. Put answers in a 2×2 grid below. |
| **Lava Path** | Landscape | Establish a readable lateral crossing lane with separated platforms. Reduce lava contrast behind controls. Enlarge answers and group prompt/hint. Show existing crossing progress clearly. |
| **Change Counter** | Portrait | Put a readable complete receipt above the change tray and coin bank. Recreate coins with clear denominations. Preserve all items/prices. Make Give change primary; Undo/Clear secondary. |
| **SATs Paper 1: Arithmetic** | Portrait, adaptive landscape | Use a clear task surface with large calculation and answer entry directly below. Integrate the answer pad. Keep Save & continue primary and run navigation secondary. Support landscape for wide working. |
| **SATs Paper 2: Reasoning** | Portrait, adaptive landscape | Keep complete question/diagram and response controls on one coherent surface. Adapt to existing question types. Test long wording and multiple-choice/input states. |
| **SATs Paper 3: Reasoning** | Portrait, adaptive landscape | Use task-specific layouts for fractions, numeric entry and multiple answers. Keep response controls close to the task. Preserve notation and input formats. Support wide diagrams in landscape. |
| **Potion Panic** | Portrait | Put ratio/target at top, moderate-sized cauldron in the middle and a roomy 2×2 ingredient-control bank below. Enlarge quantities. Make Brew primary and reduce Reset prominence. |
| **Share Splitter** | Landscape | Keep five equal guest/plate lanes. Enlarge allocation values and ratio text. Put cake supply in a protected dock. Make the receiving plate obvious and separate plate touch regions from decorative character art. |
| **Ratio Racer** | Landscape | Use a compact readable ratio reference, a clear race lane and large fraction answers. Keep cars separated and progress visible. Remove large scenic gaps between references and controls. |
| **Scale Builder** | Landscape | Use one opaque workspace for original dimensions, scale factor, drawing and active length/width field. Enlarge keypad targets. Separate original-visibility control from Check lengths. |

## 6. Art and animation requirements

- Create an asset reference sheet before replacing imagery: palette, lighting, character scale, perspective, materials and edge treatment.
- Recreate mismatched assets to that reference.
- Do not bake question text, values or mathematical labels into illustrated images.
- Keep diagrams crisp and mathematically exact.
- Place characters and devices with coherent scale, contact shadows and lighting.
- Keep foreground decorations outside controls and working areas.
- Add immediate pressed feedback, clear selection feedback and brief answer feedback.
- Prevent particles, spells and celebrations from obscuring the current or next question.
- Support reduced motion.
- Check motion and effects live; screenshots alone are insufficient.

## 7. Implementation and verification order

1. Inspect the current implementation and identify shared layout components.
2. Fix world-map obstruction, Match Mastery clipping, Place Value Panic wrapping and player-summary clipping.
3. Build the shared HUD, question surface, working region and answer dock.
4. Prove the system on Place Value Panic, Match Mastery, Transformation Station, Multiplication Mine and one SATs paper.
5. Apply the screen-specific changes to the remaining games.
6. Recreate art assets to the approved compositions.
7. Verify full interaction states and native-device behaviour.

Test at these viewport sizes at minimum:

- Portrait: 320×568, 390×844, 430×932 and 768×1024.
- Landscape: 667×375, 844×390, 932×430 and 1024×768.
- Also test native iOS safe-area insets and both landscape directions.

For each screen, test:

- Longest supported question and labels.
- Highest supported digit counts and relevant units.
- Initial, selected, correct, incorrect, disabled and complete states.
- Help, pause and working-board states.
- Keyboard/answer-pad-open state where applicable.
- Rotation and restored progress.
- Physical-size readability and touch accuracy.

Do not mark a screen complete because it passes a rectangle-overlap test. Inspect the actual rendered image and operate the actual controls.

## 8. Required handover

Deliver:

- A named checklist of all entry screens, all 37 games and the world map.
- Before/after screenshots with screen name, viewport and orientation.
- Specific evidence that every blocker is fixed.
- A list of recreated assets.
- Confirmation that educational data, rules and progression were preserved.
- Any unresolved issues, with exact screen and reproduction steps.

The final result must show the complete task, complete active board and essential controls without obstruction. Scenery must support the interaction, and every orientation must be intentionally composed.