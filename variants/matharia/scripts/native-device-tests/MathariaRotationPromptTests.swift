import XCTest
import UIKit

/// Rotation regression only: the real WKWebView and native shell, with no purchases.
final class MathariaUITests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "com.smartelearning.satslegends")
    }
    override func tearDownWithError() throws {
        app?.terminate()
        XCUIDevice.shared.orientation = .portrait
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func waitFor(_ message: String, _ check: @escaping () -> Bool) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in check() }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 20), .completed, message)
    }
    private func launch(_ route: String, orientation: UIDeviceOrientation) {
        XCUIDevice.shared.orientation = orientation
        app.launchArguments = ["--matharia-native-ui-test"]
        app.launchEnvironment = ["MATHARIA_QA_ROUTE": route]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 35))
    }
    private var prompt: XCUIElement { app.webViews.staticTexts["Turn your device sideways"].firstMatch }
    private var tips: XCUIElement { app.webViews.buttons["Tips: how to play"].firstMatch }
    private func assertPortraitPrompt() {
        waitFor("Turn-device prompt must be visible and upright") { self.prompt.exists && self.prompt.isHittable && self.app.windows.firstMatch.frame.height > self.app.windows.firstMatch.frame.width }
        XCTAssertFalse(tips.isHittable, "The landscape game must not be playable behind the prompt")
        let back = app.webViews.buttons["Back to island"].firstMatch
        XCTAssertTrue(back.exists && back.isHittable)
    }
    private func assertLandscapeGame() {
        waitFor("Landscape interface must follow the sideways device") { self.app.windows.firstMatch.frame.width > self.app.windows.firstMatch.frame.height }
        waitFor("Rotation prompt must disappear") { !self.prompt.exists || !self.prompt.isHittable }
        for _ in 0..<4 {
            let start = app.webViews.buttons.matching(NSPredicate(format: "label MATCHES[c] %@", "(Start.*|Begin.*|Let.s.*|Continue.*)")).firstMatch
            if start.waitForExistence(timeout: 2) && start.isHittable { start.tap() } else { break }
        }
        waitFor("Game controls must become usable after turning sideways") { self.tips.exists && self.tips.isHittable }
    }
    func testOpeningUprightAndTurningBackDuringPlay() {
        launch("ROTATION_GAME_ROUTE", orientation: .portrait)
        assertPortraitPrompt()
        capture("opening-upright-turn-device-prompt")
        XCUIDevice.shared.orientation = .landscapeLeft
        assertLandscapeGame()
        capture("sideways-game-ready")
        XCUIDevice.shared.orientation = .portrait
        assertPortraitPrompt()
        capture("return-to-portrait-turn-device-prompt")
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        app.activate()
        assertPortraitPrompt()
        XCUIDevice.shared.orientation = .landscapeRight
        assertLandscapeGame()
        capture("sideways-resumed-after-backgrounding")
        app.webViews.buttons["Back"].firstMatch.tap()
        waitFor("Island must return to its portrait lock") { self.app.windows.firstMatch.frame.height > self.app.windows.firstMatch.frame.width }
    }
    func testOpeningWhileAlreadySideways() {
        launch("ROTATION_GAME_ROUTE", orientation: .landscapeLeft)
        assertLandscapeGame()
        capture("already-sideways-launch")
    }
    func testPortraitWelcomeStillLocksUpright() {
        launch("/play", orientation: .landscapeLeft)
        XCTAssertTrue(app.webViews.buttons["Start adventure"].firstMatch.waitForExistence(timeout: 35))
        waitFor("Welcome screen must retain the existing portrait lock") { self.app.windows.firstMatch.frame.height > self.app.windows.firstMatch.frame.width }
        XCUIDevice.shared.orientation = .landscapeRight
        waitFor("Welcome must remain portrait after a further physical turn") { self.app.windows.firstMatch.frame.height > self.app.windows.firstMatch.frame.width }
        capture("welcome-portrait-lock-preserved")
    }
}
