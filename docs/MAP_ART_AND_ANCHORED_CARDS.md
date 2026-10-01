# Rich map artwork and anchored island cards

Latest logo-background amendment: changed only `map-exploration.css` to position the existing logo header over the top of the map, removing its reserved vertical space. The complete ocean image now starts at the same top edge as the logo, covering the whole area behind it. Logo size/top position are preserved; the map begins higher. Updated the containment assertions in `verify-map-rich-art.mjs`. Assumptions: use the existing map artwork and logo. No external legacy assumptions used. Shared gameplay hierarchy is unchanged; this is a map-only overlap adjustment. Changed files: the CSS, existing verification script and this document.

Verification for this amendment: production build passes; PC, iPad A2HS and smartphone A2HS browser-emulation checks pass for full logo containment over the map, island card placement and bottom-HUD clearance. Desktop screenshot visually checked.

## Logo header amendment
Moved the existing Matharia logo into a compact top header with a 36px visual overlap onto the ocean. Removed the character, speech prompt and unused guide component/styles. Visual thesis: the gold fantasy brand leads directly into the illustrated ocean. Content: logo, island map, existing island cards and bottom navigation. Interaction: preserve island lift, water motion and hover cards; no new logo animation. Assumption: "top bar where the hero is" refers to the map-only guide area. No external legacy assumptions used. Shared gameplay hierarchy is unchanged.

Files: `WorldMap.tsx`, `map-exploration.css`, deleted `MapExplorerGuide.tsx`, updated `verify-map-rich-art.mjs` and `verify-map-exploration.mjs`, and this task record. The overlap is map-only; it shortens the former guide area without repositioning the islands. Device checks verify logo visibility and overlap, absent guide, card placement and bottom-HUD clearance on PC, iPad A2HS and smartphone A2HS browser emulation.

Logo amendment verification: production build and scoped map TypeScript check pass; all three device checks pass. The dependency issue recorded for the earlier chest-removal round is no longer blocking the current build.

Latest amendment: removed the animated ocean treasure chest from `MapSeaLife.tsx`, deleted its exclusive animation styles from `map-exploration.css`, and updated the existing water check in `scripts/verify-map-water.mjs` to expect no chest. Assumption: the request refers to the ocean decoration. No layout or HUD hierarchy changes; existing device-fit checks remain applicable. No external legacy assumptions used.

Amendment verification: scoped map TypeScript check passes. The current production build is blocked by an unrelated unresolved `uuid` import in `src/systems/services/gameService.ts`; the chest removal introduced no dependency changes.

## Scope and assumptions
- Replace the flat ocean with richer cartoon scenery matching current in-game backgrounds.
- Refresh all eight island illustrations as one consistent atlas.
- Preserve animated water discoveries, island reactions, canonical identities and progress.
- Keep selected cards pinned to their island when another island is hovered; position cards beside the relevant terrain with viewport/HUD clearance.

Inspected `WorldMap.tsx`, `map-exploration.css`, `MapAtmosphere.tsx`, the existing island atlas and the current Ratio Racer and Coordinates Quest backgrounds. These repository assets are the style references. No external legacy assumptions were used. This changes map navigation only; the shared gameplay HUD/mission/playfield/answers/bottom-HUD hierarchy is unchanged. New art is explicitly requested. No gameplay rules or unlock rules change.

## Changed files
- `src/assets/maps/matharia-ocean-rich.png`: illustrated ocean, reefs, submerged ruins and coastal detail.
- `src/assets/maps/island-atlas-rich.png`: eight refreshed transparent island sprites.
- `src/screens/WorldMap.tsx`: atlas bounds and explicit SVG clipping, pinned-selection priority, anchored cards and focus restoration.
- `src/components/world-map/useIslandCardPosition.ts`: measured card placement, scroll/resize updates, edge and HUD clearance.
- `src/design/map-exploration.css`: complete ocean background, quieter animated water overlay, sprite and card styling.
- `scripts/verify-map-card-anchor.mjs`: all eight cards across three device environments and hover-after-selection regression.
- `scripts/verify-map-rich-art.mjs`: final artwork loading, card screenshots and first-island clearance on three device environments.
- `docs/MAP_ART_AND_ANCHORED_CARDS.md`: task record.

## Artwork record
Generated with built-in ImageGen, using `premium/ratio-racer-course.webp` and `premium/coordinates-quest.webp` as style references; the previous atlas also supplies island subjects and ordering. Originals are preserved. Ocean brief: tall portrait, hand-painted cel-shaded turquoise/sapphire water, reefs, caustics, submerged rock arches and ancient ruins, tiny marginal tropical islets; open central water, no labels/UI/characters or major islands. Atlas brief: transparent two-column/four-row layout, complete rocky silhouettes, richer cel shading, navy outlines and jewel lighting; preserve volcanic core, clocktower village, operations castle, geometry glacier, fraction forest, data pyramid, racing canyon and arithmetic temple in existing order. SVG crops preserve subject bounds without exposing neighbouring cells in letterboxed viewports.

## Verification
Production build and scoped map TypeScript check pass. All eight anchored cards pass PC, iPad A2HS and smartphone A2HS browser-emulation checks. Desktop selection remains pinned while another island is hovered and Explore reaches the selected destination. Final artwork loads on all three environments; the first island clears the shared bottom HUD. Screenshots/reports are in `qa-artifacts/map-card-anchor` and `qa-artifacts/map-rich-art`. These are browser-emulation checks, not physical-device certification. Existing reduced-motion support and pointer-free scenery remain.

The whole-repository typecheck has separate existing website GameGate and Supabase/Deno errors; those unrelated files were preserved. React review covered stable island keys, effect cleanup, measured-state equality, pointer/focus behaviour and shared atlas caching.
