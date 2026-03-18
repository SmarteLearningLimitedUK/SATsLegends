import SwiftUI

struct RootCoordinatorView: View {
    @StateObject private var appState = AppState()
    @StateObject private var router = AppRouter()

    var body: some View {
        NavigationStack(path: $appState.navigationState.path) {
            rootStageView
                .navigationDestination(for: AppRoute.self) { route in
                    destination(for: route)
                }
        }
        .environmentObject(appState)
        .environmentObject(router)
    }

    @ViewBuilder
    private var rootStageView: some View {
        switch router.rootStage {
        case .splash:
            SplashScreen {
                router.advanceFromSplash(using: appState)
            }

        case .ftueCharacterSelect:
            FTUECharacterSelectScreen()

        case .dailyReward:
            DailyLoginRewardScreen()

        case .homeHub:
            HomeHubScreen()
        }
    }

    @ViewBuilder
    private func destination(for route: AppRoute) -> some View {
        switch route {
        case .islandMap:
            IslandMapScreen()
        case .levelSelect(let islandID):
            LevelSelectScreen(islandID: islandID)
        case .miniGame(let levelID):
            MiniGameContainerScreen(levelID: levelID)
        case .results(let levelID):
            ResultsScreen(levelID: levelID)
        case .dailyQuests:
            DailyQuestsScreen()
        case .characterSelect:
            CharacterSelectScreen()
        case .characterShop:
            CharacterShopScreen()
        case .playerStats:
            PlayerStatsScreen()
        case .parentReport:
            ParentReportScreen()
        case .settings:
            SettingsScreen()
        }
    }
}

struct RootCoordinatorView_Previews: PreviewProvider {
    static var previews: some View {
        RootCoordinatorView()
    }
}