import SwiftUI

struct PlayerStatsScreen: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = PlayerStatsViewModel()

    var body: some View {
        let summary = viewModel.summary(from: appState)

        ResponsiveScreenContainer {
            SectionTitle(
                title: "Player Stats",
                subtitle: "Progress highlights and celebration metrics"
            )

            AppCard(title: "Progress Milestones") {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    statRow("Levels Completed", "\(summary.levelsCompleted)")
                    statRow("Stars Earned", "\(summary.starsEarned)")
                    statRow("Islands Unlocked", "\(summary.islandsUnlocked)")
                    statRow("Play Sessions", "\(summary.playSessions)")
                }
            }

            AppCard(title: "Player Highlights") {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    statRow("Favourite Mini-game", summary.favouriteMiniGame)
                    statRow("Longest Streak", "\(summary.longestStreak) days")
                    statRow("Perfect Rounds", "\(summary.perfectRounds)")
                }
            }

            AppCard(title: "Best Scores") {
                if summary.bestScores.isEmpty {
                    Text("No best-score records yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(summary.bestScores.keys.sorted(), id: \.self) { gameName in
                        statRow(gameName, "\(summary.bestScores[gameName] ?? 0)")
                    }
                }
            }

            AppCard(title: "Skill Mastery Snapshot") {
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

    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
        }
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
