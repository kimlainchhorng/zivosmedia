import type { CapacitorConfig } from '@capacitor/cli';

// Only allow a dev-server override in explicit development mode.
// NODE_ENV=production (set automatically by all CI/CD and release build tools)
// prevents this from ever being baked into a store release.
const devServerUrl =
  process.env.NODE_ENV !== 'production'
    ? process.env.CAPACITOR_DEV_SERVER_URL
    : undefined;

const config: CapacitorConfig = {
  appId: 'com.hizovo.app',
  appName: 'ZIVO',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
  ios: {
    // Use WKWebView's scroll inertia and allow native rubber-band scrolling
    // inside the web content area — improves perceived scroll smoothness.
    scrollEnabled: true,
    // Opt into preferred background fetch on iOS so OTA updates and
    // push-notification enrichment calls can run while the app is suspended.
    preferredContentMode: 'mobile',
    // Allow native links (tel:, mailto:, maps:) to open system apps.
    allowsLinkPreview: false,
  },
  android: {
    // Forces all WebView loads over HTTPS even when cleartext is normally
    // allowed — prevents accidental mixed-content on older Android WebViews.
    allowMixedContent: false,
    // Use HTTPS scheme for the local server so cookies set with
    // SameSite=None work inside the WebView (Android 9+ requirement).
    buildOptions: {
      keystorePath: undefined,
    },
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,   // we check manually via useOTAUpdate hook
      statsUrl: "",        // no Capgo cloud reporting
      channelUrl: "",      // no Capgo cloud channel
    },
    StatusBar: {
      // Edge-to-edge: webview extends under the native status bar so cover
      // photos, gradients, and headers reach the very top of the screen.
      // Interactive controls must use env(safe-area-inset-top) (or the
      // .pt-safe / --zivo-safe-top-sticky tokens) to stay clear of the
      // status bar area.
      overlaysWebView: true,
      style: 'DARK',
    },
    Keyboard: {
      // "native" reflows the WebView when the keyboard appears (best for
      // chat composers and forms). "ionic" repaints less but breaks
      // sticky-bottom inputs. Native matches Telegram / WhatsApp behaviour.
      resize: "native",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Keep the native splash visible until React mounts and paints. With
      // launchAutoHide:true the splash hid at ~500 ms but the JS bundle on a
      // cold native start takes 1–3 s — that gap was the white blank screen
      // users saw before any UI appeared. main.tsx now calls SplashScreen.hide()
      // after first paint. As a safety net if that never fires, the splash
      // auto-hides at launchShowDuration so users never get a permanent splash.
      launchAutoHide: false,
      // main.tsx hides the splash after first paint (usually ~800-1500 ms).
      // This is the safety-net cap — at 5 s the user stares at the splash if
      // the JS bundle stalls. 2.5 s is still safe but feels much snappier on
      // mid-tier devices where boot does complete in time.
      launchShowDuration: 2500,
      launchFadeOutDuration: 200,
      backgroundColor: '#0D0D0F',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
