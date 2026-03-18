import Foundation

enum AppRoute: Hashable {
    case islandMap
    case levelSelect(islandID: UUID)
    case miniGame(levelID: UUID)
    case results(levelID: UUID)
    case dailyQuests
    case characterSelect
    case characterShop
    case playerStats
    case parentReport
    case settings
}

enum RootStage {
    case splash
    case ftueCharacterSelect
    case dailyReward
    case homeHub
}

struct NavigationState {
    var path: [AppRoute] = []
    var pendingDeepLink: AppRoute? = nil
}