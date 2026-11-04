# Takeout Rush multi-fraction orders — 2 November 2026

The current request changes Takeout's order rules: combine several fractions, show later item limits/blocks, and explain Send availability. The supplied portrait photo shows an exact tray with zero queued customers, so the previous generic “Exact. Order up!” message was misleading. The existing 140ms auto-submit also disabled Send before a deliberate tap.

| Level | Minimum portions | Distinct fraction sizes | Restrictions |
| --- | --- | --- | --- |
| Practice / 1 | 3 | 2 | Unlimited available items |
| 2 | 3 | 2 | Wider choice of fractions |
| 3 | 4 | 2 | Maximum two of each item per order |
| 4 | 4 | 2 | One visible blocked item; remaining items limited to one or two |
| 5 | 5 | 2 | One visible blocked item; two remaining items capped at one, the others at two |

Every generated target is selected from a feasible combination under the ticket's actual restrictions. The displayed blocked item stays in the shelf but cannot be added. Stock counters show the remaining count, and removing/resetting portions restores availability. The player explicitly sends a non-empty tray; exact valid trays receive a gold Send button. Wrong submissions retain the tray/customer and use the existing life/score penalty. An empty queue shows a Waiting countdown and a matching status instead of suggesting that an order was sent.

## Checklist and evidence

| Area | Status | Evidence |
| --- | --- | --- |
| Exact rational order generation and live controller | Implemented; 2,500 generated tickets and 10 bounded-fallback cases pass | `qa-artifacts/takeout-orders/rules.json` |
| All five levels, manual Send and stock/blocks | Ten live flow cases pass across WebKit and Chromium | `qa-artifacts/takeout-orders/flow/checks.json` |
| Landscape shelf, padded labels and ready/empty states | Thirty states pass across five WebKit viewport profiles | `qa-artifacts/takeout-orders/layout/checks.json` |
| Enlarged text, practice and real Tips | Three 125% browser text cases and one practice/Tips flow pass | `qa-artifacts/takeout-orders/text-practice/checks.json` |
| Existing portion values, scoring, lives and queue timings | Source preservation and functional checks pass | `qa-artifacts/takeout-orders/scope.json` |
| TypeScript, production build and shared source contracts | Pass; 37 approved reference hashes retained | `typecheck.log`, `lint.log`, `build.log`, `shared-contract.json` in the QA folder |
| Local iOS public bundle | All 840 files match the production build by SHA-256; minimum iOS 16.4 check passes | `qa-artifacts/takeout-orders/native-copy.json`, `native-sync.log` |
| Native execution and TestFlight | Outstanding; not performed on this Windows host | A new signed macOS build/upload and real-device checks are required |

Combined receipt: [RESULT.json](../../qa-artifacts/takeout-orders/RESULT.json). Actual rendering remains React through the existing Matharia presentation transform; no native Swift rendering or authentication/purchase code changed.

The ten flow cases cover levels 1–5 in both engines, including a one-portion wrong answer, retained customer/ticket after failure, exact prepared trays remaining ready without auto-send, double-activation protection, stock depletion/removal/reset, pause/resume and next-ticket stock reset. The longer level-one flows also cover an empty queue, preparation while waiting, the original 20-second arrival, 90-second completion, rewards/progress, mission return, three-life failure and Retry. Practice retains its existing no-lives behaviour; its updated Tips pause the timer and explain the three-portion example `1/4 + 1/8 + 1/8 = 1/2`.

The viewport profiles are 667×375, 852×393, 932×430, 1024×768 and 1194×834. Checks use isolated browser accounts and simulated safe areas. They verify no gameplay scrolling, contained question/stock/fraction text, reachable control centres, food-card height of at least 64px and action/removal targets of at least 44px. The compact question region has a deliberate 64px minimum with a separate response region. Text stress enlarges selected UI text to 125%; it does not constitute native Dynamic Type testing.

### Running-screen evidence

Level five: five portions, two fraction sizes, limited stock, one visible blocked item and a deliberately enabled gold Send button. This and the waiting capture were inspected after the final build; the new button uses an aspect-preserving independent image rather than a changing sliced frame.

![Level five ready to send](../../qa-artifacts/takeout-orders/layout/iphone15-level-5-ready.png)

Empty queue: the prepared tray stays intact and the button/status show the same arrival countdown. It becomes available when the next customer arrives and still requires a deliberate tap.

![Prepared tray awaiting a customer](../../qa-artifacts/takeout-orders/flow/webkit-waiting-prepared.png)

The provided portrait photo is the defect report, not a new layout reference. The previously requested landscape composition and one-customer service remain. Existing independent artwork is reused; no new assets, masks or baked controls were introduced.

## Changed files

- `src/games/takeoutRules.ts` — exact fraction rules, per-ticket restrictions and feasible order generation.
- `src/games/TakeOutRushGame.tsx` — manual submission, real stock enforcement, valid-tray evaluation and explicit waiting states.
- `src/systems/content/learnerGuides.ts` — only Takeout's name, instructions and worked example updated for the new rules.
- `variants/matharia/presentation-transform.ts` — only Takeout's presentation adapter changed.
- `variants/matharia/src/screens/TakeoutScene.tsx` — stock/blocked labels, rule summary and real Send states.
- `variants/matharia/src/screens/takeout-scene.css` — measured space for stock labels and legible disabled/ready materials.
- `scripts/verify-takeout-rules.ts` — repeatable generated-order and exact-arithmetic checks.
- `tsconfig.json` — excludes `qa-artifacts` source snapshots from the normal project typecheck; production source remains checked.
- This handover, the appended `WORKLOG.md` entry and evidence under `qa-artifacts/takeout-orders`; generated `dist-matharia` and Matharia's native public bundle refreshed.

The original nine portion values, score/reward formula, 90-second shift, three initial customers, 20-second arrivals, three lives, feedback timing, customer sequence, practice exemption and navigation are retained. Order generation and acceptance rules are intentionally changed by this request. Other game adapters/guides and protected controller/composition files pass scope checks. Existing unrelated working-tree changes were preserved. No new dependencies, backend systems or assets were added.

## Assumptions and remaining work

“Many fractions” means at least three portions and two distinct fraction values from practice/level one, increasing to five portions. Limits apply per ticket; removing/resetting portions restores stock. Existing landscape and sequential service remain in use. These decisions are centralized in `takeoutTierPolicy`.

Browser checks pass with no known unresolved failures in this scope. Native iPhone/iPad interaction, real safe areas, Dynamic Type, device animation/performance and signing remain unverified. The existing TestFlight installation has not been updated by this task. Build/sign on macOS, exercise the new orders on devices and upload the new build before treating it as installed release behaviour. The production build retains the existing large-chunk warning.

No external legacy assumptions were used.
