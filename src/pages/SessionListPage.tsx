import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { HeatmapGrid } from "../components/charts/HeatmapGrid";
import { SessionTimelineChart } from "../components/charts/SessionTimelineChart";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import {
  SESSION_PERIODS,
  createSession,
  formatSessionDateTime,
  mockSessions,
  selectSessionListRows,
  validateSessionYear,
} from "../data/sessionDirectory";
import { selectSessionBindingHeatmap, selectSessionTimeline } from "../data/sessionInsights";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { SessionPeriod } from "../types/api";
import type { SessionListRow } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";
import formStyles from "../components/ui/Form.module.css";
import filterStyles from "../components/ui/FilterBar.module.css";
import listStyles from "./SessionListPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

const columns: Column<SessionListRow>[] = [
  {
    key: "label",
    header: "Session",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
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
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const rows = selectSessionListRows(mockSessions);

  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<SessionPeriod>("Fall");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const yearNum = Number(year);
    const yearError = validateSessionYear(yearNum);
    if (yearError) {
      setError(yearError);
      return;
    }
    const record = createSession(period, yearNum);
    navigate(`/admin/sessions/${record.id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="sessions"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Sessions"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      {creating ? (
        <form className={listStyles.createRow} onSubmit={handleCreate}>
          <div className={formStyles.field}>
            <label htmlFor="period">Period</label>
            <select id="period" value={period} onChange={(e) => setPeriod(e.target.value as SessionPeriod)}>
              {SESSION_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="year">Year</label>
            <input id="year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} required />
          </div>
          {error && <span className={formStyles.fieldError}>{error}</span>}
          <div className={listStyles.createActions}>
            <button type="submit" className={formStyles.primaryButton}>
              Create session
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={listStyles.actionsRow}>
          <button type="button" className={filterStyles.addButton} onClick={() => setCreating(true)}>
            + New session
          </button>
        </div>
      )}

      <Panel
        title="Lifecycle timeline"
        hint="Availability → activation → closing, plotted against today"
      >
        <SessionTimelineChart sessions={selectSessionTimeline()} formatDate={formatSessionDateTime} />
      </Panel>

      <Panel title="What each session binds together" hint="Classes, semesters, allocations, and enrollments">
        <HeatmapGrid
          {...selectSessionBindingHeatmap()}
          ariaLabel="Count of classes, semesters, allocations, and enrollments tied to each session"
        />
      </Panel>

      <Panel title="Sessions" hint={`${rows.length} sessions`}>
        <Table columns={columns} rows={rows} rowKey={(row) => String(row.id)} />
      </Panel>
    </DashboardShell>
  );
}
