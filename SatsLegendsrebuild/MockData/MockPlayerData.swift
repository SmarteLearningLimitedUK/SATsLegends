import Foundation

enum MockPlayerData {
    static let profile = PlayerProfile(
        id: UUID(uuidString: "FADED000-1111-2222-3333-444444444444")!,
        displayName: "Player One",
        selectedCharacterID: nil,
        level: 8,
        xp: 1460,
        lives: 5,
        dailyStreak: 3
    )

    static let progression = Progression(
        currentIslandID: MockIDs.islandSky,
        unlockedIslandIDs: [MockIDs.islandSky, MockIDs.islandForge],
        unlockedLevelIDs: [MockIDs.levelSky1, MockIDs.levelSky2, MockIDs.levelSky3, MockIDs.levelForge1, MockIDs.levelForge2],
        completedLevelIDs: [MockIDs.levelSky1, MockIDs.levelSky2],
        starsByLevelID: [
            MockIDs.levelSky1: 3,
            MockIDs.levelSky2: 2
        ]
    )

    static let stats = StatsSummary(
        sessionsCompleted: 28,
        averageAccuracy: 0.81,
        totalMinutesPlayed: 310,
        currentStreak: 5,
        skillProgress: [
            SkillProgress(id: UUID(), tag: .placeValue, mastery: 0.84),
            SkillProgress(id: UUID(), tag: .ratio, mastery: 0.78),
            SkillProgress(id: UUID(), tag: .fractions, mastery: 0.62),
            SkillProgress(id: UUID(), tag: .data, mastery: 0.58)
        ]
    )
}