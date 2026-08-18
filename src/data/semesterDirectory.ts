import type { SemesterStatus } from "../types/api";
import { classLabel, mockClasses } from "./classDirectory";

export interface SemesterRef {
  classId: number;
  classLabel: string;
  semesterId: number;
  semesterNo: number;
  status: SemesterStatus;
  session: number | null;
  courseCodes: string[];
}

/** Flattens every semester embedded in every class's scheme_of_studies — the same underlying
 * Semester rows SemesterClassSerializer nests inside Class, just re-shaped as a flat list. This is
 * the canonical semester data source; allocationDirectory.ts imports semesterRefById from here
 * rather than keeping its own copy. */
export function allSemesterRefs(): SemesterRef[] {
  return mockClasses.flatMap((c) =>
    (c.scheme_of_studies ?? []).map((s) => ({
      classId: c.class_id,
      classLabel: classLabel(c),
      semesterId: s.semester_id,
      semesterNo: s.semester_no,
      status: s.status,
      session: s.session,
      courseCodes: s.semesterdetails_set.map((d) => d.course).filter((code): code is string => code !== null),
    })),
  );
}

export function semesterRefById(semesterId: number): SemesterRef | undefined {
  return allSemesterRefs().find((s) => s.semesterId === semesterId);
}

/** Mirrors SemesterSerializer's `session` field — writable through this endpoint too (not just
 * through Class's scheme_of_studies), gated by the same isSessionLocked() rule below. Mutates the
 * same underlying Semester row classDirectory.ts's scheme_of_studies embeds. */
export function setSemesterSession(semesterId: number, session: number | null): boolean {
  for (const c of mockClasses) {
    const semester = c.scheme_of_studies?.find((s) => s.semester_id === semesterId);
    if (semester) {
      semester.session = session;
      return true;
    }
  }
  return false;
}

interface SemesterLifecycle {
  activation_deadline: string | null;
  closing_deadline: string | null;
}

/**
 * The two fields SemesterClassSerializer (Class's nested "scheme of studies" view) never exposes,
 * but the standalone SemesterSerializer (GET/PUT/PATCH /api/admin/semesters/) does — keyed by the
 * same semester_id space as classDirectory.ts's embedded scheme_of_studies entries, an additive
 * companion store rather than a duplicate (core fields stay owned by classDirectory.ts, read via
 * allSemesterRefs()/semesterRefById() above).
 *
 * Semesters 1 & 2 (CS-BS-2023, session 3/Fall 2025, both "Completed") are seeded fully historical —
 * both deadlines set and past, and semester 1 already has a generated Transcript (see
 * data/transcriptDirectory.ts) — attempting to generate again there demonstrates the real
 * "Transcripts already exists" block (BulkTranscriptSerializer.create() checking status=='Completed').
 * Semester 3 (session 1/Fall 2026, "Active") has activation_deadline set and past, and a
 * closing_deadline already set too (needed for transcript_generation_url to appear) — but a seeded
 * allocation/enrollment there is deliberately left ungraded, so both re-submitting its closing
 * deadline AND generating transcripts demonstrate the real "still has ungraded enrollments" block.
 * Semester 9 (SE-BS-2024's first semester, session 4/Spring 2028 "Initiated") is deliberately left
 * with no activation_deadline — the one semester in this mock with no sibling Active/scheduled
 * semester in its class, so it's free to demonstrate successfully setting one.
 */
const lifecycle = new Map<number, SemesterLifecycle>([
  [1, { activation_deadline: "2025-08-01T00:00:00Z", closing_deadline: "2025-12-20T00:00:00Z" }],
  [2, { activation_deadline: "2025-08-01T00:00:00Z", closing_deadline: "2025-12-20T00:00:00Z" }],
  [3, { activation_deadline: "2026-08-01T00:00:00Z", closing_deadline: "2026-12-20T00:00:00Z" }],
]);

export function getSemesterLifecycle(semesterId: number): SemesterLifecycle {
  return lifecycle.get(semesterId) ?? { activation_deadline: null, closing_deadline: null };
}

export interface AdminSemesterView extends SemesterRef, SemesterLifecycle {}

export function selectAllSemesters(): AdminSemesterView[] {
  return allSemesterRefs().map((ref) => ({ ...ref, ...getSemesterLifecycle(ref.semesterId) }));
}

export function getSemesterView(semesterId: number): AdminSemesterView | undefined {
  const ref = semesterRefById(semesterId);
  return ref ? { ...ref, ...getSemesterLifecycle(semesterId) } : undefined;
}

/** Mirrors SemesterSerializer.get_extra_kwargs(): activation_deadline (and, once set and past,
 * session) becomes read-only once activation_deadline has actually passed. */
export function isActivationDeadlineLocked(view: AdminSemesterView): boolean {
  return view.activation_deadline !== null && new Date(view.activation_deadline) < new Date();
}

export const isSessionLocked = isActivationDeadlineLocked;

/** Mirrors the same get_extra_kwargs(): closing_deadline is locked with no activation_deadline set
 * at all, and also locked while activation_deadline is set but still future and status is still
 * Inactive (can't close a semester that hasn't activated yet). */
export function isClosingDeadlineLocked(view: AdminSemesterView): boolean {
  if (!view.activation_deadline) return true;
  const activationPassed = new Date(view.activation_deadline) < new Date();
  if (!activationPassed && view.status === "Inactive") return true;
  return false;
}

/** Mirrors validate_activation_deadline/validate_closing_deadline — both reject past dates and,
 * per the real backend, anything less than 7 minutes out (a very tight window, likely a bug in
 * that code, reproduced here rather than silently loosened). */
function validateDeadline(iso: string): string | null {
  const value = new Date(iso);
  const now = new Date();
  if (value < now) return "Deadline cannot be in the past.";
  if (value.getTime() - now.getTime() < 7 * 60 * 1000) return "Deadline must be at least a few minutes from now.";
  return null;
}

export const validateSemesterActivationDeadline = validateDeadline;
export const validateSemesterClosingDeadline = validateDeadline;

/** Mirrors SemesterSerializer.update()'s conflict check when setting activation_deadline: a class
 * can only have one semester that's Active, or Inactive-but-already-scheduled-to-activate, at a
 * time. */
export function activationConflict(semesterId: number): string | null {
  const view = getSemesterView(semesterId);
  if (!view) return null;
  const conflict = selectAllSemesters().find(
    (s) =>
      s.classId === view.classId &&
      s.semesterId !== semesterId &&
      (s.status === "Active" || (s.status === "Inactive" && s.activation_deadline !== null)),
  );
  if (!conflict) return null;
  const state = conflict.status === "Active" ? "active" : "scheduled to activate";
  return `${view.classLabel} already has Semester ${conflict.semesterNo} ${state} — only one semester per class can be active or activating at a time.`;
}

export function setSemesterActivationDeadline(semesterId: number, iso: string): AdminSemesterView | string {
  const view = getSemesterView(semesterId);
  if (!view) return "Semester not found.";
  if (isActivationDeadlineLocked(view)) return "Activation deadline is locked.";
  const validationError = validateSemesterActivationDeadline(iso);
  if (validationError) return validationError;
  const conflict = activationConflict(semesterId);
  if (conflict) return conflict;
  lifecycle.set(semesterId, { ...getSemesterLifecycle(semesterId), activation_deadline: iso });
  return getSemesterView(semesterId)!;
}

/**
 * `ungradedCount` is supplied by the caller (see pages/SemesterDetailPage.tsx) instead of being
 * looked up in here, so this module doesn't need to import allocationDirectory.ts/
 * enrollmentDirectory.ts — both of which already import semester data from this module, and a
 * reverse import would cycle. Mirrors SemesterSerializer.update()'s check that every enrollment
 * under this semester's allocations already has a Result with a course_gpa set.
 */
export function setSemesterClosingDeadline(semesterId: number, iso: string, ungradedCount: number): AdminSemesterView | string {
  const view = getSemesterView(semesterId);
  if (!view) return "Semester not found.";
  if (isClosingDeadlineLocked(view)) return "Closing deadline is locked.";
  const validationError = validateSemesterClosingDeadline(iso);
  if (validationError) return validationError;
  if (ungradedCount > 0) {
    return `${ungradedCount} enrollment(s) under this semester still need a result before it can be closed.`;
  }
  lifecycle.set(semesterId, { ...getSemesterLifecycle(semesterId), closing_deadline: iso });
  return getSemesterView(semesterId)!;
}
