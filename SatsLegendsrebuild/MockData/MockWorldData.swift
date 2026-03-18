import Foundation

enum MockWorldData {
    static let levels: [GameLevel] = [
        GameLevel(id: MockIDs.levelSky1, islandID: MockIDs.islandSky, name: "Cloud Count", order: 1, skillTags: [.placeValue, .rounding], difficulty: 1, estimatedMinutes: 4, isUnlocked: true),
        GameLevel(id: MockIDs.levelSky2, islandID: MockIDs.islandSky, name: "Prime Pop", order: 2, skillTags: [.primeNumbers], difficulty: 2, estimatedMinutes: 5, isUnlocked: true),
        GameLevel(id: MockIDs.levelSky3, islandID: MockIDs.islandSky, name: "Fraction Drift", order: 3, skillTags: [.fractionEquivalence, .fractionAddSubtract], difficulty: 2, estimatedMinutes: 5, isUnlocked: true),

        GameLevel(id: MockIDs.levelForge1, islandID: MockIDs.islandForge, name: "Ratio Rapids", order: 1, skillTags: [.ratio], difficulty: 2, estimatedMinutes: 6, isUnlocked: true),
        GameLevel(id: MockIDs.levelForge2, islandID: MockIDs.islandForge, name: "Angle Arena", order: 2, skillTags: [.angles, .shapeProperties], difficulty: 3, estimatedMinutes: 6, isUnlocked: true),
        GameLevel(id: MockIDs.levelForge3, islandID: MockIDs.islandForge, name: "Measure Forge", order: 3, skillTags: [.areaPerimeter, .conversion], difficulty: 3, estimatedMinutes: 7, isUnlocked: false),

        GameLevel(id: MockIDs.levelVault1, islandID: MockIDs.islandVault, name: "Timekeeper Run", order: 1, skillTags: [.time], difficulty: 3, estimatedMinutes: 6, isUnlocked: false),
        GameLevel(id: MockIDs.levelVault2, islandID: MockIDs.islandVault, name: "Data Dungeon", order: 2, skillTags: [.dataInterpretation], difficulty: 4, estimatedMinutes: 7, isUnlocked: false),
        GameLevel(id: MockIDs.levelVault3, islandID: MockIDs.islandVault, name: "Vault Relay", order: 3, skillTags: [.fractionAddSubtract, .ratio], difficulty: 4, estimatedMinutes: 8, isUnlocked: false)
    ]

    static let islands: [Island] = [
        Island(id: MockIDs.islandSky, name: "Skyward Cliffs", subtitle: "Warm-up arc", order: 1, levelIDs: [MockIDs.levelSky1, MockIDs.levelSky2, MockIDs.levelSky3], isUnlocked: true),
        Island(id: MockIDs.islandForge, name: "Clockwork Forge", subtitle: "Mid-game mastery", order: 2, levelIDs: [MockIDs.levelForge1, MockIDs.levelForge2, MockIDs.levelForge3], isUnlocked: true),
        Island(id: MockIDs.islandVault, name: "Vault of Trials", subtitle: "Advanced challenge", order: 3, levelIDs: [MockIDs.levelVault1, MockIDs.levelVault2, MockIDs.levelVault3], isUnlocked: false)
    ]
}
