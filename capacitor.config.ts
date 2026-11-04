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
  server: { appStartPath: '/play' },
};
export default config;
