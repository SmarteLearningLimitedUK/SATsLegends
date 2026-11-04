import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
 appId:'com.smartelearning.satslegends', appName:'Matharia', webDir:'../../dist-matharia',
 backgroundColor:'#03172e', ios:{path:'native/ios',contentInset:'never',preferredContentMode:'mobile'},
 // Load the bundled index; initializeNativeApp selects the React /play route.
};
export default config;
