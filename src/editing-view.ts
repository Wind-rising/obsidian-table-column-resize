import { ViewPlugin, EditorView } from "@codemirror/view";
import type TableColumnResizePlugin from "./main";
import { setupTableResize } from "./resize-handler";

/**
 * CM6 ViewPlugin that instruments tables in Live Preview mode.
 * Uses a MutationObserver to detect when tables are rendered
 * in the editor DOM and attaches resize handles.
 */
export const tableResizeEditorExtension = (plugin: TableColumnResizePlugin) =>
  ViewPlugin.fromClass(
    class {
      private observer: MutationObserver;

      constructor(private view: EditorView) {
        this.observer = new MutationObserver(() => {
          this.instrumentTables();
        });
        this.observer.observe(view.dom, { childList: true, subtree: true });
        this.instrumentTables();
      }

      update() {
        this.instrumentTables();
      }

      instrumentTables() {
        const tables = this.view.dom.querySelectorAll(
          "table:not([data-tcr])"
        );
        if (tables.length === 0) return;

        const filePath =
          plugin.app.workspace.getActiveFile()?.path ?? "_unknown";

        tables.forEach((table) => {
          setupTableResize(plugin, table as HTMLTableElement, filePath);
        });
      }

      destroy() {
        this.observer.disconnect();
      }
    }
  );
