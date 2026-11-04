import XCTest
import StoreKitTest
import UIKit

/// Real XCUIApplication/WKWebView touches, rotation and app backgrounding.
/// Local StoreKit transactions only. No authentication credentials or live purchases.
final class MathariaUITests: XCTestCase {
    private var app: XCUIApplication!
    private var store: SKTestSession!

    override func setUpWithError() throws {
        continueAfterFailure = false
        store = try SKTestSession(configurationFileNamed: "Matharia")
        store.disableDialogs = true
        try store.clearTransactions()
        try store.buyProduct(productIdentifier: "com.smartelearning.satslegends.matharia.monthly")
        app = XCUIApplication(bundleIdentifier: "com.smartelearning.satslegends")
    }

    override func tearDownWithError() throws {
        if let app = app, app.state == .runningForeground { capture("final") }
        app?.terminate()
        try store?.clearTransactions()
        XCUIDevice.shared.orientation = .portrait
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func button(_ label: String) -> XCUIElement { app.webViews.buttons[label].firstMatch }

    private func launch(_ route: String, orientation: UIDeviceOrientation) {
        XCUIDevice.shared.orientation = orientation
        app.launchArguments = ["--matharia-native-ui-test"]
        app.launchEnvironment = ["MATHARIA_QA_ROUTE": route]
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 35), "Native web view failed to load")
    }

    private func dismissBriefings() {
        for _ in 0..<4 {
            let primary = app.webViews.buttons.matching(NSPredicate(format: "label MATCHES[c] %@", "(Start.*|Begin.*|Let.s.*|Launch mock adventure|Back to mission|Continue.*)")).firstMatch
            if primary.waitForExistence(timeout: 2) && primary.isHittable { primary.tap() } else { break }
        }
    }

    private func exercise(route: String, title: String, orientation: String) throws {
        launch(route, orientation: orientation == "portrait" ? .portrait : .landscapeLeft)
        XCTAssertTrue(button("Tips: how to play").waitForExistence(timeout: 35), "Game chrome absent; check entitlement, route or loading failure: \(title)")
        dismissBriefings()
        let scan = button("Scan the power cells")
        if scan.exists && scan.isEnabled && scan.isHittable { scan.tap() }
        capture("\(title)-game")

        let tips = button("Tips: how to play")
        XCTAssertTrue(tips.isHittable, "Help is clipped or obstructed")
        tips.tap()
        let back = button("Back to mission")
        XCTAssertTrue(back.waitForExistence(timeout: 8), "Help did not open")
        capture("\(title)-help")
        XCTAssertTrue(back.isHittable, "Help dismissal is clipped")
        back.tap()

        // A real SpringBoard transition exercises the Capacitor App lifecycle plugin.
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        app.activate()
        XCTAssertTrue(tips.waitForExistence(timeout: 12), "Game did not recover after backgrounding")
        capture("\(title)-resumed")

        XCUIDevice.shared.orientation = .portrait
        if orientation == "landscape" {
            XCTAssertTrue(app.webViews.staticTexts["Turn your device sideways"].firstMatch.waitForExistence(timeout: 10), "Landscape-only game did not show its portrait guard")
        }
        capture("\(title)-portrait-rotation")
        XCUIDevice.shared.orientation = .landscapeRight
        if orientation == "portrait" {
            XCTAssertTrue(app.webViews.staticTexts["Turn your device upright"].firstMatch.waitForExistence(timeout: 10), "Portrait-only game did not show its landscape guard")
        }
        capture("\(title)-landscape-right")
        XCUIDevice.shared.orientation = orientation == "portrait" ? .portrait : .landscapeLeft
        XCTAssertTrue(tips.waitForExistence(timeout: 8))

        // Existing answer-entry games: submit an incorrect value through the real UI.
        let answer = app.webViews.buttons.matching(NSPredicate(format: "label IN %@", ["Enter answer", "Answer"])).firstMatch
        if answer.exists && answer.isEnabled && answer.isHittable {
            answer.tap()
            let field = app.webViews.textFields.firstMatch
            XCTAssertTrue(field.waitForExistence(timeout: 5), "Answer trigger did not open an input")
            field.tap()
            field.typeText("999999")
            capture("\(title)-keyboard")
            let submit = button("Submit answer")
            XCTAssertTrue(submit.exists && submit.isHittable, "Submit is obscured by the keyboard or clipped")
            submit.tap()
        }
        // Timed games can legitimately end during UI automation. Exercise the
        // real retry action instead of treating their result screen as a crash.
        let retry = button("Retry")
        if retry.exists && retry.isHittable {
            capture("\(title)-timed-result")
            retry.tap()
            dismissBriefings()
            XCTAssertTrue(tips.waitForExistence(timeout: 10), "Retry did not restore the game")
            capture("\(title)-retry")
        }
        let exit = button("Back")
        XCTAssertTrue(exit.waitForExistence(timeout: 10) && exit.isHittable, "Back control missing or clipped")
        exit.tap()
        XCTAssertTrue(app.webViews.staticTexts["Choose a level"].firstMatch.waitForExistence(timeout: 12), "Back did not return to the island")
        capture("\(title)-island")
    }

    private func exerciseCalm(title: String, orientation: String) {
        launch("/wellbeing", orientation: .portrait)
        let activity = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
        XCTAssertTrue(activity.waitForExistence(timeout: 25), "Calm activity missing from hub")
        for _ in 0..<5 {
            if activity.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(activity.isHittable, "Calm activity cannot be reached by scrolling")
        activity.tap()
        XCUIDevice.shared.orientation = orientation == "landscape" ? .landscapeLeft : .portrait
        let exit = button("Back").waitForExistence(timeout: 5) ? button("Back") : button("Back to adventure")
        XCTAssertTrue(exit.waitForExistence(timeout: 15), "Calm activity failed to open")
        capture("\(title)-activity")
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        app.activate()
        XCTAssertTrue(exit.waitForExistence(timeout: 10))
        capture("\(title)-resumed")
        XCTAssertTrue(exit.isHittable, "Calm exit clipped or obstructed")
        exit.tap()
        capture("\(title)-exit")
    }

    func testIslandGameCarousel() {
        launch("/island/2", orientation: .portrait)
        let next = button("Next game")
        XCTAssertTrue(next.waitForExistence(timeout: 25) && next.isHittable)
        capture("island-initial")
        next.tap()
        capture("island-next-game")
        let previous = button("Previous game")
        XCTAssertTrue(previous.exists && previous.isHittable)
        previous.tap()
        XCTAssertTrue(app.webViews.staticTexts["Choose a level"].firstMatch.exists)
        capture("island-previous-game")
    }

    func testWelcomeOpensNativeAdventure() {
        launch("/play", orientation: .portrait)
        let start = button("Start adventure")
        XCTAssertTrue(start.waitForExistence(timeout: 25) && start.isHittable)
        capture("welcome")
        start.tap()
        XCTAssertTrue(button("Next game").waitForExistence(timeout: 15))
        XCTAssertEqual(app.state, .runningForeground, "Adventure left the native app")
        capture("welcome-to-island")
    }

    func testUnsubscribedPaidAccessRemainsLocked() throws {
        try store.clearTransactions()
        launch("/game/1/5", orientation: .portrait)
        XCTAssertTrue(app.webViews.staticTexts["A quick parent check."].firstMatch.waitForExistence(timeout: 25), "Locked mission must route purchases through the parent check")
        let close = button("Close")
        XCTAssertTrue(close.isHittable)
        close.tap()
        XCTAssertTrue(app.webViews.staticTexts["This mission is part of the full adventure."].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(button("Tips: how to play").exists, "Production entitlement must not be bypassed by the route fixture")
        capture("paid-access-locked")
    }

    // GENERATED_GAME_TESTS
}
