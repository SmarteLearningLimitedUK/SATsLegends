import SwiftUI

struct LevelSelectScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel: LevelSelectViewModel

    init(islandID: UUID) {
        _viewModel = StateObject(wrappedValue: LevelSelectViewModel(islandID: islandID))
    }

    var body: some View {
        ResponsiveScreenContainer {
            let island = appState.island(for: viewModel.islandID)
            EconomyHUDHeader(
                title: island?.name ?? "Level Select",
                subtitle: "Choose a level shell"
            )

            ForEach(viewModel.levelRows(appState: appState)) { level in
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        HStack {
                            Text("\(level.order). \(level.name)")
                                .font(.headline)
                            Spacer()
                            Text("Difficulty \(level.difficulty)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        HStack(spacing: AppSpacing.tight) {
                            ForEach(level.skillTags) { tag in
                                SkillTagChip(skill: tag)
                            }
                        }

                        Text("Approx \(level.estimatedMinutes) min")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if level.isUnlocked {
                            PrimaryButton(title: "Launch Mini-game Container", systemImage: "play.fill") {
                                router.navigate(to: .miniGame(levelID: level.id), appState: appState)
                            }
                        } else {
                            SecondaryButton(title: "Locked") {}
                                .disabled(true)
                        }
                    }
                }
            }
        }
        .navigationTitle("Levels")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LevelSelectScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            LevelSelectScreen(islandID: MockIDs.islandSky)
                .environmentObject(AppState.preview)
                .environmentObject(AppRouter())
        }
    }
}