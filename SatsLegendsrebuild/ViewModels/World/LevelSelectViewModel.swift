import Foundation

@MainActor
final class LevelSelectViewModel: ObservableObject {
    private(set) var islandID: UUID

    init(islandID: UUID) {
        self.islandID = islandID
    }

    func levelRows(appState: AppState) -> [GameLevel] {
        appState.levels(for: islandID)
    }
}