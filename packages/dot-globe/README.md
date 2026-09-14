# @hmwcs/dot-globe

A React point-cloud Earth with bundled Natural Earth geography and no runtime map downloads.

## Install

```sh
npm install @hmwcs/dot-globe
```

For a pnpm project, use `pnpm add @hmwcs/dot-globe`. React 18.3+ or 19 is required.

## Use

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

See [advanced usage](docs/usage.md) for city presets, coordinates, motion, appearance, and accessibility.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md) · [Data provenance](https://github.com/HMWCS/dot-globe/blob/main/docs/data-provenance.md)
