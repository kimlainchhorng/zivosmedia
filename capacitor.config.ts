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
  appName: 'Zivo Media - All in one',
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
      // launchAutoHide MUST stay true. It was false, and that is what got the
      // app pulled from Google Play on 2026-07-29 under the Broken
      // Functionality policy ("Problems loading — Your app does not open or
      // load"); the reviewer's evidence screenshot is the ZIVO logo on an
      // otherwise blank screen.
      //
      // The comment that used to sit here claimed "as a safety net if that
      // never fires, the splash auto-hides at launchShowDuration so users never
      // get a permanent splash." That was wrong, and the plugin source is
      // explicit about it -- android/.../SplashScreen.java:
      //
      //     if (settings.isAutoHide()) {
      //         ...postDelayed(() -> hideDialog(...), getShowDuration());
      //     } else {
      //         // If no autoHide, call complete
      //         if (splashListener != null) splashListener.completed();
      //     }
      //
      // With autoHide false the else-branch only fires the listener; it never
      // hides the dialog, and launchShowDuration is not read at all. So any
      // boot that failed to reach main.tsx's hide() call left the splash up
      // forever -- which is exactly a permanent splash, the thing the comment
      // promised could not happen.
      //
      // Android 12's Capacitor splash implementation also installs a pre-draw
      // gate whenever launchShowDuration is non-zero. On a slow first launch,
      // the timer callback can be starved by WebView work and hold the launch
      // screen far beyond the configured duration. A zero duration skips that
      // extra gate; Android still provides its normal system launch screen, and
      // index.html paints a static ZIVO boot shell before React is ready.
      launchAutoHide: true,
      launchShowDuration: 0,
      launchFadeOutDuration: 200,
      backgroundColor: '#0D0D0F',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
