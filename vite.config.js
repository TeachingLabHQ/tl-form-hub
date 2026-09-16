import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { vercelPreset } from "@vercel/remix/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
      // Co-located tests live next to the route they cover; without this Remix
      // compiles them as routes and the build fails on their top-level await
      ignoredRouteFiles: ["**/*.test.ts", "**/*.test.tsx"],
    }),
    tsconfigPaths(),
  ],
});
