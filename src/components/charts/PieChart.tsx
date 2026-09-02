import { useEffect, useId, useState } from "react";
import type { CategorySlice } from "../../types/dashboard";
import styles from "./PieChart.module.css";

interface PieChartProps {
  data: CategorySlice[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 92;
const FILL_DURATION_MS = 700;

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle, RADIUS);
  const end = polarToCartesian(endAngle, RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function useFillProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / FILL_DURATION_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}

export function PieChart({ data, formatValue, emptyMessage = "No data yet." }: PieChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const progress = useFillProgress();
  const clipId = useId();

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className={styles.wrap}>
        <div className={`${styles.chartFrame} ${styles.empty}`}>{emptyMessage}</div>
      </div>
    );
  }

  let cumulative = 0;
  const slices = data.map((d) => {
    const share = d.value / total;
    const startAngle = cumulative * 360;
    cumulative += share;
    const endAngle = cumulative * 360;
    const midAngle = (startAngle + endAngle) / 2;
    const labelPos = polarToCartesian(midAngle, RADIUS * 0.64);
    return { ...d, share, startAngle, endAngle, labelPos };
  });

  const activeSlice = slices.find((s) => s.id === active) ?? null;
  const sweepAngle = Math.min(progress * 360, 359.99);

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame} onMouseLeave={() => setActive(null)}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Enrollment by department: ${slices.map((s) => `${s.label} ${Math.round(s.share * 100)}%`).join(", ")}`}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={describeSlice(0, sweepAngle)} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {slices.map((s) => (
              <path
                key={s.id}
                className={styles.slice}
                d={describeSlice(s.startAngle, s.endAngle)}
                fill={s.color}
                opacity={active === null || active === s.id ? 1 : 0.45}
                tabIndex={0}
                role="button"
                aria-label={`${s.label}: ${formatValue(s.value)}, ${Math.round(s.share * 100)}%`}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
              />
            ))}
          </g>
        </svg>

        {activeSlice && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(activeSlice.labelPos.x / SIZE) * 100}%`,
              top: `${(activeSlice.labelPos.y / SIZE) * 100}%`,
            }}
          >
            <strong>{Math.round(activeSlice.share * 100)}%</strong> · {activeSlice.label} (
            {formatValue(activeSlice.value)})
          </div>
        )}
      </div>

      <div className={styles.legend}>
        {slices.map((s) => (
          <div className={styles.legendRow} key={s.id}>
            <span className={styles.swatch} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendValue}>{Math.round(s.share * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
