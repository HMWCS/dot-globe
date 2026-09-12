import type { CSSProperties, HTMLAttributes } from "react";

/** Supported point-density tiers. */
export type DotGlobeQuality = "low" | "medium" | "high";

/** Built-in point-color themes. */
export type DotGlobeTheme = "light" | "dark";

/** Geographic rotation used to choose the initial view. */
export interface DotGlobeRotation {
  /** Longitude placed at the center of the globe, in degrees east. */
  longitude?: number;
  /** Latitude placed at the center of the globe, in degrees north. */
  latitude?: number;
}

/** Public props for the dot-globe React component. */
export interface DotGlobeProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color" | "style"
> {
  /** Enables automatic rotation. Reduced-motion preferences still take precedence. */
  autoRotate?: boolean;
  /** Relative opacity of points on the far side of the globe. */
  backsideOpacity?: number;
  /** CSS class applied to the globe container. */
  className?: string;
  /** Point color accepted by Three.js Color. Overrides the theme default. */
  color?: string;
  /** Removes the globe from the accessibility tree. */
  decorative?: boolean;
  /** Initial centered longitude and latitude. */
  initialRotation?: DotGlobeRotation;
  /** Enables pointer and touch rotation. */
  interactive?: boolean;
  /** Opacity multiplier for physical land points. */
  landOpacity?: number;
  /** Opacity multiplier for ocean points. Set to zero for negative-space oceans. */
  oceanOpacity?: number;
  /** Point diameter in CSS pixels. */
  pointSize?: number;
  /** Selects a bounded point-density tier. */
  quality?: DotGlobeQuality;
  /** Automatic rotation speed in degrees per second. */
  rotationSpeed?: number;
  /** Inline styles applied to the globe container. */
  style?: CSSProperties;
  /** Selects the default point color when color is not provided. */
  theme?: DotGlobeTheme;
}

export interface ResolvedDotGlobeOptions {
  autoRotate: boolean;
  backsideOpacity: number;
  color: string;
  initialRotation: Required<DotGlobeRotation>;
  interactive: boolean;
  landOpacity: number;
  oceanOpacity: number;
  pointSize: number;
  quality: DotGlobeQuality;
  rotationSpeed: number;
}
