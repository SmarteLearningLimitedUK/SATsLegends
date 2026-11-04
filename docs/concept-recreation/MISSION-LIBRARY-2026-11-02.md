# Mission library redesign — 2 November 2026

Implemented the island selection redesign in the separate Matharia React/Vite/Capacitor variant. The original controller still computes the campaign, unlocks, scores and callbacks. The native Swift host remains unchanged.

## Design and references

The current user photographs of the iPhone 15 mission board established the problems: oversized repeated headings, limited level visibility, accordion navigation and text near ornamentation. The replacement uses a compact scenic island identity, a swipeable game selector, and one focused workspace with five level choices and a persistent launch action. Full-access users see the levels first; free users see the original free practice action first. Mock papers have a distinct paper summary and Launch action.

Reference viewport: 393×852 CSS pixels. The baseline used a roughly 168px scenic region, 118px game picker and remaining-height workspace. Final constraints let the header and tabs grow with content: scenic minimum content plus a .38fr share, automatic picker height and remaining-height panel. Landscape phones put scenery and tabs on the left and the workspace on the right. Essential footer copy and controls have additional clearance from the frame's corner ornaments. Large text and compact content can scroll inside the workspace while the launch action remains accessible.

The independent scenery, transparent navigator, ornate frames, gems and buttons come from the current repository. No new production art was needed. The custom controls explicitly opt out of the global fallback button skin. No flattened screenshot, baked control overlay, background patch or concealment mask was introduced.

## Source files changed

- `variants/matharia/src/shared/IslandAdventureBoard.tsx`
- `variants/matharia/src/shared/MissionLibrary.tsx`
- `variants/matharia/src/shared/mission-library.css`
- `variants/matharia/src/shared/shared-adventure.css`

`IslandAdventureBoard.tsx` re-exports the new modular renderer, preserving the existing adapter entry. The obsolete island-board CSS was removed from `shared-adventure.css`; briefing and results styling was retained. QA scripts, captures and receipts are under `qa-artifacts/mission-library/`. The generated native public bundle was refreshed.

## Visual evidence and checklist

- [Before versus running redesign](../../qa-artifacts/mission-library/before-after.png) — same browser viewport and isolated account fixture.
- [iPhone 15 size](../../qa-artifacts/mission-library/after/iphone15.png), [iPad landscape](../../qa-artifacts/mission-library/after/ipad.png), [phone landscape](../../qa-artifacts/mission-library/after/landscape.png).
- [37-entry screen checklist](../../qa-artifacts/mission-library/screen-checklist.json), [full receipts](../../qa-artifacts/mission-library/RESULT.json).
- Contact sheets `contact-1.png` through `contact-4.png` and individual running screens are in the QA directory. All 37 game/paper selections were inspected for layout, text containment and asset quality.

## Verification

- Seven WebKit browser viewport profiles: 320×568, 852×393, 667×375, 393×852, 430×932, 1024×768, 768×1024. These are browser tests, not iOS simulator tests.
- 37 live game/paper selections across eight islands; no missing displayed images or page overflow in the covered states.
- Account open/close, level preview, prerequisite locks, existing upgrade flow, exactly the original three free practices, free-practice progression recommendation, keyboard tabs, rotation, calm activity and map navigation.
- Number Line Ninja, Prime Pop and Conversion Canyon launch/pause/return paths. The selected game survives Back and repeated Continue. All three mock papers launch their actual game and return to their selected summary.
- Independent Ninja answer calculation, incorrect feedback/lives, pause/resume, failure, Retry, victory/rewards and Map return.
- Chromium normal-motion capture and button press/release; 160ms panel transition settles. Reduced motion removes CSS animation.
- 125% and 150% isolated font enlargement, plus CSS safe-area simulations (portrait top59/bottom34; landscape sides59/bottom21). These do not verify native Dynamic Type or physical device insets.
- TypeScript, Vite build, mission-return regression and source preservation checks pass. The 37 approved references and original source controllers remain unchanged by this task.
- Capacitor iOS asset sync and iOS 16.4 minimum checks pass. All 838 web build files match their native public copies by SHA-256.

## Assumptions and remaining work

The existing repository's sapphire-and-gold library and controller contracts are authoritative. The iPhone 15 photographs are the primary layout reference; deliberate responsive layouts cover the other browser sizes. No external legacy assumptions were used.

No blocking browser defects were identified in the covered final states. Actual iPhone/iPad execution, safe areas, VoiceOver, Dynamic Type, native performance and live Apple sign-in/purchase behaviour remain unverified on this Windows host. Auth and purchase callbacks were preserved and checked with an isolated account fixture; no live account settings were changed. Other games' full mechanics were not exhaustively replayed during this menu redesign.

This change has not been pushed, signed, uploaded to TestFlight, deployed or merged. Before production, run the native device pass and create/upload a fresh signed build through the existing Mac workflow. Prior TestFlight binaries do not contain this redesign.
