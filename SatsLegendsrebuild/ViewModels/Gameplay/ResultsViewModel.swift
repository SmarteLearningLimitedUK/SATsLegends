import Foundation

@MainActor
final class ResultsViewModel: ObservableObject {
    func starsEarned(for levelID: UUID, appState: AppState) -> Int {
        appState.progression.starsByLevelID[levelID] ?? 2
    }

    func nextLevel(after levelID: UUID, appState: AppState) -> GameLevel? {
        appState.nextLevel(after: levelID)
    }
}