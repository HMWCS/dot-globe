import type { DotGlobeTheme } from "./dotGlobeTypes.js";

const defaultPointColors: Record<DotGlobeTheme, string> = {
  dark: "#b7c5e5",
  light: "#7382a3",
};

export function resolvePointColor(
  theme: DotGlobeTheme,
  color: string | undefined,
) {
  return color ?? defaultPointColors[theme];
}
