import Foundation

struct GameQuest: Identifiable, Codable, Hashable {
    let id: UUID
    var title: String
    var detail: String
    var skillTag: SkillTag
    var target: Int
    var progress: Int
    var rewardCoins: Int
    var rewardGems: Int

    var isComplete: Bool { progress >= target }
}

struct LoginReward: Identifiable, Codable, Hashable {
    let id: UUID
    let day: Int
    let coins: Int
    let gems: Int
    var isClaimed: Bool
}