import { Plugin } from "obsidian";
import { TableResizeSettings, DEFAULT_SETTINGS } from "./types";
import { tableResizePostProcessor } from "./reading-view";
import { tableResizeEditorExtension } from "./editing-view";
import { TableResizeSettingTab } from "./settings";

export default class TableColumnResizePlugin extends Plugin {
  settings: TableResizeSettings = DEFAULT_SETTINGS;
  private saveTimeout: number | null = null;

  async onload() {
    await this.loadSettings();

    // Reading View: post-process rendered markdown to add resize handles
    this.registerMarkdownPostProcessor(tableResizePostProcessor(this));

    // Live Preview: CM6 editor extension for tables in editing view
    this.registerEditorExtension(tableResizeEditorExtension(this));

    // Settings tab
    this.addSettingTab(new TableResizeSettingTab(this.app, this));
  }

  onunload() {
    // Flush any pending save
    if (this.saveTimeout !== null) {
      window.clearTimeout(this.saveTimeout);
      this.saveSettings();
    }

    // Clean up body class if left over
    document.body.classList.remove("tcr-resizing");
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = {
      columnWidths: data?.columnWidths ?? {},
      minColumnWidth: data?.minColumnWidth ?? DEFAULT_SETTINGS.minColumnWidth,
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /** Debounced save - writes at most once per 500ms during drag operations */
  debouncedSave() {
    if (this.saveTimeout !== null) window.clearTimeout(this.saveTimeout);
    this.saveTimeout = window.setTimeout(() => {
      this.saveSettings();
      this.saveTimeout = null;
    }, 500) as unknown as number;
  }
}
