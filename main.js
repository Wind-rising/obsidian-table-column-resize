"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TableColumnResizePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  columnWidths: {},
  minColumnWidth: 50
};

// src/resize-handler.ts
function tableFingerprint(headerCells) {
  const texts = [];
  headerCells.forEach((cell) => {
    var _a;
    texts.push(((_a = cell.textContent) != null ? _a : "").trim());
  });
  return texts.join("|");
}
function setupTableResize(plugin, table, filePath) {
  var _a;
  if (table.hasAttribute("data-tcr"))
    return;
  table.setAttribute("data-tcr", "1");
  const headerRow = (_a = table.querySelector("thead tr")) != null ? _a : table.querySelector("tr");
  if (!headerRow)
    return;
  const headerCells = headerRow.querySelectorAll("th, td");
  const colCount = headerCells.length;
  if (colCount === 0)
    return;
  const fingerprint = tableFingerprint(headerCells);
  const fileKey = `${filePath}::${fingerprint}`;
  table.style.tableLayout = "fixed";
  let colgroup = table.querySelector("colgroup");
  if (!colgroup) {
    colgroup = document.createElement("colgroup");
    table.insertBefore(colgroup, table.firstChild);
  }
  while (colgroup.children.length < colCount) {
    colgroup.appendChild(document.createElement("col"));
  }
  const cols = colgroup.querySelectorAll("col");
  let hasSavedWidths = false;
  for (let i = 0; i < colCount; i++) {
    const key = `${fileKey}::${i}`;
    const saved = plugin.settings.columnWidths[key];
    if (saved !== void 0) {
      cols[i].style.width = `${saved}px`;
      hasSavedWidths = true;
    }
  }
  if (!hasSavedWidths) {
    for (let i = 0; i < colCount; i++) {
      const cell = headerCells[i];
      const w = cell.getBoundingClientRect().width;
      if (w > 0) {
        cols[i].style.width = `${w}px`;
      }
    }
  }
  for (let i = 0; i < colCount; i++) {
    const th = headerCells[i];
    th.style.position = "relative";
    th.style.overflow = "visible";
    const handle = document.createElement("div");
    handle.className = "tcr-handle";
    th.appendChild(handle);
    attachDragBehavior(plugin, handle, cols, i, fileKey, colCount);
  }
}
function attachDragBehavior(plugin, handle, cols, colIndex, fileKey, colCount) {
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const col = cols[colIndex];
    const startWidth = parseFloat(col.style.width) || col.getBoundingClientRect().width;
    handle.classList.add("tcr-dragging");
    document.body.classList.add("tcr-resizing");
    const onMove = (ev) => {
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
      for (let i = 0; i < colCount; i++) {
        const c = cols[i];
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

// src/reading-view.ts
var tableResizePostProcessor = (plugin) => (el, ctx) => {
  const tables = el.querySelectorAll("table");
  if (tables.length === 0)
    return;
  tables.forEach((table) => {
    setupTableResize(plugin, table, ctx.sourcePath);
  });
};

// src/editing-view.ts
var import_view = require("@codemirror/view");
var tableResizeEditorExtension = (plugin) => import_view.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
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
      var _a, _b;
      const tables = this.view.dom.querySelectorAll(
        "table:not([data-tcr])"
      );
      if (tables.length === 0)
        return;
      const filePath = (_b = (_a = plugin.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : "_unknown";
      tables.forEach((table) => {
        setupTableResize(plugin, table, filePath);
      });
    }
    destroy() {
      this.observer.disconnect();
    }
  }
);

// src/settings.ts
var import_obsidian = require("obsidian");
var TableResizeSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Minimum column width").setDesc("The minimum width (in pixels) a column can be resized to.").addText(
      (text) => text.setPlaceholder("50").setValue(String(this.plugin.settings.minColumnWidth)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          this.plugin.settings.minColumnWidth = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Reset all saved widths").setDesc(
      "Clear all saved column widths. Tables will return to their default widths."
    ).addButton(
      (btn) => btn.setButtonText("Reset").setWarning().onClick(async () => {
        this.plugin.settings.columnWidths = {};
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/main.ts
var TableColumnResizePlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.saveTimeout = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerMarkdownPostProcessor(tableResizePostProcessor(this));
    this.registerEditorExtension(tableResizeEditorExtension(this));
    this.addSettingTab(new TableResizeSettingTab(this.app, this));
  }
  onunload() {
    if (this.saveTimeout !== null) {
      window.clearTimeout(this.saveTimeout);
      this.saveSettings();
    }
    document.body.classList.remove("tcr-resizing");
  }
  async loadSettings() {
    var _a, _b;
    const data = await this.loadData();
    this.settings = {
      columnWidths: (_a = data == null ? void 0 : data.columnWidths) != null ? _a : {},
      minColumnWidth: (_b = data == null ? void 0 : data.minColumnWidth) != null ? _b : DEFAULT_SETTINGS.minColumnWidth
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /** Debounced save - writes at most once per 500ms during drag operations */
  debouncedSave() {
    if (this.saveTimeout !== null)
      window.clearTimeout(this.saveTimeout);
    this.saveTimeout = window.setTimeout(() => {
      this.saveSettings();
      this.saveTimeout = null;
    }, 500);
  }
};
