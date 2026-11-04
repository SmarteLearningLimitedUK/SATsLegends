# Independent Place Value Panic scene layers

The scenery, rhino, contact shadow, foreground ledge, question panel, place labels, source tiles and text are independent elements. Never use the reference screenshot as the playable background. No number, label, character or control is painted into the foreground ledge.

Existing assets retained: `game-visions/environments/place_value_panic-v1.webp`, the cohesive rhino artwork/animation, and `game-visions/objects/number-stone-v1.webp` for the blue-and-gold tiles and reusable border treatment. Text remains accessible HTML; targets and digit tiles remain native buttons.

`stone-ledge-v1.png` is a transparent foreground asset reconstructed from the user's selected reference using the built-in image generation tool. The original generated image is preserved. The runtime SVG viewBox selects its stone strip without modifying the bitmap. The source is 1774 × 887; viewBox `0 440 1774 270`, with the walkable contact line around 11% of that viewBox's height.

The ledge and actor use the same `--pvp-ground-y` within their local workspace. The actor is square and its existing foot anchor is 95% down the square. `--pvp-enemy-size` and `--pvp-ledge-height` resize each asset independently. No position is derived from the scenery's crop. Desktop rules are limited to this game's reviewed workspace and excluded from the existing native app mode. Future portrait/tablet designs can reposition the same layers without regenerating artwork.

## Generation prompt

Extract/reconstruct ONLY the warm tan stone ledge directly beneath the rhino's feet in this reference into a separate production game sprite on genuine transparent background. Wide horizontal strip approximately 5:1 aspect ratio. A narrow flat walkable top edge across the entire width with a low front face of large weathered sandstone blocks, fine gold warm afternoon highlights, a few tiny ivy leaves trailing from joints. Front-facing game platform in the same premium detailed painted 3D cartoon style as the reference. Straight nearly level top so an animated character can stand on it, no slope, no tall pedestal. Entire strip fully visible, only very narrow transparent margin. Remove EVERYTHING else: absolutely no rhino, no UI, no numbers, no frames, no text, no castle or scenery, no digit rack, no bowls/fire, no background color. The top stone surface should be at about 20% of the image height, platform front face occupies the rest. Deliver just this independently movable stone ledge with alpha.
