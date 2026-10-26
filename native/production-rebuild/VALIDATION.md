# Candidate validation

Local implementation and Chromium verification. Not an App Store/native device certification.

Browser gates: passed. No TestFlight upload was performed.

| Game | Orientation | Device layouts | Answer interactions | Start / Help / rotation / exit |
|---|---|---|---|---|
| Place Value Panic L5 | portrait | 4/4 | Pass | Pass |
| Number Line Ninja L5 | landscape | 4/4 | Pass | Pass |
| Prime Pop L5 | portrait | 4/4 | Pass | Pass |
| Rounding Rocket L5 | portrait | 4/4 | Pass | Pass |
| Maths vs Zombies L5 | landscape | 4/4 | Pass | Pass |
| Take-Out Rush L5 | portrait | 4/4 | Pass | Pass |
| Fraction Forge L5 | landscape | 4/4 | Pass | Pass |
| Match Mastery L5 | landscape | 4/4 | Pass | Pass |
| Percent Power L5 | landscape | 4/4 | Pass | Pass |
| Simplify Sprint L5 | landscape | 4/4 | Pass | Pass |
| Angle Arena L5 | landscape | 4/4 | Pass | Pass |
| Polygon Palace L5 | landscape | 4/4 | Pass | Pass |
| Area Architect L5 | landscape | 4/4 | Pass | Pass |
| Transformation Station L5 | landscape | 4/4 | Pass | Pass |
| Coordinates Quest L5 | landscape | 4/4 | Pass | Pass |
| Conversion Canyon L5 | landscape | 4/4 | Pass | Pass |
| Perimeter Path L5 | landscape | 4/4 | Pass | Pass |
| Mean Machine L5 | portrait | 4/4 | Pass | Pass |
| Graph Grabber L5 | landscape | 4/4 | Pass | Pass |
| Line Graph Lab L5 | landscape | 4/4 | Pass | Pass |
| Data Detective L5 | landscape | 4/4 | Pass | Pass |
| Factor Frenzy L5 | landscape | 4/4 | Pass | Pass |
| Multiplication Mine L5 | landscape | 4/4 | Pass | Pass |
| Order Ops Arena L5 | landscape | 4/4 | Pass | Pass |
| Formula Forge L5 | landscape | 4/4 | Pass | Pass |
| Remainder Run L5 | landscape | 4/4 | Pass | Pass |
| Chrono Dash: Time Trial L5 | landscape | 4/4 | Pass | Pass |
| Problem Pyramid L5 | landscape | 4/4 | Pass | Pass |
| Lava Path L5 | landscape | 4/4 | Pass | Pass |
| Change Counter L5 | landscape | 4/4 | Pass | Pass |
| SATs Paper 1: Arithmetic | landscape | 4/4 | Pass | Pass |
| SATs Paper 2: Reasoning | landscape | 4/4 | Pass | Pass |
| SATs Paper 3: Reasoning | landscape | 4/4 | Pass | Pass |
| Potion Panic L5 | landscape | 4/4 | Pass | Pass |
| Share Splitter L5 | landscape | 4/4 | Pass | Pass |
| Ratio Racer L5 | landscape | 4/4 | Pass | Pass |
| Scale Builder L5 | landscape | 4/4 | Pass | Pass |

All three full core papers, blank-paper handling and timeout draft recovery passed. All six calm activities completed at phone and desktop sizes (12 cases). Correct/wrong answers, selected completions, retry, result settlement and audio lifecycle have rendered evidence under qa-artifacts/production-rebuild. The protected-source guard retains 164 identical files plus two exactly hashed presentation exceptions (orientation and the compact Mean Machine readout). The curriculum regression covered 600 complete paper variants, 53 topic families, 70 readable prompts, 12 data puzzles and all 28 difficulty checks.

## Required native release gates

- Xcode simulator build/archive of this candidate
- Physical iPhone: safe areas, rotation lock, home indicator and background/resume
- VoiceOver and supported accessibility text sizes
- Native frame pacing and decoded texture memory
- Safari/WebKit verification (browser runtime unavailable on this Windows host)

## Coverage limits

- Random game generators are tested representatively, not through every possible sequence. Polygon Palace solid counting/sorting and its 3D property branch were covered in complementary seeded runs.
- Account tests use an isolated local API fixture, not real credentials or account writes.
- Tablet sizes are browser stress tests; the native project targets iPhone.

Both Vite targets and TypeScript must pass for this candidate. Existing bundle-size warnings remain: the artwork library makes the iOS web bundle about 331MB. This is bundle storage, not measured iOS resident memory. Four new compressed scene exports total about 1.41MB. See asset-inventory.json and the desktop rendering samples; neither substitutes for Instruments.
