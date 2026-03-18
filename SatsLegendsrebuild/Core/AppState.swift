import Foundation
import SwiftUI

@MainActor
final class AppState: ObservableObject {
    private enum PersistenceKeys {
        static let selectedCharacterID = "sats_legends_selected_character"
        static let lastRewardClaimTimestamp = "sats_legends_last_reward_claim"
    }

    private let defaults: UserDefaults

    @Published var player: PlayerProfile
    @Published var progression: Progression
    @Published var economy: EconomySnapshot
    @Published var islands: [Island]
    @Published var levels: [GameLevel]
    @Published var quests: [GameQuest]
    @Published var loginRewards: [LoginReward]
    @Published var characters: [GameCharacter]
    @Published var statsSummary: StatsSummary
    @Published var parentReport: ParentReport
    @Published var navigationState = NavigationState()

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.player = MockPlayerData.profile
        self.progression = MockPlayerData.progression
        self.economy = MockEconomyData.snapshot
        self.islands = MockWorldData.islands
        self.levels = MockWorldData.levels
        self.quests = MockQuestData.dailyQuests
        self.loginRewards = MockQuestData.loginRewards
        self.characters = MockCharacterData.roster
        self.statsSummary = MockPlayerData.stats
        self.parentReport = MockParentReportData.report

        if let storedID = defaults.string(forKey: PersistenceKeys.selectedCharacterID),
           let savedCharacterID = UUID(uuidString: storedID) {
            player.selectedCharacterID = savedCharacterID
        }
    }

    var selectedCharacter: GameCharacter? {
        guard let selectedID = player.selectedCharacterID else { return nil }
        return characters.first(where: { $0.id == selectedID })
    }

    var hasSelectedCharacter: Bool {
        player.selectedCharacterID != nil
    }

    var isDailyRewardAvailable: Bool {
        let stamp = defaults.double(forKey: PersistenceKeys.lastRewardClaimTimestamp)
        let lastClaimDate = Date(timeIntervalSince1970: stamp)
        return !Calendar.current.isDateInToday(lastClaimDate)
    }

    func selectCharacter(_ id: UUID) {
        player.selectedCharacterID = id
        defaults.set(id.uuidString, forKey: PersistenceKeys.selectedCharacterID)

        if let idx = characters.firstIndex(where: { $0.id == id }) {
            characters[idx].isOwned = true
        }
    }

    @discardableResult
    func purchaseCharacter(_ id: UUID) -> Bool {
        guard let index = characters.firstIndex(where: { $0.id == id }) else { return false }
        let character = characters[index]
        guard !character.isOwned else { return true }

        guard economy.coins >= character.unlockCostCoins,
              economy.gems >= character.unlockCostGems else {
            return false
        }

        economy.coins -= character.unlockCostCoins
        economy.gems -= character.unlockCostGems
        characters[index].isOwned = true
        return true
    }

    @discardableResult
    func claimDailyRewardIfAvailable() -> LoginReward? {
        guard isDailyRewardAvailable else { return nil }

        guard let index = loginRewards.firstIndex(where: { !$0.isClaimed }) else {
            defaults.set(Date().timeIntervalSince1970, forKey: PersistenceKeys.lastRewardClaimTimestamp)
            return nil
        }

        loginRewards[index].isClaimed = true
        economy.coins += loginRewards[index].coins
        economy.gems += loginRewards[index].gems
        player.dailyStreak += 1
        defaults.set(Date().timeIntervalSince1970, forKey: PersistenceKeys.lastRewardClaimTimestamp)
        return loginRewards[index]
    }

    func island(for id: UUID) -> Island? {
        islands.first(where: { $0.id == id })
    }

    func level(for id: UUID) -> GameLevel? {
        levels.first(where: { $0.id == id })
    }

    func levels(for islandID: UUID) -> [GameLevel] {
        levels
            .filter { $0.islandID == islandID }
            .sorted { $0.order < $1.order }
    }

    func completeLevel(_ levelID: UUID, stars: Int = 2) {
        progression.completedLevelIDs.insert(levelID)
        progression.starsByLevelID[levelID] = max(stars, progression.starsByLevelID[levelID] ?? 0)
    }

    func nextLevel(after levelID: UUID) -> GameLevel? {
        let orderedIslands = islands.sorted(by: { $0.order < $1.order })
        let orderedLevels = orderedIslands.flatMap { island in
            levels(for: island.id)
        }

        guard let currentIndex = orderedLevels.firstIndex(where: { $0.id == levelID }) else {
            return nil
        }

        let nextIndex = orderedLevels.index(after: currentIndex)
        guard nextIndex < orderedLevels.endIndex else { return nil }
        return orderedLevels[nextIndex]
    }
}

extension AppState {
    static var preview: AppState {
        AppState()
    }
}