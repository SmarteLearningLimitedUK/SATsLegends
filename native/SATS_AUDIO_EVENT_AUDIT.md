# Current audio event trace

23 October 2026. Read-only audit of current 37-game catalogue, routed sources, shell event handlers, sound profiles and sample assets. Evidence: `qa-artifacts/full-playtest/audio-source-trace.json`; reproducible `python scripts/audit-full-playtest-audio.py`.

All 37 current game keys have explicit sound profiles. The existing profile verifier passes 38 keys because its constants inventory also includes a non-current catalogue key; that count must not be presented as 38 played games. All 20 referenced sample clips exist.

Gameplay button taps use App's capture handler, except buttons declaring their own handling. Correct/incorrect callbacks reach shell cues through direct handlers or session events. AngleArena delegates outcome through AppRouter's onRoundComplete; CoordinatesQuest re-exports TreasurePath, whose answer paths emit events. Core intentionally defers correctness feedback until review rather than sounding correct/incorrect on answer entry. Terminal and UI sounds are present. This is event coverage, not an audible branch-by-branch playtest.

Material cues include forge/metal impacts, potion liquid, coins/cash, bubbles, scanner, rocket boost and monster voices. MathsVsZombies' actual hit callback plays impact plus monster_defeat, with one defeat per successful hit. That voice is not suppressed by the ambient-growl throttle; it uses the growl sample slowed to 0.78 rate. No missing zombie-defeat call was found.

Mute/hidden/pause paths stop pending and active effects. Audio unlock is attached to pointer and Enter/Space gestures. Sample decode failures fall back to synthesis. MirrorGate and MatrixMatch use the configured default music track instead of individual entries; they still have distinct effect profiles. This is not a missing-cue defect.

No new audio defect requiring production changes was established in this source audit. Device speaker balance, subjective suitability, iOS interruptions and audible success of every interaction remain outside this trace. Existing old audio reports/scripts were inspected as implementation references, not relabelled as fresh passed playtests. No direct function invocation was used to manufacture game-event audio evidence. No deployment/TestFlight upload occurred.
