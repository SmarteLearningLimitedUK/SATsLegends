# Breath Bloom illustrated control finish — 2 November 2026

The supplied close-up rejected the unframed cue and plain Pause button. This pass uses the existing sapphire-and-gold game artwork to give the real interactive controls the same material treatment as the HUD. Existing scenery, flower, instructions, breathing timings and completion rules are retained. No external legacy assumptions were used.

## Completion checklist

| Element/state | Result | Evidence |
| --- | --- | --- |
| Breathing console | Cue, guidance and action grouped within one independent gold/gem frame, with live text and padded regions | [Running close-up](../../qa-artifacts/bloom-materials/running-console.png) |
| Pause / Resume | Sapphire bezel, solid aspect-preserving vector symbols, icon and label centred as one group | [Inhale](../../qa-artifacts/bloom-materials/normal-in.png), [paused](../../qa-artifacts/bloom-materials/normal-paused.png) |
| Begin / next / finish | Gold action surface; original labels and handlers; fixed control slot; confirmation mark while original completion is pending | Four full flows reach the original completion dialog |
| Pace choice | Sapphire controls and gold selected material; original timing text, disabled rules and selected state | All three paces exercised through actual controls |
| Introduction / status | Existing leaf/gold frames, reserved text gutters and room for the Tips tile | [Full phone](../../qa-artifacts/bloom-materials/after/iphone15.png) |
| Compact layout | Copy beside the action on short screens; the garden keeps a visible region | [Compact phone](../../qa-artifacts/bloom-materials/after/compact.png), [320×568 stress case](../../qa-artifacts/bloom-materials/after/small.png) |
| iPad layout | Wide console with text/action columns, preserved frame corners and readable line lengths | [Portrait](../../qa-artifacts/bloom-materials/after/ipad.png), [wide](../../qa-artifacts/bloom-materials/after/ipad-wide.png) |
| Functional verification | Original paces, pause/resume, four user-started cycles, check-ins, progress, five flowers, finish/reward and navigation pass | [Flow receipt](../../qa-artifacts/bloom-materials/flow/checks.json) |
| Local native bundle | Capacitor sync; 840 files match production output; minimum iOS 16.4 retained | [Native copy receipt](../../qa-artifacts/bloom-materials/native-copy.json) |

[Supplied photo versus actual running console](../../qa-artifacts/bloom-materials/before-after-detail.png). The comparison preserves image proportions and clearly labels the native supplied photo separately from the browser capture. It is QA evidence, not an app background or interactive asset.

## Rendering and assets

The original React controller remains in `src/wellbeing/activities/BreathingBloom.tsx`. The Matharia build adapter replaces only its cue/action markup with `BloomControlPanel`, passing original cue/detail strings, flags and callbacks. The original controller still owns pace selection, remaining time, pause, cycle count, flower count and completion. Other wellbeing activities receive no new frame output.

Inspected blank production assets reused through the existing `ArtworkFrame` / `CanvasFrame` renderer:

- `frames/glacier_panel_v3` — the breathing console.
- `frames/concept_hud_wide_v4` — the introduction and status plates.
- `buttons/scale_key_v4` — sapphire controls.
- `buttons/paper_gold_v3` — selected pace and primary actions.

These contain no baked labels or controls. Nine-slice rendering preserves ornamental corners; live text and SVG symbols are separate. Decorative frames cannot intercept touches. The symbols use tight view boxes and retain their aspect ratios, avoiding transparent icon margins. Material changes use separate decorative instances so an old canvas is not retained when switching surfaces. No new raster assets, dependencies, scenery masks, patches or flattened screenshot UI were introduced.

The regular phone console uses a vertical copy/action layout, with a 260px maximum action width and 60px control slot. Short screens use a copy/action column pair with a 100px control slot; iPad uses wide text and action columns. Supporting copy reserves two lines where practical. Press feedback is restrained and removed under reduced motion; original flower animation and pacing are unchanged.

## Verification

- Six final WebKit layouts: 320×568, 375×667, 393×852, 430×932, 768×1024 and 1024×768. Insets are simulated, including iPhone 15 59px top / 34px bottom. No page scrolling, overlapping regions, intercepted controls or sub-44px targets in these cases.
- Four full flows: WebKit compact/phone/iPad and Chromium phone. Easy 3s/4s, Steady 4s/5s and Unhurried 5s/6s retain their durations. Pause holds phase/progress; Resume continues. Four cycles grow five flowers and reach the original finish/reward dialog and Calm Grove destination.
- 36 live-state copy-padding and icon/label alignment observations across inhale, paused and check-in states. Maximum measured group-centre error: 0.011px horizontally and 0.227px vertically.
- Real-clock Chromium confirms flower growth, held scale/progress while paused, resumed growth, the existing Back-to-adventure destination and no delayed completion after leaving the active cycle.
- 125% browser text stays inside its containing regions, with a visible flower and no page scrolling. This is not a native Dynamic Type test.
- Variant TypeScript and production build pass. Original controller, shell source and completion hook hash-match the pre-pass versions; shared contracts and all 37 approved game-reference hashes pass.
- Final Capacitor public copy matches all 840 production files. Four Xcode deployment settings and the Swift package retain minimum iOS 16.4.

Receipts: [RESULT](../../qa-artifacts/bloom-materials/RESULT.json), [layout geometry](../../qa-artifacts/bloom-materials/after/checks.json), [full flows](../../qa-artifacts/bloom-materials/flow/checks.json), [normal motion/text](../../qa-artifacts/bloom-materials/motion-text.json), [source preservation](../../qa-artifacts/bloom-materials/source-preservation.json).

## Changed files and handover

- [BloomControlPanel.tsx](../../variants/matharia/src/BloomControlPanel.tsx) — presentation component, live action states and solid vector symbols.
- [breath-bloom.css](../../variants/matharia/src/breath-bloom.css) — illustrated materials, grouped controls, gutters and responsive constraints.
- [presentation-transform.ts](../../variants/matharia/presentation-transform.ts) — guarded Bloom render bindings and conditional blank frame insertion.

Additional outputs: this checklist, the WORKLOG entry, scoped scripts/captures/receipts under `qa-artifacts/bloom-materials`, and the generated native public bundle. No educational, account, save, purchase or progression logic was edited.

Assumptions: retain the current scenery/flower and existing breathing content and mechanics; use the repository's sapphire-and-gold art family. No external legacy assumptions were used.

Native iOS rendering, actual safe areas/orientation, Dynamic Type and native performance remain unverified on this Windows host. Browser flows use the isolated release-account fixture. No TestFlight upload, deployment or merge was performed. The device/TestFlight candidate still needs a native run and upload before these changes can be installed from TestFlight.
