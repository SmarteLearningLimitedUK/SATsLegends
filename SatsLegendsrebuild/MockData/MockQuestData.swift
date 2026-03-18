import Foundation

enum MockQuestData {
    static let dailyQuests: [GameQuest] = [
        GameQuest(id: UUID(), title: "Precision Streak", detail: "Complete 3 rounds with 80%+ accuracy", skillTag: .rounding, target: 3, progress: 1, rewardCoins: 120, rewardGems: 2),
        GameQuest(id: UUID(), title: "Fraction Focus", detail: "Solve 12 fraction tasks", skillTag: .fractionAddSubtract, target: 12, progress: 7, rewardCoins: 180, rewardGems: 3),
        GameQuest(id: UUID(), title: "Time Trial", detail: "Finish one level in under 4 minutes", skillTag: .time, target: 1, progress: 0, rewardCoins: 220, rewardGems: 5)
    ]

    static let loginRewards: [LoginReward] = [
        LoginReward(id: UUID(), day: 1, coins: 150, gems: 0, isClaimed: false),
        LoginReward(id: UUID(), day: 2, coins: 180, gems: 1, isClaimed: false),
        LoginReward(id: UUID(), day: 3, coins: 220, gems: 2, isClaimed: false),
        LoginReward(id: UUID(), day: 4, coins: 260, gems: 2, isClaimed: false),
        LoginReward(id: UUID(), day: 5, coins: 300, gems: 3, isClaimed: false),
        LoginReward(id: UUID(), day: 6, coins: 350, gems: 4, isClaimed: false),
        LoginReward(id: UUID(), day: 7, coins: 500, gems: 8, isClaimed: false)
    ]
}
