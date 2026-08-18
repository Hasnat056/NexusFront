import { useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import {
  SESSION_PERIODS,
  SESSION_STATUS_TONE,
  closingUnlocksAt,
  formatSessionDateTime,
  getSessionById,
  isClosingDeadlineUnlocked,
  isPeriodLocked,
  setSessionActivationDeadline,
  setSessionAvailabilityDelta,
  setSessionClosingDeadline,
  setSessionPeriod,
  validateActivationDeadline,
  validateClosingDeadline,
} from "../data/sessionDirectory";
import type { SessionPeriod } from "../types/api";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";

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

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" with no timezone — this is local time, same as
 * what the input will hand back on change. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = id ? getSessionById(Number(id)) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [periodInput, setPeriodInput] = useState<SessionPeriod>(() => session?.period ?? "Fall");
  const [activationInput, setActivationInput] = useState(() => toLocalInputValue(session?.activation_deadline ?? null));
  const [deltaInput, setDeltaInput] = useState(() => String(session?.availability_delta ?? 7));
  const [closingInput, setClosingInput] = useState(() => toLocalInputValue(session?.closing_deadline ?? null));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  if (!session) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="sessions"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Session"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Sessions", href: "/admin/sessions" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Session {id} was not found.</p>
      </DashboardShell>
    );
  }

  function handleSetPeriod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSessionPeriod(session!.id, periodInput);
    setMessage("Term updated.");
    setTick((t) => t + 1);
  }

  function handleSetActivation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const iso = new Date(activationInput).toISOString();
    const validationError = validateActivationDeadline(iso);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSessionActivationDeadline(session!.id, iso);
    setMessage("Activation deadline set — status moved to Initiated. Availability and activation happen automatically at those times.");
    setTick((t) => t + 1);
  }

  function handleSetDelta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSessionAvailabilityDelta(session!.id, Number(deltaInput) || 0);
    setMessage("Availability window updated.");
    setTick((t) => t + 1);
  }

  function handleSetClosing(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const iso = new Date(closingInput).toISOString();
    const validationError = validateClosingDeadline(iso, session!.activation_deadline);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSessionClosingDeadline(session!.id, iso);
    setMessage("Closing deadline set.");
    setTick((t) => t + 1);
  }

  const periodLocked = isPeriodLocked(session);
  const closingUnlocked = isClosingDeadlineUnlocked(session);
  const closingUnlockDate = closingUnlocksAt(session.activation_deadline);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="sessions"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Session"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Sessions", href: "/admin/sessions" },
          { label: `${session.period} ${session.year}` },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>
            {session.period} {session.year}
          </h1>
          <p className={detailStyles.subline}>Session #{session.id}</p>
        </div>
        <Tag tone={SESSION_STATUS_TONE[session.status]}>{session.status}</Tag>
      </div>

      <Panel title="Term">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetPeriod}>
            <div className={formStyles.field}>
              <label htmlFor="period">Period</label>
              <select
                id="period"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value as SessionPeriod)}
                disabled={periodLocked}
              >
                {SESSION_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label>Year</label>
              <input value={session.year} readOnly />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.secondaryButton} disabled={periodLocked}>
                Save term
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            {periodLocked
              ? "Period is locked once an activation deadline has been set (a guard rail added in this app — SessionSerializer itself never restricts period)."
              : "Year is locked as soon as this session exists (SessionSerializer.get_extra_kwargs) — only settable at creation."}
          </span>
        </div>
      </Panel>

      <Panel title="Availability window">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetDelta}>
            <div className={formStyles.field}>
              <label htmlFor="availability_delta">Days before activation</label>
              <input
                id="availability_delta"
                inputMode="numeric"
                value={deltaInput}
                onChange={(e) => setDeltaInput(e.target.value)}
              />
            </div>
            <div className={formStyles.field}>
              <label>Availability deadline (computed)</label>
              <input value={formatSessionDateTime(session.availability_deadline)} readOnly />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.secondaryButton}>
                Save window
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <Panel title="Activation">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetActivation}>
            <div className={formStyles.field}>
              <label htmlFor="activation_deadline">Activation deadline</label>
              <input
                id="activation_deadline"
                type="datetime-local"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton}>
                Set activation deadline
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            Submitting forces status to Initiated immediately. session_availability_task (at the
            availability deadline) and session_activation_task (at the activation deadline) run
            server-side afterwards to move it to Available then Active — not modeled here since
            there's no scheduler in this mock.
          </span>
        </div>
      </Panel>

      <Panel title="Closing">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetClosing}>
            <div className={formStyles.field}>
              <label htmlFor="closing_deadline">Closing deadline</label>
              <input
                id="closing_deadline"
                type="datetime-local"
                value={closingInput}
                onChange={(e) => setClosingInput(e.target.value)}
                readOnly={!closingUnlocked}
                disabled={!closingUnlocked}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton} disabled={!closingUnlocked}>
                Set closing deadline
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            {closingUnlocked
              ? "Submitting schedules session_closing_task, which moves status to Completed at this deadline."
              : session.status !== "Active"
                ? "Locked until the session's status is Active (SessionSerializer marks closing_deadline read_only otherwise)."
                : `Locked for 12 weeks after activation (a guard rail added in this app, on top of the real Active-only check) — unlocks ${formatSessionDateTime(closingUnlockDate)}.`}
          </span>
        </div>
      </Panel>
    </DashboardShell>
  );
}
