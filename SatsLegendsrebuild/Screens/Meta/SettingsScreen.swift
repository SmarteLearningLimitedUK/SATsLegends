import SwiftUI

struct SettingsScreen: View {
    @AppStorage("settings_sound_enabled") private var soundEnabled = true
    @AppStorage("settings_haptics_enabled") private var hapticsEnabled = true
    @AppStorage("settings_show_tutorial_hints") private var tutorialHintsEnabled = true

    var body: some View {
        ResponsiveScreenContainer {
            SectionTitle(title: "Settings", subtitle: "Placeholder controls for app shell")

            AppCard(title: "Gameplay") {
                Toggle("Sound", isOn: $soundEnabled)
                    .frame(minHeight: LayoutConstants.minTapTarget)
                Toggle("Haptics", isOn: $hapticsEnabled)
                    .frame(minHeight: LayoutConstants.minTapTarget)
                Toggle("Tutorial hints", isOn: $tutorialHintsEnabled)
                    .frame(minHeight: LayoutConstants.minTapTarget)
            }

            AppCard(title: "Account") {
                SecondaryButton(title: "Manage Parent Access") {}
                SecondaryButton(title: "Reset Placeholder Progress") {}
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SettingsScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            SettingsScreen()
        }
    }
}