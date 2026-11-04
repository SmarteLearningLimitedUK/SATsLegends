# Percent Power display, scenery and animation — 2 November 2026

The latest iPhone 15 image rejects the offset, visually unrelated charge panel, insufficient animation, busy scenery and indistinct hero. Work uses the current SATs Legends React/TypeScript/Vite rendering path in `codex/website-refinement-2026-10-28`. The native wrapper remains Capacitor with minimum iOS 16.4. Unrelated work is retained.

## Implementation

The independent reactor prop now contains a deliberately blank emerald instrument aperture, built into its brass engineering. Live text is a child of the aspect-preserving prop, anchored at 50.1% of image width and 54% of height, inside its measured 49% × 15.2% aperture. It no longer uses a detached question frame. Original charge and restored-cell counts still come directly from the controller. The numerical value and charge bar remain live and accessible.

A new quiet ivory/emerald courtyard replaces the waterfall/castle/flower clutter. The existing hero uses the repository's guide pose, with a clear silhouette against pale stone and the same floor baseline as the machine. Shared portrait header placement remains owned by the shared HUD. Question, tableau, answer console and footer have explicit responsive regions. Long questions expand their padded region using measured text height. Console padding scales with its ornamental frame, including on iPad. The reference phone and larger devices retain the 2×2 answer grid; the tightest 320×568 profile uses four adjacent answers with at least 44px targets to preserve legible controls and space for the machine. Gameplay does not scroll.

Scenery cropping is anchored to the measured terrace floor (source y=1030 of 1846), so wide iPad cover crops place the feet and machine base on the terrace rather than against its wall. The offset is clamped to cover's available overscan: no stretching, concealed scenery or empty bands are introduced. It resets when leaving the screen.

Independent SVG energy streams/motes and a rotating core ring animate inside the machine. Correct answers add a brief charge/readout pulse; incorrect answers trigger a short machine-and-display vent together. There is no added input delay. Pause, ended rounds and reduced-motion preferences stop the appropriate effects. Original hero animation and game sound/haptic settings are retained.

## Original mechanics preserved

`src/games/PercentPowerGame.tsx`, `src/App.tsx`, `src/app/useGameplaySession.ts`, `src/audio/gameAudio.ts`, `StageHero.tsx` and the presentation adapter match their pre-task SHA-256 hashes. Only the Percent Power background entry changes in the composition catalogue. All questions, answers, helper copy, awards, lives, timers, difficulty, navigation and save/progression behaviour remain in the original code.

Rounds per tier remain 5/6/6/7/7. Correct-answer feedback remains 540ms, wrong-answer feedback 620ms and the final callback 320ms. Original wrong answers advance the round; a one-error victory therefore legitimately has fewer than 100% restored cells. This rule was verified without alteration.

## Screen checklist and verification

| Check | Evidence | Status |
| --- | --- | --- |
| Representative phone scene, value alignment and padding | `qa-artifacts/percent-focus/layout/iphone15-level-1-idle.png` | Browser capture |
| Six phone/iPad layouts, tiers 1/3/5 idle/correct | `layout/checks.json` | All 36 measured states pass, including the scenery floor |
| Enlarged question/guidance and live 100% value | `text-checks.json` | Three cases pass; selected text at 125%, not native Dynamic Type |
| All five tiers, both engines | `flow/checks.json`, `flow/summary.json` | Ten real tier flows pass |
| Normal/reduced motion, correct/vent, pause/resume | `motion-checks.json` | Four real-clock cases; visual limitation below |
| Actual animated preview | `motion-preview.gif`, `motion-contact-sheet.jpg` | Captured Chromium frames, with visible hero; no synthetic animation |
| TypeScript, production build and native resources | Build/typecheck/lint/native receipts | Pass; 844 native public files hash-match at iOS 16.4; native execution unverified |

![User image versus actual final running screen](../../qa-artifacts/percent-focus/comparison.png)

[Actual machine/hero animation preview](../../qa-artifacts/percent-focus/motion-preview.gif) · [Normal-motion iPad capture](../../qa-artifacts/percent-focus/normalfullipad.png)

Functional checks independently solve direct percentages, reverse whole-number questions and percentage increases. They verify the original award formula, exactly one cell for one answer, duplicate-touch protection, pending feedback and clock pause/resume, life loss, two-star clears, three-error failure, Retry, perfect 100% three-star clears, Next Level and Map/Close returning to Percent Power.

Browser sizes: 320×568, 375×667, 393×852, 430×932, 768×1024 and 834×1194, with simulated safe areas. Geometric checks measure the text against the actual prop aperture, shared floor, padded text regions, control hit testing, frame/console spacing and page overflow. Compilation is supplemented by inspected captures and the real animation preview.

The saved baseline readout was 12.28 CSS pixels to the right of the machine's centre on iPhone 15. Across the final 36 captured states, the live value's maximum horizontal offset from the prop aperture's measured centre is 0.113 CSS pixels. All three 100% readout cases remain inside the aperture. Final receipt: `qa-artifacts/percent-focus/RESULT.json`. Serial post-crop integration checks pass in both engines; historical parallel screenshot/load contention is retained in the flow summary, rather than being treated as a game failure.

## Assets and changed files

Built-in `image_gen` produced the selected assets. Full prompts and mode are saved in `variants/matharia/reference/percent-focus-prompts.json`; source paths, dimensions, alpha and export details are in `qa-artifacts/percent-focus/assets.json`.

- `variants/matharia/assets/png/props/percent_reactor_display_v4@2x.webp`: 1065×1476 RGBA, 456,798 bytes, original generated alpha preserved.
- `variants/matharia/assets/png/backgrounds/bg_percent_quiet_v4@2x.webp`: 852×1846 RGB, 175,692 bytes.
- `variants/matharia/src/screens/PercentScene.tsx`: machine-owned live display, independent animation layers, measured question fitting and existing guide pose.
- `variants/matharia/src/screens/percent-scene.css`: explicit responsive layout, frame-relative padding, animation and motion preferences.
- `variants/matharia/src/compositions.ts`: this game's background only.
- Prompt/provenance record, this handover, `WORKLOG.md`, QA scripts/evidence under `qa-artifacts/percent-focus`, and synced local Capacitor resources.

The selected images are whole-image WebP exports. No background masks, patches, alpha removal, stretched props, baked text, duplicate controls or screenshot-as-interface are used. The approved image remains unchanged at `variants/matharia/reference/approved/percent_power.png` (853×1844). Its busy scenery is superseded by the latest feedback; the prop's integral aperture restores the concept's integrated instrument treatment.

## Verification limits before distribution

Windows WebKit normal-motion screenshots omit the WebGL hero despite a nonempty, correctly drawn buffer, nonzero-size visible elements, active animation, no context loss and no GL error. Chromium normal screenshots/animation and WebKit reduced-motion stills show the hero correctly. Read-only layer, containment, parent-position and preserved-buffer probes did not resolve the Windows capture; copying the actual buffer into a temporary image displays the correct hero. This is recorded in `motion-limitations.json` and does **not** establish native iOS visibility. No global renderer workaround was introduced for a screenshot failure. A real iPhone/iPad normal-motion hero check remains required.

Native iOS execution, real safe areas, Dynamic Type, native backgrounding and performance/audio routing remain unverified on this Windows host. Signing on macOS and uploading a new TestFlight build remain outstanding. No push, merge, deployment or TestFlight upload was performed. The existing production large-chunk warning remains.

Assumptions: retain portrait gameplay, emerald/brass machine identity and sapphire/gold shared controls; latest feedback authorizes quieter scenery and an integrated live readout; educational content and mechanics remain exact. No external legacy assumptions were used.
