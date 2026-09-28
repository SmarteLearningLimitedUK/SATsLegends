# World map effect refinement

## Requested change

The existing map effects crossed some island names. The map now uses restrained terrain lighting, small environmental motes and gentle shoreline highlights, with clear space around every name plate.

## Design and behavior

- Keep `src/assets/maps/mapselect.png`, its map geography and its illustrated names.
- Position accents over the illustrated terrain, independently of the larger island hit areas.
- Exclude all eight illustrated name plates from the complete decorative SVG layer, with extra space around each plate. This protects the names through every animation frame.
- Remove the old smoke, flame blobs, light beams, orbiting objects and symbols from this screen.
- Retain island hit areas, recommendation, detail panels, unlock/progress logic and navigation.
- Keep keyboard focus visible without painting a translucent fill over the lettering.
- Respect the system reduced-motion preference by making the accents static.

## Changed files

- `src/screens/WorldMap.tsx`: compose the new atmosphere layer and remove the former per-hotspot decorations.
- `src/components/world-map/MapAtmosphere.tsx`: terrain coordinates, label exclusion mask and restrained biome accents.
- `src/design/map-effects.css`: isolated map atmosphere, focus and reduced-motion styles.
- `docs/MAP_EFFECTS_NOTES.md`: scope, assumptions and validation.

## Assumptions

The current poster, island geography, names and navigation are intentional. This change preserves them. The painted name on the seventh island says “Ratio Rapids”; the current island data calls it “Ratio Racer”. That existing difference has been preserved because renaming the map was not requested.

Only the current prompt and repository files informed this change. No external legacy assumptions, new worlds, backend, analytics or boss systems were introduced. Existing uncommitted work, including `ios/`, was preserved.

## Validation

Device checks use desktop Chromium at 1440 × 900 and WebKit with iPad A2HS at 768 × 1024 and smartphone A2HS at 390 × 844. These are browser simulations; physical devices were not tested.

The map-specific QA script and screenshots live under the ignored `qa-artifacts/legend-reskin` directory. It checks all eight illustrated labels with maximum effect opacity against the artwork with effects hidden, keyboard focus, island details and navigation, document overflow and reduced motion.

All 84 map checks passed across the three profiles (28 per profile), with no runtime errors. All eight labels remained protected with the effects forced to maximum opacity. Pixel comparisons allow up to two RGB channel steps for browser compositor rounding; the WebKit checks differed by at most one step.

Keyboard focus, all eight island detail panels, island navigation, reduced motion and document overflow checks passed. `npm run lint`, the production build and scoped `git diff --check` passed. The build retained its existing warning about a JavaScript chunk exceeding 500 kB.

The final map checks ran against an isolated production preview to prevent live Vite module updates from interrupting the browser run.
