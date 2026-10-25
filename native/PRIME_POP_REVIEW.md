# Prime Pop local fixes — 21 October 2026

Requested scope: missed-prime penalties, sufficient prime supply, and a clearer danger line with its label on the rail.

The original escape filter already checked primality, but used the bubble's art-size token as a percentage radius rather than its actual rendered edge. It also kept composites above the line, occupying spawn capacity. The new boundary uses rendered pixel size and field height; all bubbles leave at the boundary, and only primes emit a missed-answer event. Escaped events include the number for verification.

Spawning guarantees two prime opportunities whenever fewer are active, including replacing a composite when the field is full. Values come from exact prime/composite pools rather than bounded random retries. The existing number ranges, scores and timers remain. Scored levels now finish immediately when the target score is reached. The striped warning rail is thicker, with DANGER centred within it. Question wording explicitly says to let other numbers pass.

Validation:
- `npx tsx scripts/verify-prime-pop-rules.ts` passed classification through 99, all five ranges under extreme random values, score budget and rendered-edge boundary checks.
- `node scripts/verify-prime-pop-playability.mjs` passed actual component interaction at 844×390 and 1440×900: all five scored tiers won, 35-second escape observations emitted prime-only penalties, and the label centre matched the rail centre. The isolated harness uses a fixed shared-session clock so escape observations can continue without the shell ending the game.
- Shared-shell dock checks passed at 844×390, 667×375 and 1440×900, including simulated 21px phone bottom insets. Screenshots: `qa-artifacts/prime-pop-dock/`.
- TypeScript, iOS build and website build passed. Physical iPhone checks remain for the next authorised TestFlight update.

Changed files: `src/games/PrimePopGame.tsx`, `src/games/primePopRules.ts`, `src/games/prime-pop.css`, `scripts/verify-prime-pop-rules.ts`, `scripts/verify-prime-pop-playability.mjs`, this document, and generated evidence under `qa-artifacts/prime-pop-playability/` and `qa-artifacts/prime-pop-dock/`.

Assumptions: missed primes and taps on non-primes cost lives in scored play; untouched non-primes pass safely; practice remains non-failing. No external legacy assumptions were used. No deployment or TestFlight upload was performed. Wait for **“update build”**.
