import Foundation

enum MockPlayerData {
    static let profile = PlayerProfile(
        id: UUID(uuidString: "FADED000-1111-2222-3333-444444444444")!,
        displayName: "Player One",
        selectedCharacterID: nil,
        level: 8,
        xp: 1_460,
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
        levelsCompleted: 12,
        starsEarned: 27,
        islandsUnlocked: 2,
        favouriteMiniGame: "Take-Out Rush",
        longestStreak: 9,
        perfectRounds: 18,
        playSessions: 28,
        bestScores: [
            "Take-Out Rush": 8_900,
            "Prime Pop": 7_600,
            "Ratio Rapids": 7_250
        ],
        skillProgress: [
            SkillProgress(id: UUID(), tag: .placeValue, mastery: 0.84),
            SkillProgress(id: UUID(), tag: .fractionEquivalence, mastery: 0.72),
            SkillProgress(id: UUID(), tag: .ratio, mastery: 0.78),
            SkillProgress(id: UUID(), tag: .dataInterpretation, mastery: 0.58)
        ]
    )
}
