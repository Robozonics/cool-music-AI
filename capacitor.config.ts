import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musify.app',
  appName: 'Musify',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true
  }
};

export default config;
