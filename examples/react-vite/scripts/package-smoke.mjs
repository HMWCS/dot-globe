import { DotGlobe } from "@hmwcs/dot-globe";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const markup = renderToString(
  createElement(DotGlobe, { "aria-label": "Verified Earth" }),
);

if (
  !markup.includes("data-dot-globe") ||
  !markup.includes('aria-label="Verified Earth"')
) {
  throw new Error("The package entry point did not render DotGlobe.");
}

console.log("Verified package exports and server-side rendering.");
