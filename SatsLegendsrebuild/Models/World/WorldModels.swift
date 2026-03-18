import Foundation

struct Island: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let subtitle: String
    let order: Int
    let levelIDs: [UUID]
    var isUnlocked: Bool
}

struct GameLevel: Identifiable, Codable, Hashable {
    let id: UUID
    let islandID: UUID
    let name: String
    let order: Int
    let skillTags: [SkillTag]
    let difficulty: Int
    let estimatedMinutes: Int
    var isUnlocked: Bool
}