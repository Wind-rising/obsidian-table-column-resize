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

  // Ensure table-layout: fixed so widths are respected
  table.style.tableLayout = "fixed";

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

  // Restore saved widths
  let hasSavedWidths = false;
  for (let i = 0; i < colCount; i++) {
    const key = `${fileKey}::${i}`;
    const saved = plugin.settings.columnWidths[key];
    if (saved !== undefined) {
      (cols[i] as HTMLElement).style.width = `${saved}px`;
      hasSavedWidths = true;
    }
  }

  // If no saved widths, initialize cols from actual rendered widths
  if (!hasSavedWidths) {
    for (let i = 0; i < colCount; i++) {
      const cell = headerCells[i] as HTMLElement;
      const w = cell.getBoundingClientRect().width;
      if (w > 0) {
        (cols[i] as HTMLElement).style.width = `${w}px`;
      }
    }
  }

  // Add drag handles to header cells
  for (let i = 0; i < colCount; i++) {
    const th = headerCells[i] as HTMLElement;
    th.style.position = "relative";
    th.style.overflow = "visible";

    const handle = document.createElement("div");
    handle.className = "tcr-handle";
    th.appendChild(handle);

    attachDragBehavior(plugin, handle, cols, i, fileKey, colCount);
  }
}

function attachDragBehavior(
  plugin: TableColumnResizePlugin,
  handle: HTMLElement,
  cols: NodeListOf<Element>,
  colIndex: number,
  fileKey: string,
  colCount: number
) {
  handle.addEventListener("pointerdown", (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const col = cols[colIndex] as HTMLElement;
    const startWidth =
      parseFloat(col.style.width) || col.getBoundingClientRect().width;

    handle.classList.add("tcr-dragging");
    document.body.classList.add("tcr-resizing");

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.max(
        plugin.settings.minColumnWidth,
        startWidth + delta
      );
      col.style.width = `${newWidth}px`;
    };

    const onUp = () => {
      handle.classList.remove("tcr-dragging");
      document.body.classList.remove("tcr-resizing");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);

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

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
}
