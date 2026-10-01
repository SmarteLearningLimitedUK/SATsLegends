# Map without island labels

The flat-map artwork described here was subsequently replaced by the independent cartoon sprites in `docs/CARTOON_MAP_REDESIGN.md`. The label-free navigation and character guide remain.

## Request and result
Remove the oversized island labels completely, make the islands stand out, and put a character at the top saying “Select an island to explore”.

All eight live plaques are removed. A sibling version of the map artwork removes the eight baked-in plaques as well, revealing ocean and terrain underneath. Barratt's existing happy portrait appears above the map with a readable speech bubble and gentle breathing/sway motion. Reduced motion disables it.

Island terrain is now the hit target. The atmosphere and interactive targets share the existing island coordinates, with gold shoreline highlighting for hover/selection and a visible keyboard focus ring. Island names remain in accessible button labels and the existing island detail panels. Closing a panel returns focus to its island, including touch selection.

## Scope and layout
The former destination recommendation strip is replaced by the requested character guide in normal document flow. It scrolls with the map rather than covering island artwork. Terrain hit targets replace the old label-centered targets because labels no longer exist. The existing portrait map, shared dock and gameplay HUD hierarchy remain unchanged. No gameplay layout exception is introduced.

## Files changed
- `src/screens/WorldMap.tsx`: remove plaques/measurement logic, use the clean map, terrain targets and character guide; preserve selection, detail and navigation behavior.
- `src/components/world-map/MapAtmosphere.tsx`: shared terrain bounds; remove obsolete label masks and floating subject glyphs.
- `src/components/world-map/MapExplorerGuide.tsx`: existing Barratt character and requested message.
- `src/design/map-effects.css`: remove retired plaque/guidance rules; preserve island previews and detail-panel styles.
- `src/design/map-exploration.css`: character, speech, terrain emphasis and focus styling.
- `src/assets/maps/mapselect-unlabelled.png`: edited map, keeping the original file intact.
- `scripts/verify-map-exploration.mjs`: all eight selections, detail panels, explore/back routes, keyboard focus, guide, device fit and reduced motion.
- `docs/MAP_EXPLORATION_UPDATE.md` and `docs/ISLAND_LABEL_REDESIGN.md`: current scope and supersession note.
- Removed the unused `IslandDestinationLabel.tsx` and `island-destination-labels.css` created for the previous label proposal.

## Assumptions
Keep the current island names, subject mapping, unlock rules, eight-island composition and detail panels. Use an existing friendly character. No external legacy assumptions, prior-project assets or new progression systems were used.

## Artwork record
Built-in ImageGen edit of `src/assets/maps/mapselect.png`; output copied into the repository as `src/assets/maps/mapselect-unlabelled.png`. Original retained. Prompt: remove all eight navy island-name plaques, gold borders and white island text; reconstruct ocean/terrain underneath; preserve all eight island positions, scale, spacing, cartoon art style, ocean, coastlines, ships, rocks and existing top logo; no added islands, labels, UI or characters. The output's narrow white side margins are outside the displayed `object-cover` crop; the full height and all eight islands remain visible through normal scrolling.

## Validation
Production build and TypeScript checks pass. Browser results are stored at `qa-artifacts/map-exploration/report.json`, with top and final-island screenshots for PC (1264 × 625), iPad A2HS (768 × 1024) and smartphone A2HS (390 × 844) emulation. Physical-device certification is not claimed. Required gameplay hierarchy remains unchanged; map device-fit checks apply to the requested navigation change.
