import { PluginSettingTab, Setting, App } from "obsidian";
import type TableColumnResizePlugin from "./main";

export class TableResizeSettingTab extends PluginSettingTab {
  plugin: TableColumnResizePlugin;

  constructor(app: App, plugin: TableColumnResizePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Minimum column width")
      .setDesc("The minimum width (in pixels) a column can be resized to.")
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.minColumnWidth))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.minColumnWidth = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Reset all saved widths")
      .setDesc(
        "Clear all saved column widths. Tables will return to their default widths."
      )
      .addButton((btn) =>
        btn
          .setButtonText("Reset")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.columnWidths = {};
            await this.plugin.saveSettings();
          })
      );
  }
}
