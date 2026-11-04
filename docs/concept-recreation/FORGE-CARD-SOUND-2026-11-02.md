# Fraction Forge question card and hammer impact — 2 November 2026

The supplied iPhone 15 capture shows question ornaments crossing the text. Forge's scene CSS reset both jewels' translation, overriding the shared outside-edge placement. Short and long questions also used different panel offsets. Placement and striking shared the same metal sample, making hammer contact hard to distinguish.

The scoped fix retains the existing independent frame, background, hero and controls. It gives the question one stable height and a 12px HUD gap, places its jewels outside the text, and derives target/mould/rack positions from that question region. The crest has an aspect-preserving 48px maximum width so it also clears the HUD and target on iPad. The original frame-to-copy padding is increased to 8% on each side; vertical padding remains 8px. The target plaque has a deliberate minimum size for its two text regions.

A doubled landscape inset was also reproduced: the stage added another safe-area margin inside an already safe-area-bounded parent. Forge alone now consumes that parent correctly; the top HUD centres on the question, and the complete rack stays visible. Its first ingot row stays below the question. No shared game geometry or other game adapters were changed.

A separate synthesized contact sound combines a sharp transient, a short body and five inharmonic metal resonances. It uses the existing audio bus, mute/stop controls and existing pause-aware 440ms hammer-contact delay (immediate with reduced motion). Placement retains its original sound. The contact lasts about 0.56 seconds and needs no download. Sources are disconnected after completion or cancellation.

## Checklist

| Area | Status | Evidence in `qa-artifacts/forge-card-sound` |
| --- | --- | --- |
| Long/short questions and neighbouring controls | 18 states pass across six WebKit browser profiles; levels 1, 2 and 5 | `layout/checks.json` |
| Real game interactions | Ten cases pass: all five levels in Chromium and WebKit | `flow/checks.json` |
| Hammer signal | Chromium offline rendering passes attack/body/ring, peak, clean ending and cancellation checks | `audio/signal-checks.json` |
| Hammer contact and mute | Real-time Chromium pause, normal-motion contact, mute cancellation and leaving during wind-up pass | `audio-timing.json` |
| TypeScript/build/source contracts | Variant typecheck, root lint/typecheck, production build and shared contracts pass; 37 approved reference hashes retained | `typecheck.log`, `lint.log`, `build.log`, `shared-contract.json` |
| Preservation | Seven protected files unchanged; removing the new Forge-only branch/import leaves the previous audio engine identical | `scope.json` |
| Local iOS public bundle | All 840 files hash-match the build; iOS 16.4 verified in four Xcode settings and Swift package | `native-copy.json`, `native-sync.log` |
| Native device execution and TestFlight | Outstanding | No simulator/device or signed upload was performed on Windows |

Combined receipt: [RESULT.json](../../qa-artifacts/forge-card-sound/RESULT.json).

The browser profiles are 844×390 reference, 852×393 iPhone 15, 667×375 compact phone, 932×430 large phone, 1024×768 iPad and 1194×834 large iPad. The phone/iPad safe areas are simulated. Checks separately measure text versus jewels, HUD separation, target padding, rack bounds, question-versus-ingot overlap, hit centres, 44px control targets and absence of gameplay scrolling. Screenshots were inspected after correcting the largest discrepancies. A 0.0078px target-text rounding difference was handled with a 0.5px measurement tolerance; an actual iPad ornament collision was corrected in source.

The gameplay cases exercise legal selection, Clear, wrong/correct strikes, life loss, disabled controls, pause/resume, stable question bounds between commissions and immediate reduced-motion contact. Both level-five cases complete six real commissions, mute between questions, reach victory/rewards and return to the Fraction Forge mission group. The existing fraction controller, prompt/recipe banks, score rules and timing code remain unchanged by hash.

Chromium's offline signal has peak 0.6566, attack RMS 0.1986 and ringing-tail RMS 0.0202. Cancellation produces silence and invokes cleanup once. Real-time contact was observed at about 458ms of active time, including browser input/scheduling overhead, against the existing 440ms delay. Muting an active ring stops its voices; pausing before contact holds the cue; leaving before contact produces no delayed hit. These are signal and browser execution checks, not a device listening test.

### Direct visual and sound evidence

The before image is the user-provided iPhone capture. The after image is the running compiled application in WebKit at iPhone 15 dimensions with simulated safe areas. Both show the actual `7/10` question and the same four fraction values; the after state is produced by a repeatable random seed, without changing game logic or placing fake text over a screen.

![Question comparison](../../qa-artifacts/forge-card-sound/question-comparison.png)

Full running capture: [iphone15-final.png](../../qa-artifacts/forge-card-sound/iphone15-final.png). Longer division question: [iphone15-level-5.png](../../qa-artifacts/forge-card-sound/layout/iphone15-level-5.png). The approved 1844×853 v2 Fraction Forge reference remains unchanged at `variants/matharia/reference/approved/fraction_forge-v2.png`.

Sound preview rendered from the same synthesis function: [anvil-contact.wav](../../qa-artifacts/forge-card-sound/audio/anvil-contact.wav). This preview is before the existing game master gain/compressor and any physical device volume controls.

## Changed files

- `variants/matharia/src/screens/forge-scene.css` — stable padded question, outside ornaments, safe-area alignment, target/mould/rack layout budget.
- `src/audio/forgeStrike.ts` — new self-contained metal-on-anvil synthesis with cleanup/cancellation.
- `src/audio/gameAudio.ts` — selects that cue only for Fraction Forge impact, on the existing master/stop path. All other audio code is preserved.
- This handover, the appended `WORKLOG.md` entry, QA scripts/evidence under `qa-artifacts/forge-card-sound`, and regenerated production/native public bundles.

No new bitmap assets, recorded clips, dependencies, question content, rules, account/purchase code or backend systems were introduced. Existing unrelated working-tree changes were preserved.

## Verification limitations

This Windows WebKit runner exposes no Web Audio API, so its gameplay/layout checks cannot verify sound. Audio rendering and actual playback scheduling were checked in Chromium. Native iPhone/iPad sound balance, audio routing/silent-mode behaviour, real safe areas, Dynamic Type and device animation/performance remain unverified. A signed macOS build and device pass are still required; the existing TestFlight installation has not been changed. The production build retains the existing large-chunk warning.

Assumptions: “definitive hit” means a distinct metal-on-anvil contact, separate from placing an ingot; retain the existing hammer timing and gameplay. Only the current prompt, supplied image and repository were used. No external legacy assumptions were used.
