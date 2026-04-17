import type TableColumnResizePlugin from "./main";

/**
 * Build a stable fingerprint from a table's header row text.
 * This is independent of how Obsidian splits sections during rendering,
 * so it works consistently in Reading View, Live Preview, and PDF export.
 */
function tableFingerprint(headerCells: NodeListOf<Element>): string {
  const texts: string[] = [];
  headerCells.forEach((cell) => {
    texts.push((cell.textContent ?? "").trim());
  });
  return texts.join("|");
}

/**
 * Instruments a single <table> element with column-resize drag handles.
 *
 * @param plugin   - plugin instance (for settings + save)
 * @param table    - the <table> DOM element
 * @param filePath - note file path, e.g. "path/to/note.md"
 */
export function setupTableResize(
  plugin: TableColumnResizePlugin,
  table: HTMLTableElement,
  filePath: string
) {
  if (table.hasAttribute("data-tcr")) return;
  table.setAttribute("data-tcr", "1");

  // Count columns from the first row
  const headerRow =
    table.querySelector("thead tr") ?? table.querySelector("tr");
  if (!headerRow) return;

  const headerCells = headerRow.querySelectorAll("th, td");
  const colCount = headerCells.length;
  if (colCount === 0) return;

  // Content-based key: stable across Reading View, Live Preview, and PDF export.
  // Tables with identical headers in the same file share widths — intentional.
  const fingerprint = tableFingerprint(headerCells);
  const fileKey = `${filePath}::${fingerprint}`;

  // table-layout: fixed and width: 100% are applied via styles.css (with
  // !important) on the [data-tcr] selector — avoids inline styles.

  // Create or find <colgroup>
  let colgroup = table.querySelector("colgroup");
  if (!colgroup) {
    colgroup = document.createElement("colgroup");
    table.insertBefore(colgroup, table.firstChild);
  }

  // Ensure we have enough <col> elements
  while (colgroup.children.length < colCount) {
    colgroup.appendChild(document.createElement("col"));
  }

  const cols = colgroup.querySelectorAll("col");

  // Helper: write width to BOTH the <col> and the header <th>. Some
  // Obsidian/theme CSS ignores <col> widths; writing the th directly
  // is the reliable path in table-layout: fixed mode.
  const applyWidth = (i: number, widthPx: number) => {
    (cols[i] as HTMLElement).style.setProperty("width", `${widthPx}px`, "important");
    (headerCells[i] as HTMLElement).style.setProperty("width", `${widthPx}px`, "important");
    (headerCells[i] as HTMLElement).style.setProperty("min-width", `${widthPx}px`, "important");
    (headerCells[i] as HTMLElement).style.setProperty("max-width", `${widthPx}px`, "important");
  };

  // Restore saved widths
  let hasSavedWidths = false;
  for (let i = 0; i < colCount; i++) {
    const key = `${fileKey}::${i}`;
    const saved = plugin.settings.columnWidths[key];
    if (saved !== undefined) {
      applyWidth(i, saved);
      hasSavedWidths = true;
    }
  }

  // If no saved widths, initialize cols from actual rendered widths
  if (!hasSavedWidths) {
    for (let i = 0; i < colCount; i++) {
      const cell = headerCells[i] as HTMLElement;
      const w = cell.getBoundingClientRect().width;
      if (w > 0) applyWidth(i, w);
    }
  }

  // Add drag handles to header cells
  // (th position:relative and overflow:visible come from styles.css)
  for (let i = 0; i < colCount; i++) {
    const th = headerCells[i] as HTMLElement;

    const handle = document.createElement("div");
    handle.className = "tcr-handle";
    th.appendChild(handle);

    attachDragBehavior(plugin, handle, cols, headerCells, i, fileKey, colCount, applyWidth);
  }
}

function attachDragBehavior(
  plugin: TableColumnResizePlugin,
  handle: HTMLElement,
  cols: NodeListOf<Element>,
  headerCells: NodeListOf<Element>,
  colIndex: number,
  fileKey: string,
  colCount: number,
  applyWidth: (i: number, widthPx: number) => void
) {
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    // Block CM6 and Obsidian from stealing this as a text-selection / cell-focus drag.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const startX = e.clientX;
    const th = headerCells[colIndex] as HTMLElement;
    const startWidth = th.getBoundingClientRect().width;

    handle.classList.add("tcr-dragging");
    document.body.classList.add("tcr-resizing");

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const delta = ev.clientX - startX;
      const newWidth = Math.max(
        plugin.settings.minColumnWidth,
        startWidth + delta
      );
      applyWidth(colIndex, newWidth);
    };

    const onUp = () => {
      handle.classList.remove("tcr-dragging");
      document.body.classList.remove("tcr-resizing");
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);

      // Persist all column widths
      for (let i = 0; i < colCount; i++) {
        const c = cols[i] as HTMLElement;
        const w = parseFloat(c.style.width);
        if (!isNaN(w)) {
          plugin.settings.columnWidths[`${fileKey}::${i}`] = Math.round(w);
        }
      }
      plugin.debouncedSave();
    };

    // Document-level listeners so the drag survives if CM6 re-renders
    // the table mid-drag (which would destroy any handle-bound listener).
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  };

  handle.addEventListener("pointerdown", onPointerDown, true);
  handle.addEventListener("mousedown", (e: MouseEvent) => {
    e.stopPropagation();
  }, true);
}
