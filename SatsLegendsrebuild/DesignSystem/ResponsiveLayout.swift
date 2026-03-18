import SwiftUI

struct ResponsiveMetrics {
    let screenSize: CGSize
    let horizontalPadding: CGFloat
    let readableContentWidth: CGFloat
    let isPadLayout: Bool

    var spacingTight: CGFloat { AppSpacing.tight }
    var spacingStandard: CGFloat { AppSpacing.standard }
    var spacingMedium: CGFloat { AppSpacing.medium }
    var spacingLarge: CGFloat { AppSpacing.large }
    var spacingSection: CGFloat { AppSpacing.sectionGap }

    var proportionalScale: CGFloat {
        (screenSize.width / LayoutBreakpoints.standardPhoneMin).clamped(to: 0.92...1.2)
    }

    func scaled(_ value: CGFloat) -> CGFloat {
        value * proportionalScale
    }

    static func resolve(size: CGSize, horizontalSizeClass: UserInterfaceSizeClass?) -> ResponsiveMetrics {
        let width = size.width
        let isPad = horizontalSizeClass == .regular || width >= LayoutBreakpoints.iPadPortraitMin

        let padding: CGFloat
        if isPad {
            padding = width >= LayoutBreakpoints.iPadLandscapeMin ? 32 : 24
        } else if width <= LayoutBreakpoints.smallPhoneWidth {
            padding = 16
        } else {
            padding = 20
        }

        let readable: CGFloat
        if isPad || width > 700 {
            let candidate = width * 0.84
            readable = candidate.clamped(to: LayoutConstants.iPadReadableMin...LayoutConstants.iPadReadableMax)
        } else {
            readable = width
        }

        return ResponsiveMetrics(
            screenSize: size,
            horizontalPadding: padding,
            readableContentWidth: readable,
            isPadLayout: isPad
        )
    }
}

struct ScreenLayoutContext {
    let metrics: ResponsiveMetrics
    let safeArea: EdgeInsets
}

struct ResponsiveScreenContainer<Content: View>: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    let scrollable: Bool
    let content: (ScreenLayoutContext) -> Content

    init(
        scrollable: Bool = true,
        @ViewBuilder content: @escaping (ScreenLayoutContext) -> Content
    ) {
        self.scrollable = scrollable
        self.content = content
    }

    var body: some View {
        GeometryReader { proxy in
            let metrics = ResponsiveMetrics.resolve(
                size: proxy.size,
                horizontalSizeClass: horizontalSizeClass
            )
            let context = ScreenLayoutContext(metrics: metrics, safeArea: proxy.safeAreaInsets)

            ZStack {
                Color(uiColor: .systemBackground)
                    .ignoresSafeArea()

                if scrollable {
                    ScrollView {
                        innerContent(context)
                    }
                    .scrollIndicators(.hidden)
                } else {
                    innerContent(context)
                }
            }
        }
    }

    @ViewBuilder
    private func innerContent(_ context: ScreenLayoutContext) -> some View {
        VStack(alignment: .leading, spacing: context.metrics.spacingLarge) {
            content(context)
        }
        .frame(maxWidth: context.metrics.readableContentWidth, alignment: .topLeading)
        .padding(.horizontal, context.metrics.horizontalPadding)
        .padding(.top, context.safeArea.top + context.metrics.spacingMedium)
        .padding(.bottom, context.safeArea.bottom + context.metrics.spacingMedium)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}