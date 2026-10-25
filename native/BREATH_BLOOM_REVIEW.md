# Breath Bloom and calm headers — local review, 21 October 2026

The shared adventure HUD's top bar is now hidden on the Calm Grove hub and all six calm activities. This removes SATs Legends, stale level labels, hearts and timer chrome from those screens. The calm activity title, exit action and existing bottom Back/Sound/Music controls remain. The wellbeing content no longer reserves an 80px margin for the removed header; its own heading respects the safe top inset.

Breath Bloom uses portrait phone presentation. The native account shell already locks wellbeing routes to portrait, so no native orientation change was needed. Mobile browsers show an upright-phone gate when sideways, pause the activity and disable its controls until upright. The learner's manual Pause state is preserved across rotation.

The breathing scene uses four rows: pace picker, flexible flower garden, cue and action. The garden shrinks to the available height instead of forcing the page to scroll. Small-screen fixed scene heights and scroll behaviour are overridden for this activity. The footer and action reserve separate space, with compact typography on short portrait screens.

Validation: compiled iOS browser checks passed at 320×568, 375×667, 390×844 and 430×932 with simulated device top/bottom insets. Checks cover no document/shell scrolling, a visible garden, control bounds, an unobscured action hit target above the footer, start, Pause/Resume, upright rotation prompt and preserved manual pause. Top-HUD absence was checked in all six calm activities. Screenshots were visually inspected. TypeScript, iOS build and website build passed. Physical-device orientation and safe-area behaviour remain for the next authorised TestFlight update.

Changed files: `src/App.tsx`, `src/wellbeing/activities/BreathingBloom.tsx`, `src/wellbeing/wellbeing.css`, `scripts/verify-breath-bloom-portrait.mjs`, this document and evidence under `qa-artifacts/breath-bloom-portrait/`.

Assumptions: remove the adventure top bar from calm screens, retain existing exit/audio controls, and apply portrait/no-scroll requirements specifically to Breath Bloom. Other calm activity mechanics remain unchanged. No external legacy assumptions were used. No deployment or TestFlight upload was performed. Wait for **“update build”**.
