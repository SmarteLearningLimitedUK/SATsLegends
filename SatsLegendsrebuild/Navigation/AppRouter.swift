import Foundation

@MainActor
final class AppRouter: ObservableObject {
    @Published var rootStage: RootStage = .splash

    func advanceFromSplash(using appState: AppState) {
        if !appState.hasSelectedCharacter {
            rootStage = .ftueCharacterSelect
            return
        }

        if appState.isDailyRewardAvailable {
            rootStage = .dailyReward
            return
        }

        rootStage = .homeHub
    }

    func completeFTUE(characterID: UUID, appState: AppState) {
        appState.selectCharacter(characterID)
        rootStage = .homeHub
    }

    func completeDailyReward(appState: AppState) {
        _ = appState.claimDailyRewardIfAvailable()
        rootStage = .homeHub
    }

    func navigate(to route: AppRoute, appState: AppState) {
        appState.navigationState.path.append(route)
    }

    func backToHome(appState: AppState) {
        appState.navigationState.path.removeAll()
        rootStage = .homeHub
    }

    func back(appState: AppState) {
        guard !appState.navigationState.path.isEmpty else { return }
        appState.navigationState.path.removeLast()
    }

    // Reserved for future deep-link support.
    func queueDeepLink(_ route: AppRoute, appState: AppState) {
        appState.navigationState.pendingDeepLink = route
    }
}