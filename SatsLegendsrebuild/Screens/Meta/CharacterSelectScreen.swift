import SwiftUI

struct CharacterSelectScreen: View {
    @EnvironmentObject private var appState: AppState

    @StateObject private var viewModel = CharacterSelectViewModel()

    var body: some View {
        ResponsiveScreenContainer {
            EconomyHUDHeader(title: "Character Select", subtitle: "Switch active hero")

            ForEach(viewModel.roster(from: appState)) { character in
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(character.name)
                                    .font(.headline)
                                Text(character.title)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(character.rarity.rawValue.capitalized)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(uiColor: .tertiarySystemBackground))
                                .clipShape(Capsule())
                        }

                        Text(character.bio)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        if appState.player.selectedCharacterID == character.id {
                            SecondaryButton(title: "Currently Active", systemImage: "checkmark.circle.fill") {}
                                .disabled(true)
                        } else if character.isOwned {
                            PrimaryButton(title: "Set Active", systemImage: "person.fill.checkmark") {
                                appState.selectCharacter(character.id)
                            }
                        } else {
                            SecondaryButton(title: "Locked - Visit Shop") {}
                                .disabled(true)
                        }
                    }
                }
            }
        }
        .navigationTitle("Characters")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CharacterSelectScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            CharacterSelectScreen()
                .environmentObject(AppState.preview)
        }
    }
}