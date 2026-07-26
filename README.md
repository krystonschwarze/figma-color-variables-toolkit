# Color Variables Toolkit

Figma plugin that moves colors between the canvas and variables, in both directions. Replaces the
separate plugins `figma-variables-generator` and `figma-variables-to-canvas`.

The two directions are the same job seen from either end, so they share one window and a segmented
control switches between them. There is no manifest menu and no window resizing: one entry point, one
size, both directions always one click away. Aliasing variable groups lives in its own plugin,
`figma-bulk-alias`.

| Direction          | Reads                     | Writes               |
| ------------------ | ------------------------- | -------------------- |
| **From selection** | layer fills on the canvas | color variables      |
| **To canvas**      | color variables           | frames on the canvas |

**Reload** in the header re-reads the collections without a restart, for when something changed in
Figma while the window was open.

Variable group hierarchy lives in the variable name itself, separated by slashes. Both directions read
that same convention through `src/variables/naming.ts`.

## From selection

Select layers with a single solid fill, choose a target collection, hit **Create variables**.

- The layer name becomes the variable name. Slashes create groups, so `brand/primary` lands in the
  `brand` group. Empty segments and stray whitespace are dropped.
- A variable that already exists in the target collection is updated instead of duplicated.
- Collections with more than one mode show a mode picker.
- **Bind each layer fill to its variable** replaces the layer fill with a bound paint. Turn it off to
  create variables without touching the layers.

Layers are skipped, never guessed at, when they have no fill, more than one visible fill, a mixed
fill, or a name that is empty once the slashes are removed. The result line reports how many were
created, updated, skipped and failed.

## To canvas

Pick a collection and a swatch size. The plugin rebuilds the group hierarchy from the variable names
and lays it out with auto layout so every frame hugs its content.

```
Variables <collection>            HORIZONTAL   modes side by side
└─ <mode>                         VERTICAL     groups stacked
   └─ design                      VERTICAL
      └─ static                   VERTICAL
         └─ alpha-light           HORIZONTAL   swatches in a row
            ├─ 01                 64 x 64
            ├─ 02                 64 x 64
            └─ 03                 64 x 64
```

Each mode column gets an explicit variable mode via `setExplicitVariableModeForCollection`, which is
what makes the columns actually differ. Names sort naturally, so `01, 02, 10`. Only colour variables
can become a swatch, so other types are counted and reported rather than drawn as a placeholder. The
generated frame lands to the right of everything already on the page.

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

## Layout

| Path              | Role                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `src/code.ts`     | Sandbox entry. Validates messages, talks to the Figma API.                       |
| `src/messages.ts` | Message contract shared by both sides.                                           |
| `src/variables/`  | `naming` and `tree` are pure and unit tested, `collections` wraps the Figma API. |
| `src/tools/`      | One module per direction, sandbox side.                                          |
| `src/ui/`         | Plugin window. One shell, one screen module per direction.                       |
| `ui-kit/`         | Shared design system. Synced copy, do not edit here.                             |

Run `npm run sync:ui-kit` to pull the latest design system from the repo carrying the
`.ui-kit-canonical` marker, currently `figma-tidy-sections`.

## Plugin id

The manifest reuses the id of the former `figma-variables-to-canvas`. Neither predecessor was
published in the Figma Community, so no installs are affected.
