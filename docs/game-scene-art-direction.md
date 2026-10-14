# Scene art direction and annotated amendments

The visual benchmark is the existing Take Out Rush cafe, Rounding Rocket launch complex and Ratio Racer circuit. The remaining desktop settings now use complete wide illustrations, with foreground, activity-related equipment and distant depth. The three benchmark games retain their artwork.

Assumptions: preserve question answers, scoring, difficulty and timed-round rules; use this repository's characters and existing fonts; retain portrait scenery on narrow screens while using the new landscape environments on desktop. No external legacy assumptions were used.

## Illustrated environments

All assets were generated with the built-in image generation tool and encoded as WebP for Vite. No external image service or new runtime dependency was added. Each image is requested without baked-in text, labels, diagrams or UI; all maths remains rendered by React/SVG.

The shared prompt direction was: a single wide 16:9 SATs Legends game environment; polished cartoon fantasy adventure for ages 10–13, crisp dark contours, dimensional hand-painted cel shading, rich turquoise/copper/gold colours, warm lantern light, complete foreground/midground/depth, a central clear space for playable controls, no photorealism or nursery clip art.

- `src/assets/maps/scenes/lava.webp`: Spectacular basalt volcanic cavern with molten river, lava waterfalls and clear central crossing.
- `src/assets/maps/scenes/area_architect.webp`: Fantasy mountain-town construction site with cranes, scaffolding, arches and clear paved construction floor.
- `src/assets/maps/scenes/graph_grabber.webp`: Turquoise fantasy cargo harbour with sailing ships, crane hooks, rope coils and shipment crates.
- `src/assets/maps/scenes/data_detective.webp`: Detective evidence laboratory with specimen jars, cookies, socks, gem trays, coins and a clear work desk.
- `src/assets/maps/scenes/factor_frenzy.webp`: Crystal-powered industrial laboratory with copper pipes, turquoise coils and mechanical arms.
- `src/assets/maps/scenes/chrono.webp`: A giant ornate clock mechanism in a bright fantasy clockmaker tower, visible brass gears and pendulums on both sides, stained glass skylight, a timber workbench across lower foreground. Clear middle for large interactive clock dial, absolutely no dial numbers baked in.
- `src/assets/maps/scenes/conversion_canyon.webp`: A canyon cargo weigh station: rugged timber loading dock spanning icy turquoise gorge, cranes with hooks and rope, gem cargo piles, distant waterfalls and wooden railings. Clear central workbench to place an interactive weighing scale. Not an empty glacier.
- `src/assets/maps/scenes/coordinates_quest.webp`: An explorer command deck on an adventurous wooden airship high above colourful mountains and floating islands. Brass navigation instruments, ropes and sails at the edges, rich cloud panorama, central wood navigator desk for interactive coordinate chart. No chart drawn in image.
- `src/assets/maps/scenes/formula_forge.webp`: A vibrant fantasy geometric foundry, copper furnaces, shaped steel metal pieces, drafting tools and glowing turquoise assembly mechanism on side walls, dimensional wood/metal workbench at lower foreground. Clear central place for geometric diagram, no text or diagrams baked into image.
- `src/assets/maps/scenes/fraction_match.webp`: A magical mosaic restoration gallery in a luminous fantasy palace with tall turquoise stained glass, purple drapery and gold gilded stonework. Empty centre for a mosaic tile matching activity, small glowing crystal fixtures at sides. Wide complete scene.
- `src/assets/maps/scenes/line_graph_lab.webp`: A fantasy weather observatory on a mountain with domed telescope, bright blue skies and clouds outside tall curved windows, brass barometers, weather instruments, maps and a wooden instrument desk in the foreground. Clear middle for playable weather graph, no drawn charts.
- `src/assets/maps/scenes/multiplication_mine.webp`: A stunning deep crystal mine with scaffolds, mine cart rails, large turquoise crystal clusters, warm lanterns, pulley hoists and extraction machinery. Clear central mining area with grounded stone plinth for an interactive rock, no giant foreground rock baked in.
- `src/assets/maps/scenes/number_line_ninja.webp`: A dynamic ninja training dojo, polished wooden floor, red and teal banners, practice dummies at far sides, bamboo terraces and hanging lanterns. A deep bright courtyard visible through centre, horizontal central gap for playable measuring bridge. Complete scene, not plain landscape.
- `src/assets/maps/scenes/order_ops_arena.webp`: An elaborate magical operations arena inside a fantasy wizard workshop, glowing cyan power machinery, purple rune lanterns, spinning brass mechanisms at sides, central raised stone arena and vacant space for spell challenge.
- `src/assets/maps/scenes/perimeter_path.webp`: An adventurous survey camp beside a fantasy fortress under construction, masonry paths, timber scaffold and architects tools, gold lanterns, lush green surroundings. Central work surface clear for measuring polygon boundaries, no polygons or text.
- `src/assets/maps/scenes/place_value_panic.webp`: A spectacular ancient number-stone shrine in an overgrown jungle, carved stone towers, glowing blue rune stones without symbols, waterfalls, lanterns, jade and gold details. Flat stone puzzle altar in foreground, centre clear for draggable number stones and enemy.
- `src/assets/maps/scenes/polygon_palace.webp`: A bright majestic cartoon palace shape gallery: richly carved arches with geometric stone ornaments, turquoise windows, gold statues, pink and purple hanging fabrics, dimensional floor and two side display plinths. Clear central space for interactive polygon display.
- `src/assets/maps/scenes/problem_pyramid.webp`: A colourful ancient pyramid puzzle vault: sandy gold stone architecture with stepped stone dais in centre, torch-lit carved walls, turquoise crystal beams, desert sun through vaulted doorway. Clear central steps for interactive numerical puzzle blocks, no numbers.
- `src/assets/maps/scenes/remainder_run.webp`: A fantasy harbour cargo sorting dock with long timber quay, crates, tied sailing ship behind right edge, turquoise sea, lighthouse distant, crane and dockworkers tools at sides. Central loading deck clear for interactive cargo grouping, no UI.
- `src/assets/maps/scenes/rotation_station.webp`: A magnificent fantasy mechanical turntable workshop, a round brass mechanism installed flush in the middle floor, surrounding gears, polished wood benches, stained glass and sunlight. Clear central circular area for rotating shapes, no shapes or labels.
- `src/assets/maps/scenes/scale_builder.webp`: A bustling fantasy architect workshop with perspective model castles, rulers, drafting compasses, wood frames, blue paper rolls, huge bright windows looking over a fantasy city. Clear central desk for interactive scale blueprint, no grids or labels baked in.

Additional transparent sprites: `src/assets/items/cookie.webp`, `sock.webp` and `lava-platform.webp`. Prompts request respectively an isolated chocolate-chip cookie, striped stinky socks and a wide faceted basalt platform with molten edge cracks, in matching crisp cartoon fantasy artwork. No faces, text or UI.

## Annotation fixes

- Angle Arena: align the stable enemy actor's visible feet to the canvas crate platform.
- Area Architect: explain the gold target squares, square units, tile selection and avoiding gaps/overlaps.
- Change Counter: expose the shop scenery, shorten the receipt and place a dimensional till on the counter.
- Chrono Dash: clockmaker tower scene, grouped controls, larger labels and nearby actions.
- Conversion Canyon: remove the box, use a mechanical scale with a proper tray and animated load needle, preserve shudder/break/overweight feedback.
- Coordinates Quest: navigator airship scene, centred larger chart and clearer numbered axes.
- Core of Calculation: animated reactor, crystal/rune mission frame and preserved mock-exam marking.
- Data Detective: high-contrast evidence station, illustrated cookies/socks/gems/coins in chart labels and dossiers.
- Factor Frenzy: crystal laboratory, energy platform, machine animation and substantial selection controls.
- Formula Forge: foundry scene, compact answer console, contained labels and clear given measurements.
- Fraction Forge: compact ingot rack and adjacent strike action, dimensional metal controls.
- Graph Grabber: cargo harbour, crisp numbered chart, interactive shipment tracing and crane animation.
- Lava Path: volcanic canyon, illustrated basalt platforms, flowing lava currents, embers and character jumps.

## Changed implementation files

`src/components/SceneEnvironment.tsx`, `src/gameSceneMeta.ts`, `src/games/gameSceneArtwork.ts`, `evidenceArtwork.ts`, `GameSceneEffects.tsx`, `GameSetStage.tsx`, `gameStaging.ts`, `scene-production.css`; the annotated game components; and NumberLineNinja, PlaceValuePanic, PolygonPalace, RotationStation and PerimeterPath for the shared responsive scene renderer.

Changed game components under `src/games/`: `AngleArenaGame.tsx`, `AreaArchitectGame.tsx`, `BossEncounterGame.tsx`, `ChronoDashGame.tsx`, `ConversionCanyonGame.tsx`, `DataDetectiveGame.tsx`, `FactorFrenzyGame.tsx`, `FormulaForgeGame.tsx`, `GraphGrabberGame.tsx`, `LavaPathGame.tsx`, `NumberLineNinjaGame.tsx`, `PerimeterPathGame.tsx`, `PlaceValuePanicGame.tsx`, `PolygonPalaceGame.tsx` and `RotationStationGame.tsx`. Change Counter, Coordinates Quest, Fraction Forge and Scale Builder use scoped layout rules in `scene-production.css`.

Verification scripts: `scripts/verify-game-staging.mjs` and `scripts/verify-scene-production.mjs`. Screenshots and detailed runtime reports are under `qa-artifacts`, which is ignored by Git.

## Final verification

- 83 scene/viewport cases pass: all 35 games at 1304×884 and 700×600, plus the 13 annotated games at 320×568. Compact-layout failures were corrected and retested; the aggregate report records the retests.
- TypeScript and the Vite production build pass.
- Conversion Canyon retry scoring passes: five correct answers and two mistakes give two stars and 71% accuracy.
- Graph Grabber sector construction, preview, locking and reachable controls pass at 320×568, 700×600 and 1280×720.
- The gallery contains 35 refreshed 1440×900 in-play desktop screenshots. A representative final visual review checked actor grounding, scale placement and the lava crossing's alignment with the river.

The environment prompt set is recorded in `docs/game-scene-art-prompts.json`. Question answers, difficulty generation and scoring algorithms were preserved. These checks validate the changed scope; they are not a claim that the entire application cannot contain a defect.

## Fraction Forge hammer correction

The anvil hammer was subsequently enlarged to three times its previous rendered size in `src/games/fraction-forge.css`, scaling around the existing grip pivot so the strike animation remains intact. The change targets the scene prop. Desktop, compact desktop and short-phone control checks and the production build pass; the gallery was refreshed. No external legacy assumptions were used.

The current hammer scale is 2.55: a 15% reduction from the requested 3× size. Only the SVG scale in `src/games/fraction-forge.css` changed; its grip pivot and strike animation are preserved. The screenshot and gallery bundle were refreshed. No external legacy assumptions were used.

Replaced the large decorative Lucide outline with a solid steel-and-wood SVG hammer in `src/games/FractionForgeGame.tsx`. Attached it to the anvil and adjusted the striking pivot and swing in `src/games/fraction-forge.css`. The small Strike-button icon remains a standard control icon. Maths and scoring are unchanged; no external legacy assumptions were used. Desktop, compact desktop and short-phone checks, TypeScript and the production build pass. The Fraction Forge screenshot was refreshed.

## Perimeter proportions correction

Changed `src/games/PerimeterPathGame.tsx` and `src/games/game-refinements.css`: render the SVG and selectable labels in one centred square viewport, preserve the aspect ratio, and derive rectangular coordinates from the actual side lengths. Square questions therefore render equal screen lengths. Equal-sided tier-two questions are named squares correctly. Side values, perimeter answers and scoring remain unchanged. Nine square/rectangle/compound cases pass across desktop, compact desktop and phone, including pixel-proportion and selectable-edge checks. TypeScript and the production build pass; the gallery screenshot was refreshed. No external legacy assumptions were used.


### Rotation Station: SATs transformation revision

Replaced in-place rotation choices with exact vertex plotting and translation description. The five tiers cover positive-coordinate translations, vertical mirror lines, mixed vertical/horizontal reflection and two-direction translation, four-quadrant axis reflection/translation, then describing translations from two images. Original triangles and submitted images are drawn on an undistorted labelled SVG grid; reflection lines are explicit. Tap, pointer drag, keyboard arrows/Enter and desktop cursor controls are supported. Incorrect submissions reveal the correct image; feedback waits for Next mission. Each submitted image counts once, with accuracy-based stars and shared session events/pause/timing.

Assumptions: preserve the existing Rotation Station name, routes, workshop artwork and shared gameplay architecture. This is revision, with no written responses or work outside the game. Content follows KS2 framework 5P2/6P2/6P3; no external legacy assumptions used.

Validation: 10,000 generated questions checked for exact transforms, grid bounds, unique choices, vertex-order independence and duplicate rejection. All five tiers played with correct/wrong submissions at 1304×884, 390×844 and 320×568; separate drag, keyboard and translation-description checks passed. Existing five-tier suite passed (28 checks); TypeScript and production build passed.


### Transformation Station: simpler entry and instructions

Renamed visible labels to Transformation Station, retaining internal IDs and routes so existing progress stays compatible. Questions now say “Slide the blue triangle…” or “Make a mirror image…”. The first tier uses a 0–6 grid, smaller triangles and one-to-three-square horizontal moves. The active blue corner is highlighted; a persistent placement prompt shows corner A/B/C and completed count. Optional Hint gives a short counting instruction without revealing target coordinates. Marking and later SATs transformation tasks are unchanged. Desktop, phone and small-phone correct/wrong marking passed across all five tiers; hint toggling and layout passed on desktop and the smallest phone. TypeScript, production build and 10,000 generated question checks passed.

Assumptions: simplify understanding and starter difficulty, preserve advanced revision content and saved progress. No external legacy assumptions used.

Changed files for this amendment: `src/games/RotationStationGame.tsx`, `src/games/rotationStationQuestions.ts`, `src/games/rotation-station.css`, `src/gameNames.ts`, `src/gameMeta.ts`, `src/constants.ts`, `src/systems/content/islandBlueprint.ts`, `src/systems/content/learnerGuides.ts`, `src/games/gameStaging.ts`, `scripts/verify-rotation-transformations.ts`, and this document. The ignored screenshot/gallery bundle was also refreshed.

### User-supplied recorded sound effects

Integrated 17 curated clips from `C:\Users\samva\OneDrive\Desktop\SFX`. Original source files were preserved. MP3 copies remove embedded artwork/metadata, trim long tails and leading silence, balance loudness and fade out; together they occupy approximately 352 KB. `docs/sfx-assets.json` records every output file, original filename and processing target.

Mappings: shared UI pop, positive answer cue, soft incorrect beep and level-up; coins/cash/rewards for Change Counter and Take Out Rush; liquid bubbles for Potion Panic; fairy spells and slime impacts for Maths vs Zombies; boost/explosion for Angle Arena; boost for Ratio Racer, Remainder Run and Simplify Sprint; metal strike for Fraction Forge; scanner on Mean Machine scan; wood placement for building/serving, gem handling for mining/equivalence and other placement. Rounding Rocket retains its existing timed countdown/continuous launch audio, adding metal part placement and recorded completion reward. Spoken dialogue, horror breathing and duplicate/macOS files were excluded from the selected set.

The current-game palette preloads without opening an AudioContext. Recordings share the existing audio bus/mute control, cache decoded buffers, cap repeated cues by group, stop on mute/hidden-tab/leaving/help/working-board, cancel late decode callbacks, and fall back to existing synthesis on load/decode failure. Completion rewards continue on the result screen. Music settings and gameplay/scoring are unchanged.

Verification: all 17 recordings decoded in Chromium with real non-clipping waveforms. Playback/mute/gesture/profile-change/pending-cancellation and missing-file fallback checks passed. Real correct/incorrect gameplay checks passed in Maths vs Zombies and Change Counter, including keyboard input. Existing music/mute/pause/visibility/persistence checks and 38 sound-profile checks passed. TypeScript and production build passed.

Assumptions: the user's supplied files are approved for this game's use; select fitting short effects rather than use every file. No external legacy assets or assumptions were used.

Changed files: `src/audio/gameAudio.ts`, `src/audio/gameSampleLibrary.ts`, `src/audio/gameSoundProfiles.ts`, `src/App.tsx`, `src/games/FractionForgeGame.tsx`, `src/games/MeanMachineGame.tsx`, `scripts/verify-recorded-sfx.mjs`, `scripts/verify-per-game-audio.mjs`, `.github/workflows/quality.yml`, `docs/sfx-assets.json`, this document, and the 17 MP3 files under `src/assets/audio/sfx/` individually listed in the manifest.

### Monster reactions requested by the user

Added three more recordings from the supplied SFX folder: Coloss angry shout (short growl), Imp laugh, and Goblin death (short hit/defeat reaction). Each is trimmed, faded and mixed more quietly than answer cues; the manifest now lists 20 files. Maths vs Zombies plays growls on creature arrival, laughs after a missed answer, and hurt reactions on spell impact. Angle Arena plays hurt reactions on hit and laughs on missed shots. Factor Frenzy's creature reacts to correct hits and incorrect answers. Creature ambience requires an already unlocked audio context; repeated growls/laughs are rate-limited and monster voices share one playback group. Existing mute, hidden-tab/pause cancellation and fallback behavior apply. No spoken dialogue was added.

Assumption: add creature reactions in the existing monster encounters, without replacing ordinary maths feedback. No external legacy assets or assumptions used.

Changed files for this amendment: `src/audio/gameAudio.ts`, `src/audio/gameSampleLibrary.ts`, `src/games/MathsVsZombiesGame.tsx`, `src/games/AngleArenaGame.tsx`, `src/games/FactorFrenzyGame.tsx`, `scripts/verify-recorded-sfx.mjs`, `docs/sfx-assets.json`, this document, and `src/assets/audio/sfx/monster-growl.mp3`, `monster-laugh.mp3`, `monster-hurt.mp3`. Original supplied files remain unchanged.

Validation: all 20 recordings decode to finite non-clipping audio; monster recordings, no-autoplay guard, mute and fallback checks passed. Existing gameplay correct/wrong sound checks passed. TypeScript and production build passed.

### Action-specific sound audit and engine cues

Shared button, answer and terminal feedback already covered many actions, but direct grid placement and drag-to-plate actions lacked their own cue; ingot selection used only the generic UI pop. Added placement sounds in Transformation Station, Share Splitter and Fraction Forge. Ratio Racer already had a recorded boost reward but lacked a mechanical acceleration/stall sound. Added finite synthesized acceleration roar and falling-RPM sputter synchronized to `correctBoost` / `incorrectStall`, with effect cleanup on pause/state change/unmount. Existing Rounding Rocket countdown and layered launch exhaust/bass remain, with their engine now registered for shared cancellation on leaving or hiding the page. Repeated stop calls are safe.

Not every decorative animation needs sound: passive background movement and calm activities remain quiet unless they have an intentional interaction cue. The audit identifies missing specific action sounds rather than claiming every possible animation has been sonified.

Preview WAV files in `qa-artifacts/audio-previews/engine-roar.wav` and `rocket-launch.wav` were rendered directly from the game's Web Audio functions. No external assets were needed. Assumption: the user wanted useful missing effects implemented as well as reported; keep scoring, content and timing unchanged. No external legacy assumptions used.

Changed files: `src/audio/gameAudio.ts`, `src/games/RatioRacerGame.tsx`, `src/games/RotationStationGame.tsx`, `src/games/ShareSplitterGame.tsx`, `src/games/FractionForgeGame.tsx`, `scripts/verify-engine-cues.mjs`, `.github/workflows/quality.yml`, and this document. Ignored local preview files were also generated.

Validation: engine start, cancellation, double-stop safety, mute and a real racer answer/Help pause passed. TypeScript and production build passed. Rounding Rocket desktop and phone launch flows, scoring, cinematic timer exclusion, mute/unmute and pause were checked with its existing regression script.
