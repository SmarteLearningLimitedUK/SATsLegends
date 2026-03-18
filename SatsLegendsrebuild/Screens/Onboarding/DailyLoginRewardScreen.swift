import SwiftUI

struct DailyLoginRewardScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel = DailyLoginRewardViewModel()

    var body: some View {
        ResponsiveScreenContainer {
            SectionTitle(
                title: "Daily Login Reward",
                subtitle: "Claim once per day before entering the hub"
            )

            AppCard(title: "Reward Track") {
                VStack(spacing: AppSpacing.standard) {
                    let rewards = viewModel.rewards(from: appState)

                    ForEach(rewards) { reward in
                        HStack {
                            Text("Day \(reward.day)")
                                .fontWeight(.semibold)
                            Spacer()
                            Text("\(reward.coins) coins / \(reward.gems) gems")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if reward.isClaimed {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                }
            }

            AppCard {
                Text("Next reward day: \(viewModel.nextClaimDay(from: appState))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            PrimaryButton(title: "Claim and Continue", systemImage: "gift.fill") {
                router.completeDailyReward(appState: appState)
            }

            SecondaryButton(title: "Skip for now") {
                router.rootStage = .homeHub
            }
        }
    }
}

struct DailyLoginRewardScreen_Previews: PreviewProvider {
    static var previews: some View {
        DailyLoginRewardScreen()
            .environmentObject(AppState.preview)
            .environmentObject(AppRouter())
    }
}