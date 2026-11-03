# Centred SATs Legends hero

The homepage hero now centres its headline and uses a cinematic ensemble scene based on the existing SATs Legends character artwork. The four adventurers are placed across the centre of a shared landscape, with the game-selection section directly beneath the hero. The purple, blue and gold identity and existing access wording are retained. On phones the heading and artwork stack to protect readability.

Changed files: `src/website/HomePage.tsx`, `src/website/website-cinematic-hero.css`, `src/assets/website/universe-hero-centered.png` and this report. Assumptions: this is a website visual change and existing game access and prices remain in place. No external legacy assumptions were used.

Verification: TypeScript passed; Chromium emulation at 320, 390, 768, 1024, 1440 and 1920 pixels checked centred heading, image loading, selection order, destination links and horizontal overflow. Physical-device testing was not performed.
