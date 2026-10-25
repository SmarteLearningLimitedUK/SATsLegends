import Foundation
import Capacitor
import StoreKit

/// StoreKit owns payment and local transaction verification. The authenticated
/// server independently checks Apple before the account receives game access.
@objc(LegendsStorePlugin)
public class LegendsStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LegendsStorePlugin"
    public let jsName = "LegendsStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private let productIDs: Set<String> = [
        "com.smartelearning.satslegends.matharia.monthly",
        "com.smartelearning.satslegends.matharia.annual"
    ]
    private var pending: [UInt64: StoreKit.Transaction] = [:]
    private var purchasing = false
    private var updates: Task<Void, Never>?

    public override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result,
                   self.productIDs.contains(transaction.productID) {
                    self.pending[transaction.id] = transaction
                    self.notifyListeners("transactionsChanged", data: [:])
                }
            }
        }
    }
    deinit { updates?.cancel() }

    @objc func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: productIDs)
                call.resolve(["products": products.sorted { $0.price < $1.price }.map { product in
                    ["id": product.id, "name": product.displayName,
                     "price": product.displayPrice, "description": product.description,
                     "period": product.id.hasSuffix("monthly") ? "month" : "year"]
                }])
            } catch { call.reject("Apple’s subscription options could not be loaded. Please try again.") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("productId"), productIDs.contains(id),
              let token = call.getString("appAccountToken"), let account = UUID(uuidString: token) else {
            call.reject("Sign in to your parent account and choose a valid plan."); return
        }
        Task { @MainActor in
            guard !purchasing else { call.reject("A purchase is already in progress."); return }
            purchasing = true
            defer { purchasing = false }
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("This subscription is not available from Apple yet."); return
                }
                switch try await product.purchase(options: [.appAccountToken(account)]) {
                case .success(let result):
                    guard case .verified(let transaction) = result else {
                        call.reject("Apple could not verify this purchase. No access has been granted."); return
                    }
                    pending[transaction.id] = transaction
                    call.resolve(["status": "purchased", "transactionIds": [String(transaction.id)]])
                case .userCancelled: call.resolve(["status": "cancelled", "transactionIds": []])
                case .pending: call.resolve(["status": "pending", "transactionIds": []])
                @unknown default: call.reject("The purchase has not completed. Please check your Apple account.")
                }
            } catch { call.reject("The Apple purchase could not complete. You can try again or restore purchases.") }
        }
    }
    @MainActor private func currentTransactions() async -> [String] {
        var ids = Set<String>()
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result, productIDs.contains(transaction.productID) {
                pending[transaction.id] = transaction; ids.insert(String(transaction.id))
            }
        }
        // Unfinished transactions survive an app close or a failed server sync.
        for await result in StoreKit.Transaction.unfinished {
            if case .verified(let transaction) = result, productIDs.contains(transaction.productID) {
                pending[transaction.id] = transaction; ids.insert(String(transaction.id))
            }
        }
        return Array(ids)
    }
    @objc func entitlements(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(["transactionIds": await currentTransactions()]) }
    }
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do { try await AppStore.sync(); call.resolve(["transactionIds": await currentTransactions()]) }
            catch { call.reject("Purchases could not be restored. Check your Apple account and connection.") }
        }
    }
    @objc func finish(_ call: CAPPluginCall) {
        let ids = call.getArray("transactionIds", String.self) ?? []
        Task { @MainActor in
            for id in ids {
                if let number = UInt64(id), let transaction = pending[number] {
                    await transaction.finish(); pending.removeValue(forKey: number)
                }
            }
            call.resolve()
        }
    }
    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Subscription settings cannot be opened right now."); return
            }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Apple subscription settings could not be opened.") }
        }
    }
}
