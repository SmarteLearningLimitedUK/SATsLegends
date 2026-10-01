# Island destination plaques

Superseded by the user's request to remove labels completely. See `docs/MAP_EXPLORATION_UPDATE.md` for the implemented map and character guide. The plaque proposal below is historical.

## Requested change
Redesign all eight main-map island labels with creative control so they feel more premium and game-like.

## Design
- Shared enamel-and-brass expedition plaque with an opaque navy face, carved edging and a raised subject crest.
- Eight distinct subject symbols use the existing island IDs and curriculum themes.
- Canonical island names remain on one line in the existing display font, with 15px physical text and cream-on-navy contrast.
- Hover, keyboard focus and selection brighten the crest and brass edge. The directional arrow moves slightly inside the plaque. Reduced-motion preferences remove transitions.
- Locked destinations retain the existing access logic and show a lock instead of an arrow.

## Scope and layout reason
The labels are 272px wide and at least 58px tall in physical screen space. This map-only change provides room for the subject crest, the longest canonical name and the direction indicator. Existing hotspot anchors, artwork, destination routes and atmosphere masks remain in use; live label measurements keep effects out of the lettering. Solid plaques cover the names already baked into the artwork.

The shared gameplay hierarchy is unchanged: top HUD, mission, playfield, answers, bottom HUD. No gameplay layout exception is introduced.

## Files changed for this request
- `src/components/world-map/IslandDestinationLabel.tsx`: reusable plaque and subject crests.
- `src/design/island-destination-labels.css`: map-scoped material, typography and interaction states.
- `src/screens/WorldMap.tsx`: render the plaque using the existing label refs and anchors; adjust its width.
- `scripts/verify-world-map-labels.mjs`: include the new source files in the QA fingerprint and validate the redesigned focus ring's colour, physical width, opacity and contrast.
- `docs/ISLAND_LABEL_REDESIGN.md`: scope, assumptions and validation record.

## Assumptions
- Preserve current island names, subject mapping, access rules and route behavior.
- Premium should complement the existing fantasy map and character aesthetic.
- This request concerns destination labels, not the map composition or island detail cards.
- No external legacy assumptions, prior-project assets or hidden dependencies were used.

## Verification
- Production build and TypeScript checks passed.
- Browser verification covers all eight labels and their detail/explore/back routes, text containment and contrast, pointer targets, keyboard focus, baked-art coverage and atmosphere masking.
- Device-fit targets: PC (1264 × 625), iPad A2HS emulation (768 × 1024), smartphone A2HS emulation (390 × 844). Browser emulation is not physical-device certification.
- Final browser results are recorded in `qa-artifacts/destination-labels/report.json`; reduced-motion results use `reduced-report.json`.
