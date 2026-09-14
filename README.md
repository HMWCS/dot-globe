# dot-globe

A React point-cloud Earth with bundled Natural Earth geography and no runtime map downloads.

[Live demo](https://hmwcs.github.io/dot-globe/)

![Dot globe rotating at its default speed](docs/assets/dot-globe-demo.gif)

|                         Light                         |                        Dark                         |
| :---------------------------------------------------: | :-------------------------------------------------: |
| ![Light theme globe](docs/assets/dot-globe-light.png) | ![Dark theme globe](docs/assets/dot-globe-dark.png) |

## Add to your React project

```sh
npm install @hmwcs/dot-globe
```

For a pnpm project, use `pnpm add @hmwcs/dot-globe`. React 18.3+ or 19 is required.

```tsx
import { DotGlobe } from "@hmwcs/dot-globe";

export function Earth() {
  return (
    <div style={{ width: 320, maxWidth: "100%", background: "#0b1018" }}>
      <DotGlobe theme="dark" autoRotate={false} />
    </div>
  );
}
```

The globe fills its container width and defaults to a square; supply the background. Use a client component in frameworks with React Server Components.

See [advanced usage](packages/dot-globe/docs/usage.md) for city presets, coordinates, motion, appearance, and accessibility.

## Run the demo locally

Use Node.js 22.13+ and pnpm 11.16.0 for repository development:

```sh
git clone https://github.com/HMWCS/dot-globe.git
cd dot-globe
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed URL. Drag or use arrow keys to rotate; controls select view, quality, theme, and motion.

## Development

```sh
pnpm check
pnpm --filter dot-globe-example build
```

The static demo build is `examples/react-vite/dist`. Geography generation and verification are documented in [data provenance](docs/data-provenance.md).

## Attribution

Project code is available under the [MIT License](LICENSE). Natural Earth data is public domain and documented separately. Dependency attributions are listed in [third-party notices](THIRD_PARTY_NOTICES.md).
