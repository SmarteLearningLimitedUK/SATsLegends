import Foundation

enum SkillTag: String, CaseIterable, Codable, Identifiable, Hashable {
    case placeValue = "PLACE_VALUE"
    case rounding = "ROUNDING"
    case primeNumbers = "PRIME_NUMBERS"
    case fractionEquivalence = "FRACTION_EQUIVALENCE"
    case fractionAddSubtract = "FRACTION_ADD_SUBTRACT"
    case ratio = "RATIO"
    case angles = "ANGLES"
    case shapeProperties = "SHAPE_PROPERTIES"
    case areaPerimeter = "AREA_PERIMETER"
    case time = "TIME"
    case conversion = "CONVERSION"
    case dataInterpretation = "DATA_INTERPRETATION"

    var id: String { rawValue }

    var displayName: String {
        rawValue
            .split(separator: "_")
            .map { $0.capitalized }
            .joined(separator: " ")
    }
}
