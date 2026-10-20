# Website game source synchronization — 20 October 2026

## Cause

The website checkout lagged behind the saved Matharia development commits and both local game working trees contained substantial unpublished changes. Lexcoria was pinned to its older main commit. Refreshing the browser could not retrieve code that had never been included in the website build.

## Release scope

The owner selected “Latest local versions after testing”. Read-only snapshots were taken from `D:/BrainZilla/GitHub/SATsLegends` and `D:/BrainZilla/GitHub/Lexcoria`. Neither development working tree was changed. Snapshot hashes and source base revisions are in `scripts/game-release-sources.json`.

- Imported Matharia game source, artwork, music, sound effects, gameplay layouts and QA scripts into this website repository. Kept the refreshed homepage and website account/payment integration.
- Included the game load error boundary and routine save-status accessibility rule from the newer Matharia source. Native app hooks are inert in the website build; only their required app/core dependencies were added.
- Published a dedicated Lexcoria snapshot branch `codex/website-local-game-sync-20261020`, pinned by `scripts/lexcoria.commit` for reproducible combined builds.
- Fixed a release-blocking Lexcoria first-login defect: two missing request IDs could compare equal and then attempt to mutate a null pending-save object. Pending request and saved row must both exist before acknowledging a save.
- Updated QA fixtures for the website's existing `account_subscriptions` RPC. Hidden choices are excluded from geometry checks; the passage modal is checked against its actual full-shell host.
- Added per-game source information to `site-release.json` and an English `game-release.json`. No new backend migration or real billing action is involved.

Changed areas: `src/` game code/assets (excluding the website redesign), `src/website/{GameGate.tsx,WebsiteRoot.tsx,family.css}`, game verification scripts, `scripts/{build-with-english.mjs,publish-site.mjs,lexcoria.commit,game-release-sources.json}`, package manifests, and the TypeScript exclude list for local release snapshots.

## Verification

- TypeScript checks and production builds passed for both games and the combined website artifact.
- Matharia: 71 practice/highest-tier routes each tested on desktop (1440×900) and touch landscape phone (844×390), including a reachable native gameplay action, runtime errors and missing media checks. Initial development-server navigation timeouts were rerun successfully. Portrait rotation prompt pauses play and landscape resumes it.
- Lexcoria: all 23 routes at 320×568, 390×844, 768×1024, 1440×900, 844×390 and 667×375; map/island/profile checks; saved level remapping; reading book and practice-paper checks. The legacy trailing drag-to-duel test expects a removed enemy selector and is not a valid check of the redesigned game. Current mission/adventure interaction suites were run separately; their results are recorded in the ignored QA logs.
- Content: 600 Matharia paper variants, 53 KS2 topic families and question integrity; English GPS domains, statutory spelling lists, reading marks and 1,000 seeded randomised sessions.
- Production-artifact account fixture passed shared parent login, selected-child English entry and server denial without entitlement. No real user data, payments or cloud access settings changed.
- Refreshed purple website sections retained, with no overflow at 390/1440px. Production lazy-module failure/retry and slow-load recovery passed.
- Actual updated desktop gameplay captures visually inspected in ignored `qa-artifacts/game-sync/`.

Checks use Chromium emulation; they do not replace physical iOS/Android testing. Existing bundle-size build warnings remain.

Assumptions: the owner-authorized local working trees are the desired newest games. Release-specific compatibility fixes live in the isolated snapshots/website checkout. No external legacy project assumptions were used.
