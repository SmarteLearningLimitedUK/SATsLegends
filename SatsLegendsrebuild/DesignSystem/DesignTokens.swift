import SwiftUI

enum AppSpacing {
    static let tight: CGFloat = 8
    static let standard: CGFloat = 12
    static let medium: CGFloat = 16
    static let large: CGFloat = 24
    static let sectionGap: CGFloat = 32
}

enum AppRadius {
    static let small: CGFloat = 12
    static let medium: CGFloat = 16
    static let large: CGFloat = 24
}

enum LayoutBreakpoints {
    static let smallPhoneWidth: CGFloat = 375
    static let standardPhoneMin: CGFloat = 390
    static let standardPhoneMax: CGFloat = 393
    static let largePhoneMin: CGFloat = 428
    static let largePhoneMax: CGFloat = 430
    static let iPadPortraitMin: CGFloat = 768
    static let iPadLandscapeMin: CGFloat = 1024
}

enum LayoutConstants {
    static let minTapTarget: CGFloat = 44
    static let iPadReadableMin: CGFloat = 680
    static let iPadReadableMax: CGFloat = 760
}

extension Comparable {
    func clamped(to limits: ClosedRange<Self>) -> Self {
        min(max(self, limits.lowerBound), limits.upperBound)
    }
}