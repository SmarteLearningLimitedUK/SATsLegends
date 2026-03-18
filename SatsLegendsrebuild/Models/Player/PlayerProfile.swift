import Foundation

struct PlayerProfile: Identifiable, Codable, Hashable {
    let id: UUID
    var displayName: String
    var selectedCharacterID: UUID?
    var level: Int
    var xp: Int
    var lives: Int
    var dailyStreak: Int
}

struct Progression: Codable, Hashable {
    var currentIslandID: UUID?
    var unlockedIslandIDs: Set<UUID>
    var unlockedLevelIDs: Set<UUID>
    var completedLevelIDs: Set<UUID>
    var starsByLevelID: [UUID: Int]
}