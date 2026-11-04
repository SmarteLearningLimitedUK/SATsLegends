# Matharia / SATs Legends — Reskin Asset Library

This is a layered art and GUI kit based on the supplied HUD, world map, mission menu, rhino screen and game reference sheets. It does not change the educational bank, implement gameplay, or constitute an App Store-ready build.

## Start here

Open `index.html` after extracting the entire archive. Browse `previews/screens` for assembled examples, `masters` for original generated artwork, `vector` for editable GUI sources, `png` for individual 1x/2x/3x exports, and `ios/Matharia.xcassets` for the Xcode image catalogue. `manifest.json` identifies every asset, dimensions, source, category and export paths. `layouts.json` gives the layer placements used for the previews. `generation_log.json` retains the image-generation prompts and reference roles.

Each character, island, object, frame, icon and GUI state is an individual asset. Screen previews are assembled examples and are never a substitute for those individual layers.

## Shared visual language

- Sapphire/navy interiors: #03172e, #072c51, #164d79.
- Warm gold bevels and ornate corners: #9c5513, #ffd45e, #fff2ac.
- Cyan magic and selection: #2be8dc, #53c9ff.
- Ivory text: #fff3cd; coral life indicator: #f54866.
- Interactive surfaces face the player squarely. Scenery may have depth; charts, labels, buttons, number tiles and slots must not be foreshortened.
- Every game uses the same top status HUD and bottom utility HUD. Insert the current title, hero portrait, live progress, three lives and timer into the empty top shell. Bottom utility actions: Back, Help, Board, Sound and Music.
- Use illustrated skin masters where fixed artwork is desirable. Use SVG sources for size-independent components and controlled button states. Do not flatten text, question data or progress into a frame.

## Identity and source scope

The rhino, Bran, blue-robed green mage and red dragon chef follow the visible supplied designs. The mage is called `mage` rather than assigning an unverified character name or changing its species. The library does not invent a redesign for unseen heroes such as Mochi. The five map islands retain the names in the supplied map: Geometry Glacier, Fraction Forest, Data Desert, Arithmetic Acropolis and Ratio Rapids. These labels are demonstration strings, not a migration of the app's existing island data.

## Multiple sizes for iOS

Each exported asset has 1x, 2x and 3x files with identical logical bounds. Vector assets are rendered from the SVG at each target density. Generated raster masters are downsampled; they are not claimed to contain extra detail from enlargement. Their logical dimensions are set from the master resolution so the 3x file never exceeds the original available pixels. See each manifest entry for the exact native resolution and recommended maximum point size.

Density and screen layout are different concerns. A 3x image is not a portrait/landscape layout. Reposition and size the layers using Auto Layout, SwiftUI, or the existing web renderer; do not stretch one full-screen screenshot to fit another device. Larger iPad backgrounds may need further higher-resolution art if displayed above the listed maximum size. Keep heroes proportional with aspect-fit and backgrounds with aspect-fill. Keep important scenery inside the documented focus region.

## Responsive assembly

1. Obtain actual safe-area insets at runtime. Reserve top and bottom safe regions before laying out the scene.
2. Top status bar: compact title and portrait at the left, live progress under the title, lives and timer to the right. Long titles truncate or reduce only within a defined minimum readable size; never overlap lives.
3. Bottom utility bar: five equal touch areas. Use real accessible buttons, not a single tappable image. Minimum target 44 x 44 points; allow 48–56 points where practical.
4. Put questions, answer controls, live charts and game objects in the remaining rectangle. Use a dark frame under all instructional text. Keep the hero outside the question and answer hit areas.
5. All gameplay fits the viewport without page scrolling. World maps and mission menus may scroll. Do not reduce text and controls merely to preserve decorative scenery.
6. Screen examples use empty or example educational values. Rebind the app's existing content and scoring logic unchanged. Graphs, numbers, fraction segments and hit regions must be drawn from actual data by the app.

## Integration limits and validation

Static artwork and the supplied preview layouts are not rigged skeletal animations. Supplied characters are static poses; no rigged action-animation sequence is included. Optional transitions must respect Reduce Motion. Do not use cropped or morphed artwork as a claim of frame-accurate animation.

The 9-slice candidate insets are recorded in the manifest. Verify the illustrated corners at each chosen size; prefer splitting a frame into corners, edges and a centre, or using its SVG source. Do not stretch a baked rounded button without preserving its corners.

This library includes contact-sheet review and automated checks of image readability, export dimensions, transparency where appropriate, catalogue references and archive integrity. On-device QA remains necessary: small iPhone, notched iPhone, iPad, dynamic text, VoiceOver labels, colour contrast, hit regions and performance. Generated art is not asserted to be award-winning or AAA-certified.

## Rebuild

The scripts under `tools` reproduce vector exports, raster density exports, catalogues, manifests and assembled previews from the included masters. They use Python 3, Pillow and Inkscape. The original artwork was created with the built-in image-generation tool; no API key is required to use this delivered library. Regeneration is optional and is separate from using the supplied assets.
