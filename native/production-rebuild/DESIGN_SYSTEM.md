# SATs Legends presentation system

The visual thesis is a bright, tactile fantasy adventure: expressive heroes on coherent terraces, emerald enamel controls, warm brass edges and a clear view of the puzzle. The content plan is brand → hero → one action on entry, and question → interaction → feedback during play. Motion establishes the scene, acknowledges a press and rewards an answer; ambient motion stays secondary.

## Materials and tokens

The implementation is in `src/design/production-tokens.css`. `legend-theme.css` maps the existing shared controls onto these tokens; game-specific island palettes remain available.

| Role | Token / value |
|---|---|
| Foreground | `--prod-text` #fff6de |
| Supporting text | `--prod-text-muted` #d3e6dc |
| Enamel | #123f3b, #082d30, #1d5a50 |
| Brass | #f7cc6b; highlight #fff0ae; edge #ad772c |
| Action text | #17392e on warm gold |
| Success / error | #83e5a0 / #ffb2ac, alongside words or symbols |
| Focus | 3px #fff3b1, visible offset |
| Spacing | 4, 8, 12, 16, 24px |
| Control / panel radius | 14 / 24px |
| Touch minimum | 44 CSS px after stage scaling |
| Press / entrance | 120 / 360ms; cubic-bezier(.2,.75,.25,1) |

Baloo 2 is the display face; Fredoka is the body face. Existing mathematics retains its exact source and notation. Compact questions target 16px or larger, instructions 14px and utility labels 12px. Standard scenes use larger sizes. Long content wraps; it must not be truncated to preserve a frame.

## Composition and states

- Welcome uses separate portrait and landscape compositions, a live brand mark and one live Start/Continue action. The hero has contact shadows and a clean silhouette in the artwork.
- Account and learner screens share a purpose-painted quiet garden and one functional panel. Learner names remain live; the guide portrait is a shared mascot, not an invented saved learner avatar.
- Start/turn prompts use the same terrace, enamel and gold action. Their existing pause and focus contracts remain intact.
- Questions sit on quiet, opaque enamel. Answer values remain real DOM text and buttons.
- Press states move at most 1–2px. Disabled controls remain visibly distinct. Selection retains a visible focus/selection edge, not colour alone.
- Help uses a lightbulb, one rules dialog and the existing pause behaviour. Board, sound and music retain their existing actions.
- Results inherit the played island. Short landscape statistics retain readable labels and actions; the detailed breakdown remains available under the existing results behaviour.
- Reduced motion uses the existing application-wide media rule and MotionConfig; the new entry and account animations also opt out explicitly.

## Asset decisions

Four replacement illustrations were generated from this repository's Barratt and world references. Exported WebP files total about 1.41MB; source PNGs, prompts and provenance are retained outside the production bundle. See `entry-art.json` and `asset-inventory.json`.

Existing mini-game artwork was retained where its composition already supports the interaction. Replacing suitable artwork solely to make it new would add size and risk without improving the scene. The repaired shared materials, text, target sizes and orientation apply to those existing scenes.

Maths vs Zombies receives a separate replacement arena: the left defender area has pale limestone and open atmosphere, and the fighting lane is continuous. This replaces the dark plants and dense columns behind the hero without adding a glow or a tinted overlay.

No stock assets, external legacy characters, hidden systems or unrelated backend features were introduced.
