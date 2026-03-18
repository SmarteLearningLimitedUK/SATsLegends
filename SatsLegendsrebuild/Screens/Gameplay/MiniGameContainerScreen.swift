import SwiftUI

struct MiniGameContainerScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: AppRouter

    @StateObject private var viewModel = MiniGameContainerViewModel()

    let levelID: UUID

    var body: some View {
        let level = appState.level(for: levelID)

        GameContainerView(
            isPausePresented: viewModel.isPauseOverlayPresented,
            onResultsTrigger: {
                appState.completeLevel(levelID, stars: 2)
                router.navigate(to: .results(levelID: levelID), appState: appState)
            },
            topHUD: {
                HStack {
                    EconomyHUDHeader(title: level?.name ?? "Mini-game", subtitle: "Container shell")

                    Button {
                        viewModel.togglePause()
                    } label: {
                        Image(systemName: "pause.fill")
                            .padding(12)
                            .background(Color(uiColor: .secondarySystemBackground))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
            },
            objective: {
                VStack(alignment: .leading, spacing: AppSpacing.tight) {
                    Text("Complete objective milestones to finish the round.")
                    if let level {
                        HStack(spacing: AppSpacing.tight) {
                            ForEach(level.skillTags) { tag in
                                SkillTagChip(skill: tag)
                            }
                        }
                    }
                }
            },
            playField: {
                VStack(spacing: AppSpacing.medium) {
                    RoundedRectangle(cornerRadius: AppRadius.medium, style: .continuous)
                        .fill(Color(uiColor: .tertiarySystemBackground))
                        .overlay(Text("Central Play Field Placeholder").font(.headline))

                    HStack(spacing: AppSpacing.standard) {
                        RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous)
                            .fill(Color(uiColor: .tertiarySystemBackground))
                            .overlay(Text("Input Zone").font(.caption))
                        RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous)
                            .fill(Color(uiColor: .tertiarySystemBackground))
                            .overlay(Text("Mechanic Slot").font(.caption))
                    }
                    .frame(height: 100)
                }
            },
            bottomActions: {
                HStack(spacing: AppSpacing.standard) {
                    SecondaryButton(title: viewModel.isPauseOverlayPresented ? "Resume" : "Pause") {
                        viewModel.togglePause()
                    }
                    PrimaryButton(title: "Submit Placeholder Action") {
                        viewModel.pushFeedback("Placeholder action submitted")
                    }
                }
            },
            feedbackLayer: {
                Text(viewModel.feedbackText)
                    .font(.caption)
                    .padding(.horizontal, AppSpacing.standard)
                    .padding(.vertical, AppSpacing.tight)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(Capsule())
            },
            pauseOverlay: {
                VStack(spacing: AppSpacing.medium) {
                    AppCard(title: "Paused") {
                        Text("Pause overlay placeholder for menus and options.")
                            .foregroundStyle(.secondary)
                        PrimaryButton(title: "Resume") {
                            viewModel.togglePause()
                        }
                    }
                }
                .frame(maxWidth: 420)
            }
        )
        .navigationTitle(level?.name ?? "Mini-game")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct MiniGameContainerScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            MiniGameContainerScreen(levelID: MockIDs.levelSky1)
                .environmentObject(AppState.preview)
                .environmentObject(AppRouter())
        }
    }
}