# Color Variables Toolkit

Figma plugin that moves colors between the canvas and variables, in both directions. One window, a
segmented control switches the direction.

| Direction          | Reads                     | Writes               |
| ------------------ | ------------------------- | -------------------- |
| **From selection** | layer fills on the canvas | color variables      |
| **To canvas**      | color variables           | frames on the canvas |

## What it does

- **From selection** turns layers with a single solid fill into variables. The layer name becomes the
  variable name and slashes create groups, an existing variable is updated rather than duplicated,
  and the fill can be bound to the new variable in the same pass.
- **To canvas** rebuilds the group hierarchy from the variable names and draws every mode as its own
  column of swatches, each column carrying its explicit variable mode.
- Layers that cannot be read cleanly, without a fill or with several, are skipped and counted rather
  than guessed at.
- **Reload** re-reads the collections without a restart.

Aliasing variable groups lives in its own plugin, `figma-bulk-alias`.

## Development

```sh
npm install
npm run dev      # rebuild dist/ on every change
npm test         # unit tests for the pure logic, via the Node test runner
npm run build    # minified production build
npm run verify   # typecheck, lint, format check, test, build
```

Import the plugin in Figma via **Plugins > Development > Import plugin from manifest** and pick
`manifest.json`. The manifest points at `dist/`, so run a build at least once before importing.

## Documentation

- [docs/reference.md](docs/reference.md): both directions in full, the source layout and the plugin id.
- [ui-kit/README.md](ui-kit/README.md): the shared design system.
