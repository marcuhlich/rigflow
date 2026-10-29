import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rigflow.app',
  appName: 'RigFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rigflow',
      iconColor: '#F59E0B',
      sound: 'default',
    },
  },
};

export default config;