# Homepage presentation refresh — 20 October 2026

The owner requested a refresh of the gameplay previews, then expanded the request to the whole homepage because it was not neat enough.

## Design and content

- Replaced the long, repeated homepage sections with a single cinematic opening, three practice steps, two clear game choices, actual gameplay, parent benefits, practical FAQs and one plans call to action.
- The opening retains the SATs Legends brand and existing cinematic artwork, with “Big challenges. Brilliant minds.” and clearer supporting copy.
- Removed the repeated landscape background behind homepage copy. Alternating quiet purple and cream sections create more readable contrast.
- Preserved the three existing section URLs, current Matharia pricing, school-companion positioning and separate Lexcoria availability/access.
- Characters occupy their own layout areas. No character overlays are placed over copy or controls.
- The Journal remains removed. No new marketing claims, testimonials, guarantees or external legacy assumptions were introduced.

## Gameplay preview provenance

Captured the real current practice routes in an isolated Chromium browser at 1280 × 800 CSS pixels and 2× density. Full-size JPEGs are 2560 × 1600; responsive preview JPEGs are 1280 × 800. The normal game briefing buttons were used to enter gameplay. No game UI was generated or composited; no production account or real child's progress was used.

Routes: `/game/1/1`, `/game/2/3`, `/game/3/1`, `/game/7/1` (Place Value Panic, Match Mastery, Angle Arena and Potion Panic). Captures show the current purple controls, desktop scene arrangements and artwork. Questions are randomly generated representative examples.

Gallery layout is two landscape columns on desktop/tablet and one column on phones. Preview sources use `srcset`, load lazily and open a 2560-pixel native-dialog viewer with keyboard closing and focus restoration. Both home and parents use the updated shared gallery.

## Verification

- TypeScript and production Vite build passed; existing game bundle-size warnings remain.
- Homepage checked at 320, 390, 580, 768, 1024, 1251, 1440 and 1920 px: no document overflow, all three section anchors reachable, correct dark labels on cream sections, FAQ expands and no runtime errors.
- Gallery checked on home and parents at 1440, 768, 390 and 320 px in Chromium: four loaded images, full-size viewer sources, Close/Escape, focus restoration and no horizontal page overflow.
- Desktop/mobile page captures and all four real game screenshots visually inspected. Evidence is in ignored `qa-artifacts/home-refresh` and `qa-artifacts/website-gameplay`.
- Current checks are Chromium emulation; physical Safari/iOS testing has not been performed for this refresh.

## Source changes

`src/website/HomePage.tsx`, `homepage-refresh.css`, `Website.tsx`, `WebsiteRoot.tsx`, `GameplayGallery.tsx`, `gameplay-gallery.css`, eight desktop JPEGs, capture/gallery verification scripts and documentation.

Assumptions: “refresh everything” refers to the homepage presentation and its shared gameplay previews. Account, billing and gameplay behaviour are unchanged. No external legacy project assumptions were used.

## Published and verified

Published to `https://satslegends.com/` through the verified FTPS publisher from source `763c1c37d12c8c9fb910cd245848f1aa5b939d8c`. This release uploaded the complete 609-file combined artifact (158.1 MB). The publisher confirmed website, Matharia and Lexcoria publication and HTTPS entry-file verification.

Fresh live-browser checks passed at 390, 768 and 1440 px: new homepage heading and two game choices, no Journal links, no horizontal overflow, all four new desktop image sources, a working 2560-pixel screenshot viewer, Escape closing and no runtime errors. Live `site-release.json` matched the source commit. Live first-screen captures are stored under ignored `qa-artifacts/home-refresh/live-*-top.png`.
