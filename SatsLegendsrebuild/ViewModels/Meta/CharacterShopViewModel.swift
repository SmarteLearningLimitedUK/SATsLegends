import Foundation

@MainActor
final class CharacterShopViewModel: ObservableObject {
    func purchasableCharacters(from appState: AppState) -> [GameCharacter] {
        appState.characters.filter { !$0.isOwned }
    }
}