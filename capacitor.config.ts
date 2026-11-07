import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.collushsports.app',
  appName: 'Collush Sports',
  webDir: 'dist',
  ios: {
    // Explicitly register SPM-based plugins that may not auto-discover via CAPBridgedPlugin
    packageClassList: ['SignInWithApple'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#111111',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
