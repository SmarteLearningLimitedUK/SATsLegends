# Minigame screenshots on the website

## Current update — after local game synchronization, 20 October 2026

All four gallery scenes were recaptured from the newly published Matharia source snapshot (`3ae32a9087b592cfcb2b420ea5606f293e5cd0dce0b7c2622fdb2dcde373499b`), replacing the older artwork in both previews and enlarged views. The homepage and parents page share this gallery. Captures show the current detailed rhino and adventurer, fraction tile board, crystal cannon in the frozen courtyard, and copper cauldron in the woodland workshop.

Captures use 1440 × 900 CSS pixels at 2× density. Full-size JPEGs are 2880 × 1800 and responsive previews are 1440 × 900. They preserve the actual desktop screen without cropping or compositing. Questions vary because practice rounds are randomised; no real parent account or child's progress was used. Captures were visually inspected, including the place-value labels and current control dock.

`node scripts/capture-website-gameplay.mjs` captures the current catalog against the local development server (or `LEGENDS_CAPTURE_URL`). Desktop is now the default; portrait mode stops with a clear message because current Matharia gameplay requests landscape. The optional `LEGENDS_CAPTURE_GAMES` can restrict a reference capture; a publishable manifest requires all four scenes.

`capture-manifest.json` records the Matharia snapshot, capture commit, routes, questions and SHA-256 digests of all eight images. `scripts/verify-website-gameplay-source.mjs` checks that they match the current game snapshot and file contents. The publisher runs this check before building, preventing another game snapshot being published with stale gallery captures.

Updated files: eight desktop JPEGs and their capture manifest under `src/assets/website/gameplay`, `src/website/GameplayGallery.tsx` (dimensions and accurate image descriptions), `gameplay-gallery.css` (matching aspect-ratio notation), `scripts/capture-website-gameplay.mjs`, `verify-website-gameplay-gallery.mjs`, `verify-website-gameplay-source.mjs`, `publish-site.mjs` and this document. Assumptions: replace every existing gameplay screenshot, retain the established gallery and actual-game content. No external legacy assumptions were used.

Gallery verification covers home and parents at 1440, 768, 390 and 320 px, full-resolution sources, Close/Escape, focus restoration and horizontal overflow. `GALLERY_QA_ENGINES=chromium` selects the available engine. These checks use browser emulation, not physical Safari/iOS hardware.

## Historical portrait implementation

The home page and public parent page now show four real minigame screenshots with skill captions. Each opens a larger image in a keyboard-accessible native dialog. Phone layouts use a horizontal strip so the portrait game screens remain readable without cropping the questions or controls.

Screenshots were captured from the current React app in an isolated local browser at 390 × 844 CSS pixels and twice the pixel density. The actual introductory panels were dismissed using their Start buttons. Game routes were looked up from the repository's current `ISLANDS` catalog; no game screens were invented or composited.

| Minigame | Captured route | Practice shown |
| --- | --- | --- |
| Place Value Panic | `/game/1/1` | Rebuilding numbers using tens and units |
| Match Mastery | `/game/2/3` | Matching equivalent values on a fraction gem board |
| Angle Arena | `/game/3/1` | Finding a missing angle and choosing a cannon answer |
| Potion Panic | `/game/7/1` | Restoring a potion recipe's ratio |

The four JPEGs total about 928 KB, are loaded lazily, and keep their original portrait framing. Captures contain no real account or child progress information. Individual missions and randomly generated questions can differ when children play.

## Refreshing captures

With a local Vite dev server running, execute `node scripts/capture-website-gameplay.mjs`. It writes the website images to `src/assets/website/gameplay/` and a capture record to the ignored `qa-artifacts/website-gameplay/capture.json`. Inspect the screenshots before rebuilding/uploading. This script changes image files only and does not change gameplay or production accounts.

Run `npm run lint`, `npm run build:ftp` and `node scripts/verify-website-gameplay-gallery.mjs`. Set `LEGENDS_WEBSITE_QA_URL` to a compiled preview URL when checking the production build. The gallery checks cover both pages, four loaded images, larger views, keyboard closing, focus restoration, phone scrolling and Chromium/WebKit layouts.

Completed verification: TypeScript, FTP and preview builds passed. The gallery passed on both pages at 1440, 768, 390 and 320 px in Chromium and at 390 px in WebKit, including all four loaded screenshots, Close/Escape, focus restoration and responsive framing. The checks passed against the compiled preview as well as the development server. The public parent preview was opened and the gallery confirmed in the browser. The refreshed FTP ZIP includes all four JPEGs and `.htaccess`, with no `.env` files.

## Changed files

- `src/website/GameplayGallery.tsx` and `gameplay-gallery.css`.
- `src/website/Website.tsx` and `ForParents.tsx`.
- `src/games/FractionMatchGame.tsx`: corrected “equivalent” in the instruction before capturing it.
- Four new JPEG files in `src/assets/website/gameplay/`.
- `scripts/capture-website-gameplay.mjs` and `verify-website-gameplay-gallery.mjs`.
- This document and the appended `docs/WEBSITE_NOTES.md` entry.

Assumptions: screenshots belong on the home and parent information pages; current practice-mode screens are representative examples; original portrait framing should be preserved. Changes are limited to the screenshot feature. No external legacy project assumptions were used.

## Verification of the post-sync captures

All eight JPEG dimensions were checked. TypeScript, the capture-source/hash check and the gallery checks passed on home and parents at 1440, 768, 390 and 320 px in Chromium. Checks include responsive image candidates, 2880-pixel full-size images, Close/Escape, focus restoration, and no horizontal overflow. Evidence is under ignored `qa-artifacts/website-gameplay` and `.deploy/gameplay-gallery-*.log`.

Published and verified from source `6997e2e` on https://satslegends.com. The publisher uploaded 144 changed files (9.3 MB) and verified the combined website/game entries. Fresh live checks passed on home and parents at 1440 and 390 px, including full-size 2880-pixel viewers, Escape, restored focus and no horizontal overflow. SHA-256 checks confirmed that the eight image assets served by the live site exactly match the new captures. Live evidence: ignored `.deploy/gameplay-gallery-live.log` and `qa-artifacts/website-gameplay/live/gallery.png`.
