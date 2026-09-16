import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Deliberately does not load the Remix plugin: these are node-side unit tests
// of domain logic and route actions, not a browser build.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Matches the ignoredRouteFiles glob in vite.config.js: a test file Remix
    // skips but vitest doesn't collect would silently never run
    include: ["app/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
  },
});
