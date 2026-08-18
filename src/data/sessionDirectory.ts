import type { AdminSession, SessionPeriod, SessionStatus } from "../types/api";
import type { SessionListRow, StatusTone } from "../types/dashboard";

/**
 * Stand-in for GET /api/admin/sessions/. Four sessions spanning the real lifecycle so every
 * detail-page action has something to demonstrate: Fall 2026 is Active (so its closing-deadline
 * field is unlocked), Spring 2027 is untouched Inactive (so activation is still open), Fall 2025
 * is Completed (historical, everything locked), and Spring 2028 is Initiated — the narrow window
 * CourseAllocationSerializer.get_fields() requires a semester's session to be in before that
 * semester can be picked for a new allocation (see data/allocationDirectory.ts).
 */
export const mockSessions: AdminSession[] = [
  {
    url: "/api/admin/sessions/1/",
    id: 1,
    period: "Fall",
    year: 2026,
    status: "Active",
    activation_deadline: "2026-08-01T00:00:00Z",
    availability_delta: 7,
    availability_deadline: "2026-07-25T00:00:00Z",
    closing_deadline: null,
  },
  {
    url: "/api/admin/sessions/2/",
    id: 2,
    period: "Spring",
    year: 2027,
    status: "Inactive",
    activation_deadline: null,
    availability_delta: 7,
    availability_deadline: null,
    closing_deadline: null,
  },
  {
    url: "/api/admin/sessions/3/",
    id: 3,
    period: "Fall",
    year: 2025,
    status: "Completed",
    activation_deadline: "2025-08-01T00:00:00Z",
    availability_delta: 7,
    availability_deadline: "2025-07-25T00:00:00Z",
    closing_deadline: "2025-12-20T00:00:00Z",
  },
  {
    url: "/api/admin/sessions/4/",
    id: 4,
    period: "Spring",
    year: 2028,
    status: "Initiated",
    activation_deadline: "2026-08-30T00:00:00Z",
    availability_delta: 7,
    availability_deadline: "2026-08-23T00:00:00Z",
    closing_deadline: null,
  },
];

export const SESSION_PERIODS: SessionPeriod[] = ["Fall", "Spring"];

/** Minimum time a session must run before it can be closed — a UI-only guard rail, not enforced
 * anywhere in SessionSerializer (which only checks status == 'Active'). Requested explicitly;
 * flagging here since it's stricter than what the real API would currently accept. */
const CLOSING_MIN_WEEKS_AFTER_ACTIVATION = 12;

export const SESSION_STATUS_TONE: Record<SessionStatus, StatusTone> = {
  Inactive: "warning",
  Initiated: "warning",
  Available: "good",
  Active: "good",
  Completed: "critical",
};

export function formatSessionDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function selectSessionListRows(sessions: AdminSession[]): SessionListRow[] {
  return sessions.map((s) => ({
    id: s.id,
    label: `${s.period} ${s.year}`,
    status: { label: s.status, tone: SESSION_STATUS_TONE[s.status] },
    activationDeadline: s.activation_deadline,
    availabilityDeadline: s.availability_deadline,
    closingDeadline: s.closing_deadline,
    detailHref: `/admin/sessions/${s.id}`,
  }));
}

export function getSessionById(id: number): AdminSession | undefined {
  return mockSessions.find((s) => s.id === id);
}

function computeAvailabilityDeadline(activationDeadline: string | null, availabilityDelta: number): string | null {
  if (!activationDeadline) return null;
  const d = new Date(activationDeadline);
  d.setUTCDate(d.getUTCDate() - availabilityDelta);
  return d.toISOString();
}

/** The moment closing_deadline unlocks under the UI-only 12-week rule above — null if the
 * session hasn't activated yet at all. */
export function closingUnlocksAt(activationDeadline: string | null): string | null {
  if (!activationDeadline) return null;
  const d = new Date(activationDeadline);
  d.setUTCDate(d.getUTCDate() + CLOSING_MIN_WEEKS_AFTER_ACTIVATION * 7);
  return d.toISOString();
}

/** Real rule (SessionSerializer.get_extra_kwargs) is just status == 'Active'. This adds the
 * requested UI-only tightening: Active isn't enough on its own — activation must also have
 * happened at least 12 weeks ago. */
export function isClosingDeadlineUnlocked(session: AdminSession): boolean {
  if (session.status !== "Active" || !session.activation_deadline) return false;
  const unlocksAt = closingUnlocksAt(session.activation_deadline);
  return unlocksAt !== null && new Date() >= new Date(unlocksAt);
}

/** Real rule (SessionSerializer) is: no restriction on `period` at all, ever. This adds the
 * requested UI-only lock: once activation_deadline has been set (session.activation_deadline !=
 * null), the term identity can no longer be changed here. */
export function isPeriodLocked(session: AdminSession): boolean {
  return session.activation_deadline !== null;
}

/** Mirrors SessionSerializer.validate_year — only enforced on create; year is read_only on update. */
export function validateSessionYear(year: number): string | null {
  if (year < new Date().getFullYear()) return "Year cannot be in the past.";
  return null;
}

/** Mirrors SessionSerializer.validate_activation_deadline. */
export function validateActivationDeadline(iso: string): string | null {
  const value = new Date(iso);
  const now = new Date();
  if (value < now) return "Activation deadline cannot be in the past.";
  const fourWeeksOut = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  if (value > fourWeeksOut) return "Activation deadline cannot be more than 4 weeks in the future.";
  return null;
}

/** Mirrors SessionSerializer.validate_closing_deadline. */
export function validateClosingDeadline(iso: string, activationDeadline: string | null): string | null {
  const value = new Date(iso);
  if (value < new Date()) return "Closing deadline cannot be in the past.";
  if (activationDeadline && value <= new Date(activationDeadline)) {
    return "Closing deadline must be after the activation deadline.";
  }
  return null;
}

/** Stand-in for POST /api/admin/sessions/ — period and year only. availability_delta has a
 * model default of 7 (AcademicSession.availability_delta) and no create-time reason to set
 * up front — it's freely editable later. activation_deadline/closing_deadline are technically
 * acceptable on create too (Meta has no create-time read_only on them), but SessionSerializer
 * doesn't override create(), so setting them here would NOT trigger the Initiated-status/
 * task-scheduling side effect that only update() has — so this deliberately only exposes the
 * two fields that make sense to set before the session exists. */
export function createSession(period: SessionPeriod, year: number): AdminSession {
  const nextId = mockSessions.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  const record: AdminSession = {
    url: `/api/admin/sessions/${nextId}/`,
    id: nextId,
    period,
    year,
    status: "Inactive",
    activation_deadline: null,
    availability_delta: 7,
    availability_deadline: null,
    closing_deadline: null,
  };
  mockSessions.push(record);
  return record;
}

/** Stand-in for PATCH /api/admin/sessions/<id>/ with only period — real SessionSerializer has no
 * read_only rule for this field at all, so this would genuinely succeed server-side even after
 * activation; isPeriodLocked() above is what actually gates the UI control, this setter just
 * mirrors that same guard defensively. */
export function setSessionPeriod(id: number, period: SessionPeriod): AdminSession | undefined {
  const session = getSessionById(id);
  if (!session || isPeriodLocked(session)) return undefined;
  session.period = period;
  return session;
}

/** Stand-in for PATCH /api/admin/sessions/<id>/ with activation_deadline — forces status to
 * 'Initiated' synchronously; session_availability_task/session_activation_task (not modeled here,
 * no scheduler in this mock) are what later move it to 'Available' then 'Active' once those
 * moments actually arrive. */
export function setSessionActivationDeadline(id: number, activationDeadline: string): AdminSession | undefined {
  const session = getSessionById(id);
  if (!session) return undefined;
  session.activation_deadline = activationDeadline;
  session.availability_deadline = computeAvailabilityDeadline(activationDeadline, session.availability_delta);
  session.status = "Initiated";
  return session;
}

/** Stand-in for PATCH /api/admin/sessions/<id>/ with only availability_delta — the plain
 * super().update() fallback path, only reachable when activation_deadline/closing_deadline
 * aren't also in the payload. */
export function setSessionAvailabilityDelta(id: number, availabilityDelta: number): AdminSession | undefined {
  const session = getSessionById(id);
  if (!session) return undefined;
  session.availability_delta = availabilityDelta;
  session.availability_deadline = computeAvailabilityDeadline(session.activation_deadline, availabilityDelta);
  return session;
}

/** Stand-in for PATCH /api/admin/sessions/<id>/ with closing_deadline. Real gate is just
 * status == 'Active' (get_extra_kwargs); isClosingDeadlineUnlocked() above adds the requested
 * UI-only 12-weeks-since-activation tightening on top of that. */
export function setSessionClosingDeadline(id: number, closingDeadline: string): AdminSession | undefined {
  const session = getSessionById(id);
  if (!session || !isClosingDeadlineUnlocked(session)) return undefined;
  session.closing_deadline = closingDeadline;
  return session;
}
