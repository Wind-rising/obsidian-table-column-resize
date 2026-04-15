export interface ColumnWidths {
  [key: string]: number;
}

export interface TableResizeSettings {
  columnWidths: ColumnWidths;
  minColumnWidth: number;
}

export const DEFAULT_SETTINGS: TableResizeSettings = {
  columnWidths: {},
  minColumnWidth: 50,
};
