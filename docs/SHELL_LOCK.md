# SATs Legends Locked Shell (Do Not Change)

This repo is now in **production stabilisation** mode.

Goal: AAA consistency by freezing layout maths + safe-area rules and forcing minigames to plug into the same shell.

## Locked Structure

These foundation pieces are the only approved gameplay layout:

- AppShell (owns full-viewport, safe-area, no-scroll)
- TopHUD (shell-owned)
- GameShell (question / playfield / answers)
- QuestionPanel
- GameplayViewport
- AnswerPanel
- BottomHUD (shell-owned)

Minigames must render only their unique interactive content inside GameplayViewport, and must not define page-level wrappers.

## Locked Rules (Forever)

Do not change:

- viewport maths (`100vw` / `100dvh`)
- safe-area handling (`env(safe-area-inset-top/bottom)`)
- overflow rules (no body scrolling, no bounce)
- row proportions (TopHUD / middle stage / BottomHUD)
- central playfield bounds
- question/answer panel bounds

Visual polish is allowed only by skinning these regions (tokens, surfaces, fonts, shadows), not by moving them.

## Implementation Anchors

- Root viewport + global no-scroll: `src/index.css`
- Shell host: `src/App.tsx` and `src/app/AppRouter.tsx`
- Locked gameplay shell: `src/layout/shell/GameShell.tsx`
- Back-compat adapter: `src/components/game-ui/GameScreenLayout.tsx`

