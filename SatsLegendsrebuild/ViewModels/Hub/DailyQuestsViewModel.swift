import Foundation

@MainActor
final class DailyQuestsViewModel: ObservableObject {
    func quests(from appState: AppState) -> [GameQuest] {
        appState.quests
    }
}