# Graph Grabber chart focus — 2 November 2026

## Request and assumptions

The supplied iPhone landscape image requests better use of screen space: a larger graph and smaller answers. Use the current repository and supplied screenshot, retain the approved harbor materials/independent assets and central shared HUD, and preserve shipment data, questions, correct answers, scoring, lives, timing, progress and navigation. This is presentation work in the existing React/TypeScript/Vite Matharia variant.

The approved harbor reference is `variants/matharia/reference/approved/graph_grabber.png` (1844×853). The current user request authorizes rebalancing its chart/answer hierarchy while retaining the existing materials. The baseline 852×393 browser viewport with simulated 59px side / 21px bottom safe areas has a 411.03×119.63 chart frame but only 378.16×81.31 physical plot. Its four answer targets are about 100.68×44px. The duplicate landscape inset shifts the stage to x118..852, clipping Trace beyond the safe right edge.

## Changed production files

- `variants/matharia/src/screens/graph-scene.css`: removes Graph's duplicate landscape inset; allocates the main landscape region to the chart and uses a narrow right answer column. Individual buttons retain 44px minimum targets with smaller numeric/name typography. The original central HUD stays in place. Chart title/plot/boat-name regions use explicit padding and larger readable labels. The decorative guide is centred in the spare left column, accounting for the renderer's transparent canvas margins and preserving the original ground line.
- `variants/matharia/src/screens/GraphScene.tsx`: preserves the answer lock/handler and uses the same four live choices in the right column. Locked feedback occupies that column, keeping the chart stable. Original support text remains accessible through the existing Tips hook. The long-question threshold now recognizes current 83/88-character prompts rather than an unreachable 115-character threshold.
- `variants/matharia/src/screens/ShipmentChart.tsx`: larger physical axis gutters, 14px tick labels and readable tick pitch. Zero and maximum remain visible; a penultimate label is omitted if it falls within 22 physical pixels of the maximum, preventing the appended endpoint from overlapping it. Original step values 1/2/5/10/20, common linear maximum/projection, per-step crate drawing, live values and inspection callbacks remain unchanged.
- This handover, `WORKLOG.md`, QA scripts/receipts/captures in `qa-artifacts/graph-chart-focus` and the prepared local Capacitor public copy.

No new art, masks, background patches or flattened UI are required. The existing independent frames and controls are reused.

## Persistent checklist

| Check | Evidence | Status |
| --- | --- | --- |
| Reproduce small graph / oversized answer hierarchy | Baseline actual-game captures and bounds | Reproduced |
| Larger readable plot and restrained answer column | Plot area 1.98×; phone, compact, iPad captures and bounds | Pass in browsers |
| Correct scale, crates, labels and inspection | Real source-data calculations, crate ratios, 0/max ticks and Trace checks | Pass |
| Correct/wrong/duplicate answers, timing and pause | Twelve marked answers; original 155/334 XP and 950/1150ms delays | Pass in browsers |
| Long questions, feedback and enlarged prose | Target/pair questions, 125% prose stress and no overlapping ticks | Pass in browsers |
| Scope, production build and typecheck | Final logs; 30 protected source files and five reference/asset hashes unchanged; original guards/scale intact | Pass locally |
| Native copy at iOS 16.4 | Final sync/minimum logs and 848 matching build files by SHA256 | Pass locally |

## Measured result and evidence

At the same 852×393 phone viewport and representative five-boat state, the plot grows from 378.16×81.31 to 447.08×135.92 CSS px: 1.98× its original area. Its frame grows from 411.03×119.63 to 467.08×199.92. A representative crate side increases from 8.62 to 15.27px (1.77×). The answer group now occupies a narrow right column with smaller type; individual cards retain 44px height and gain width/padding for long boat names. The central navigation HUD stays in its original position. Trace is now safely visible rather than clipped off the right edge.

Four focused profiles cover compact 667×375, phone 852×393, iPad 1024×768 and reduced-motion WebKit. They provide 33 full-flow measured states, twelve independent markings and 198 answer/Trace control rectangles. Two final phone/compact guide smokes bring the measured-state total to 35. Correct/wrong answers, repeated input rejection, original score/life behavior, pause/resume, bar/name inspection, Trace selection and dismissal, long source questions and 125% question/feedback prose stress pass. The final guide-only CSS refinement leaves all chart/control geometry unchanged; its larger visible head/body/boots are inspected in the refreshed phone/compact captures.

Axis-name inspection labels are 24px high; their existing equivalent Trace controls are 44px or larger. No claim is made that the smaller axis labels themselves have 44px touch boxes. Zero/max remain present. The compact max-9 case now uses 0/2/4/6/9 without the previous 8/9 text collision. This changes only visible label density, retaining the original scale and crate values.

`qa-artifacts/graph-chart-focus/comparison.png` contains actual before/after browser captures. `after/checks.json`, `after/metrics.json` and `after/guide-smoke.json` hold final measurements and functional receipts. Earlier tick-collision and undersized-guide diagnostics are archived separately. Phone idle/error, final phone/compact guides, iPad and the combined comparison were visually inspected. Default WebGL alpha readback is empty after compositing, so visible guide containment is a screenshot inspection, not a numerical silhouette-bounds claim.

`source-scope.json` verifies 30 protected source files and five reference/asset hashes unchanged, including shipment questions/controller, presentation adapter, shared shell/session/HUD/audio and approved materials. Chart code is checked to differ only in physical gutters, tick pitch/endpoint clearance and tick font. All 848 distribution files match the local Capacitor public copy, and the iOS minimum remains 16.4. Aggregate receipt: `qa-artifacts/graph-chart-focus/RESULT.json`.

## Limits

Browser viewport and safe-area checks are not native iOS testing. Native rendering, accessibility, orientation, backgrounding and performance remain unverified on this Windows host. A full victory/failure sweep and real backend/account/purchase operations were not repeated. No TestFlight upload, publication, push or merge is included. Before production, verify the prepared bundle on native iPhone/iPad and submit a signed build when requested.

No external legacy assumptions were used.
