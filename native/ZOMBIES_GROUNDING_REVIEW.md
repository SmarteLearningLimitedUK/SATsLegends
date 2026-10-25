# Maths vs Zombies grounding — local review, 22 October 2026

The hero now uses the same explicit 90% battlefield ground coordinate as the zombies. The actor's painted-foot baseline (95% of its square) determines its top position, rather than a separate bottom offset involving the name label. The label is positioned independently, and a low stone footing touches the painted baseline. The hero is 20% larger than the enemy render box where width permits, with both sizes constrained to the available playfield.

The prior backdrop filter targeted a local image that the shared scene intentionally hides. The contrast treatment now targets the visible shared backdrop: reduced brightness/saturation and a small blur keep detailed character art in focus. The existing environment remains. The local image treatment remains available for standalone composition.

The feedback row previously disappeared when empty, changing battlefield height after an answer and moving both feet and footing. Desktop reserves that row consistently. On short landscape phones, feedback shares the instruction row, temporarily hiding the aim instruction while feedback is visible. This keeps battlefield geometry stable and frees height for the hero without covering answers.

Validation: the grounding script checks the expected ground, actual actor baseline and footing within two pixels; hero-to-enemy scale; answer controls below the playfield; and unchanged feet during casting/feedback. It covers desktop, 844×390 and 667×375 with normal/reduced motion, plus the other three selectable heroes on desktop. Screenshots are visually reviewed. The existing defeat-groan/mute checks pass at phone and desktop after adapting the test to the new local Start gate. TypeScript, website build and iOS build pass. Physical-device verification remains for a future authorised build.

Changed files: `src/games/MathsVsZombiesGame.tsx`, `src/games/maths-vs-zombies.css`, `scripts/verify-zombie-hero-grounding.mjs`, `scripts/verify-zombies-contrast-audio.mjs`, this document and evidence under `qa-artifacts/zombie-hero-grounding/`. `ZombieHeroActor.tsx` was inspected and retained.

Assumptions: retain the existing character art and terrace setting; use a low stone footing for explicit contact and keep existing cast/defeat behaviour. No external legacy assumptions were used. No deployment or TestFlight upload was performed. These changes and the new Start gate remain local; installed build `100.5.1` predates them.
