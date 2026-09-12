# @hmwcs/dot-globe

A React point-cloud Earth with bundled Natural Earth geography and no runtime map downloads.

## Install

This package is not published to npm. Build an archive from the [repository](https://github.com/HMWCS/dot-globe) root using Node.js 22.13+ and pnpm 11.16.0:

```sh
pnpm install --frozen-lockfile
pnpm --filter @hmwcs/dot-globe build
pnpm --dir packages/dot-globe pack --pack-destination ../..
```

The archive is created in the repository root. In your existing React project:

```sh
npm install /path/to/dot-globe/hmwcs-dot-globe-0.0.0.tgz
```

Alternatively, use `pnpm add` with the same path. Supported React versions: `^18.3.0 || ^19.0.0`.

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
