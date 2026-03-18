import SwiftUI

struct SplashScreen: View {
    let onFinished: () -> Void

    @State private var hasCompletedDelay = false

    var body: some View {
        ResponsiveScreenContainer(scrollable: false) { _ in
            Spacer(minLength: 0)

            VStack(spacing: AppSpacing.large) {
                Text("Sats Legends")
                    .font(.system(size: 42, weight: .bold, design: .rounded))

                Text("Game-first SATs adventure")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                ProgressView()
                    .controlSize(.large)
            }
            .frame(maxWidth: .infinity)

            Spacer(minLength: 0)
        }
        .task {
            guard !hasCompletedDelay else { return }
            hasCompletedDelay = true
            try? await Task.sleep(nanoseconds: UInt64(LaunchFlowService.splashDuration * 1_000_000_000))
            onFinished()
        }
    }
}

struct SplashScreen_Previews: PreviewProvider {
    static var previews: some View {
        SplashScreen {}
    }
}