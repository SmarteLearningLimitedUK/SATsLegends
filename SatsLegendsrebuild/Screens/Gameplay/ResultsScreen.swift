import SwiftUI

struct ResultsScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel = ResultsViewModel()

    let levelID: UUID

    var body: some View {
        let level = appState.level(for: levelID)
        let nextLevel = viewModel.nextLevel(after: levelID, appState: appState)

        ResponsiveScreenContainer {
            SectionTitle(
                title: "Round Results",
                subtitle: level.map { "\($0.name) completed" } ?? "Round complete"
            )

            AppCard(title: "Summary") {
                VStack(alignment: .leading, spacing: AppSpacing.standard) {
                    Text("Stars Earned: \(viewModel.starsEarned(for: levelID, appState: appState))")
                        .font(.headline)
                    Text("Placeholder performance metrics and reward summary.")
                        .foregroundStyle(.secondary)
                }
            }

            if let nextLevel {
                PrimaryButton(title: "Next Level: \(nextLevel.name)", systemImage: "arrow.right.circle.fill") {
                    router.navigate(to: .miniGame(levelID: nextLevel.id), appState: appState)
                }
            }

            SecondaryButton(title: "Replay Level", systemImage: "arrow.clockwise") {
                router.navigate(to: .miniGame(levelID: levelID), appState: appState)
            }

            if let islandID = level?.islandID {
                SecondaryButton(title: "Return to Level Select", systemImage: "list.number") {
                    router.navigate(to: .levelSelect(islandID: islandID), appState: appState)
                }
            }

            PrimaryButton(title: "Return Home", systemImage: "house.fill") {
                router.backToHome(appState: appState)
            }
        }
        .navigationTitle("Results")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ResultsScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            ResultsScreen(levelID: MockIDs.levelSky1)
                .environmentObject(AppState.preview)
                .environmentObject(AppRouter())
        }
    }
}