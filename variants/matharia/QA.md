# Matharia verification

Validation performed on 30 October 2026 against the local production bundle, with the repository's isolated release-account fixture.

| Check | Result |
| --- | --- |
| Original SATs Legends production build | Passed |
| Matharia production build | Passed |
| Root TypeScript check and variant type check | Passed |
| Capacitor sync, including `@capacitor/app` | Passed |
| Broad Chromium sweep: 37 activities × 4 sizes, plus map checks | 152/152 passed |
| Representative WebKit sweep | 28/28 passed |
| Final Chromium checks after chart, hero, and branding adjustments | 16/16 passed |
| Final WebKit chart/hero checks | 12/12 passed |
| Mesh animation, native bridge pause/resume, phone rotation, simulated safe areas | 4/4 passed |

The broad sweep covers 667×375, 844×390, 768×1024, and 1024×768. The map additionally runs at 390×844. Each map check scrolls through all eight island pages, verifies that exactly one whole island page occupies the viewport, and opens an island. The final targeted checks additionally require the live line chart to show data points, retain at least an 80-pixel plotting surface, and clear the bottom HUD; the independent Prime Pop hero must remain visible.

Shared controls were exercised with real browser clicks, including Help, working board, and audio toggling. Animation verification compares hero canvas captures and checks that backgrounding freezes the mesh. Camera cutouts and the home-indicator region were simulated with Chromium safe-area overrides.

Evidence is in the repository's ignored `qa-artifacts/` folder:

- `matharia-release/verification-chromium.json`: complete activity sweep.
- `matharia-webkit-final/verification-webkit.json`: representative WebKit sweep.
- `matharia-visual-final/verification-chromium.json`: final targeted Chromium checks.
- `matharia-chart-webkit/verification-webkit.json`: final targeted WebKit checks.
- `matharia-motion/verification.json`: motion/lifecycle/safe-area checks.
- `matharia-review/index.html`: screenshot gallery for all 37 activities, with final selected captures substituted.

The original and variant builds retain the existing large-chunk warnings. Physical iPhone/iPad behaviour, native compilation/signing, multitasking, and TestFlight installation remain unverified on this Windows host. Native iPad target/orientation settings and launch-screen XML were inspected; they were not compiled with Xcode.

No educational question, marking, scoring, or progression modules were edited for the reskin. The final targeted runs follow the last presentation adjustments; the full sweep was not unnecessarily repeated after every CSS-only correction.
