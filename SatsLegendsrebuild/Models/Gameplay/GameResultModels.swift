import Foundation

struct LevelResult: Identifiable, Codable, Hashable {
    let id: UUID
    let levelID: UUID
    let score: Int
    let stars: Int
    let wasSuccessful: Bool
    let completionDate: Date
}

struct GameResultSummary: Codable, Hashable {
    var latestResult: LevelResult?
    var recentResults: [LevelResult]
}
