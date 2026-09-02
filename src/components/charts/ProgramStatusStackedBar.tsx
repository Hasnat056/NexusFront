import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { STUDENT_STATUS_COLOR as STATUS_COLOR, STUDENT_STATUS_ORDER } from "../../lib/studentStatusColors";
import type { StudentStatus } from "../../types/api";
import styles from "./ProgramStatusStackedBar.module.css";

export interface ProgramStatusPoint {
  programId: string;
  programName: string;
  detailHref: string;
  counts: Partial<Record<StudentStatus, number>>;
}

interface ProgramStatusStackedBarProps {
  points: ProgramStatusPoint[];
}

/** Matches this panel's typical rendered width closely enough that 1 SVG unit ≈ 1 screen pixel. */
const WIDTH = 1160;
const ROW_HEIGHT = 34;
const BAR_HEIGHT = 16;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;
const LABEL_WIDTH = 90;
const COUNT_WIDTH = 60;
const BAR_LEFT = LABEL_WIDTH;
const BAR_RIGHT = WIDTH - COUNT_WIDTH;
const GAP = 2;
/** Past this many programs, the chart stops growing the page and scrolls internally instead —
 * at 100+ programs a one-row-per-program bar chart would otherwise render several page-lengths
 * tall. The cap only ever changes how much scrolls inside the panel, never how many rows exist —
 * chartFrame is still sized to fit every row; scrollArea just clips and scrolls it. */
const VISIBLE_ROW_CAP = 12;

interface Segment {
  status: StudentStatus;
  count: number;
  x: number;
  width: number;
}

interface Row {
  programId: string;
  programName: string;
  detailHref: string;
  total: number;
  segments: Segment[];
}

/** One horizontal stacked bar per program — student headcount broken down by status, ranked by
 * total enrollment. Position/length of the whole bar carries headcount; segment color carries
 * status identity (a fixed hue per status, never recomputed from whichever statuses are present).
 * Replaces a fee-based swarm that this dataset didn't make interesting — enrollment composition
 * is the more useful comparison across programs. */
export function ProgramStatusStackedBar({ points }: ProgramStatusStackedBarProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  const rows: Row[] = [...points]
    .map((p) => {
      const total = STUDENT_STATUS_ORDER.reduce((sum, s) => sum + (p.counts[s] ?? 0), 0);
      return { p, total };
    })
    .sort((a, b) => b.total - a.total)
    .map(({ p, total }) => {
      const barWidth = BAR_RIGHT - BAR_LEFT;
      const usable = total > 0 ? barWidth - GAP * (STUDENT_STATUS_ORDER.filter((s) => (p.counts[s] ?? 0) > 0).length - 1) : barWidth;
      let x = BAR_LEFT;
      const segments: Segment[] = [];
      for (const status of STUDENT_STATUS_ORDER) {
        const count = p.counts[status] ?? 0;
        if (count === 0) continue;
        const segWidth = total > 0 ? Math.max((count / total) * usable, 0) : 0;
        segments.push({ status, count, x, width: segWidth });
        x += segWidth + GAP;
      }
      return { programId: p.programId, programName: p.programName, detailHref: p.detailHref, total, segments };
    });

  const height = PAD_TOP + rows.length * ROW_HEIGHT + PAD_BOTTOM;
  const activeRow = rows.find((r) => r.programId === active) ?? null;
  const scrolls = rows.length > VISIBLE_ROW_CAP;
  const scrollAreaMaxHeight = PAD_TOP + VISIBLE_ROW_CAP * ROW_HEIGHT + PAD_BOTTOM;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.scrollArea}
        style={scrolls ? { maxHeight: `${scrollAreaMaxHeight}px`, overflowY: "auto" } : undefined}
      >
        <div className={styles.chartFrame} style={{ aspectRatio: `${WIDTH} / ${height}` }}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${WIDTH} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Student status breakdown by program: ${rows
              .map((r) => `${r.programName} ${r.total} students`)
              .join(", ")}`}
          >
            {rows.map((row, i) => {
              const y = PAD_TOP + i * ROW_HEIGHT;
              const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
              const isActive = active === row.programId;
              const dim = active !== null && !isActive;
              return (
                <g
                  key={row.programId}
                  opacity={dim ? 0.4 : 1}
                  className={styles.row}
                  tabIndex={0}
                  role="button"
                  aria-label={`${row.programName}: ${row.total} student${row.total === 1 ? "" : "s"} — ${row.segments
                    .map((s) => `${s.status} ${s.count}`)
                    .join(", ")}`}
                  onMouseEnter={() => setActive(row.programId)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(row.programId)}
                  onBlur={() => setActive(null)}
                  onClick={() => navigate(row.detailHref)}
                >
                  <text x={LABEL_WIDTH - 12} y={barY + BAR_HEIGHT / 2 + 4} textAnchor="end" className={styles.rowLabel}>
                    {row.programId}
                  </text>
                  <rect
                    x={BAR_LEFT}
                    y={barY}
                    width={BAR_RIGHT - BAR_LEFT}
                    height={BAR_HEIGHT}
                    rx={3}
                    className={styles.track}
                  />
                  {row.segments.map((seg) => (
                    <rect
                      key={seg.status}
                      x={seg.x}
                      y={barY}
                      width={seg.width}
                      height={BAR_HEIGHT}
                      rx={3}
                      fill={STATUS_COLOR[seg.status]}
                      className={styles.segment}
                    />
                  ))}
                  <text x={BAR_RIGHT + 10} y={barY + BAR_HEIGHT / 2 + 4} className={styles.countLabel}>
                    {row.total}
                  </text>
                </g>
              );
            })}
          </svg>

          {activeRow && (
            <div
              className={styles.tooltip}
              style={{
                left: `${(BAR_LEFT / WIDTH) * 100}%`,
                top: `${((PAD_TOP + rows.indexOf(activeRow) * ROW_HEIGHT) / height) * 100}%`,
              }}
            >
              <strong>{activeRow.programName}</strong>
              <br />
              {activeRow.segments.map((s) => `${s.status} ${s.count}`).join(" · ") || "No students yet"}
            </div>
          )}
        </div>
      </div>
      {scrolls && <p className={styles.scrollHint}>{rows.length} programs — scroll to see the rest.</p>}

      <div className={styles.legend}>
        {STUDENT_STATUS_ORDER.map((status) => (
          <span className={styles.legendItem} key={status}>
            <span className={styles.swatch} style={{ background: STATUS_COLOR[status] }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}
