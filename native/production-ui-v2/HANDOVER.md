# SATs Legends — production UI rebuild handover

Latest correction: the owner requested the original illustrated graphics and richer materials over the current layouts. See ../graphics-restore/HANDOVER.md. The gallery now reflects that correction; the generated replacement asset inventory below is retained as history, with those exports marked inactive defaults. The mechanical scale remains unchanged.

The browser implementation is complete for the 37 campaign games and the entry/map screens in USER_BRIEF.md. This is a local candidate. It has **not** been uploaded to TestFlight, and the earlier TestFlight build does not contain this rebuild. Native device release validation remains outstanding.

## Review the result

- `qa-artifacts/production-ui-v2/index.html`: named before/after gallery, four viewport profiles, full-resolution images.
- `qa-artifacts/production-ui-v2/art-reference.html`: palette, existing character reference, original/replacement rocket and vector icon family.
- `checklist.json`: named status and evidence for all 37 games, welcome, learners, sign-in, settings, player summary, map and mission results.
- `CHANGED_FILES.md` and `CHANGED_FILES.json`: exact changed source list compared with the source baseline saved before this brief. Earlier unrelated worktree changes are excluded.
- `DESIGN_SYSTEM.md`: tokens, shared layout ownership, accessibility and native validation boundaries.
- `ASSETS.json`: original/replacement paths, dimensions, format, size, SHA256 and provenance for 14 recreated exports.

The gallery's Before images are the repository baseline captures retained when this brief began. They preserve their original orientations. Map/profile blocker screenshots show the updated camera bounds and reserved regions; a fresh pre-edit map/profile screenshot was not available. Earlier failing intermediate QA captures remain on disk for traceability and are not used as current gallery images.

## What changed

The shared production shell reserves safe-area padding and the physical compact HUD once. Pause, contextual lightbulb Help and working-board access replace the persistent five-button game toolbar. Sound/music and Back remain accessible in the focus-trapped pause dialog. Existing session pause conditions hold timers while menus, Help, working or rotation gates are open.

Four scoped composition stylesheets own the question, working object/board and response regions. Superseded reference-coordinate rules are excluded from the migrated screens. They preserve the existing island scenery and character identity, with opaque working surfaces, system mathematical text, tabular digits, persistent selection states and readable disabled controls. Small graph points have the existing 44px directional/check-next controls as alternatives to direct precision taps.

Each game follows the orientation in the brief. Papers remain portrait preferred and adaptive. **At a 320×568 portrait stress viewport, the paper launch uses the existing paused rotation gate.** The compact wide paper layout is tested at 667×375; the complete portrait papers are tested at 375×667. This avoids shrinking long questions, sentence choices and multiple response fields into an unreadable 320px composition. Rotation does not change the question or reset the session.

The iOS root serializes supported Capacitor orientation requests. The iPad plist now allows portrait and upside-down portrait as well as both landscape directions, matching the mixed game matrix. Native orientation falls back to the existing rotation/Start screen if the container cannot turn.

The map has physically reserved HUD, camera and recommendation regions. Camera bounds include the highest and lowest destinations, and camera position survives returning to the map. The summary places next practice above navigation. Learner cards, long names, keyboard-height accommodation, readable sign-in controls and explicit persistent settings switches are covered by isolated account fixtures.

## Educational and behavioural protection

`source-baseline.json` predates this brief's implementation. The original educational baseline was not overwritten. `scripts/production-content-guard.mjs` passes with **157 protected files unchanged and nine narrowly reviewed presentation exceptions**. No question generator, mathematical value, answer, validator, score, life count, timer duration or progression function was edited for this rebuild.

`scripts/verify-production-visual-boundaries.mjs` reconstructs the exact pre-rebuild source for App, Take-Out Rush, Angle Arena, Perimeter Path, Order Ops Arena, the asset resolver and SATs answer fields by reversing only the reviewed presentation changes. The answer-fields edit adds only a short/long display attribute; full choice text and handlers remain intact. The Perimeter edit enlarges label plates/type without changing points, edges, lengths or events. Take-Out Rush restores a measured customer area, uses the existing full-bleed diner background once and moves the unchanged feedback markup into the scene track above food controls. Order Ops moves the unchanged feedback markup into its reserved actor region; the full expression and answer controls remain visible.

The independent regressions pass: 600 full paper variants, all 53 KS2 topic families, 70 challenge prompts, 12 data puzzles and the five-tier difficulty checks. These tests protect the existing curriculum; they do not assert that every possible dynamically generated visual state has been exhaustively sampled.

## Validation evidence

| Check | Current evidence |
|---|---|
| All games, four sizes | `after/report.json`: 148 captures, no page errors/body scrolling; complete initial questions and enabled controls within the viewport. |
| Lowest scored tier | `first-tier/report.json`: 37 additional compact captures; questions and controls fit, including Multiplication Mine's separate introductory ore/product layout. Precision coordinate markers retain their directional-control alternative. |
| Four first-priority blockers | `blockers/results.json`: 16 passes across 320×568, 390×844, 430×932 and 768×1024. Includes long suggestion/large balance, restored camera, next practice, seven aligned columns, all 30 Match tiles and a legal equivalence swap. |
| Campaign actions | `playtest/ledger.json`, `polygon-retest/ledger-focused.json`, `special-playtest/results.json` and Match blocker evidence collectively cover all 34 non-paper games. Includes incorrect/correct states, clear/reset, allocation, ingredient removal, keypad input, complete launch/combat/receipt rounds where applicable. |
| Compact campaign actions | `compact-playtest/ledger-focused.json`: 28 additional complete action passes at 320×568 / 667×375. The remaining five workshop games have compact passes in `special-playtest/results.json`; Match has the compact legal-swap blocker pass. |
| Full papers | `paper-landscape-final/results.json` and `paper-portrait-final/results.json`: all 36+25+25 missions, saved answers, answer pad, Later/revisit, retained working, full marks and final review. Per-mission question/control bounds are recorded alongside screenshots. |
| Shared utilities | `utilities/results.json`: all 37 games; pause holds the displayed timer, sound state toggles/restores, Escape/focus restoration, contextual Help, retained working draft and question preservation through rotation. |
| Entry stress | `entry-stress/results.json`: four sizes; three learners, long names, persistent sound/music switches, fully visible Return action, full field labels and a shortened keyboard viewport proxy. |
| Result states | `results/results.json`: eight passes; portrait victory and landscape retry across all four device profiles. All four summary statistics and primary actions are visible; XP/bonus detail remains reachable in the existing detail scroll region. |
| Motion | `motion/results.json`: live Match swap/refill and zombie spell in normal/reduced motion; reduced mode removes decorative animations. Desktop frame and heap samples are recorded without claiming native performance. |
| Safe-area emulation | `safe-area/results.json`: Chromium overrides actual CSS `env(safe-area-inset-*)` values; checked separately from the earlier custom-property proxy. This remains browser emulation. |
| Build/types | `npm run build:ios` and `npm run lint` pass. Existing large-chunk build warnings remain; no native archive was produced on this host. |

The 14 recreated exports total approximately 194 KiB. The rocket's transparent source and generation prompt are retained. Food/coin icons are project-authored SVGs; existing subjects and denominations remain unchanged. No external stock art or baked mathematical labels were introduced.

Angle Arena additionally completed all six tier-five rounds at 320×568 and 390×844 (`angle-rounds/results.json`). Supplied angles retain their exact geometry. Ratio/difference questions show two unknown adjacent angles with a clear “Not to scale” label; the presentation does not derive the answer.

## Outstanding native release gate

This Windows host has no Xcode/iOS Simulator or attached physical iPhone/iPad. Browser automation cannot certify native rotation, VoiceOver, real keyboard/autofill behaviour, device memory/frame rate, status-bar/home-indicator behaviour, background/resume or archive signing. WebKit is not installed in this environment either; the new browser checks use Chromium.

Before a release, open `native/ios/App` in Xcode on macOS, sync/build this candidate, and run portrait and both landscape directions on a compact supported iPhone, a notched/Dynamic Island iPhone and iPad. Exercise the rotation/Start gate, mid-round rotation and background/resume, long reasoning tasks with answer pad, account keyboard/autofill, VoiceOver, reduced motion, audio settings and memory between repeated game launches. Then validate an archive. No prior build's native result is being reused for this candidate.

No confirmed browser layout blocker remains in the recorded passing cases. Native validation is an unresolved release requirement, so this handover does not claim App Store readiness.

## Assumptions

- The latest pasted brief and current repository are authoritative; the established characters, island families and educational content are retained.
- Compact papers may use the explicitly permitted adaptive landscape layout; standard portrait papers remain available.
- QA account requests are intercepted locally. Real learner data and backend systems were not changed.
- No external legacy project assumptions were used.
