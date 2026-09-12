import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** Ships the canonical repository notices with the standalone demo. */
export function licenseAssets(): Plugin {
  const sources = new Map([
    [
      "LICENSE.txt",
      readFileSync(new URL("../../../LICENSE", import.meta.url), "utf8"),
    ],
    [
      "THIRD_PARTY_NOTICES.txt",
      readFileSync(
        new URL("../../../THIRD_PARTY_NOTICES.md", import.meta.url),
        "utf8",
      ),
    ],
  ]);

  return {
    name: "dot-globe-license-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split("?")[0]?.slice(1);
        const source = sources.get(name ?? "");
        if (source === undefined) return next();
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(source);
      });
    },
    generateBundle() {
      for (const [fileName, source] of sources)
        this.emitFile({ type: "asset", fileName, source });
    },
  };
}
