import { useState } from "react";
import styles from "./ResultsDistributionChart.module.css";

export interface ResultPoint {
  enrollmentId: number;
  studentName: string;
  studentId: string;
  obtainedMarks: number;
  courseGpa: number;
}

interface ResultsDistributionChartProps {
  points: ResultPoint[];
}

/** Matches this panel's typical rendered width closely enough that 1 SVG unit ≈ 1 screen pixel. */
const WIDTH = 1160;
const PAD_LEFT = 32;
const PAD_RIGHT = 32;
const CURVE_TOP = 28;
const BASELINE_Y = 190;
const RUG_TOP = 228;
const PAD_BOTTOM = 14;
const CURVE_STEPS = 100;

function gaussianKDE(values: number[], bandwidth: number, x: number): number {
  let sum = 0;
  for (const v of values) {
    const u = (x - v) / bandwidth;
    sum += Math.exp(-0.5 * u * u);
  }
  return sum / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
}

/** A smoothed density curve (Gaussian KDE) over the class's marks — the standard "grade
 * distribution" shape — with a dashed line marking the class average, and every student's actual
 * mark plotted below it as a hoverable point. Real distributions cluster near the mean, so at real
 * class sizes many points land at nearly the same x — laid out on one line they'd overlap and hide
 * each other. Points that would collide fall back to an extra row instead (a beeswarm, same
 * lane-packing technique as ProgramFeeSwarm): the rug grows downward as the class gets denser, but
 * every student stays its own separately hoverable dot no matter how many there are. Dot size also
 * shrinks a little as the roster grows, so a lecture hall's worth of points doesn't need as much
 * per-lane width to stop colliding. */
export function ResultsDistributionChart({ points }: ResultsDistributionChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((p) => p.obtainedMarks);
  const spread = Math.max(...values) - Math.min(...values);
  const bandwidth = Math.max(6, spread / 3 || 10);

  const plotLeft = PAD_LEFT;
  const plotRight = WIDTH - PAD_RIGHT;
  function toX(marks: number) {
    return plotLeft + (Math.max(0, Math.min(100, marks)) / 100) * (plotRight - plotLeft);
  }

  const samples = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => {
    const x = (i / CURVE_STEPS) * 100;
    return { x, density: gaussianKDE(values, bandwidth, x) };
  });
  const maxDensity = Math.max(...samples.map((s) => s.density), 1e-9);
  function toY(density: number) {
    return CURVE_TOP + (1 - density / maxDensity) * (BASELINE_Y - CURVE_TOP);
  }

  const linePath = samples.map((s, i) => `${i === 0 ? "M" : "L"} ${toX(s.x).toFixed(1)} ${toY(s.density).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${toX(100)} ${BASELINE_Y} L ${toX(0)} ${BASELINE_Y} Z`;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const xTicks = [0, 25, 50, 75, 100];

  const n = points.length;
  const dotRadius = n <= 15 ? 7 : n <= 40 ? 5.5 : n <= 80 ? 4.5 : 3.5;
  const hitRadius = dotRadius + 6;
  const minGap = dotRadius * 2 + 4;
  const laneHeight = dotRadius * 2 + 8;

  const sortedByMarks = [...points].sort((a, b) => a.obtainedMarks - b.obtainedMarks);
  const laneLastX: number[] = [];
  const placed = sortedByMarks.map((p) => {
    const x = toX(p.obtainedMarks);
    let lane = laneLastX.findIndex((lastX) => x - lastX >= minGap);
    if (lane === -1) {
      lane = laneLastX.length;
      laneLastX.push(x);
    } else {
      laneLastX[lane] = x;
    }
    return { ...p, x, lane };
  });
  const laneCount = Math.max(1, laneLastX.length);
  const rugBottom = RUG_TOP + laneCount * laneHeight;
  const height = rugBottom + PAD_BOTTOM;

  const activePoint = placed.find((p) => p.enrollmentId === active) ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame} style={{ aspectRatio: `${WIDTH} / ${height}` }}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${WIDTH} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Distribution of final marks across the class, with each student's mark plotted below"
        >
          {xTicks.map((t) => (
            <line key={t} x1={toX(t)} y1={CURVE_TOP} x2={toX(t)} y2={BASELINE_Y} className={styles.grid} />
          ))}

          <path d={areaPath} className={styles.area} />
          <path d={linePath} className={styles.curve} />

          <line x1={plotLeft} y1={BASELINE_Y} x2={plotRight} y2={BASELINE_Y} className={styles.axisLine} />
          {xTicks.map((t) => (
            <text key={t} x={toX(t)} y={BASELINE_Y + 18} textAnchor="middle" className={styles.axisLabel}>
              {t}
            </text>
          ))}

          <line x1={toX(average)} y1={CURVE_TOP} x2={toX(average)} y2={rugBottom} className={styles.averageLine} />
          <text x={toX(average)} y={CURVE_TOP - 10} textAnchor="middle" className={styles.averageLabel}>
            avg {average.toFixed(1)}
          </text>

          {placed.map((p) => {
            const isActive = active === p.enrollmentId;
            const dim = active !== null && !isActive;
            const y = RUG_TOP + p.lane * laneHeight + laneHeight / 2;
            return (
              <g key={p.enrollmentId} opacity={dim ? 0.35 : 1}>
                {laneCount === 1 && <line x1={p.x} y1={y - 9} x2={p.x} y2={y + 9} className={styles.rugTick} />}
                <circle cx={p.x} cy={y} r={dotRadius} className={styles.point} />
                <circle
                  cx={p.x}
                  cy={y}
                  r={hitRadius}
                  className={styles.hitArea}
                  tabIndex={0}
                  role="img"
                  aria-label={`${p.studentName}: ${p.obtainedMarks} marks, GPA ${p.courseGpa}`}
                  onMouseEnter={() => setActive(p.enrollmentId)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(p.enrollmentId)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>

        {activePoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(activePoint.x / WIDTH) * 100}%`,
              top: `${((RUG_TOP + activePoint.lane * laneHeight) / height) * 100}%`,
            }}
          >
            <strong>{activePoint.studentName}</strong>
            <br />
            {activePoint.studentId} · {activePoint.obtainedMarks} marks · GPA {activePoint.courseGpa}
          </div>
        )}
      </div>
    </div>
  );
}
