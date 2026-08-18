import { useState } from "react";
import styles from "./SessionTimelineChart.module.css";

export interface TimelineSession {
  id: number;
  label: string;
  color: string;
  availability: string | null;
  activation: string | null;
  closing: string | null;
}

interface SessionTimelineChartProps {
  sessions: TimelineSession[];
  formatDate: (iso: string) => string;
  now?: Date;
}

const ROW_HEIGHT = 34;
const PAD_TOP = 22;
const PAD_BOTTOM = 18;
const LABEL_WIDTH = 100;
const PAD_RIGHT = 16;
/** Matches this panel's typical rendered width closely enough that 1 SVG unit ≈ 1 screen pixel —
 * text sized here reads at the size it's authored at instead of being blown up by the browser
 * scaling a much-narrower viewBox up to fill a much-wider panel. */
const WIDTH = 1160;

type MarkerKind = "availability" | "activation" | "closing";
const MARKER_ORDER: MarkerKind[] = ["availability", "activation", "closing"];
const MARKER_LABEL: Record<MarkerKind, string> = {
  availability: "Availability deadline",
  activation: "Activation deadline",
  closing: "Closing deadline",
};

interface Marker {
  kind: MarkerKind;
  date: Date;
  x: number;
}

function MarkerShape({ kind, x, y, size }: { kind: MarkerKind; x: number; y: number; size: number }) {
  if (kind === "availability") {
    const d = `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`;
    return <path d={d} />;
  }
  if (kind === "closing") {
    return <rect x={x - size * 0.82} y={y - size * 0.82} width={size * 1.64} height={size * 1.64} rx={2} />;
  }
  return <circle cx={x} cy={y} r={size} />;
}

/** A per-session event timeline: each row is one session, plotted along a shared time axis rather
 * than compared by bar length or angle — position in time is the whole encoding. Row labels are
 * drawn inside the same SVG as the plot (not a separate HTML column) so they can never drift out
 * of alignment with their row at different container widths. Marker shape (not color) says which
 * deadline it is; color says the session's status. A dashed "today" line gives every row the same
 * reference point. */
export function SessionTimelineChart({ sessions, formatDate, now = new Date() }: SessionTimelineChartProps) {
  const [active, setActive] = useState<{ sessionId: number; kind: MarkerKind } | null>(null);

  const allDates = sessions
    .flatMap((s) => [s.availability, s.activation, s.closing])
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime());
  const minTime = Math.min(...allDates, now.getTime());
  const maxTime = Math.max(...allDates, now.getTime());
  const span = maxTime - minTime || 1;
  const plotLeft = LABEL_WIDTH;
  const plotRight = WIDTH - PAD_RIGHT;

  function toX(iso: string): number {
    const t = new Date(iso).getTime();
    return plotLeft + ((t - minTime) / span) * (plotRight - plotLeft);
  }

  const nowX = plotLeft + ((now.getTime() - minTime) / span) * (plotRight - plotLeft);
  const height = PAD_TOP + sessions.length * ROW_HEIGHT + PAD_BOTTOM;

  const rows = sessions.map((s, i) => {
    const y = PAD_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const markers: Marker[] = [];
    if (s.availability) markers.push({ kind: "availability", date: new Date(s.availability), x: toX(s.availability) });
    if (s.activation) markers.push({ kind: "activation", date: new Date(s.activation), x: toX(s.activation) });
    if (s.closing) markers.push({ kind: "closing", date: new Date(s.closing), x: toX(s.closing) });
    markers.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { session: s, y, markers };
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame} style={{ aspectRatio: `${WIDTH} / ${height}` }}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${WIDTH} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Session lifecycle timeline: availability, activation, and closing deadlines across sessions, with today marked"
        >
          <text x={plotLeft} y={16} className={styles.rangeLabel}>
            {formatDate(new Date(minTime).toISOString())}
          </text>
          <text x={plotRight} y={16} textAnchor="end" className={styles.rangeLabel}>
            {formatDate(new Date(maxTime).toISOString())}
          </text>

          <line x1={nowX} y1={PAD_TOP - 6} x2={nowX} y2={height - PAD_BOTTOM + 6} className={styles.nowLine} />
          <text x={nowX} y={height - 6} className={styles.nowLabel} textAnchor="middle">
            Today
          </text>

          {rows.map(({ session, y, markers }) => (
            <g key={session.id}>
              <text x={0} y={y + 4} className={styles.rowLabel}>
                {session.label}
              </text>
              <line x1={plotLeft} y1={y} x2={plotRight} y2={y} className={styles.baseline} />
              {markers.length > 1 && (
                <line
                  x1={markers[0].x}
                  y1={y}
                  x2={markers[markers.length - 1].x}
                  y2={y}
                  stroke={session.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              )}
              {markers.map((m) => {
                const isActive = active?.sessionId === session.id && active.kind === m.kind;
                return (
                  <g
                    key={m.kind}
                    fill={session.color}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    tabIndex={0}
                    role="button"
                    aria-label={`${session.label} — ${MARKER_LABEL[m.kind]}: ${formatDate(m.date.toISOString())}`}
                    className={styles.marker}
                    onMouseEnter={() => setActive({ sessionId: session.id, kind: m.kind })}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive({ sessionId: session.id, kind: m.kind })}
                    onBlur={() => setActive(null)}
                  >
                    <MarkerShape kind={m.kind} x={m.x} y={y} size={5.5} />
                    {isActive && (
                      <foreignObject x={Math.min(Math.max(m.x - 80, plotLeft), plotRight - 160)} y={y - 46} width={160} height={34}>
                        <div className={styles.tooltip}>
                          <strong>{MARKER_LABEL[m.kind]}</strong>
                          <br />
                          {formatDate(m.date.toISOString())}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
              {markers.length === 0 && (
                <text x={plotLeft + 10} y={y + 4} className={styles.emptyLabel}>
                  Not scheduled yet
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.legend}>
        {MARKER_ORDER.map((kind) => (
          <span className={styles.legendItem} key={kind}>
            <svg viewBox="0 0 16 16" className={styles.legendIcon} aria-hidden="true">
              <g fill="var(--color-muted)">
                <MarkerShape kind={kind} x={8} y={8} size={5.5} />
              </g>
            </svg>
            {MARKER_LABEL[kind]}
          </span>
        ))}
      </div>
    </div>
  );
}
