import SwiftUI

struct GameContainerView<TopHUD: View, Objective: View, PlayField: View, BottomActions: View, FeedbackLayer: View, PauseOverlay: View>: View {
    let isPausePresented: Bool
    let onResultsTrigger: () -> Void

    @ViewBuilder let topHUD: () -> TopHUD
    @ViewBuilder let objective: () -> Objective
    @ViewBuilder let playField: () -> PlayField
    @ViewBuilder let bottomActions: () -> BottomActions
    @ViewBuilder let feedbackLayer: () -> FeedbackLayer
    @ViewBuilder let pauseOverlay: () -> PauseOverlay

    var body: some View {
        ResponsiveScreenContainer(scrollable: false) { context in
            ZStack {
                VStack(spacing: context.metrics.spacingMedium) {
                    topHUD()

                    AppCard(title: "Objective") {
                        objective()
                    }

                    AppCard {
                        playField()
                            .frame(minHeight: context.metrics.scaled(260), maxHeight: .infinity)
                    }
                    .frame(maxHeight: .infinity)

                    AppCard {
                        bottomActions()
                    }
                }

                VStack {
                    Spacer()
                    feedbackLayer()
                }

                if isPausePresented {
                    pauseOverlay()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.35).ignoresSafeArea())
                }
            }
            .overlay(alignment: .bottomTrailing) {
                Button(action: onResultsTrigger) {
                    Label("Trigger Results", systemImage: "flag.checkered")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, AppSpacing.standard)
                        .padding(.vertical, AppSpacing.tight)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.bottom, context.safeArea.bottom + AppSpacing.standard)
            }
        }
    }
}