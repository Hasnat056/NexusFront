import type { EnrollmentCreateAllocation } from "../types/api";
import { loadPersisted, persist } from "./localPersistence";

/**
 * Stands in for probing GET /api/student/enrollments/create/ and getting 200
 * instead of 403 — the endpoint's permission class 403s the whole request
 * when the enrollment-window cache key isn't set. The real gate is
 * `session.status == 'Available'` (StudentEnrollmentCreatePermission), which
 * only session_availability_task/session_activation_task can set, and neither
 * is modeled here (see data/sessionDirectory.ts's doc comment on
 * setSessionActivationDeadline — "no scheduler in this mock") — none of the
 * seed sessions ever reaches 'Available' on its own. So unlike every other
 * mock flag in this app, this one has no real trigger to mirror; it's plain
 * mutable+persisted state with a manual dev toggle (see
 * setEnrollmentWindowOpen) so the closed-window dashboard is actually
 * reachable through the UI instead of only by hand-editing this file.
 */
const enrollmentWindowState = { open: loadPersisted("enrollmentWindowOpen", true) };

export function isEnrollmentWindowOpen(): boolean {
  return enrollmentWindowState.open;
}

export function setEnrollmentWindowOpen(open: boolean): void {
  enrollmentWindowState.open = open;
  persist("enrollmentWindowOpen", open);
}

/**
 * Shaped like GET /api/student/enrollments/create/ once the window is open.
 * faculty_data reuses three real faculty from data/facultyDirectory.ts (Marcus
 * Webb, Sana Ahmed, Javeria Khan); NUM-CS-2020-045 for SE-2201 doesn't have a
 * matching admin-directory row, same "faculty not yet browsed in this demo"
 * gap as elsewhere in the app — the real payload embeds this data inline, no
 * client join required. course_data deliberately avoids CS-3102/CS-4210/
 * MATH-2210 — data/studentEnrollments.ts already has this student Active in
 * those this semester, and once mockActiveEnrollmentsResponse() merges a
 * confirmed pick in as Active, reusing one of those codes would show as a
 * confusing duplicate course card. CS-4301/CS-4415/MATH-4210 aren't in
 * data/courseDirectory.ts (same inline-embed reasoning as the faculty gap).
 */
const SEED_ENROLLMENT_CREATE_ALLOCATIONS: EnrollmentCreateAllocation[] = [
  {
    allocation_id: 221,
    confirm: false,
    faculty_data: { faculty_id: "NUM-CS-2019-008", faculty_name: "Marcus Webb" },
    course_data: { course_code: "CS-4301", course_name: "Artificial Intelligence", credit_hours: 3, lab: false },
  },
  {
    allocation_id: 244,
    confirm: true,
    faculty_data: { faculty_id: "NUM-CS-2019-008", faculty_name: "Marcus Webb" },
    course_data: { course_code: "CS-4415", course_name: "Compiler Construction", credit_hours: 3, lab: true },
  },
  {
    allocation_id: 256,
    confirm: false,
    faculty_data: { faculty_id: "NUM-CS-2020-045", faculty_name: "Rehan Farooq" },
    course_data: { course_code: "SE-2201", course_name: "Software Engineering Principles", credit_hours: 3, lab: false },
  },
  {
    allocation_id: 267,
    confirm: true,
    faculty_data: { faculty_id: "NUM-EE-2021-014", faculty_name: "Sana Ahmed" },
    course_data: { course_code: "EE-2101", course_name: "Circuit Analysis", credit_hours: 4, lab: true },
  },
  {
    allocation_id: 279,
    confirm: false,
    faculty_data: { faculty_id: "NUM-MATH-2016-002", faculty_name: "Javeria Khan" },
    course_data: { course_code: "MATH-4210", course_name: "Numerical Methods", credit_hours: 3, lab: false },
  },
];

export const mockEnrollmentCreateAllocations: EnrollmentCreateAllocation[] = loadPersisted(
  "enrollmentCreateAllocations",
  SEED_ENROLLMENT_CREATE_ALLOCATIONS,
);

function saveEnrollmentCreateAllocations(): void {
  persist("enrollmentCreateAllocations", mockEnrollmentCreateAllocations);
}

/**
 * Mirrors StudentEnrollmentCreateAPIView.post(): the real endpoint POSTs the
 * full {allocation_id, confirm}[] list, and StudentEnrollmentCreateSerializerB.
 * create() only actually touches the DB — Enrollment.objects.create()/.delete()
 * — for rows whose confirm flips relative to the existing Enrollment row
 * (status='Inactive' == "confirmed" here, since this mock has no separate
 * Enrollment table backing these picks — `confirm` on this array IS that
 * state). The view's returned count only adds for newly-created enrollments
 * (`return_count != -1`); a withdrawal returns count=-1 and is deliberately
 * excluded from the total, and the response string is always "courses"
 * (never singular) — both quirks kept as-is for fidelity.
 */
export function submitEnrollmentSelections(confirmedIds: ReadonlySet<number>): string {
  let count = 0;
  for (const allocation of mockEnrollmentCreateAllocations) {
    const nowConfirmed = confirmedIds.has(allocation.allocation_id);
    if (allocation.confirm !== nowConfirmed) {
      allocation.confirm = nowConfirmed;
      if (nowConfirmed) count += 1;
    }
  }
  saveEnrollmentCreateAllocations();
  return `${count} courses enrolled successfully`;
}
