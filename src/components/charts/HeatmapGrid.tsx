import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./HeatmapGrid.module.css";

export interface HeatmapCell {
  label: string;
  color: string;
  textColor?: string;
  tooltip: string;
  href?: string;
}

interface HeatmapGridProps {
  rowLabels: string[];
  columnLabels: string[];
  cells: HeatmapCell[][];
  ariaLabel: string;
}

/** A row/column matrix with color-coded cells — used both for magnitude (a sequential ramp over
 * counts) and for status (a fixed status/categorical color per cell), depending on what the caller
 * passes as `color`. Not a bar or pie: position in a grid plus color is the whole encoding, no
 * length or angle involved. */
export function HeatmapGrid({ rowLabels, columnLabels, cells, ariaLabel }: HeatmapGridProps) {
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);

  return (
    <div className={styles.wrap} role="img" aria-label={ariaLabel}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `minmax(90px, auto) repeat(${columnLabels.length}, 1fr)` }}
      >
        <div className={styles.corner} />
        {columnLabels.map((label) => (
          <div className={styles.colHead} key={label}>
            {label}
          </div>
        ))}

        {rowLabels.map((rowLabel, r) => (
          <Fragment key={rowLabel}>
            <div className={styles.rowHead}>
              {rowLabel}
            </div>
            {cells[r].map((cell, c) => {
              const isActive = active?.row === r && active?.col === c;
              const content = (
                <span
                  className={styles.cell}
                  style={{ background: cell.color, color: cell.textColor ?? "inherit" }}
                  tabIndex={0}
                  role="button"
                  aria-label={cell.tooltip}
                  onMouseEnter={() => setActive({ row: r, col: c })}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive({ row: r, col: c })}
                  onBlur={() => setActive(null)}
                >
                  {cell.label}
                </span>
              );
              return (
                <div className={styles.cellWrap} key={`${rowLabel}-${c}`}>
                  {cell.href ? (
                    <Link to={cell.href} className={styles.cellLink}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                  {isActive && <div className={styles.tooltip}>{cell.tooltip}</div>}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
