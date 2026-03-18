import SwiftUI

struct ParentReportScreen: View {
    @EnvironmentObject private var appState: AppState

    @StateObject private var viewModel = ParentReportViewModel()

    var body: some View {
        let report = viewModel.report(from: appState)

        ResponsiveScreenContainer {
            SectionTitle(title: "Parent Report", subtitle: "Structured overview with placeholder data")

            AppCard(title: "Completion Overview") {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    Text("Levels complete: \(report.completionOverview.completedLevels)/\(report.completionOverview.totalLevels)")
                    Text("Weekly play: \(report.completionOverview.weeklyMinutes) min")
                    Text("Weekly accuracy: \(Int(report.completionOverview.weeklyAccuracy * 100))%")
                }
            }

            AppCard(title: "Skill Mastery Overview") {
                VStack(spacing: AppSpacing.standard) {
                    ForEach(report.skillMasteryOverview) { mastery in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(mastery.tag.displayName)
                                Spacer()
                                Text("\(Int(mastery.mastery * 100))%")
                                    .foregroundStyle(.secondary)
                            }
                            ProgressView(value: mastery.mastery)
                        }
                    }
                }
            }

            AppCard(title: "Strengths") {
                tagWrap(report.strengths)
            }

            AppCard(title: "Areas for Improvement") {
                tagWrap(report.improvements)
            }

            AppCard(title: "Recent Activity") {
                VStack(alignment: .leading, spacing: AppSpacing.standard) {
                    ForEach(report.recentActivity) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.headline)
                            Text(item.note)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(item.timestamp.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            AppCard(title: "Recommended Focus") {
                tagWrap(report.recommendedFocus)
            }
        }
        .navigationTitle("Parent Report")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func tagWrap(_ tags: [SkillTag]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: AppSpacing.tight)], spacing: AppSpacing.tight) {
            ForEach(tags) { tag in
                SkillTagChip(skill: tag)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct ParentReportScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            ParentReportScreen()
                .environmentObject(AppState.preview)
        }
    }
}