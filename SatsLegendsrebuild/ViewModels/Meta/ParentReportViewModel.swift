import Foundation

@MainActor
final class ParentReportViewModel: ObservableObject {
    func report(from appState: AppState) -> ParentReport {
        appState.parentReport
    }
}