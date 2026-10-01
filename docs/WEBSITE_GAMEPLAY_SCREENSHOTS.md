# Minigame screenshots on the website

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
