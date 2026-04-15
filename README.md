# Table Column Resize

An [Obsidian](https://obsidian.md) plugin that lets you manually adjust table column widths by dragging column borders.

## Features

- **Drag to resize** — hover over the right edge of any table header cell and drag to adjust the column width.
- **Persistent widths** — column widths are saved per-note and restored when you reopen the document.
- **Works everywhere** — Reading View, Live Preview, and PDF export all respect your custom widths.

## Usage

1. Open a note containing a Markdown table.
2. Hover over the right border of a header cell — a blue highlight appears.
3. Click and drag to resize the column.
4. Widths are saved automatically.

## Settings

| Setting | Description |
|---|---|
| **Minimum column width** | The smallest width (in px) a column can be resized to. Default: 50. |
| **Reset all saved widths** | Clear all saved column widths across all notes. |

## Installation

### From Community Plugins

1. Open **Settings → Community plugins → Browse**.
2. Search for **Table Column Resize**.
3. Click **Install**, then **Enable**.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/lolieatapple/obsidian-table-column-resize/releases/latest).
2. Create a folder `table-column-resize` inside your vault's `.obsidian/plugins/` directory.
3. Place the three files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

```bash
bun install
bun run build
```

## License

[MIT](LICENSE)
