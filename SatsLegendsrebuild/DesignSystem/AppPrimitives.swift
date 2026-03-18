import SwiftUI

struct AppCard<Content: View>: View {
    let title: String?
    let content: Content

    init(title: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.standard) {
            if let title {
                Text(title)
                    .font(.headline)
            }
            content
        }
        .padding(AppSpacing.medium)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.medium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.medium, style: .continuous)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        )
    }
}

struct PrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.tight) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: LayoutConstants.minTapTarget)
            .padding(.horizontal, AppSpacing.standard)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct SecondaryButton: View {
    let title: String
    var systemImage: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.tight) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: LayoutConstants.minTapTarget)
            .padding(.horizontal, AppSpacing.standard)
            .background(Color(uiColor: .tertiarySystemBackground))
            .foregroundStyle(.primary)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct TopHUDBar: View {
    let title: String
    let subtitle: String?
    let coins: Int
    let gems: Int
    let energy: Int

    var body: some View {
        HStack(alignment: .top, spacing: AppSpacing.standard) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: AppSpacing.tight)

            HStack(spacing: AppSpacing.tight) {
                hudBadge(icon: "c.circle", value: coins)
                hudBadge(icon: "diamond", value: gems)
                hudBadge(icon: "bolt", value: energy)
            }
        }
    }

    private func hudBadge(icon: String, value: Int) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
            Text("\(value)")
                .fontWeight(.semibold)
        }
        .font(.caption)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(Capsule())
    }
}

struct SkillTagChip: View {
    let skill: SkillTag

    var body: some View {
        Text(skill.displayName)
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(uiColor: .tertiarySystemBackground))
            .clipShape(Capsule())
    }
}

struct HubNavCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: AppSpacing.standard) {
                Image(systemName: symbol)
                    .font(.title3)
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
            .padding(AppSpacing.medium)
            .background(Color(uiColor: .secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.medium, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct SectionTitle: View {
    let title: String
    let subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title3)
                .fontWeight(.bold)
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}