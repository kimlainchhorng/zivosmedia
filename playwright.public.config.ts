import { defineConfig } from "@playwright/test";

// Public checks never load credentials. Local overrides are loopback-only.
const baseURL = process.env.PUBLIC_SMOKE_URL || "https://zivosmedia.com";
const target = new URL(baseURL);
if (target.username || target.password || target.pathname !== "/" || target.search || target.hash
  || !(target.origin === "https://zivosmedia.com" ||
    (target.protocol === "http:" && ["localhost", "127.0.0.1"].includes(target.hostname)))) {
  throw new Error("PUBLIC_SMOKE_URL must be the production apex or a loopback HTTP origin.");
}

export default defineConfig({
  testDir: "./tests/public",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: { baseURL, browserName: "chromium", serviceWorkers: "block", trace: "off", screenshot: "off", video: "off" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
