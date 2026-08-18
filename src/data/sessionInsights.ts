import type { HeatmapCell } from "../components/charts/HeatmapGrid";
import type { TimelineSession } from "../components/charts/SessionTimelineChart";
import { mockAllocations } from "./allocationDirectory";
import { mockEnrollments } from "./enrollmentDirectory";
import { allSemesterRefs } from "./semesterDirectory";
import { mockSessions } from "./sessionDirectory";

const STATUS_HEX: Record<string, string> = {
  Inactive: "#c1602a",
  Initiated: "#c1602a",
  Available: "#3f8a5c",
  Active: "#3f8a5c",
  Completed: "#b23b3b",
};

export interface SessionBinding {
  sessionId: number;
  label: string;
  status: string;
  classes: number;
  semesters: number;
  allocations: number;
  enrollments: number;
}

/**
 * Cross-resource counts per session — the whole reason Sessions get a richer view than any other
 * list page: a session's own row (period/year/deadlines) says nothing about how much of the
 * curriculum actually hangs off it. Classes = distinct classes with a semester on this session;
 * semesters = semesters assigned to it (via classDirectory.ts's embedded scheme, read through
 * semesterDirectory.ts); allocations = CourseAllocation rows whose denormalized `session` string
 * matches this session's label; enrollments = Enrollment rows under those allocations.
 */
export function selectSessionBindings(): SessionBinding[] {
  return mockSessions.map((s) => {
    const label = `${s.period} ${s.year}`;
    const semesters = allSemesterRefs().filter((sem) => sem.session === s.id);
    const classIds = new Set(semesters.map((sem) => sem.classId));
    const allocations = mockAllocations.filter((a) => a.session === label);
    const allocationIds = new Set(allocations.map((a) => a.allocation_id));
    const enrollments = mockEnrollments.filter((e) => allocationIds.has(e.allocation));
    return {
      sessionId: s.id,
      label,
      status: s.status,
      classes: classIds.size,
      semesters: semesters.length,
      allocations: allocations.length,
      enrollments: enrollments.length,
    };
  });
}

const BINDING_COLUMNS = [
  { id: "classes", label: "Classes" },
  { id: "semesters", label: "Semesters" },
  { id: "allocations", label: "Allocations" },
  { id: "enrollments", label: "Enrollments" },
] as const;

/** Sequential ramp over a single hue (the app's accent) — magnitude only, normalized per column
 * so four metrics on very different scales (a handful of classes vs. dozens of enrollments) each
 * still show their own real spread instead of the busiest column drowning the rest. */
export function selectSessionBindingHeatmap(): { rowLabels: string[]; columnLabels: string[]; cells: HeatmapCell[][] } {
  const bindings = selectSessionBindings();
  const columnMax = BINDING_COLUMNS.map((col) => Math.max(...bindings.map((b) => b[col.id]), 1));

  const cells = bindings.map((b) =>
    BINDING_COLUMNS.map((col, ci) => {
      const value = b[col.id];
      const intensity = value / columnMax[ci];
      const alpha = value === 0 ? 0.06 : 0.16 + intensity * 0.68;
      return {
        label: String(value),
        color: `color-mix(in srgb, var(--color-accent) ${Math.round(alpha * 100)}%, var(--color-surface))`,
        textColor: alpha > 0.55 ? "var(--color-on-accent)" : "var(--color-ink)",
        tooltip: `${b.label} · ${col.label}: ${value}`,
        href: `/admin/sessions/${b.sessionId}`,
      };
    }),
  );

  return {
    rowLabels: bindings.map((b) => b.label),
    columnLabels: BINDING_COLUMNS.map((c) => c.label),
    cells,
  };
}

export function selectSessionTimeline(): TimelineSession[] {
  return mockSessions.map((s) => ({
    id: s.id,
    label: `${s.period} ${s.year}`,
    color: STATUS_HEX[s.status] ?? "#8a8071",
    availability: s.availability_deadline,
    activation: s.activation_deadline,
    closing: s.closing_deadline,
  }));
}
