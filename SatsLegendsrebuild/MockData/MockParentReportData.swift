import Foundation

enum MockParentReportData {
    static let report = ParentReport(
        completionOverview: CompletionOverview(
            completedLevels: 5,
            totalLevels: 9,
            weeklyMinutes: 112,
            weeklyAccuracy: 0.8
        ),
        skillMasteryOverview: [
            SkillProgress(id: UUID(), tag: .placeValue, mastery: 0.86),
            SkillProgress(id: UUID(), tag: .rounding, mastery: 0.8),
            SkillProgress(id: UUID(), tag: .ratio, mastery: 0.74),
            SkillProgress(id: UUID(), tag: .fractions, mastery: 0.59),
            SkillProgress(id: UUID(), tag: .data, mastery: 0.56)
        ],
        strengths: [.placeValue, .rounding, .angles],
        improvements: [.fractions, .data, .conversion],
        recentActivity: [
            RecentActivity(id: UUID(), title: "Prime Pop", timestamp: Date().addingTimeInterval(-3_600), note: "Finished with 82% accuracy"),
            RecentActivity(id: UUID(), title: "Ratio Rapids", timestamp: Date().addingTimeInterval(-8_000), note: "Reached mastery tier bronze"),
            RecentActivity(id: UUID(), title: "Daily Quest", timestamp: Date().addingTimeInterval(-30_000), note: "Completed Precision Streak")
        ],
        recommendedFocus: [.fractions, .conversion, .data]
    )
}