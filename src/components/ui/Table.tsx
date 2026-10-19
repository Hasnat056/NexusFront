import type { ReactNode } from "react";
import styles from "./Table.module.css";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Fixed column width (e.g. "45%", "8rem") — only takes effect when the table's own
   * `fixedLayout` is set; ignored under the default auto layout. */
  width?: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Pins column widths to each column's `width` instead of the browser recomputing them from
   * content on every render — needed wherever a cell's content can change length in place (e.g. a
   * Select whose picked value is longer than its placeholder), which under the default `auto`
   * layout reflows the whole column and visibly shifts it. Off by default since most tables here
   * want their columns sized to fit whatever's actually in them. */
  fixedLayout?: boolean;
}

export function Table<T>({ columns, rows, rowKey, fixedLayout = false }: TableProps<T>) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table} style={fixedLayout ? { tableLayout: "fixed" } : undefined}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === "right" ? styles["align-right"] : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === "right" ? styles.numeric : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
