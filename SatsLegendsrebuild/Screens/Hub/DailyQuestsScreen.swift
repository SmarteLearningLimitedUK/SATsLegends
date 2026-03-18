import SwiftUI

struct DailyQuestsScreen: View {
    @EnvironmentObject private var appState: AppState

    @StateObject private var viewModel = DailyQuestsViewModel()

    var body: some View {
        ResponsiveScreenContainer {
            EconomyHUDHeader(title: "Daily Quests", subtitle: "High-value short objectives")

            ForEach(viewModel.quests(from: appState)) { quest in
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        Text(quest.title)
                            .font(.headline)
                        Text(quest.detail)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        ProgressView(value: Double(quest.progress), total: Double(quest.target))

                        HStack {
                            SkillTagChip(skill: quest.skillTag)
                            Spacer()
                            Text("+\(quest.rewardCoins) coins, +\(quest.rewardGems) gems")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Daily Quests")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DailyQuestsScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            DailyQuestsScreen()
                .environmentObject(AppState.preview)
        }
    }
}