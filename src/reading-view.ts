import type { MarkdownPostProcessorContext } from "obsidian";
import type TableColumnResizePlugin from "./main";
import { setupTableResize } from "./resize-handler";

/**
 * MarkdownPostProcessor that instruments tables in Reading View
 * with drag-to-resize handles.
 */
export const tableResizePostProcessor =
  (plugin: TableColumnResizePlugin) =>
  (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const tables = el.querySelectorAll("table");
    if (tables.length === 0) return;

    tables.forEach((table) => {
      setupTableResize(plugin, table as HTMLTableElement, ctx.sourcePath);
    });
  };
