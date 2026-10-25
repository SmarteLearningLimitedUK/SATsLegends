import type { CapacitorConfig } from '@capacitor/cli';

// Bundle identifier retained from the repository's existing iOS configuration.
const config: CapacitorConfig = {
  appId: 'com.smartelearning.satslegends',
  appName: 'SATs Legends',
  webDir: 'dist-ios',
  backgroundColor: '#081b29',
  loggingBehavior: 'debug',
  ios: {
    path: 'native/ios',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
  // Load the bundled index.html. initializeNativeApp selects the /play React
  // route; appStartPath would require a physical public/play file on iOS.
};
export default config;
