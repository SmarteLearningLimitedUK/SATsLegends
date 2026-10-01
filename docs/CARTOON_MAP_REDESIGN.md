# Cartoon map redesign

## Scope
Replace the flat painted map with a cohesive cartoon adventure map. Use one generated transparent atlas for all eight islands, with dark outlines, cel shading, chunky shapes and colours matching the existing Barratt character. Keep the character guide, island identities, detail panels and navigation.

The ocean is a lightweight gradient with illustrated wave marks and a dotted voyage route. Independent island sprites lift and enlarge on hover or keyboard focus; selection raises them further. Shadows deepen and a warm rim highlights the active island. The interaction target stays stationary. Reduced motion keeps highlights but removes lifting and animation.

## Changed files
- `src/screens/WorldMap.tsx`: replace the poster with the shared atlas sprites inside existing island buttons.
- `src/components/world-map/MapAtmosphere.tsx`: ocean waves and voyage route.
- `src/design/map-exploration.css`: ocean, independent sprites, lift/selection/shadow and reduced-motion styles.
- `src/assets/maps/island-atlas-cartoon.png`: transparent 2-column, 4-row atlas.
- `scripts/verify-map-exploration.mjs`: verify loaded sprites and actual hover/selection transforms as well as existing map navigation/device checks.
- `docs/CARTOON_MAP_REDESIGN.md`: task notes and artwork record.
- `docs/MAP_EXPLORATION_UPDATE.md`: mark the former flat artwork as superseded.

## Assumptions and layout
Existing eight destinations, terrain coordinates, access rules and routes remain the source of truth. No external legacy assumptions were used. This is a map-only visual change; the required gameplay HUD/mission/playfield/answers/bottom-HUD hierarchy is unchanged. Device-fit verification covers PC, iPad A2HS and smartphone A2HS browser emulation; physical-device certification is not claimed.

## Artwork record
Built-in ImageGen, one generation using the current Barratt happy portrait as the style reference. Final asset: `src/assets/maps/island-atlas-cartoon.png`. Prompt: create exactly eight separate floating islands in an equal 2-column, 4-row transparent atlas, matching Barratt's dark outlines, warm cel shading, rounded forms and vivid cartoon colours; no characters, labels, numbers, logo or background. Reading order: lava energy fortress; mountain clock village with ruler bridge; gear castle; icy geometric mountain; forest treehouse with fraction pools; pyramid with chart blocks; rapids with racing flags; arithmetic acropolis with books and runic steps. Each island includes its rocky underside and a distinct readable silhouette.

## Validation
Production build and TypeScript checks passed. Browser verification and screenshots are recorded in `qa-artifacts/map-exploration/report.json` and its sibling PNGs. Checks cover all eight touch/keyboard selections, explore/back routes, real hover/selection scaling, clear guide text, 44px minimum targets and reduced motion.
