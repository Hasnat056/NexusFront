import type { StatBreakdownSegment } from "../../types/dashboard";

interface StatusBreakdownBarProps {
  segments: StatBreakdownSegment[];
  width?: number;
}

const TONE_VAR: Record<StatBreakdownSegment["tone"], string> = {
  good: "var(--color-good)",
  warning: "var(--color-warning)",
  critical: "var(--color-critical)",
  flat: "var(--color-muted)",
};

const GAP = 2;
const HEIGHT = 7;

export function StatusBreakdownBar({ segments, width = 220 }: StatusBreakdownBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  const usableWidth = width - GAP * (segments.length - 1);
  let x = 0;

  const bars = segments.map((s) => {
    const segWidth = Math.max((s.count / total) * usableWidth, 0);
    const bar = { ...s, x, width: segWidth, share: s.count / total };
    x += segWidth + GAP;
    return bar;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: `${HEIGHT}px`, marginTop: "0.65rem" }}
      role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(", ")}
    >
      {bars.map((b) => (
        <rect key={b.label} x={b.x} y={0} width={b.width} height={HEIGHT} rx={1.5} fill={TONE_VAR[b.tone]}>
          <title>
            {b.label}: {b.count} ({Math.round(b.share * 100)}%)
          </title>
        </rect>
      ))}
    </svg>
  );
}
