# Maths vs Zombies — local review, 21 October 2026

The existing background is graded darker and less saturated, with a soft radial shadow behind the hero. A subtle warm edge shadow separates the hero from the scenery without changing its art or scale. The setting and gameplay layout remain unchanged.

Each confirmed defeat now triggers `monster_defeat` instead of the short hurt cue. It uses the existing monster-growl recording at 0.78 playback speed for a lower, longer groan. Defeat sounds bypass the ambience cooldown and have a separate playback group, so spawning growls and laughter cannot cut them off. Distinct defeats can finish their own groans. Global mute, pause/leave cleanup and hidden-tab behaviour still use the shared audio controls. A descending synthesized tail is available if the recording fails to decode.

Validation: compiled iOS browser checks at 844×390 and 1440×900 defeated three zombies each and observed three non-silent decoded groan recordings, with no explicit interruption by monster ambience. A further defeat with audio muted produced no groan. Screenshots were visually reviewed. TypeScript, iOS build and website build passed. This is automated audio playback verification; physical iPhone listening remains for the next authorised build.

Changed files: `src/games/MathsVsZombiesGame.tsx`, `src/games/maths-vs-zombies.css`, `src/audio/gameAudio.ts`, `src/audio/gameSampleLibrary.ts`, `scripts/verify-zombies-contrast-audio.mjs`, this document and evidence under `qa-artifacts/zombies-contrast-audio/`.

Assumptions: retain the current setting and hero art; every confirmed zombie defeat gets a groan when sound is enabled. No external legacy assumptions were used. No deployment or TestFlight upload was performed. Wait for **“update build”**.
