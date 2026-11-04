import AuthenticationServices
import Capacitor
import CryptoKit
import Security
import StoreKit
import UIKit

/// Native-only account and purchase boundary. Access comes from verified Apple
/// transactions, never a JavaScript preference or a checkout redirect.
@objc(MathariaServicesPlugin)
public final class MathariaServicesPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "MathariaServicesPlugin"
    public let jsName = "MathariaServices"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]
    private var productIDs: Set<String> {
        Set(Bundle.main.object(forInfoDictionaryKey: "MathariaSubscriptionProductIDs") as? [String] ?? [])
    }
    private var updateTask: Task<Void, Never>?
    private var purchaseBusy = false
    private var authCall: CAPPluginCall?
    private var authController: ASAuthorizationController?
    private var authNonce: String?

    public override func load() {
        updateTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified(let transaction) = result, self.productIDs.contains(transaction.productID) else { continue }
                await transaction.finish()
                let access = await self.currentAccess()
                await MainActor.run { self.notifyListeners("entitlementsChanged", data: access, retainUntilConsumed: true) }
            }
        }
    }
    deinit { updateTask?.cancel() }

    private func currentAccess() async -> JSObject {
        var active = false
        var expiresAt: Double?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result,
                  productIDs.contains(transaction.productID),
                  transaction.productType == .autoRenewable,
                  transaction.revocationDate == nil, !transaction.isUpgraded,
                  let expiration = transaction.expirationDate, expiration > Date() else { continue }
            active = true
            expiresAt = max(expiresAt ?? 0, expiration.timeIntervalSince1970 * 1000)
        }
        var access: JSObject = ["active": active, "expiresAt": NSNull(), "configured": !productIDs.isEmpty]
        if let expiresAt { access["expiresAt"] = expiresAt }
        return access
    }
    private func periodName(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "period"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        Task { @MainActor in
            var access = await currentAccess()
            do {
                let products = try await Product.products(for: productIDs)
                access["plans"] = products.filter { $0.type == .autoRenewable }.sorted { $0.price < $1.price }.compactMap { product -> JSObject? in
                    guard let period = product.subscription?.subscriptionPeriod else { return nil }
                    return ["id": product.id, "name": product.displayName, "price": product.displayPrice,
                            "period": periodName(period.unit), "periodCount": period.value]
                }
            } catch {
                // Verified, cached entitlements still work when the catalogue is offline.
                access["plans"] = [JSObject]()
            }
            call.resolve(access)
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchaseBusy else { call.reject("A purchase is already in progress.", "BUSY"); return }
            guard let id = call.getString("productId"), productIDs.contains(id) else {
                call.reject("This subscription is not available.", "UNKNOWN_PRODUCT"); return
            }
            purchaseBusy = true
            defer { purchaseBusy = false }
            do {
                guard let product = try await Product.products(for: [id]).first, product.type == .autoRenewable else {
                    call.reject("This subscription is not available from the App Store.", "UNAVAILABLE"); return
                }
                var options = Set<Product.PurchaseOption>()
                if let raw = call.getString("accountToken"), let token = UUID(uuidString: raw) { options.insert(.appAccountToken(token)) }
                let purchase = try await product.purchase(options: options)
                var outcome: String
                switch purchase {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("Apple could not verify this purchase. Please restore purchases or try again.", "UNVERIFIED"); return
                    }
                    await transaction.finish()
                    outcome = "purchased"
                case .pending: outcome = "pending"
                case .userCancelled: outcome = "cancelled"
                @unknown default: outcome = "pending"
                }
                var access = await currentAccess()
                if outcome == "purchased", access["active"] as? Bool != true { outcome = "pending" }
                notifyListeners("entitlementsChanged", data: access, retainUntilConsumed: true)
                access["outcome"] = outcome
                call.resolve(access)
            } catch { call.reject("Unable to complete the App Store purchase. Please try again.", "STORE_ERROR") }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchaseBusy else { call.reject("A purchase is already in progress.", "BUSY"); return }
            purchaseBusy = true
            defer { purchaseBusy = false }
            do {
                // Only a deliberate Restore action invokes the Apple authentication prompt.
                try await AppStore.sync()
                let access = await currentAccess()
                notifyListeners("entitlementsChanged", data: access, retainUntilConsumed: true)
                call.resolve(access)
            } catch { call.reject("Unable to restore purchases. Check your connection and Apple Account.", "RESTORE_ERROR") }
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = bridge?.viewController?.view.window?.windowScene else { call.reject("Open the app before managing subscriptions."); return }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Unable to open your App Store subscriptions.", "STORE_ERROR") }
        }
    }

    @objc func signInWithApple(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.authCall == nil else { call.reject("Sign-in is already in progress.", "BUSY"); return }
            guard self.bridge?.viewController?.view.window != nil else { call.reject("Open the app before signing in."); return }
            var random = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, random.count, &random) == errSecSuccess else { call.reject("Unable to start secure sign-in."); return }
            let nonce = random.map { String(format: "%02x", $0) }.joined()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            self.authCall = call
            self.authNonce = nonce
            let controller = ASAuthorizationController(authorizationRequests: [request])
            self.authController = controller
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? UIWindow()
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { authCall = nil; authNonce = nil; authController = nil }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken, let token = String(data: data, encoding: .utf8),
              let nonce = authNonce else { authCall?.reject("Apple did not return a valid sign-in token.", "APPLE_AUTH_FAILED"); return }
        // A fresh authorization code lets the deletion service revoke Apple's
        // credential. It is exchanged immediately and is never logged/persisted.
        var result: JSObject = ["identityToken": token, "nonce": nonce]
        if let codeData = credential.authorizationCode,
           let code = String(data: codeData, encoding: .utf8) { result["authorizationCode"] = code }
        authCall?.resolve(result)
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { authCall = nil; authNonce = nil; authController = nil }
        if (error as? ASAuthorizationError)?.code == .canceled { authCall?.reject("Sign-in cancelled.", "CANCELLED") }
        else { authCall?.reject("Apple sign-in is currently unavailable. Please try again.", "APPLE_AUTH_FAILED") }
    }
}
