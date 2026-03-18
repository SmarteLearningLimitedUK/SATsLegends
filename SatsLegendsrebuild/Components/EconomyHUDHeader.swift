import SwiftUI

struct EconomyHUDHeader: View {
    @EnvironmentObject private var appState: AppState

    let title: String
    let subtitle: String

    var body: some View {
        TopHUDBar(
            title: title,
            subtitle: subtitle,
            coins: appState.economy.coins,
            gems: appState.economy.gems,
            energy: appState.economy.energy
        )
    }
}