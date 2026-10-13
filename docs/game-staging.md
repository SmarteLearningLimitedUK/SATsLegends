# Game staging inventory

Each registered game has an explicit setting. Existing staged games retain their native scenes. Other games receive a physical play surface and peripheral equipment, anchored to their real boards. Materials include stone daises, workbenches, plotting instruments, galleries, mine rigs, archives, cargo docks and reactor consoles.

Fixtures use existing illustrated environments and scalable vector props. Success/error cues forward the existing typed game event once. Maths, question generation, difficulty and scoring remain owned by their original games. Added scene motion respects reduced motion and the shared pause state.

## Current playable routes

| Game | Setting | Implementation | Sample route |
|---|---|---|---|
| PlaceValuePanic | Number stone sanctuary | Anchored fixture and equipment | `/game/1/1` |
| NumberLineNinja | Ninja measuring bridge | Anchored fixture and equipment | `/game/1/2` |
| PrimePop | Crystal ward clearing | Existing dedicated scene | `/game/1/3` |
| RoundingRocket | Rocket assembly launch complex | Existing dedicated scene | `/game/1/4` |
| MathsVsZombies | Village spell defence lane | Existing dedicated scene | `/game/1/41` |
| TakeOutRush | Cafe hero service counter | Existing dedicated scene | `/game/2/1` |
| FractionForge | Fraction smithy anvil | Existing dedicated scene | `/game/2/2` |
| FractionMatch | Equivalence mosaic gallery | Anchored fixture and equipment | `/game/2/3` |
| PercentPower | Percentage reactor chamber | Existing dedicated scene | `/game/2/4` |
| SimplifySprint | Simplification escape chamber | Existing dedicated scene | `/game/2/5` |
| AngleArena | Glacier sparring arena | Existing dedicated scene | `/game/3/1` |
| PolygonPalace | Palace shape exhibit | Anchored fixture and equipment | `/game/3/2` |
| AreaArchitect | Architect construction table | Anchored fixture and equipment | `/game/3/3` |
| RotationStation | Rotation turntable workshop | Anchored fixture and equipment | `/game/3/4` |
| CoordinatesQuest | Treasure navigator chart table | Anchored fixture and equipment | `/game/3/5` |
| ConversionCanyon | Canyon weighing installation | Anchored fixture and equipment | `/game/3/6` |
| PerimeterPath | Surveyor boundary platform | Anchored fixture and equipment | `/game/3/7` |
| MeanMachine | Island power calibration workshop | Existing dedicated scene | `/game/4/1` |
| GraphGrabber | Data observatory chart stand | Anchored fixture and equipment | `/game/4/11` |
| LineGraphLab | Weather observatory plotting desk | Anchored fixture and equipment | `/game/4/12` |
| DataDetective | Detective evidence station | Anchored fixture and equipment | `/game/4/13` |
| FactorFrenzy | Factor crystal laboratory | Anchored fixture and equipment | `/game/5/1` |
| MultiplicationMine | Mine extraction rig | Anchored fixture and equipment | `/game/5/11` |
| OrderOpsArena | Operation sequencing console | Anchored fixture and equipment | `/game/5/12` |
| FormulaForge | Formula assembly workbench | Anchored fixture and equipment | `/game/5/13` |
| RemainderRun | Cargo grouping dock | Anchored fixture and equipment | `/game/5/14` |
| ChronoDash | Temple clock mechanism | Anchored fixture and equipment | `/game/6/1` |
| ProblemPyramid | Pyramid assembly dais | Anchored fixture and equipment | `/game/6/2` |
| LavaPath | Lava crossing engineering route | Existing dedicated scene | `/game/6/3` |
| ChangeCounter | Monster market till counter | Existing dedicated scene | `/game/6/4` |
| BossEncounter | Calculation colosseum | Existing dedicated scene | `/game/8/1` |
| PotionPanic | Potion maker bubbling workbench | Existing dedicated scene | `/game/7/1` |
| ShareSplitter | Monster party serving table | Existing dedicated scene | `/game/7/3` |
| RatioRacer | Grand prix fuel pit lane | Existing dedicated scene | `/game/7/4` |
| ScaleBuilder | Scale drawing drafting desk | Anchored fixture and equipment | `/game/7/5` |

## Verification

- 70 initial scene/layout checks: 35 playable components at 1440×900 and 390×844, including targeted reruns.
- Every registered minigame has a staging definition; every non-native routed surface resolves.
- Fixtures fit their real surfaces; scenery loads without horizontal overflow or new blocked controls.
- Graph fixtures stop during Help and respect reduced motion on desktop and phone.
- Scale Builder completes all five difficulties using numerical and drag answers; error/success cues, 83% accuracy after one mistake, stars and completion pass.
- TypeScript and production build pass; the 28 difficulty-generator checks pass.

## Changed files

- `src/games/MiniGame.tsx`
- `src/gameSceneMeta.ts`
- `src/games/gameStaging.ts`
- `src/games/GameSetStage.tsx`
- `src/games/GameSetFixture.tsx`
- `src/games/GameSetAtmosphere.tsx`
- `src/games/game-staging.css`
- `scripts/verify-game-staging.mjs`
- `scripts/verify-scale-builder-numeric.mjs`
- `docs/game-staging.md`

Assumptions: preserve the existing mathematical content and game rules; reuse dedicated scenes where staging is already present. No external legacy assumptions were used.
