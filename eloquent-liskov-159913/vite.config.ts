import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const pkg = _require("./package.json") as { version: string };

const manualChunkGroups = {
  "vendor-react": ["react", "react-dom", "react-router-dom"],
  "vendor-supabase": ["@supabase/supabase-js"],
  "vendor-query": ["@tanstack/react-query"],
  // Keep all Radix in ONE chunk because splitting can evaluate shared internals
  // out of order across chunks.
  "vendor-radix": [
    "@radix-ui/react-dialog",
    "@radix-ui/react-popover",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-toast",
    "@radix-ui/react-tabs",
    "@radix-ui/react-select",
    "@radix-ui/react-accordion",
    "@radix-ui/react-tooltip",
  ],
  // Heavy lazy-loaded libs — keep each in its own chunk so the main bundle
  // stays lean and these only download when the relevant route opens.
  "vendor-livekit": ["livekit-client"],
  "vendor-stripe": ["@stripe/stripe-js", "@stripe/react-stripe-js", "@stripe/connect-js", "@stripe/react-connect-js"],
  "vendor-maps": ["@react-google-maps/api", "@googlemaps/markerclusterer"],
  "vendor-framer": ["framer-motion"],
  "vendor-charts": ["recharts"],
  "vendor-mediapipe": ["@mediapipe/tasks-vision"],
  "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas", "html-to-image"],
  "vendor-docx": ["docx", "file-saver"],
} as const;

const packageSegment = (packageName: string) =>
  `/node_modules/${packageName}/`;

const manualChunks = (id: string) => {
  const normalizedId = id.replaceAll(path.sep, "/");

  for (const [chunkName, packageNames] of Object.entries(manualChunkGroups)) {
    if (
      packageNames.some((packageName) =>
        normalizedId.includes(packageSegment(packageName)),
      )
    ) {
      return chunkName;
    }
  }
};

const pwaPrecacheGlobPatterns = [
  "index.html",
  "manifest.webmanifest",
  "favicon.ico",
  "assets/index-*.js",
  "assets/vendor-react-*.js",
  "assets/vendor-radix-*.js",
  "assets/vendor-supabase-*.js",
  "assets/vendor-query-*.js",
  "assets/vendor-framer-*.js",
  "assets/*.css",
  "pwa-icons/*.png",
];

const pwaPrecacheGlobIgnores = [
  "**/mediapipe/**",
  "**/stickers/**",
  "**/gifts/**",
  "**/vehicles/**",
  "**/flags/**",
  "**/videos/**",
  "**/payments/**",
  "**/brand-logos/**",
  "**/destinations/**",
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8081,
    watch: {
      ignored: [
        "**/android/**",
        "**/ios/App/App/public/**",
        "**/ios/DerivedData/**",
        "**/ios/build/**",
      ],
    },
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@ffmpeg/core"],
  },
  build: {
    target: "es2022",
    modulePreload: { polyfill: false },
    minify: "esbuild",
    cssMinify: "esbuild",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    cssCodeSplit: true,
    sourcemap: mode === 'production' ? false : 'hidden',
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Dev mode: skip SW entirely so HMR-fresh JS always runs. With this off,
      // refreshes during development show the latest code immediately instead
      // of serving last-build's cached bundle (which masked the recent
      // chat-layout fixes).
      disable: mode === "development",
      devOptions: { enabled: false },
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      injectManifest: {
        rollupFormat: "iife",
        // Keep the offline app shell cached, but do not precache every lazy
        // route chunk. The old manifest pulled 1,200+ files (~18 MB) on
        // install/update, competing with normal app navigation on slow phones.
        globPatterns: pwaPrecacheGlobPatterns,
        globIgnores: pwaPrecacheGlobIgnores,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ["favicon.ico", "robots.txt", "pwa-icons/*.png"],
      manifest: {
        name: "ZIVO",
        short_name: "ZIVO",
        theme_color: "#0D0D0F",
        description: "One app for every journey. Flights, hotels, cars, rides, and food delivery - all in one place.",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/?source=pwa",
        id: "com.zivo.app",
        icons: [
          {
            src: "/pwa-icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa-icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        categories: ["travel", "lifestyle", "shopping"],
        shortcuts: [
          {
            name: "Search Flights",
            short_name: "Flights",
            url: "/flights",
            icons: [{ src: "/pwa-icons/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Search Hotels",
            short_name: "Hotels",
            url: "/hotels",
            icons: [{ src: "/pwa-icons/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Rent a Car",
            short_name: "Cars",
            url: "/cars",
            icons: [{ src: "/pwa-icons/icon-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: pwaPrecacheGlobPatterns,
        globIgnores: pwaPrecacheGlobIgnores,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets"
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unsplash-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(jpg|jpeg|png|webp|avif)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "local-images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              // Only cache successful responses — without this an early
              // network blip / 0-byte fetch gets locked into CacheFirst and
              // the broken image renders forever.
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            urlPattern: /\.(mp4|webm|mov|m4v)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "local-video-metadata",
              expiration: {
                maxEntries: 25,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              rangeRequests: true,
              cacheableResponse: {
                statuses: [200, 206]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: "lucide-react/dist/esm/icons/facebook",
        replacement: path.resolve(__dirname, "./src/lib/icons/facebook.tsx"),
      },
      {
        find: "lucide-react/dist/esm/icons/instagram",
        replacement: path.resolve(__dirname, "./src/lib/icons/instagram.tsx"),
      },
      {
        find: "lucide-react/dist/esm/icons/linkedin",
        replacement: path.resolve(__dirname, "./src/lib/icons/linkedin.tsx"),
      },
      {
        find: "lucide-react/dist/esm/icons/twitter",
        replacement: path.resolve(__dirname, "./src/lib/icons/twitter.tsx"),
      },
      {
        find: "lucide-react/dist/esm/icons/youtube",
        replacement: path.resolve(__dirname, "./src/lib/icons/youtube.tsx"),
      },
      {
        find: /^lucide-react$/,
        replacement: path.resolve(__dirname, "./src/lib/lucide-react.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
      {
        find: "@radix-ui/react-slot",
        replacement: path.resolve(__dirname, "./node_modules/@radix-ui/react-slot"),
      },
      // React 19 hoists <title>/<meta>/<link> natively. react-helmet-async
      // collides with that hoisting, causing NotFoundError on commit/unmount
      // (App failed to start crash on iOS WKWebView in particular).
      {
        find: "react-helmet-async",
        replacement: path.resolve(__dirname, "./src/lib/react-helmet-shim.tsx"),
      },
    ],
    // Prevent duplicate React copies (fixes "Cannot read properties of null (reading 'useEffect')")
    dedupe: ["react", "react-dom", "@radix-ui/react-slot"],
  },
}));
