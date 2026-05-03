import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rigflow.app',
  appName: 'RigFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rigflow',
      iconColor: '#6366f1',
      sound: 'default',
    },
  },
};

export default config;