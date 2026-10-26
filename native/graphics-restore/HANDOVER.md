# Original artwork with current layouts

The owner rejected the muted treatment and requested the original graphics/materials with the latest screen compositions. The Conversion Canyon mechanical scale is explicitly retained.

- Restored the original rocket and original food artwork imports.
- Restored reference question illustrations, jewel sockets, carved frames, brighter scenery and dimensional emerald/blue/gold controls.
- Retained the measured portrait/landscape layouts, compact utility controls, full question wording, seven-column place-value structure and complete Match board.
- Kept Conversion Canyon's existing MechanicalScale source unchanged. Weight tiles have separate primary/secondary lines, 8px gaps and shorter shadows; repeated decorative highlights are suppressed over their labels.
- Changes are in src/design/restored-fantasy-materials.css, src/main.tsx, src/games/visionScene.ts, src/games/TakeOutRushGame.tsx and the recorded presentation exception metadata. scripts/verify-restored-conversion.mjs records eight device/motion interaction checks.

## Verification

The 148 rendered game captures pass their viewport and complete-question/control bounds checks. Eight Conversion Canyon device/motion cases pass: no label intersection, separate rows, accessible action row, correct select/reset state and an unchanged scale component. TypeScript, the iOS web build, educational-source guard and exact presentation reconstruction checks pass. Additional gameplay and native build results are recorded with the release candidate.

qa-artifacts/graphics-restore/before contains the muted screenshots retained before this correction. The current gallery will show the restored materials over the latest layouts. Earlier generated replacement exports remain on disk for provenance; the rocket and food defaults now use the original images. No new stock or generated art was added.

## Release status

Packaging is authorized by the owner's preceding TestFlight request, with this visual correction incorporated. Native compilation and signing must use the macOS workflows for the exact candidate commit. No new TestFlight upload has yet completed. Physical-device visual, VoiceOver and performance sign-off remain separate from simulator compilation/launch evidence.

Assumptions: the previous illustrated art and rich materials are the visual reference; current screen layouts and the explicitly preferred mechanical scale are retained. Educational content, gameplay rules and learner data are preserved. No external legacy project assumptions were used.
