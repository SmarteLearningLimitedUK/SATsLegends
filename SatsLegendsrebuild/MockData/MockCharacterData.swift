import Foundation

enum MockCharacterData {
    static let roster: [GameCharacter] = [
        GameCharacter(id: MockIDs.characterAstra, name: "Astra", title: "Storm Runner", rarity: .starter, bio: "Balanced starter with reliable pacing.", unlockCostCoins: 0, unlockCostGems: 0, isStarter: true, isOwned: true),
        GameCharacter(id: MockIDs.characterFlint, name: "Flint", title: "Forge Guardian", rarity: .starter, bio: "Steady pressure and high focus boosts.", unlockCostCoins: 0, unlockCostGems: 0, isStarter: true, isOwned: true),
        GameCharacter(id: MockIDs.characterVera, name: "Vera", title: "Archive Seeker", rarity: .starter, bio: "Fast objective handling and clue bonuses.", unlockCostCoins: 0, unlockCostGems: 0, isStarter: true, isOwned: true),
        GameCharacter(id: MockIDs.characterNyx, name: "Nyx", title: "Void Scout", rarity: .rare, bio: "Specialist unlocked from the character shop.", unlockCostCoins: 1_400, unlockCostGems: 10, isStarter: false, isOwned: false),
        GameCharacter(id: MockIDs.characterOrion, name: "Orion", title: "Titan Vanguard", rarity: .epic, bio: "High-end unlock designed for long-term progression.", unlockCostCoins: 2_600, unlockCostGems: 20, isStarter: false, isOwned: false)
    ]
}