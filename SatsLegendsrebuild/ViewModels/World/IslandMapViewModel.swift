import Foundation

@MainActor
final class IslandMapViewModel: ObservableObject {
    func islands(from appState: AppState) -> [Island] {
        appState.islands.sorted(by: { $0.order < $1.order })
    }

    func completionCount(for island: Island, appState: AppState) -> Int {
        island.levelIDs.filter { appState.progression.completedLevelIDs.contains($0) }.count
    }
}