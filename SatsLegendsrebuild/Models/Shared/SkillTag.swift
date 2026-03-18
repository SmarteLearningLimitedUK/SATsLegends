import Foundation

enum SkillTag: String, CaseIterable, Codable, Identifiable, Hashable {
    case placeValue = "PLACE_VALUE"
    case fractions = "FRACTIONS"
    case ratio = "RATIO"
    case angles = "ANGLES"
    case area = "AREA"
    case time = "TIME"
    case data = "DATA"
    case rounding = "ROUNDING"
    case primeNumbers = "PRIME_NUMBERS"
    case conversion = "CONVERSION"

    var id: String { rawValue }

    var displayName: String {
        rawValue
            .split(separator: "_")
            .map { $0.capitalized }
            .joined(separator: " ")
    }
}