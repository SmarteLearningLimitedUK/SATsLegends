import Foundation

@MainActor
final class DailyLoginRewardViewModel: ObservableObject {
    func rewards(from appState: AppState) -> [LoginReward] {
        appState.loginRewards
    }

    func nextClaimDay(from appState: AppState) -> Int {
        (appState.loginRewards.first(where: { !$0.isClaimed })?.day) ?? appState.loginRewards.count
    }
}