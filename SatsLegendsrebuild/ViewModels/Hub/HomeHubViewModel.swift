import Foundation

struct HomeHubDestination: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let symbol: String
    let route: AppRoute
}

@MainActor
final class HomeHubViewModel: ObservableObject {
    @Published private(set) var destinations: [HomeHubDestination] = [
        HomeHubDestination(title: "Island Map", subtitle: "Choose an island and mission path.", symbol: "map", route: .islandMap),
        HomeHubDestination(title: "Daily Quests", subtitle: "Pick up high-value short goals.", symbol: "checklist", route: .dailyQuests),
        HomeHubDestination(title: "Characters", subtitle: "Switch your active hero loadout.", symbol: "person.3", route: .characterSelect),
        HomeHubDestination(title: "Character Shop", subtitle: "Unlock premium roster options.", symbol: "bag", route: .characterShop),
        HomeHubDestination(title: "Player Stats", subtitle: "Review progression and play metrics.", symbol: "chart.bar", route: .playerStats),
        HomeHubDestination(title: "Parent Report", subtitle: "View skill mastery and focus areas.", symbol: "doc.text.magnifyingglass", route: .parentReport),
        HomeHubDestination(title: "Settings", subtitle: "Configure controls, sound, and access.", symbol: "gearshape", route: .settings)
    ]
}