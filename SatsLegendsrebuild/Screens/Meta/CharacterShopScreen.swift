import SwiftUI

struct CharacterShopScreen: View {
    @EnvironmentObject private var appState: AppState

    @StateObject private var viewModel = CharacterShopViewModel()
    @State private var purchaseMessage = ""

    var body: some View {
        ResponsiveScreenContainer {
            EconomyHUDHeader(title: "Character Shop", subtitle: "Unlock additional roster options")

            if !purchaseMessage.isEmpty {
                AppCard {
                    Text(purchaseMessage)
                        .font(.subheadline)
                }
            }

            let lockedRoster = viewModel.purchasableCharacters(from: appState)
            if lockedRoster.isEmpty {
                AppCard {
                    Text("All characters are already unlocked.")
                        .foregroundStyle(.secondary)
                }
            } else {
                ForEach(lockedRoster) { character in
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.standard) {
                            Text("\(character.name) - \(character.title)")
                                .font(.headline)
                            Text(character.bio)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            Text("Cost: \(character.unlockCostCoins) coins + \(character.unlockCostGems) gems")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            PrimaryButton(title: "Purchase") {
                                let success = appState.purchaseCharacter(character.id)
                                purchaseMessage = success
                                    ? "\(character.name) unlocked."
                                    : "Not enough currency for \(character.name)."
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Shop")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CharacterShopScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            CharacterShopScreen()
                .environmentObject(AppState.preview)
        }
    }
}