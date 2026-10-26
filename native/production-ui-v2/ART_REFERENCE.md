# Production art reference, v2

The existing SATs Legends art is the source of identity. The target is a tactile fantasy adventure: bright scenery at the perimeter, a clearly lit hero or device, and a quiet central working surface. No question, number, measurement or mathematical diagram is illustrated into a raster asset.

| Property | Rule |
|---|---|
| Palette | Deep teal #082d30 / #123f3b, warm gold #f7cc6b, ivory #fff6de; secondary island colour only in scenery and small material accents. |
| Lighting | Broad warm light from upper left, cool ambient fill, small restrained highlights. No photographic chrome or hard lens flares. |
| Character scale | Cute existing large heads, readable eyes, chunky equipment; character supports the working object, and stays outside its touch bounds. |
| Perspective | Standing actors share a ground plane; orthographic front view for devices used as live mathematical workspaces. Graphs remain exact programmatic diagrams. |
| Materials | Painted enamel, soft leather, carved stone, brushed warm brass; broad shapes instead of tiny rivet noise. |
| Edges | Soft bevels, clear silhouettes, no heavy glowing perimeter. Use existing gold highlights sparingly. |
| Contact | Short soft contact shadow aligned beneath feet/device. No floating character feet or double shadows. |
| Motion | 120ms press, 200–350ms answer feedback; reward effects confined to the object. Reduced motion removes travel/particles. |

Reference images: `src/assets/reference-screens/island-guide.png` for character proportions/materials; existing `src/assets/game-visions/environments/` for the established fantasy world. The current rocket-v1 asset has photographic metal and must be replaced by a painted, rounded fantasy rocket with the same front-facing assembly composition. Food and coin illustrations must use one cohesive programmatic icon family with live labels kept separate.

Asset targets:
- Rocket v2: transparent, front-facing vertical device; central hull, two side boosters, rounded nose, warm brass fittings, teal enamel, crystal window. Keep the silhouette compatible with the live 220×360 SVG assembly regions. Export at approximately 640×1048 or better, compressed WebP alpha. No text, logos, mathematical values, flames or platform baked into it.
- Food icon family: simple rounded vector illustrations, consistent 64×64 viewBox, warm upper-left highlights. Existing item names/portion values remain unchanged and rendered as live text.
- Coin family: programmatic metal colours, edges and mint pattern with live denomination text. Preserve existing denominations, names and coin selection semantics.

No external or legacy project assumptions are used.
