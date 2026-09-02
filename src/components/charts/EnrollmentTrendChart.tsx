import { useState } from "react";
import type { TrendPoint } from "../../types/dashboard";
import styles from "./EnrollmentTrendChart.module.css";

interface EnrollmentTrendChartProps {
  data: TrendPoint[];
  formatValue: (value: number) => string;
  axisLabels?: { atIndex: number; label: string }[];
}

const WIDTH = 640;
const HEIGHT = 180;
const VIEW_TOP = -14;
const VIEW_HEIGHT = HEIGHT - VIEW_TOP;
const PAD_LEFT = 32;
const PAD_RIGHT = 32;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 148;
const AXIS_Y = 176;

function buildGeometry(data: TrendPoint[]) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (WIDTH - PAD_LEFT - PAD_RIGHT) / (data.length - 1) : 0;

  return data.map((d, i) => {
    const x = PAD_LEFT + i * stepX;
    const y = PLOT_BOTTOM - ((d.value - min) / range) * (PLOT_BOTTOM - PLOT_TOP);
    return { ...d, x, y };
  });
}

export function EnrollmentTrendChart({ data, formatValue, axisLabels = [] }: EnrollmentTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={`${styles.chartFrame} ${styles.empty}`}>No enrollment data yet.</div>
      </div>
    );
  }

  const points = buildGeometry(data);
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${linePoints} ${points[points.length - 1].x},${PLOT_BOTTOM} ${points[0].x},${PLOT_BOTTOM}`;
  const first = points[0];
  const last = points[points.length - 1];
  const active = hovered !== null ? points[hovered] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame}>
        <svg
          className={styles.svg}
          viewBox={`0 ${VIEW_TOP} ${WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Enrollment trend from ${formatValue(first.value)} to ${formatValue(last.value)}`}
        >
          <line className={styles.grid} x1={PAD_LEFT} y1={PLOT_TOP} x2={WIDTH - PAD_RIGHT} y2={PLOT_TOP} />
          <line
            className={styles.grid}
            x1={PAD_LEFT}
            y1={(PLOT_TOP + PLOT_BOTTOM) / 2}
            x2={WIDTH - PAD_RIGHT}
            y2={(PLOT_TOP + PLOT_BOTTOM) / 2}
          />
          <line className={styles.grid} x1={PAD_LEFT} y1={PLOT_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={PLOT_BOTTOM} />

          <polygon className={styles.area} points={areaPoints} />
          <polyline className={styles.line} points={linePoints} />

          {points.map((p, i) => (
            <circle
              key={p.label}
              className={styles.hit}
              cx={p.x}
              cy={p.y}
              r={10}
              tabIndex={0}
              role="button"
              aria-label={p.tooltip}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}

          <circle className={styles.dot} cx={first.x} cy={first.y} r={3} />
          <circle className={styles.dot} cx={last.x} cy={last.y} r={4} />
          <text className={styles.startLabel} x={first.x} y={first.y + 16}>
            {formatValue(first.value)}
          </text>
          <text className={styles.endpointLabel} x={last.x - 42} y={last.y - 4}>
            {formatValue(last.value)}
          </text>

          {axisLabels.map(({ atIndex, label }) => (
            <text
              key={label}
              className={styles.axisLabel}
              x={points[atIndex]?.x ?? PAD_LEFT}
              y={AXIS_Y}
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
        </svg>

        {active && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(active.x / WIDTH) * 100}%`,
              top: `${((active.y - VIEW_TOP) / VIEW_HEIGHT) * 100}%`,
            }}
          >
            {active.tooltip}
          </div>
        )}
      </div>
    </div>
  );
}
