import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ProgramFeeSwarm.module.css";

export interface ProgramPoint {
  programId: string;
  programName: string;
  department: string;
  color: string;
  studentCount: number;
  feePerSemester: number;
  totalSemesters: number;
  detailHref: string;
}

interface ProgramFeeSwarmProps {
  points: ProgramPoint[];
  formatFee: (value: number) => string;
}

/** Matches this panel's typical rendered width closely enough that 1 SVG unit ≈ 1 screen pixel. */
const WIDTH = 1160;
const LANE_HEIGHT = 34;
const PAD_TOP = 34;
const PAD_BOTTOM = 30;
const PAD_LEFT = 24;
const PAD_RIGHT = 24;
const MIN_GAP = 84;

interface Placed extends ProgramPoint {
  x: number;
  lane: number;
}

/** Every program on one shared axis — fee per semester — rather than one row per program, so the
 * whole thing stays compact instead of growing with the list. Points that would collide at this
 * width fall back to a second lane (a beeswarm/strip plot, not a ranked list); with this dataset's
 * actual spread they mostly fit on one line. Position on the axis carries the value; color carries
 * department identity; a direct label carries the exact fee. No bars, no angles. */
export function ProgramFeeSwarm({ points, formatFee }: ProgramFeeSwarmProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  const fees = points.map((p) => p.feePerSemester);
  const minFee = Math.min(...fees);
  const maxFee = Math.max(...fees);
  const span = maxFee - minFee || 1;
  const pad = span * 0.1;
  const plotLeft = PAD_LEFT;
  const plotRight = WIDTH - PAD_RIGHT;

  function toX(fee: number) {
    const lo = minFee - pad;
    const hi = maxFee + pad;
    return plotLeft + ((fee - lo) / (hi - lo)) * (plotRight - plotLeft);
  }

  const sorted = [...points].sort((a, b) => a.feePerSemester - b.feePerSemester);
  const laneLastX: number[] = [];
  const placed: Placed[] = sorted.map((p) => {
    const x = toX(p.feePerSemester);
    let lane = laneLastX.findIndex((lastX) => x - lastX >= MIN_GAP);
    if (lane === -1) {
      lane = laneLastX.length;
      laneLastX.push(x);
    } else {
      laneLastX[lane] = x;
    }
    return { ...p, x, lane };
  });

  const laneCount = Math.max(1, laneLastX.length);
  const axisY = PAD_TOP + laneCount * LANE_HEIGHT + 10;
  const height = axisY + PAD_BOTTOM;

  const xTicks = [minFee, (minFee + maxFee) / 2, maxFee];
  const activePoint = placed.find((p) => p.programId === active) ?? null;
  const departments = Array.from(new Map(points.map((p) => [p.department, p.color])).entries());

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame} style={{ aspectRatio: `${WIDTH} / ${height}` }}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${WIDTH} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Programs positioned by fee per semester, colored by department"
        >
          {xTicks.map((t) => (
            <line key={t} x1={toX(t)} y1={PAD_TOP - 12} x2={toX(t)} y2={axisY} className={styles.grid} />
          ))}
          <line x1={plotLeft} y1={axisY} x2={plotRight} y2={axisY} className={styles.axisLine} />
          {xTicks.map((t) => (
            <text key={t} x={toX(t)} y={axisY + 18} textAnchor="middle" className={styles.axisLabel}>
              {formatFee(t)}
            </text>
          ))}

          {placed.map((p) => {
            const y = axisY - 10 - p.lane * LANE_HEIGHT;
            const isActive = active === p.programId;
            const labelUp = p.lane % 2 === 0;
            return (
              <g key={p.programId}>
                <line x1={p.x} y1={y} x2={p.x} y2={axisY} className={styles.stem} />
                <circle
                  cx={p.x}
                  cy={y}
                  r={7}
                  fill={p.color}
                  opacity={active === null || isActive ? 1 : 0.4}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.programName}: ${formatFee(p.feePerSemester)} per semester, ${p.studentCount} students`}
                  className={styles.point}
                  onMouseEnter={() => setActive(p.programId)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(p.programId)}
                  onBlur={() => setActive(null)}
                  onClick={() => navigate(p.detailHref)}
                />
                <text x={p.x} y={labelUp ? y - 12 : y + 20} textAnchor="middle" className={styles.pointLabel}>
                  {p.programId}
                </text>
              </g>
            );
          })}
        </svg>

        {activePoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(activePoint.x / WIDTH) * 100}%`,
              top: `${((axisY - 10 - activePoint.lane * LANE_HEIGHT) / height) * 100}%`,
            }}
          >
            <strong>{activePoint.programName}</strong>
            <br />
            {activePoint.department} · {formatFee(activePoint.feePerSemester)}/sem · {activePoint.totalSemesters} semesters ·{" "}
            {activePoint.studentCount} student{activePoint.studentCount === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className={styles.legend}>
        {departments.map(([dept, color]) => (
          <span className={styles.legendItem} key={dept}>
            <span className={styles.swatch} style={{ background: color }} />
            {dept}
          </span>
        ))}
      </div>
    </div>
  );
}
