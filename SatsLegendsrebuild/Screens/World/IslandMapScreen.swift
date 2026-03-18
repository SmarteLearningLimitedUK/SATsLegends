import SwiftUI

struct IslandMapScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel = IslandMapViewModel()

    var body: some View {
        ResponsiveScreenContainer {
            EconomyHUDHeader(title: "Island Map", subtitle: "Choose your next island route")

            ForEach(viewModel.islands(from: appState)) { island in
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        Text(island.name)
                            .font(.headline)
                        Text(island.subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        let completed = viewModel.completionCount(for: island, appState: appState)
                        Text("\(completed)/\(island.levelIDs.count) levels completed")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if island.isUnlocked {
                            PrimaryButton(title: "Open Level Select", systemImage: "arrow.right") {
                                router.navigate(to: .levelSelect(islandID: island.id), appState: appState)
                            }
                        } else {
                            SecondaryButton(title: "Locked") {}
                                .disabled(true)
                        }
                    }
                }
            }
        }
        .navigationTitle("Island Map")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct IslandMapScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            IslandMapScreen()
                .environmentObject(AppState.preview)
                .environmentObject(AppRouter())
        }
    }
}