# Homepage hero and game selection

A full-width hero introduces the shared SATs Legends universe using the existing group artwork. Matharia and Lexcoria selection appears immediately below, with existing availability and access wording retained. The hero action links to that selection.

Changed files: `src/website/HomePage.tsx`, `src/website/website-cinematic-hero.css`, and this report. Assumptions: this is a website layout change and existing game access and pricing remain in place. No external legacy assumptions were used.

Verification: TypeScript and Chromium viewport checks at 320, 390, 768 and 1440 pixels passed, including artwork loading, section order, destination links and horizontal overflow. Checks use emulation rather than physical devices.
