import SwiftUI

struct HomeHubScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter
    @StateObject private var viewModel = HomeHubViewModel()

    var body: some View {
        ResponsiveScreenContainer {
            EconomyHUDHeader(
                title: "Home Hub",
                subtitle: appState.selectedCharacter.map { "Active: \($0.name)" } ?? "No character selected"
            )

            AppCard {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    Text(appState.player.displayName)
                        .font(.headline)
                    Text("Level \(appState.player.level) • Streak \(appState.player.dailyStreak)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            SectionTitle(title: "Game Areas", subtitle: "Modular shell routes for the full experience")

            GeometryReader { proxy in
                let columns = Array(
                    repeating: GridItem(.flexible(), spacing: AppSpacing.standard),
                    count: proxy.size.width >= 700 ? 3 : 2
                )

                LazyVGrid(columns: columns, spacing: AppSpacing.standard) {
                    ForEach(viewModel.destinations) { destination in
                        HubNavCard(
                            title: destination.title,
                            subtitle: destination.subtitle,
                            symbol: destination.symbol
                        ) {
                            router.navigate(to: destination.route, appState: appState)
                        }
                    }
                }
            }
            .frame(minHeight: 420)
        }
    }
}

struct HomeHubScreen_Previews: PreviewProvider {
    static var previews: some View {
        HomeHubScreen()
            .environmentObject(AppState.preview)
            .environmentObject(AppRouter())
    }
}