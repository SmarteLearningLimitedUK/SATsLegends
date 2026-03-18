import SwiftUI

struct FTUECharacterSelectScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel = FTUECharacterSelectViewModel()
    @State private var selectedCharacterID: UUID?

    var body: some View {
        ResponsiveScreenContainer {
            SectionTitle(
                title: "Choose Your Starter Hero",
                subtitle: "Pick one to unlock your first run. You can switch later."
            )

            let starters = viewModel.starterRoster(from: appState)
            ForEach(starters) { character in
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        Text("\(character.name) - \(character.title)")
                            .font(.headline)

                        Text(character.bio)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        HStack {
                            Text(character.rarity.rawValue.capitalized)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(uiColor: .tertiarySystemBackground))
                                .clipShape(Capsule())

                            Spacer()

                            if selectedCharacterID == character.id {
                                Label("Selected", systemImage: "checkmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(.green)
                            }
                        }

                        SecondaryButton(title: selectedCharacterID == character.id ? "Selected" : "Select") {
                            selectedCharacterID = character.id
                        }
                    }
                }
            }

            PrimaryButton(title: "Start Adventure", systemImage: "play.fill") {
                guard let selectedCharacterID else { return }
                router.completeFTUE(characterID: selectedCharacterID, appState: appState)
            }
            .opacity(selectedCharacterID == nil ? 0.5 : 1)
            .disabled(selectedCharacterID == nil)
        }
    }
}

struct FTUECharacterSelectScreen_Previews: PreviewProvider {
    static var previews: some View {
        FTUECharacterSelectScreen()
            .environmentObject(AppState.preview)
            .environmentObject(AppRouter())
    }
}