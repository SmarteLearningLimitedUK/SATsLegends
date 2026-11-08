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
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func waitFor(_ message: String, _ check: @escaping () -> Bool) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in check() }, object: nil)
        let result = XCTWaiter.wait(for: [expectation], timeout: 45)
        if result != .completed {
            capture("failed-rotation-check")
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = message
            tree.lifetime = .keepAlways
            add(tree)
        }
        XCTAssertEqual(result, .completed, message)
    }
    private func launch(_ route: String, orientation: UIDeviceOrientation) {
        XCUIDevice.shared.orientation = orientation
        app.launchArguments = ["--matharia-native-ui-test"]
        app.launchEnvironment = ["MATHARIA_QA_ROUTE": route]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 35))
    }
    private var prompt: XCUIElement { app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Turn your device sideways")).firstMatch }
    private var tips: XCUIElement { app.webViews.buttons["Tips: how to play"].firstMatch }
    private func assertPortraitPrompt() {
        let back = app.webViews.buttons["Back to island"].firstMatch
        // WebKit exposes headings as non-tappable accessibility groups.
        // The text must exist; the actual action must be tappable.
        waitFor("Turn-device prompt must be visible and usable") { self.prompt.exists && back.exists && back.isHittable }
        XCTAssertFalse(tips.exists && tips.isHittable, "The landscape game must not be playable behind the prompt")
        XCTAssertTrue(back.exists && back.isHittable)
    }
    private func assertLandscapeGame() {
        waitFor("Rotation prompt must disappear") { !self.prompt.exists }
        let start = app.webViews.buttons["Start practice"].firstMatch
        waitFor("Game or its practice briefing must be ready") {
            (self.tips.exists && self.tips.isHittable) || (start.exists && start.isHittable)
        }
        if start.exists && start.isHittable {
            start.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
        if UIDevice.current.userInterfaceIdiom == .phone {
            let window = app.windows.firstMatch
            XCTAssertGreaterThan(window.frame.height, window.frame.width)
            let bottom = window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.997))
            let above = window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
            bottom.press(forDuration: 0.02, thenDragTo: above, withVelocity: .fast, thenHoldForDuration: 0)
        } else {
            // The app window need not reach the iPad screen edge in multitasking.
            XCUIDevice.shared.press(.home)
        }
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10), "The Home gesture must leave the game")
        app.activate()
        assertPortraitPrompt()
        XCUIDevice.shared.orientation = .landscapeRight
        assertLandscapeGame()
        capture("sideways-resumed-after-backgrounding")
    }
    func testOpeningWhileAlreadySideways() {
        launch("ROTATION_GAME_ROUTE", orientation: .landscapeLeft)
        assertLandscapeGame()
        capture("already-sideways-launch")
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        XCUIDevice.shared.orientation = .portrait
        app.activate()
        assertPortraitPrompt()
    }
    func testBackFromUprightPromptRestoresIslandControls() {
        launch("ROTATION_GAME_ROUTE", orientation: .portrait)
        assertPortraitPrompt()
        app.webViews.buttons["Back to island"].firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let nextGame = app.webViews.buttons["Next game"].firstMatch
        waitFor("Leaving the rotation prompt must restore usable island controls") { nextGame.exists && nextGame.isHittable }
        XCTAssertFalse(tips.exists && tips.isHittable)
        capture("turn-device-back-to-island")
    }
}
