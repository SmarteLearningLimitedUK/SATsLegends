import SwiftUI

struct PlayerStatsScreen: View {
    @EnvironmentObject private var appState: AppState

    @StateObject private var viewModel = PlayerStatsViewModel()

    var body: some View {
        let summary = viewModel.summary(from: appState)

        ResponsiveScreenContainer {
            SectionTitle(title: "Player Stats", subtitle: "Progress and session metrics")

            AppCard(title: "Overview") {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    Text("Sessions: \(summary.sessionsCompleted)")
                    Text("Average accuracy: \(Int(summary.averageAccuracy * 100))%")
                    Text("Total minutes: \(summary.totalMinutesPlayed)")
                    Text("Current streak: \(summary.currentStreak) days")
                }
                .font(.subheadline)
            }

            AppCard(title: "Skill Mastery") {
                VStack(spacing: AppSpacing.standard) {
                    ForEach(summary.skillProgress) { mastery in
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
        }
        .navigationTitle("Player Stats")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PlayerStatsScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            PlayerStatsScreen()
                .environmentObject(AppState.preview)
        }
    }
}