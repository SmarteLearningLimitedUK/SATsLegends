# Arcade amendment — 29 September 2026

Scope: Conversion Canyon, Coordinates Quest (TreasurePathGame), Take-Out Rush,
Fraction Forge, Simplify Sprint, Mean Machine, Data Detective and PlayerProfile.

Inspected implementation files: src/games/ConversionCanyonGame.tsx,
src/games/TreasurePathGame.tsx, src/games/CoordinatesQuestGame.tsx,
src/games/TakeOutRushGame.tsx, src/games/FractionForgeGame.tsx,
src/games/SimplifySprintGame.tsx, src/games/MeanMachineGame.tsx,
src/games/DataDetectiveGame.tsx, src/screens/PlayerProfile.tsx,
src/components/game-ui/GameUiKit.tsx, src/games/game-refinements.css,
src/design/legend-theme.css and docs/EXPERIENCE_SPEC.md.

Assumptions: reuse repository character artwork, learning objectives, scoring
and five difficulty tiers; mistakes remain recoverable where currently allowed.
No external or legacy project assumptions are used. Preserve existing edits.

Scoped layout exceptions: compact scale tray above its smaller mechanism;
Coordinates expedition portrait; Fraction Forge lava crossing below its existing
drag interaction; Simplify vault journey and Mean Machine power restoration
inside their playfields; Data Detective horizontally scrollable suspect lineup.
These add gameplay feedback without adding another HUD. Static scenery remains
contained above the shared bottom HUD. PlayerProfile is a scrollable summary,
not a gameplay screen. Validate PC, iPad and smartphone fit and native controls.

## Result

- Conversion: smaller mechanism with a scrollable weight tray above it; placement
  shudder, continuous strain when overloaded, visible snapped pose and crack on
  Submit; exact excess in grams and kilograms; remove weights or repair/reset.
  Feedback is in the mission strip so it cannot displace the mechanism.
- Coordinates: trim existing artwork's transparent padding, enlarge the hero,
  animate movement to a correct coordinate, and scroll the expedition journey.
- Take-Out: supportive cafe service copy replaces judgment language; animated
  delivery feedback and +60 XP for each three consecutive exact orders.
- Fraction Forge: alternate ascending/descending missions, build a lava crossing,
  show damage feedback, and award +60 XP every three clean bridges. Existing
  error penalties remain. Comparator marks now match the requested direction.
- Simplify: vault escape progression, recorded factor chain and unlock reactions.
- Mean: scanning/power restoration, persistent repaired cells, and +75 XP every
  three consecutive correct repairs. Incorrect repairs reset this streak.
- Data Detective: animated charts, interactive clue pins, opaque readable chart
  panel, complete item labels, named scrolling suspects, keyboard-accessible
  dossiers with focus return, Escape and a Tab loop.
- Profile: clear hero summary, readable two-column stats for the portrait stage,
  consistent fonts/light text, complete achievement count and scrollable content.

## Changed files in this amendment

- `docs/ARCADE_AMENDMENT_NOTES.md`
- `src/components/game-ui/ArcadeJourney.tsx`
- `src/components/game-ui/arcade-amendments.css`
- `src/design/legend-theme.css`
- `src/games/ConversionCanyonGame.tsx`
- `src/games/TreasurePathGame.tsx` (Coordinates Quest implementation)
- `src/games/TakeOutRushGame.tsx`
- `src/games/FractionForgeGame.tsx`
- `src/games/SimplifySprintGame.tsx`
- `src/games/MeanMachineGame.tsx`
- `src/games/DataDetectiveGame.tsx`
- `src/screens/PlayerProfile.tsx`
- `scripts/verify-gameplay-refinements.mjs` (scoped native carousel checks)
- `scripts/verify-arcade-amendments.mjs`

## Verification

- Production build passed (7.74 seconds); TypeScript passed.
- All seven games passed 28 device-fit checks: PC, short PC, iPad A2HS simulation
  and smartphone A2HS simulation. Last conversion/forge edits were rechecked
  across all four sizes (8 additional passes).
- Fifteen native flow checks passed across short PC, iPad and phone: scale
  overload/excess/repair/correct shipment, coordinates, simplifying, three mean
  repairs and profile scrolling. Data Detective additionally checked every
  suspect dossier through native carousel scrolling on all four sizes.
- Six final scale checks passed across PC/iPad/phone with normal and reduced
  motion: live strain, visible broken mechanism, exact excess and reset.
- Native PC drag checks completed three alternating Fraction Forge rounds and
  verified the +60 XP hot streak. Three exact cafe orders verified its stamp.
- Reviewed React dependencies, guarded state transitions and keyboard access.
  Visual checks confirmed the scale remains visible during error feedback and
  charts/item labels are readable. Screenshots and logs are in the ignored
  `qa-artifacts/arcade-amendments` directory.
- Shared HUD → mission → playfield → responses → bottom HUD preserved; static
  scenery is contained above the dock. Device checks are browser simulations,
  not physical-device certification. Existing five difficulty tiers retained.

No external legacy assumptions or new artwork/backends were introduced. Earlier
workspace edits were preserved. This amendment was completed inside 30 minutes.
