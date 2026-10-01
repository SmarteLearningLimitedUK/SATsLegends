# Map water and hover cards

## Requested changes
Fix island clipping; add rich water animation and discoveries; open an island card on hover. Restore the Welcome to Matharia logo, make sea creatures less childish, add small palm islands, and limit hover-card content to subject category, island name and progress.

## Result and assumptions
Island sprites no longer expand beyond their resting hit bounds or use the extra inset crop. Arithmetic Acropolis moves slightly upward and the map gains bottom scroll clearance. The map opts out of its parent's vertical stretch so its natural height and bottom padding contribute to scrolling. Core of Calculation moves down slightly to leave clear space beneath the restored logo. This is a map-only layout adjustment to protect full silhouettes and bottom-HUD clearance. Required gameplay HUD/mission/playfield/answers/bottom-HUD hierarchy is unchanged.

The water now moves gently, with three subdued underwater creature silhouettes, a bubbling shipwreck, a bobbing treasure chest with animated lid/glint, rippling wakes and five small palm islands with swaying fronds. Decorations have no pointer interception. Reduced motion stops these animations.

Mouse hover displays only the category, canonical name and current percentage/progress bar. Hover previews do not steal focus or intercept clicks on the islands. Clicking/tapping pins the compact card and reveals Close and Explore. Existing island identities, progress, unlock rules and destinations remain. No external legacy assumptions were used.

## Changed files
- `src/screens/WorldMap.tsx`: logo, transient hover preview, pinned selection and compact category/name/progress cards.
- `src/components/world-map/MapAtmosphere.tsx`: water flow, sea details and scoped coordinate changes.
- `src/components/world-map/MapSeaLife.tsx`: animated underwater silhouettes, wreck, chest and palm islets, as SVG artwork matching the existing vector atmosphere.
- `src/design/map-exploration.css`: sprite crop/bounds, scroll clearance, logo, compact cards and sea motion.
- `src/assets/maps/matharia-logo.png`: transparent standalone Welcome to Matharia logo.
- `scripts/verify-map-water.mjs`: focused hover/card, clipping, logo, decoration and reduced-motion device checks.
- `docs/MAP_WATER_AND_HOVER.md`: task notes.

## Artwork record
Built-in ImageGen edit of the existing `src/assets/maps/mapselect.png`. Final file: `src/assets/maps/matharia-logo.png`. Prompt: extract only the original gold/navy Welcome to Matharia logo as a complete transparent image; preserve exact spelling, fantasy lettering, blue/gold rim, central diamond and sparkles; remove all ocean, islands, other labels and scenery; no redesign or new text. Original map is preserved.

## Verification
Production build and the focused map TypeScript check pass. The repository-wide typecheck encounters separate existing website GameGate and Supabase/Deno errors; those files are outside this task and were preserved.

PC, iPad A2HS and smartphone A2HS browser emulation checks cover all eight sprite bounds, eight desktop hover cards, mobile/keyboard first-and-last selections, first-island bottom-HUD clearance, logo visibility, all requested sea details and reduced motion. Results/screenshots: `qa-artifacts/map-water/report.json` and sibling PNGs. Physical device certification is not claimed.
