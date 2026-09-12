import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { licenseAssets } from "./scripts/license-assets.ts";

export default defineConfig({
  base: "./",
  plugins: [react(), licenseAssets()],
  resolve: {
    alias: {
      "@hmwcs/dot-globe": resolve(
        import.meta.dirname,
        "../../packages/dot-globe/src/index.ts",
      ),
    },
  },
});
