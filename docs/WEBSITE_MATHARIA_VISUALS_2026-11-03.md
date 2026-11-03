# Matharia website visual refresh — 3 November 2026

## Scope and assumptions

The owner selected **website visuals only**. The newest owner-supplied Matharia development files are the visual reference. No original game development files were modified. Matharia’s hosted source snapshot (`3ae32a9087b592cfcb2b420ea5606f293e5cd0dce0b7c2622fdb2dcde373499b`) and Lexcoria’s pinned release (`9a6740259128eb0bb556ae2f335ce82f2281f2ad`) are retained. Accounts, checkout, entitlements, prices and game logic are outside this pass.

The latest Matharia style uses teal panels, warm gold edges, detailed environments and high-resolution characters. The website now carries that palette through its navigation, buttons, backgrounds, forms and public information pages. The homepage uses the actual courtyard and rhino from the game, with copy and artwork in separate layout regions. Mobile places the character scene below the copy. The public parents page keeps progress information first.

The four gallery scenes are fresh, uncropped browser captures from the latest reference: Place Value Panic, Match Mastery, Angle Arena and Potion Panic. Full-size images are 2880×1800; responsive previews are 1440×900. They are clearly labelled as previews of the next visual update because playable game versions are retained. No real account or child progress was used. The Lexcoria landing page keeps its existing visual treatment pending its separate overhaul.

## Changed files

- `src/website/HomePage.tsx`: reference artwork, logo, shorter hero description, separated character scene and accurate image descriptions.
- `src/website/ForParents.tsx`, `AdventureArtwork.tsx`: current Matharia environments.
- `src/website/Website.tsx`, `WebsiteRoot.tsx`: scoped website theme and stylesheet import.
- `src/website/website-matharia-visuals.css`: palette, surfaces, responsive composition, gallery viewer and reduced-motion treatment.
- `src/website/GameplayGallery.tsx`: accurate development-preview labels and descriptions.
- `src/assets/website/matharia-current/`: `courtyard.webp`, `forest-world.webp`, `rhino.png` and source/hash manifest.
- `src/assets/website/gameplay/`: eight refreshed desktop JPEGs and capture manifest.
- `scripts/capture-website-gameplay.mjs`, `verify-website-gameplay-source.mjs`: explicit reference provenance, source/hash checks and failed-font/artwork rejection.
- `scripts/verify-website-gameplay-gallery.mjs`: navigate to DOM readiness before the existing explicit gallery/image assertions, avoiding an unrelated page-load timeout.
- `docs/WEBSITE_GAMEPLAY_SCREENSHOTS.md` and this report.

## Verification

- TypeScript and the combined production website/game build passed. Both game source versions were retained.
- All four reference captures passed with fonts and artwork loaded and no JavaScript page errors.
- Source/image hash guard passed, including the retained hosted game version.
- Chromium viewport checks passed for nine public routes at 320×750, 390×844, 768×1024, 1024×768, 1280×720, 1440×900 and 1920×1080: 63 route/viewport combinations. Both development and compiled builds passed. Checks cover document overflow, homepage copy/art separation, parent hero separation, account text/character separation, mobile navigation and the excluded English theme.
- Gallery checks passed on home and parents at 1440, 768, 390 and 320 px: four loaded images, full-size image dimensions, responsive sources, Close/Escape, focus restoration and body-scroll restoration.
- Desktop and phone hero, parent and account artwork were visually inspected. This is browser emulation, not a physical-device Safari/iPad/Android certification.

Evidence is in ignored `qa-artifacts/matharia-website-20261103/`, `qa-artifacts/website-gameplay/` and `.deploy/matharia-website-*.log`.

No external legacy assumptions were used. References came from the current repository and the explicitly opened owner-supplied current Matharia files.

## Live deployment follow-up

The first release (`0a81cbd`) uploaded 147 files (12.0 MB). Its live release record retained both game source versions, all eleven artwork/screenshot hashes matched, and desktop checks passed for home, parents, subscriptions and login. Live testing caught Apache’s canonical `/english/` redirect: the theme exclusion originally checked only `/english`. The path check now tolerates trailing slashes, preserving Lexcoria’s existing theme on direct navigation.
