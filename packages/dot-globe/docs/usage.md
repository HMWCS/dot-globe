# Advanced usage

## Coordinates and city presets

`initialRotation` centers a longitude and latitude in degrees: east and north are positive; west and south are negative. Changing either coordinate recenters the globe immediately. Omitted coordinates default to longitude `-18` and latitude `12`.

Define city names and approximate center coordinates in your application:

```tsx
"use client";

import { useState } from "react";
import { DotGlobe } from "@hmwcs/dot-globe";

const cities = {
  Beijing: { longitude: 116.4074, latitude: 39.9042 },
  Tokyo: { longitude: 139.6917, latitude: 35.6895 },
  London: { longitude: -0.1276, latitude: 51.5072 },
};
type City = keyof typeof cities;

export function CityGlobe() {
  const [city, setCity] = useState<City>("Beijing");

  return (
    <div style={{ width: 320, maxWidth: "100%" }}>
      <label>
        Center on
        <select
          value={city}
          onChange={(event) => setCity(event.target.value as City)}
        >
          {Object.keys(cities).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <DotGlobe
        initialRotation={cities[city]}
        autoRotate={false}
        interactive={false}
        aria-label={`Earth centered on ${city}`}
      />
    </div>
  );
}
```

This selects the viewing direction; it does not add a visible city marker. The package has no built-in city database, markers, routes, or geocoder.

## Motion and appearance

`autoRotate={false}` stops automatic rotation. `interactive={false}` disables pointer, touch, and arrow-key rotation; use both for a fixed view. With interaction enabled, drag or focus the globe and press arrow keys; Shift increases the keyboard step.

Automatic rotation respects reduced-motion preferences and pauses while the document is hidden or the globe is offscreen.

The canvas is transparent. Set the container background with `style` or `className`; `theme` changes only the point color. The container fills its parent's width and has a square aspect ratio unless overridden.

| Prop                 | Default     | Effect                                                              |
| -------------------- | ----------- | ------------------------------------------------------------------- |
| `autoRotate`         | `true`      | Enable automatic rotation.                                          |
| `rotationSpeed`      | `1.4`       | Degrees per second; negative values reverse direction.              |
| `interactive`        | `true`      | Enable pointer, touch, and keyboard rotation.                       |
| `theme`              | `"light"`   | `"light"` or `"dark"` point colors.                                 |
| `color`              | Theme color | Three.js color string, such as `"#60a5fa"`; overrides `theme`.      |
| `quality`            | `"high"`    | `"low"`, `"medium"`, or `"high"` point density.                     |
| `pointSize`          | `2.4`       | Point diameter in CSS pixels, clamped to `0.5–8`.                   |
| `landOpacity`        | `0.84`      | Land point opacity multiplier, clamped to `0–1`.                    |
| `oceanOpacity`       | `0`         | Ocean point opacity multiplier, clamped to `0–1`; `0` hides oceans. |
| `backsideOpacity`    | `0.14`      | Relative far-side opacity, clamped to `0–1`.                        |
| `style`, `className` | —           | Style the outer `div`, including size and background.               |

## Accessibility and rendering

At small display sizes, overlapping supplemental island dots are omitted. Their coordinates remain intact; use a larger container or smaller `pointSize` to resolve nearby islands. The visible subset changes with the view. This does not remove polar compression or front/back projection overlap.

The globe has an image role and defaults to `aria-label="3D Earth"`. Give meaningful globes a descriptive label. Use `decorative` for visual decoration; this hides the globe from assistive technology and removes its default keyboard focus.

Use standard container attributes such as `id` and `data-*`. A forwarded `ref` points to the outer `div`. TypeScript exports include `DotGlobeProps`, `DotGlobeRotation`, `DotGlobeQuality`, and `DotGlobeTheme`.

In frameworks with React Server Components, put usage behind a `"use client"` boundary, as above. Import and server rendering are supported; WebGL starts after mounting. If WebGL initialization fails, a text fallback appears.
