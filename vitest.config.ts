import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Deliberately does not load the Remix plugin: these are node-side unit tests
// of domain logic and route actions, not a browser build.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
