import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beatsaber.rhythmslasher',
  appName: 'Rhythm Slasher',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    // Enable WebView media capture
    preferences: {
      // Allow inline media playback without fullscreen
      'AllowInlineMediaPlayback': 'TRUE',
      // Allow media to play without user interaction
      'MediaPlaybackRequiresUserAction': 'FALSE',
      // Enable system gestures
      'DisableLongPressGestures': 'FALSE',
      // Smooth scrolling
      'SuppressesIncrementalRendering': 'FALSE',
      // WebGL and modern web features
      'WKWebViewOnly': 'TRUE'
    }
  }
};

export default config;
