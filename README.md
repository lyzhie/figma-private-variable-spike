# Private Token Picker

A Figma Design development plugin that reviews variable bindings in imported instances and reuses available variables on compatible frames, shapes and text layers.

## Setup

1. In Figma Desktop, create a development plugin through **Plugins → Development → New plugin** and obtain its assigned ID.
2. Run `npm ci` and `npm run configure -- YOUR_FIGMA_PLUGIN_ID` in this project.
3. Run `npm run verify`.
4. Choose **Plugins → Development → Import plugin from manifest**, selecting the generated `manifest.json`.
5. Run **Private Variable Spike**.

The personal plugin ID is intentionally omitted. A real Figma-assigned ID is required for persistent file storage. Prebuilt runtime files are included in `dist/`; to use without Node.js, copy `manifest.template.json` to `manifest.json`, add your assigned `id` field, and keep it beside `dist/`.

## Workflow

1. Select an imported instance and click **Review & save tokens**.
2. Review saved tokens grouped by type. Numeric values are displayed directly; colors show a swatch and Hex.
3. Select a target layer.
4. Choose compatible tokens in the property rows.
5. Click **Apply selected tokens** once to submit all choices.

Only reviewed property categories supported by the target are listed. Corner radius binds all four corners. Vertical padding binds top/bottom; Horizontal padding binds left/right. Padding requires auto layout. Fill and Stroke require existing solid paints. Unselected properties are unchanged.

**Clear saved tokens** removes the saved list without removing existing design bindings.

## Privacy and persistence

No network access is requested. There are no analytics, external API credentials or external uploads in the plugin. Review reads the selected instance and descendants. It stores variable IDs, keys, names, resolved value snapshots and source usage labels in the current Figma document's private plugin data. These can contain design metadata; they follow the Figma file, not the GitHub repository. Clearing removes the current saved list, not historical Figma versions.

This repository excludes personal paths, account-specific plugin configuration, real design exports, private file links and raw observation logs. Tests use synthetic variables. See [privacy review](docs/privacy-review.md).

## Evidence boundary

Earlier desktop experiments found that unpublished variable dependencies exposed by an imported component instance could resolve by the actual target alias ID and bind to another component or ordinary Frame. Source-file IDs and private-key import did not work in those runs. These observations are not a guarantee for other files, permissions or future Figma versions.

The plugin does not copy/create variables or import by key. A saved variable must remain resolvable in the current file. Values shown are mode-dependent snapshots; Apply binds the variable, not the displayed literal value. Batch writes are not transactional: runtime failures are reported with an applied/total count.

`npm run verify` runs type checking, build and mock regression checks. Mock results do not establish real Figma behavior. Some text/property combinations still require desktop testing.
