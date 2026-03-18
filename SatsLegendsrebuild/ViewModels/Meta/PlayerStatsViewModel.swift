import Foundation

@MainActor
final class PlayerStatsViewModel: ObservableObject {
    func summary(from appState: AppState) -> StatsSummary {
        appState.statsSummary
    }
}