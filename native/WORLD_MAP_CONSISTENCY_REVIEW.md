# Portrait world map consistency — 25 October 2026

The portrait map previously combined a five-island reference painting with three old atlas cutouts above it. Its stretched background crop exposed parts of unrelated islands and hard horizontal joins. It now renders one continuous eight-island painting, preserving its 1:3 aspect ratio, with live island buttons and progress indicators positioned in the same artwork coordinate system.

Visual thesis: one sunlit miniature fantasy archipelago with consistent sea, perspective and island materials. Content: current island/progress header, eight labelled islands on a continuous voyage path, existing navigation dock. Interaction: native vertical scrolling, initial alignment to the recommended island, and existing island-selection navigation. No new decorative motion was added to this correction.

The selected-island marker works for all eight islands. A resize observer keeps initial alignment valid after viewport changes without resetting ordinary scrolling. Header text can wrap at narrow sizes, and bottom scroll clearance keeps the last island accessible above the dock. The landscape map remains on its existing rendering path.

## Changed files

- `src/components/world-map/ReferenceWorldMap.tsx`: replace the split artwork/atlas sections with a single image and eight live labels; align to the recommended island.
- `src/screens/WorldMap.tsx`: remove atlas props from the portrait component; retain the landscape renderer.
- `src/components/game-ui/reference-batch-two.css`: continuous-map geometry, image proportions, safe-area scroll clearance, header wrapping and focus styling.
- `src/assets/reference-batch-two/map-continuous-v2.png`: new continuous eight-island art, generated with the built-in image tool using the existing five-island scene as the edit target.
- `src/assets/reference-batch-two/map-continuous-v2.prompt.json`: full generation prompt and asset provenance.
- `scripts/verify-continuous-world-map.mjs`: compiled-map geometry, scroll captures, touch targets and all-eight-island navigation checks; explicitly report unavailable browser engines as skipped.
- This review document. Local evidence and helper files remain ignored.

## Verification

- TypeScript, the iOS production web bundle and the website production build passed.
- Chromium: 320×568, 375×667, 390×844, 430×932 and 589×1280 passed. All eight island buttons were tapped and their corresponding mission headings verified at every size: 40 navigation flows.
- Top, middle and bottom scroll screenshots were captured at each size. Visual inspection confirmed consistent artwork and no horizontal section joins.
- Initial recommended-island alignment, header containment and current-island marker passed at 320×568 for islands 1, 6 and 8 using different saved-progress fixtures.
- Existing player normalisation intentionally exposes all islands. That access behaviour was retained; no new unlock restrictions were introduced.
- WebKit could not be installed on this Windows host: installation failed with EPERM when writing Playwright.exe. Safari and physical iPhone verification are outstanding; no Safari pass is claimed.
- Account requests used isolated local fixtures, with no live account or progress changes. The fixture was corrected to preserve save revision between navigation steps.

Evidence: `qa-artifacts/continuous-world-map/`. These changes have not been uploaded to TestFlight. Build 100.6.1 remains the previously uploaded build.

Assumptions: the latest portrait map reference remains the intended style, and all eight existing campaign islands remain available. No external legacy assumptions were used.
