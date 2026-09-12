import {
  DotGlobe,
  type DotGlobeProps,
  type DotGlobeQuality,
  type DotGlobeRotation,
  type DotGlobeTheme,
} from "../../packages/dot-globe/dist/index.js";

const quality: DotGlobeQuality = "high";
const rotation: DotGlobeRotation = { latitude: 12, longitude: -18 };
const theme: DotGlobeTheme = "dark";
const props = {
  backsideOpacity: 0.14,
  initialRotation: rotation,
  pointSize: 2.4,
  quality,
  theme,
} satisfies DotGlobeProps;

void DotGlobe;
void props;
