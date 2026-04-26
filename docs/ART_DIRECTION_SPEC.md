# SATs Legends Art Direction (Global)

This doc standardises the SATs Legends visual language so every asset and UI surface reads as one premium mobile-game universe.

These are **global rules**. If a specific mini-game needs an exception, document it explicitly in that mini-game's README/spec and keep the exception narrow.

## Non-Negotiables

1. Light source
- Light always comes from **upper-left**.
- Highlights and rim-light must bias top-left.
- Shadows fall down-right and stay soft.

2. Outline language
- **Thick, readable outlines** on characters, interactables, and key UI elements.
- Avoid hairline strokes: no thin lines that vanish on small iPhones.
- Outlines should be tinted (navy/ink) rather than pure black.

3. Colour + materials
- **Saturated colours** (toy-like, playful, premium).
- Rounded forms, friendly silhouettes.
- Materials feel like **plastic/toy resin**: soft specular highlights, gentle gradient ramps.
- Use **soft gradients only** (no harsh banding).

4. Shadows
- Use **soft ambient shadows** with low contrast.
- No harsh black drop-shadows.
- Prefer tinted shadows (deep navy/blue) over black.

5. Texture + realism
- No photorealism.
- No realistic textures (grain, fabric weave, photographed surfaces).
- Use stylised patterns or clean gradient fills instead.

## UI Surface Rules

- Primary UI panels should have:
  - a soft top-left highlight
  - a subtle inner sheen (inset highlight)
  - a single ambient shadow layer
  - a consistent outline thickness

- Buttons should feel pressable:
  - rounded, toy-like
  - thick outline
  - gentle highlight on upper-left edge
  - press state should move slightly, never blur or distort

## Do / Don't (Quick Checks)

Do:
- 2px+ outlines on key surfaces
- top-left highlight reads at a glance
- shadows are soft and never pure black
- colours remain saturated under dark backdrops

Don't:
- thin 1px line art for important shapes
- black, sharp drop shadows
- noisy/photographic textures
- inconsistent light direction across adjacent assets

## Asset Acceptance Checklist

- [ ] Light reads from upper-left
- [ ] Outlines are thick and readable at iPhone size
- [ ] Shadow is soft and tinted (not harsh black)
- [ ] Colours are saturated and match existing palette
- [ ] No photoreal or photographed texture sources

