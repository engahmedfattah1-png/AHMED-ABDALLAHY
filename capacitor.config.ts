import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maham.infratrack',
  appName: 'InfraTrack Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Add plugin configurations here if needed later (Camera, Geolocation settings)
  }
};

export default config;