import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(import.meta.dirname, "./src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Vitest defaults to 5s. Several suites here render large trees or walk
    // the whole src/ directory and land near that ceiling, so on a busy
    // machine they failed with "Test timed out" rather than any assertion —
    // AppSwitcher, PostShareSheet, CreatePostModal.workflow, HotelBooking
    // search recovery, ProfileEditPage return navigation and the Media Ride
    // retirement boundary all did, intermittently. Eighteen tests had already
    // been given per-test overrides for the same reason. A single generous
    // ceiling makes the suite's result mean "the assertions passed" instead of
    // "the machine was quiet", while still catching a genuine hang.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
