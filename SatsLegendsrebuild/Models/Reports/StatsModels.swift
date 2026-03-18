import Foundation

struct EconomySnapshot: Codable, Hashable {
    var coins: Int
    var gems: Int
    var energy: Int
}

struct SkillProgress: Identifiable, Codable, Hashable {
    let id: UUID
    let tag: SkillTag
    var mastery: Double
}

struct StatsSummary: Codable, Hashable {
    var levelsCompleted: Int
    var starsEarned: Int
    var islandsUnlocked: Int
    var favouriteMiniGame: String
    var longestStreak: Int
    var perfectRounds: Int
    var playSessions: Int
    var bestScores: [String: Int]
    var skillProgress: [SkillProgress]
}

struct CompletionOverview: Codable, Hashable {
    var completedLevels: Int
    var totalLevels: Int
    var weeklyMinutes: Int
    var weeklyAccuracy: Double
}

struct RecentActivity: Identifiable, Codable, Hashable {
    let id: UUID
    let title: String
    let timestamp: Date
    let note: String
}

struct ParentReportSummary: Codable, Hashable {
    var completionOverview: CompletionOverview
    var skillMasteryOverview: [SkillProgress]
    var strengths: [SkillTag]
    var improvements: [SkillTag]
    var recentActivity: [RecentActivity]
    var recommendedFocus: [SkillTag]
}

typealias ParentReport = ParentReportSummary
