import Foundation

@MainActor
final class FTUECharacterSelectViewModel: ObservableObject {
    func starterRoster(from appState: AppState) -> [GameCharacter] {
        appState.characters.filter(\.isStarter)
    }
}