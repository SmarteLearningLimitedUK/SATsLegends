# Animated island map

Visual thesis: an illustrated adventure map with readable navy/gold nameplates,
and living previews that describe the maths on each island.
Content: destination guidance, eight consistent island labels, selected island
scene and subject summary, existing progress and Explore action.
Interactions: hover/keyboard terrain activation, subject-specific scene props,
and slow layered scene motion; reduced-motion users receive static scenes.

Assumptions: retain canonical names, IDs, original map poster, unlock rules,
routes, progression and shared navigation. Only repository artwork is reused.
No external legacy assumptions or new boss/game systems are introduced.

Layout reason: labels widen to a shared 250 physical pixels to keep every full
name on one line. Their existing artwork anchors remain fixed and edge-clamped;
label exclusion masks resize with them, keeping effects behind names. Selected
preview headers are 116 physical pixels and include a concise subject summary.
The map is navigation, not gameplay; gameplay hierarchy is unchanged.

Changed files:
- src/screens/WorldMap.tsx
- src/components/world-map/MapAtmosphere.tsx
- src/components/world-map/IslandPreviewScene.tsx
- src/design/map-effects.css
- scripts/verify-world-map-labels.mjs
- docs/MAP_INTERACTION_NOTES.md

Verification: production build and TypeScript pass. The map checks cover all
8 canonical names, minimum 14px physical label text, consistent 250px plates,
44px controls, label masking, keyboard/native touch, Explore/Back routing and
stationary browser scrolling. Scene checks confirm Geometry uses the glacier
artwork, every header image loads, and every island has a subject description.
A focused check confirms the header camera moves, selected terrain reacts,
Escape closes the preview and keyboard focus returns to its island. Reduced
motion freezes the header camera and ambient animation. React state/ref usage
and resize-listener cleanup were reviewed. Gameplay hierarchy is unchanged.

Final guidance adjustment: its island name now spans the full second row so
it also stays on one line beside a readable, 44px Let's go control. This scoped
re-stack is required by the requested consistent labels; map poster bounds and
island hotspots are unchanged. All eight islands passed normal-motion checks
on PC, short PC, iPad A2HS simulation and phone A2HS simulation; reduced-motion
checks passed on PC and phone (48 island/navigation cases in total). Guidance
was then checked independently after its final layout adjustment.
