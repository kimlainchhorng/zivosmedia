import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    middlewareMode: false,
    proxy: {
      // Proxy image requests through a local endpoint
      "/api/proxy-image": {
        target: "http://localhost:5173",
        // We'll handle this with a custom middleware
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            // Custom handling for image proxy
            const url = new URL(req.url, "http://localhost");
            const imageUrl = url.searchParams.get("url");

            if (imageUrl) {
              // Verify URL is whitelisted
              const allowedDomains = [
                "cf.bstatic.com",
                "t.bstatic.com",
                "q-xx.bstatic.com",
                "r-xx.bstatic.com",
              ];

              try {
                const parsed = new URL(imageUrl);
                const isAllowed = allowedDomains.some((domain) =>
                  parsed.hostname.includes(domain)
                );

                if (!isAllowed) {
                  res.statusCode = 403;
                  res.end("Domain not whitelisted");
                  return;
                }

                // Fetch the image
                import("node-fetch").then(async (fetchModule) => {
                  const fetch = fetchModule.default;
                  const response = await fetch(imageUrl, {
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                      Referer: "https://www.booking.com/",
                    },
                  });

                  if (!response.ok) {
                    res.statusCode = response.status;
                    res.end("Failed to fetch image");
                    return;
                  }

                  const buffer = await response.arrayBuffer();
                  res.statusCode = 200;
                  res.setHeader(
                    "Content-Type",
                    response.headers.get("content-type") || "image/jpeg"
                  );
                  res.setHeader("Cache-Control", "public, max-age=31536000");
                  res.setHeader("Access-Control-Allow-Origin", "*");
                  res.setHeader("Access-Control-Allow-Methods", "GET");
                  res.end(Buffer.from(buffer));
                });
              } catch (error) {
                res.statusCode = 400;
                res.end("Invalid URL");
              }
            }
          });
        },
      },
    },
  },
});
