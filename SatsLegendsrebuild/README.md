# SatsLegendsrebuild (SwiftUI Framework Shell)

Refactored SwiftUI framework for Sats Legends with consistent naming and stricter feature folder ownership.

## Enforced structure

- `App/`
- `Core/`
- `DesignSystem/`
- `Models/` (grouped: `Characters`, `Player`, `Progression`, `Reports`, `Shared`, `World`)
- `ViewModels/` (grouped by feature: `Onboarding`, `Hub`, `World`, `Gameplay`, `Meta`)
- `Screens/` (grouped by feature: `Onboarding`, `Hub`, `World`, `Gameplay`, `Meta`)
- `Components/`
- `Navigation/`
- `Services/`
- `MockData/`

## Naming and duplication refactor

- Standardized model naming used across app state, view models, and mock data:
  - `GameCharacter`
  - `GameQuest`
  - `LoginReward`
  - `GameLevel`
  - `SkillProgress`
- Removed duplicate alias indirection (`DomainAliases.swift`).
- Reduced repeated HUD setup with reusable `EconomyHUDHeader` component.
- Split mixed view-model files into feature-owned files to avoid cross-feature coupling.

## Scope reminder

Framework only: no final art, gameplay mechanics, backend, analytics, or audio.