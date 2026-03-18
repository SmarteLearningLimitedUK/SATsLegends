import Foundation

@MainActor
final class CharacterSelectViewModel: ObservableObject {
    func roster(from appState: AppState) -> [GameCharacter] {
        appState.characters
    }
}