# Production presentation contract

The current repository's characters, island scenery and teal/gold identity are the source. No external legacy design assumptions are used.

## Tokens

`src/design/production-tokens.css` is the token owner. Reading surfaces use deep teal `#082d30` and raised teal `#123f3b`; text is ivory `#fff6de`, with supporting text `#d3e6dc`. Gold `#f7cc6b` marks primary actions and trim. Success `#83e5a0` and error `#ffb2ac` accompany existing text feedback. Selection also uses a persistent outline or pressed state. Focus uses `#fff3b1`.

Instructions, mathematical values and controls use the system text face. Short titles retain the existing Baloo/Fredoka family. Compact questions start at 18px and supporting copy at 16px. Main numerical choices use 24px or larger where the game composition allows. Numeric columns use tabular figures. Axis, unit and compact status labels have their own smaller scale; long educational wording is preserved.

Spacing tokens are 4, 8, 12, 16 and 24px. Controls have a 44px minimum target, with primary actions typically 48–56px. Control and panel radii are 14px and 24px; compact compositions may use smaller framing to recover working space. Press feedback is 120ms and entry motion 360ms using the shared easing curve. Reduced motion removes decorative travel/particles.

## Layout ownership

`gameplay-dock-layout.css` owns the physical HUD row and the single safe rectangle, using CSS environment insets once. The remaining game host supplies the measured working height. Individual games must not subtract another HUD or home-indicator allowance.

The four production composition files imported last in `main.tsx` own each game's question, working and response regions. The `data-layout-revision="production-v2"` flag isolates this contract from superseded reference coordinates. Decorative scenery can extend behind these regions; questions, calculations and controls have reserved space and opaque reading surfaces.

`GameActionDock` supplies compact Pause, contextual lightbulb Help and Work access. `GamePauseMenu` retains Back, sound and music, traps focus, supports Escape and restores focus. Existing session pause conditions hold the timer while utilities or the rotation gate are open. Results reserve their primary actions below a scrollable detail region; the four summary statistics fit on the tested compact phone.

## Orientation and accessibility

`checklist.json` is the named orientation matrix. Papers are portrait preferred and adaptive; the 320×568 stress viewport uses the paused landscape launch fallback. Orientation requests are serialized in the existing Capacitor root; React gameplay identity is retained during rotation. Native behaviour still requires macOS/device validation.

Controls retain meaningful labels, explicit switch state, keyboard focus and non-colour feedback. Precision graph markers retain larger directional/check-next controls as alternatives. Reading regions stay separate from scenery. Browser safe-area tests use actual CSS environment-inset emulation; they do not certify native VoiceOver, keyboard, physical touch accuracy or device performance.
