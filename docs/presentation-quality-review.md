# Presentation QA — 20 October 2026

The approved visual target remains `qa-artifacts/concept-cast/index.html`: high-resolution fantasy scenery with the detailed original four heroes and six enemies. This pass reviews all 37 game types and improves presentation without changing maths, answers, difficulty settings or scoring.

## Findings and corrections

| Finding | Correction | Evidence |
| --- | --- | --- |
| Combatants too small for the scene | Enlarged Maths vs Zombies heroes/enemies, Angle Arena's goblin and Order Ops Arena's enemy; enlarged the Lava Path actor on desktop | Current screenshots and per-actor screen-height measurements |
| Actor feet and contact shadows separated | Align shared contact shadows with the mesh's actual foot inset; anchor Angle Arena's feet to the centre of the painted podium surface, including its perspective depth | Largest measured shadow gap below 0.72px; podium gap below 0.40px across the tested engines/viewports |
| Zombie movement visibly steps backwards | Removed the effect that copied delayed React positions back into the live animation state. Spawn, frame and hit paths already update the live state directly | Long movement, spacing, selected-target, pause and reaction checks pass |
| Graph helpers too small beside boards | Enlarged both desktop graph helpers within the clear left actor area | Graph Grabber and Line Graph Lab captures |
| Three phone helpers stood above the foreground floor | Lowered Conversion Canyon, Mean Machine and Match Mastery actors in their existing clear areas | Phone and small-phone captures |
| Banquet guests appeared suspended above their chairs | Aligned chair seats to the guest silhouettes and placed lower bodies behind the tabletop; increased available guest height on landscape phones | All six Share Splitter practice/difficulty routes pass serving checks at 568×320 |
| Forge ingredients/actions protruded from the decorative rack | Replaced the unreliable stretched frame interior with a contained metal-and-gold rack; kept ingredients, actions and strike feedback within it | Six opening containment checks plus three post-strike feedback checks |
| Multiplication working was small inside an oversized panel | Sized the panel to its contents, enlarged desktop working rows and corrected the Carry caption's styling | Current captures and existing interaction checks |
| Scene atmosphere lacked depth | Added independent moving light shafts, low haze and glacier/rapids water highlights alongside existing island particles and game effects | Ambient clocks advance and pause; reduced motion suppresses the new layers |

Scenery and floors stay stationary. Background atmosphere moves independently, so characters do not slide as a consequence of a decorative camera zoom. Existing cooking, forging, projectile, race and answer-feedback systems remain in place. The new background layers do not intercept input.

## Verified coverage

- 37 game types, one representative highest available level or paper each.
- Chromium: 148 current captures at 1920×1080, 1366×768, 844×390 and 667×375.
- WebKit: 74 current captures at 844×390 and 667×375.
- No page runtime errors, page-width overflow or blocked enabled-control centres in those sampled states; 1,714 enabled controls measured.
- Visible character clocks, background animation, Help pause and reduced-motion checks pass across both engines.
- 36 existing interaction/layout checks pass: eight focused games and four surrounding navigation screens at three viewport sizes. These include exact-change submission, suspect inspection, cooking/forge activity, containment and keyboard interactions.
- 11 zombie checks pass: desktop, phone, 568×320 and reduced-motion movement; six practice/difficulty routes; independent enemy reaction and background-pause behaviour. The increased actor size requires a longer observation window before a second enemy can safely enter in the reduced-motion case.
- Six Share Splitter practice/difficulty serving routes pass at 568×320, including plate hit areas, exact serving, Reset, Check, reward event and the next order.
- Angle Arena's existing projectile collision/travel properties pass 3/3 checks over 575 samples.
- TypeScript and production build pass. Vite retains its existing large-chunk advisory.

### Geometry warnings reviewed

The general overlap scanner reports coordinate-axis labels inside coordinate-point hit areas. Those labels intentionally occupy the same grid. All enabled point controls receive centre hits. It also reports three adjacent line-box overlaps in the laptop Perimeter Path labels: the number and unit are deliberately wrapped, remain readable and do not overlap visually. These raw warnings are retained in `quality-summary.json`; they have not been silently removed from the audit.

## Release assessment

The sampled presentation and browser smoke checks pass. This is not an AAA certification or a complete deployment sign-off. Outstanding release work is physical iPhone testing for touch, safe areas, sustained frame rate and memory, and full-level/end-state/save-path coverage beyond the sampled routes. The character renderer remains the repository's deformable 2D artwork system; this pass does not create newly authored skeletal animation. The environment paintings remain raster artwork with animated atmospheric layers rather than fully animated 3D environments.

No production deployment was performed.

## Changed files in this pass

- `src/components/game-ui/vision-character.css`
- `src/games/AngleArenaGame.tsx`
- `src/games/GameSceneEffects.tsx`
- `src/games/MathsVsZombiesGame.tsx`
- `src/games/MultiplicationColumns.tsx`
- `src/games/SharePartyTable.tsx`
- `src/games/ShareSplitterGame.tsx`
- `src/games/share-splitter.css`
- `src/games/presentation-quality.css`
- `src/main.tsx`
- `scripts/capture-current-game-screenshots.mjs`
- `scripts/qa/presentation-audit.mjs`
- `scripts/verify-review-polish.mjs`
- `scripts/verify-share-splitter-reskin.mjs`
- `scripts/verify-zombie-ground-movement.mjs`
- `scripts/build-presentation-review.mjs`
- `docs/presentation-quality-review.md`
- Generated evidence in `qa-artifacts/deployment-presentation/`.

## Assumptions

- Preserve the approved rich concept style and current cast identities.
- Target desktop within the website and iPhone landscape; portrait is outside this pass.
- Preserve maths, scoring and difficulty. Movement consistency and presentation corrections are in scope.
- A representative level per game type establishes the visual review, not exhaustive question-bank or deployment certification.

No external legacy assumptions were used.
