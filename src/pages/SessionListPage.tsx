import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { HeatmapGrid, type HeatmapCell } from "../components/charts/HeatmapGrid";
import { SessionTimelineChart, type TimelineSession } from "../components/charts/SessionTimelineChart";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type {
  AdminClass,
  AdminCourseAllocationSummary,
  AdminEnrollmentSummary,
  AdminSession,
  SessionPeriod,
  SessionStatus,
} from "../types/api";
import type { StatusTone } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";
import formStyles from "../components/ui/Form.module.css";
import listStyles from "./SessionListPage.module.css";

const SESSION_PERIODS: SessionPeriod[] = ["Fall", "Spring"];
const SESSION_STATUSES: SessionStatus[] = ["Inactive", "Initiated", "Available", "Active", "Completed"];
const SESSION_STATUS_TONE: Record<SessionStatus, StatusTone> = {
  Inactive: "warning",
  Initiated: "warning",
  Available: "good",
  Active: "good",
  Completed: "critical",
};
const STATUS_HEX: Record<SessionStatus, string> = {
  Inactive: "#c1602a",
  Initiated: "#c1602a",
  Available: "#3f8a5c",
  Active: "#3f8a5c",
  Completed: "#b23b3b",
};

function formatSessionDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function validateSessionYear(year: number): string | null {
  if (year < new Date().getFullYear()) return "Year cannot be in the past.";
  return null;
}

interface SessionRow {
  id: number;
  label: string;
  status: { label: SessionStatus; tone: StatusTone };
  activationDeadline: string | null;
  availabilityDeadline: string | null;
  closingDeadline: string | null;
}

const columns: Column<SessionRow>[] = [
  {
    key: "label",
    header: "Session",
    render: (row) => (
      <Link to={`/admin/sessions/${row.id}`} className={styles.nameLink}>
        {row.label}
      </Link>
    ),
  },
  { key: "status", header: "Status", render: (row) => <Tag tone={row.status.tone}>{row.status.label}</Tag> },
  { key: "activation", header: "Activation deadline", render: (row) => formatSessionDateTime(row.activationDeadline) },
  { key: "availability", header: "Availability deadline", render: (row) => formatSessionDateTime(row.availabilityDeadline) },
  { key: "closing", header: "Closing deadline", render: (row) => formatSessionDateTime(row.closingDeadline) },
];

export function SessionListPage() {
  const navigate = useNavigate();
  useAdminPageConfig("Sessions");

  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [allocations, setAllocations] = useState<AdminCourseAllocationSummary[]>([]);
  const [enrollments, setEnrollments] = useState<AdminEnrollmentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<SessionPeriod>("Fall");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
      cached("admin:allocations", () => apiGetAllPages<AdminCourseAllocationSummary>("/admin/allocations/")),
      cached("admin:enrollments", () => apiGetAllPages<AdminEnrollmentSummary>("/admin/enrollments/")),
    ])
      .then(([sessionsRes, classesRes, allocationsRes, enrollmentsRes]) => {
        if (cancelled) return;
        setSessions(sessionsRes);
        setClasses(classesRes);
        setAllocations(allocationsRes);
        setEnrollments(enrollmentsRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const yearNum = Number(year);
    const yearError = validateSessionYear(yearNum);
    if (yearError) {
      setCreateError(null);
      setCreateFieldErrors({ year: yearError });
      return;
    }
    setCreateError(null);
    setCreateFieldErrors({});
    try {
      const record = await apiMutate<AdminSession>("/admin/sessions/", "POST", { period, year: yearNum });
      invalidateCache("admin:sessions");
      navigate(`/admin/sessions/${record.id}`);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setCreateError(banner);
      setCreateFieldErrors(fields);
    }
  }

  const yearOptions = useMemo(
    () => Array.from(new Set((sessions ?? []).map((s) => s.year))).sort((a, b) => b - a),
    [sessions],
  );

  // SessionListCreateAPIView: filterset_fields = ['period', 'year', 'status'], search_fields =
  // ['period', 'status'] (AdminModule/views.py). The full list is already fetched for the
  // timeline/heatmap panels above, so this filters that same client-side rather than re-fetching.
  const filteredSessions = useMemo(() => {
    return (sessions ?? []).filter((s) => {
      if (periodFilter && s.period !== periodFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (yearFilter && String(s.year) !== yearFilter) return false;
      if (search && !s.period.toLowerCase().includes(search.toLowerCase()) && !s.status.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sessions, periodFilter, statusFilter, yearFilter, search]);

  const rows: SessionRow[] = useMemo(
    () =>
      filteredSessions.map((s) => ({
        id: s.id,
        label: `${s.period} ${s.year}`,
        status: { label: s.status, tone: SESSION_STATUS_TONE[s.status] },
        activationDeadline: s.activation_deadline,
        availabilityDeadline: s.availability_deadline,
        closingDeadline: s.closing_deadline,
      })),
    [filteredSessions],
  );

  const timeline: TimelineSession[] = useMemo(
    () =>
      (sessions ?? []).map((s) => ({
        id: s.id,
        label: `${s.period} ${s.year}`,
        color: STATUS_HEX[s.status] ?? "#8a8071",
        availability: s.availability_deadline,
        activation: s.activation_deadline,
        closing: s.closing_deadline,
      })),
    [sessions],
  );

  const bindingHeatmap = useMemo(() => {
    const bindings = (sessions ?? []).map((s) => {
      const label = `${s.period} ${s.year}`;
      const semesters = classes.flatMap((c) => (c.scheme_of_studies ?? []).filter((sem) => sem.session === s.id));
      const classIds = new Set(
        classes.filter((c) => (c.scheme_of_studies ?? []).some((sem) => sem.session === s.id)).map((c) => c.class_id),
      );
      const sessionAllocations = allocations.filter((a) => a.session === label);
      const allocationIds = new Set(sessionAllocations.map((a) => a.allocation_id));
      const sessionEnrollments = enrollments.filter((e) => allocationIds.has(e.allocation));
      return {
        sessionId: s.id,
        label,
        classes: classIds.size,
        semesters: semesters.length,
        allocations: sessionAllocations.length,
        enrollments: sessionEnrollments.length,
      };
    });
    const columns = [
      { id: "classes" as const, label: "Classes" },
      { id: "semesters" as const, label: "Semesters" },
      { id: "allocations" as const, label: "Allocations" },
      { id: "enrollments" as const, label: "Enrollments" },
    ];
    const columnMax = columns.map((col) => Math.max(...bindings.map((b) => b[col.id]), 1));
    const cells: HeatmapCell[][] = bindings.map((b) =>
      columns.map((col, ci) => {
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
    return { rowLabels: bindings.map((b) => b.label), columnLabels: columns.map((c) => c.label), cells };
  }, [sessions, classes, allocations, enrollments]);

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by period or status…"
        selects={[
          {
            id: "period",
            value: periodFilter,
            onChange: setPeriodFilter,
            placeholder: "All periods",
            options: SESSION_PERIODS.map((p) => ({ value: p, label: p })),
          },
          {
            id: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All statuses",
            options: SESSION_STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            id: "year",
            value: yearFilter,
            onChange: setYearFilter,
            placeholder: "All years",
            options: yearOptions.map((y) => ({ value: String(y), label: String(y) })),
          },
        ]}
        addLabel="+ New session"
        addOnClick={() => setCreating(true)}
        addDisabled={creating}
      />

      {creating && (
        <form className={listStyles.createRow} onSubmit={handleCreate}>
          <div className={formStyles.field} data-invalid={createFieldErrors.period ? "true" : undefined}>
            <label htmlFor="period">Period</label>
            <select id="period" value={period} onChange={(e) => setPeriod(e.target.value as SessionPeriod)}>
              {SESSION_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {createFieldErrors.period && <span className={formStyles.fieldError}>{createFieldErrors.period}</span>}
          </div>
          <div className={formStyles.field} data-invalid={createFieldErrors.year ? "true" : undefined}>
            <label htmlFor="year">Year</label>
            <input id="year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} required />
            {createFieldErrors.year && <span className={formStyles.fieldError}>{createFieldErrors.year}</span>}
          </div>
          {createError && <span className={formStyles.fieldError}>{createError}</span>}
          <div className={listStyles.createActions}>
            <button type="submit" className={formStyles.primaryButton}>
              Create session
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <Panel title="Lifecycle timeline" hint="Availability → activation → closing, plotted against today">
        {sessions ? (
          <SessionTimelineChart sessions={timeline} formatDate={formatSessionDateTime} />
        ) : (
          <p className={styles.empty}>Loading…</p>
        )}
      </Panel>

      <Panel title="What each session binds together" hint="Classes, semesters, allocations, and enrollments">
        {sessions ? (
          <HeatmapGrid {...bindingHeatmap} ariaLabel="Count of classes, semesters, allocations, and enrollments tied to each session" />
        ) : (
          <p className={styles.empty}>Loading…</p>
        )}
      </Panel>

      <Panel title="Sessions" hint={sessions ? `${rows.length} of ${sessions.length} sessions` : undefined}>
        {!sessions && <p className={styles.empty}>Loading sessions…</p>}
        {sessions && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => String(row.id)} />}
        {sessions && rows.length === 0 && <p className={styles.empty}>No sessions match these filters.</p>}
      </Panel>
    </>
  );
}
