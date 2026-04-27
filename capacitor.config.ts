import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.collushsports.app',
  appName: 'Collush Sports',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111111',
      showSpinner: false,
    },
  },
}

export default config
