export const CHECKBOX_PX = 48;
export const CHECKBOX_WIDTH = `${CHECKBOX_PX}px`;

/** Highlights the top edge of the active column's header cell. */
export const COLUMN_ACTIVE_SHADOW = "inset 0 1px 0 var(--color-primary)";

export function alignFlex(align) {
  if (align === "right") return "justify-end";
  if (align === "center") return "justify-center";
  return "justify-start";
}

export function alignText(align) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function readCell(row, column) {
  if (column.cell) return column.cell(row);
  return (row)[column.key];
}

export function readSortValue(row, column) {
  if (column.sortValue) return column.sortValue(row);
  return (row)[column.key];
}
