import Foundation

@MainActor
final class MiniGameContainerViewModel: ObservableObject {
    @Published var isPauseOverlayPresented = false
    @Published var feedbackText = "Ready"

    func togglePause() {
        isPauseOverlayPresented.toggle()
    }

    func pushFeedback(_ text: String) {
        feedbackText = text
    }
}