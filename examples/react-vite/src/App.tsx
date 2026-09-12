import { useState } from "react";
import {
  DotGlobe,
  type DotGlobeQuality,
  type DotGlobeRotation,
} from "@hmwcs/dot-globe";

const views = {
  default: { label: "Default", rotation: { latitude: 12, longitude: -18 } },
  pacific: { label: "Pacific", rotation: { latitude: -18, longitude: 150 } },
  atlantic: { label: "Atlantic", rotation: { latitude: 8, longitude: -25 } },
  americas: { label: "Americas", rotation: { latitude: 4, longitude: -90 } },
  polar: { label: "North polar", rotation: { latitude: 68, longitude: 20 } },
} satisfies Record<string, { label: string; rotation: DotGlobeRotation }>;

type ViewName = keyof typeof views;

function getInitialSettings() {
  const search = new URLSearchParams(window.location.search);
  const view = search.get("view");

  return {
    autoRotate: search.get("motion") !== "off",
    dark: search.get("theme") === "dark",
    view: view && view in views ? (view as ViewName) : "default",
  };
}

export function App() {
  const [initialSettings] = useState(() => getInitialSettings());
  const [autoRotate, setAutoRotate] = useState(initialSettings.autoRotate);
  const [dark, setDark] = useState(initialSettings.dark);
  const [quality, setQuality] = useState<DotGlobeQuality>("high");
  const [view, setView] = useState<ViewName>(initialSettings.view);

  return (
    <div className={dark ? "app app--dark" : "app"}>
      <header className="site-header">
        <a className="brand" href="./" aria-label="dot-globe demo home">
          <span className="brand-mark" aria-hidden="true" />
          dot-globe
        </a>
        <a
          className="repository-link"
          href="https://github.com/HMWCS/dot-globe"
        >
          GitHub
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">React component · WebGL</p>
            <h1 id="hero-title">Earth, distilled to dots.</h1>
            <p className="hero-description">
              A lightweight, texture-free point globe with geographically
              verified contours, smooth rotation, and a small React API.
            </p>
          </div>

          <div className="showcase">
            <div className="globe-frame">
              <DotGlobe
                aria-label="Interactive point-cloud Earth"
                autoRotate={autoRotate}
                initialRotation={views[view].rotation}
                quality={quality}
                theme={dark ? "dark" : "light"}
              />
            </div>

            <div className="controls" aria-label="Globe controls">
              <label>
                <span>View</span>
                <select
                  value={view}
                  onChange={(event) => setView(event.target.value as ViewName)}
                >
                  {Object.entries(views).map(([value, preset]) => (
                    <option key={value} value={value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quality</span>
                <select
                  value={quality}
                  onChange={(event) =>
                    setQuality(event.target.value as DotGlobeQuality)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setAutoRotate((value) => !value)}
              >
                {autoRotate ? "Pause" : "Rotate"}
              </button>
              <button type="button" onClick={() => setDark((value) => !value)}>
                {dark ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </section>

        <section className="usage" aria-labelledby="usage-title">
          <div>
            <p className="eyebrow">Small by design</p>
            <h2 id="usage-title">Drop it into any layout.</h2>
            <p>
              The component follows its container, pauses while hidden, respects
              reduced motion, and releases its WebGL resources on unmount.
            </p>
          </div>
          <pre aria-label="React usage example">
            <code>{`import { DotGlobe } from '@hmwcs/dot-globe';

<DotGlobe quality="high" />`}</code>
          </pre>
        </section>
      </main>

      <footer>
        <a href="./LICENSE.txt">MIT License</a>
        <a href="./THIRD_PARTY_NOTICES.txt">
          Natural Earth · third-party notices
        </a>
      </footer>
    </div>
  );
}
