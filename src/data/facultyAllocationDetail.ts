import type {
  AdminEnrollmentSummary,
  Assessment,
  Attendance,
  CourseAllocationStatus,
  EnrollmentStatus,
  FacultyAllocationDetail,
  FacultyAssessmentChecked,
  Lecture,
  RosterStudentInfo,
} from "../types/api";
import { mockFacultyAllocations, saveFacultyAllocations } from "./facultyAllocations";
import { loadPersisted, persist } from "./localPersistence";

/**
 * Nested mock world for GET /api/faculty/allocations/<id>/ and its four sub-resources
 * (enrollments read-only here; assessments/lectures/attendance full CRUD). Deliberately NOT
 * reconciled with data/studentEnrollments.ts's own mock roster for these same allocation_ids —
 * that file already attributes different faculty identities to 142/156/163 than Faculty's own
 * mock world does (data/facultyProfile.ts's "Marcus Webb"). Same "kept in sync by hand" tension
 * documented elsewhere in this app; this is a fresh, internally-consistent roster for Faculty's
 * own view, invented rather than reconciled, per the same precedent.
 */
const AYESHA: RosterStudentInfo = { image: null, student_id: "NUM-STU-2023-201", first_name: "Ayesha", last_name: "Raza" };
const BILAL: RosterStudentInfo = { image: null, student_id: "NUM-STU-2023-205", first_name: "Bilal", last_name: "Khan" };
const ZARA: RosterStudentInfo = { image: null, student_id: "NUM-STU-2022-118", first_name: "Zara", last_name: "Ahmed" };

/**
 * Allocation 999 exists purely as a scale demo — a 100-student lecture-hall class, Completed with
 * results already computed, so the Results distribution chart (components/charts/
 * ResultsDistributionChart.tsx) has a real roster to beeswarm-pack instead of just 2-3 points.
 * Names cycle deterministically through two fixed pools (20 first × 5 last = 100 unique
 * combinations, no RNG); marks are a fixed, pre-generated array (seeded PRNG, not Math.random, so
 * the "random-looking" spread is actually stable across reloads) approximating a normal
 * distribution around 74/100 — a plausible final-exam spread, not a real statistical claim.
 */
const BIG_CLASS_FIRST_NAMES = [
  "Aiman", "Bilal", "Ceyda", "Danyal", "Elif", "Farhan", "Gulnaz", "Hamza", "Iqra", "Jawad",
  "Kiran", "Laiba", "Musa", "Noreen", "Omar", "Palwasha", "Qasim", "Rida", "Sana", "Talha",
];
const BIG_CLASS_LAST_NAMES = ["Abbasi", "Baig", "Chaudhry", "Durrani", "Effendi"];
const BIG_CLASS_MARKS = [
  92, 76, 83, 72, 64, 61, 66, 71, 88, 81, 76, 80, 100, 71, 68, 65, 79, 76, 83, 66,
  72, 66, 90, 77, 76, 74, 80, 62, 70, 73, 68, 85, 83, 71, 45, 86, 93, 80, 59, 76,
  81, 73, 68, 87, 79, 85, 64, 69, 72, 99, 70, 61, 80, 78, 84, 75, 76, 86, 72, 89,
  60, 82, 62, 75, 68, 65, 74, 58, 85, 66, 64, 63, 80, 71, 77, 74, 58, 63, 60, 82,
  67, 57, 82, 70, 73, 87, 74, 76, 78, 66, 67, 89, 65, 76, 88, 75, 77, 68, 73, 83,
];

const BIG_CLASS_ROSTER: RosterStudentInfo[] = BIG_CLASS_MARKS.map((_, i) => ({
  image: null,
  student_id: `NUM-STU-2024-${500 + i}`,
  first_name: BIG_CLASS_FIRST_NAMES[i % BIG_CLASS_FIRST_NAMES.length],
  last_name: BIG_CLASS_LAST_NAMES[Math.floor(i / BIG_CLASS_FIRST_NAMES.length) % BIG_CLASS_LAST_NAMES.length],
}));

function bigClassGpa(marks: number): number {
  return Math.round(Math.min(4, Math.max(0, (marks / 100) * 4)) * 100) / 100;
}

const BIG_CLASS_ENROLLMENTS: AdminEnrollmentSummary[] = BIG_CLASS_ROSTER.map((student, i) => ({
  urls: `http://localhost:8000/api/admin/enrollments/${6000 + i}/`,
  enrollment_id: 6000 + i,
  student: student.student_id,
  student_info: { student_id: student.student_id, student_name: `${student.first_name} ${student.last_name}` },
  allocation: 999,
  enrollment_date: "2026-08-05",
  status: "Completed",
  result: { result_id: 97000 + i, obtained_marks: BIG_CLASS_MARKS[i], course_gpa: bigClassGpa(BIG_CLASS_MARKS[i]) },
}));

const SEED_ENROLLMENTS_BY_ALLOCATION: Record<number, AdminEnrollmentSummary[]> = {
  999: BIG_CLASS_ENROLLMENTS,
  142: [
    {
      urls: "http://localhost:8000/api/admin/enrollments/5001/",
      enrollment_id: 5001,
      student: AYESHA.student_id,
      student_info: { student_id: AYESHA.student_id, student_name: `${AYESHA.first_name} ${AYESHA.last_name}` },
      allocation: 142,
      enrollment_date: "2026-08-05",
      status: "Active",
      result: null,
    },
    {
      urls: "http://localhost:8000/api/admin/enrollments/5002/",
      enrollment_id: 5002,
      student: BILAL.student_id,
      student_info: { student_id: BILAL.student_id, student_name: `${BILAL.first_name} ${BILAL.last_name}` },
      allocation: 142,
      enrollment_date: "2026-08-05",
      status: "Active",
      result: null,
    },
  ],
  156: [
    {
      urls: "http://localhost:8000/api/admin/enrollments/5003/",
      enrollment_id: 5003,
      student: AYESHA.student_id,
      student_info: { student_id: AYESHA.student_id, student_name: `${AYESHA.first_name} ${AYESHA.last_name}` },
      allocation: 156,
      enrollment_date: "2026-08-05",
      status: "Active",
      result: null,
    },
    {
      urls: "http://localhost:8000/api/admin/enrollments/5004/",
      enrollment_id: 5004,
      student: ZARA.student_id,
      student_info: { student_id: ZARA.student_id, student_name: `${ZARA.first_name} ${ZARA.last_name}` },
      allocation: 156,
      enrollment_date: "2026-08-05",
      status: "Active",
      result: null,
    },
  ],
  163: [
    {
      urls: "http://localhost:8000/api/admin/enrollments/5005/",
      enrollment_id: 5005,
      student: BILAL.student_id,
      student_info: { student_id: BILAL.student_id, student_name: `${BILAL.first_name} ${BILAL.last_name}` },
      allocation: 163,
      enrollment_date: "2026-08-05",
      status: "Completed",
      result: { result_id: 9163, obtained_marks: 88.5, course_gpa: 3.54 },
    },
    {
      urls: "http://localhost:8000/api/admin/enrollments/5006/",
      enrollment_id: 5006,
      student: ZARA.student_id,
      student_info: { student_id: ZARA.student_id, student_name: `${ZARA.first_name} ${ZARA.last_name}` },
      allocation: 163,
      enrollment_date: "2026-08-05",
      status: "Completed",
      result: { result_id: 9164, obtained_marks: 76.25, course_gpa: 3.05 },
    },
  ],
};

function buildAssessmentChecked(
  assessmentId: number,
  enrollments: AdminEnrollmentSummary[],
  obtainedFor: (studentId: string) => number | null,
): FacultyAssessmentChecked[] {
  return enrollments.map((enrollment, index) => ({
    id: assessmentId * 10 + index + 1,
    assessment: assessmentId,
    enrollment: enrollment.enrollment_id,
    obtained: obtainedFor(enrollment.student),
    student_upload: null,
    student_info: enrollment.student === AYESHA.student_id ? AYESHA : enrollment.student === BILAL.student_id ? BILAL : ZARA,
  }));
}

// 142: Ongoing, request pending (not yet admin-confirmed) — Final still ungraded, so neither the
// request nor an "Apply" would be ready even if confirmed. Demonstrates the in-progress state.
const alloc142Assessments: Assessment[] = [
  {
    urls: "http://localhost:8000/api/faculty/allocations/142/assessments/14201/",
    assessment_id: 14201,
    allocation: 142,
    assessment_type: "Quiz",
    assessment_name: "Quiz 1",
    assessment_date: "2026-08-20",
    weightage: 15,
    total_marks: 20,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(14201, SEED_ENROLLMENTS_BY_ALLOCATION[142], (id) =>
      id === AYESHA.student_id ? 17 : 14,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/142/assessments/14202/",
    assessment_id: 14202,
    allocation: 142,
    assessment_type: "Exam",
    assessment_name: "Midterm",
    assessment_date: "2026-09-15",
    weightage: 35,
    total_marks: 50,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(14202, SEED_ENROLLMENTS_BY_ALLOCATION[142], (id) =>
      id === AYESHA.student_id ? 41 : 33,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/142/assessments/14203/",
    assessment_id: 14203,
    allocation: 142,
    assessment_type: "Exam",
    assessment_name: "Final",
    assessment_date: "2026-12-10",
    weightage: 50,
    total_marks: 100,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(14203, SEED_ENROLLMENTS_BY_ALLOCATION[142], () => null),
  },
];

// 156: Ongoing, request confirmed by admin — fully graded, ready for Faculty to hit "Apply".
const alloc156Assessments: Assessment[] = [
  {
    urls: "http://localhost:8000/api/faculty/allocations/156/assessments/15601/",
    assessment_id: 15601,
    allocation: 156,
    assessment_type: "Quiz",
    assessment_name: "Quiz 1",
    assessment_date: "2026-08-18",
    weightage: 15,
    total_marks: 20,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(15601, SEED_ENROLLMENTS_BY_ALLOCATION[156], (id) =>
      id === AYESHA.student_id ? 19 : 16,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/156/assessments/15602/",
    assessment_id: 15602,
    allocation: 156,
    assessment_type: "Exam",
    assessment_name: "Midterm",
    assessment_date: "2026-09-12",
    weightage: 35,
    total_marks: 50,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(15602, SEED_ENROLLMENTS_BY_ALLOCATION[156], (id) =>
      id === AYESHA.student_id ? 45 : 38,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/156/assessments/15603/",
    assessment_id: 15603,
    allocation: 156,
    assessment_type: "Exam",
    assessment_name: "Final",
    assessment_date: "2026-08-14",
    weightage: 50,
    total_marks: 100,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(15603, SEED_ENROLLMENTS_BY_ALLOCATION[156], (id) =>
      id === AYESHA.student_id ? 91 : 79,
    ),
  },
];

// 163: request already applied — allocation is Completed, every field of every assessment is
// read-only, results already computed and written onto the enrollments above.
const alloc163Assessments: Assessment[] = [
  {
    urls: "http://localhost:8000/api/faculty/allocations/163/assessments/16301/",
    assessment_id: 16301,
    allocation: 163,
    assessment_type: "Quiz",
    assessment_name: "Quiz 1",
    assessment_date: "2026-07-05",
    weightage: 15,
    total_marks: 20,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(16301, SEED_ENROLLMENTS_BY_ALLOCATION[163], (id) =>
      id === BILAL.student_id ? 18 : 15,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/163/assessments/16302/",
    assessment_id: 16302,
    allocation: 163,
    assessment_type: "Exam",
    assessment_name: "Midterm",
    assessment_date: "2026-07-15",
    weightage: 35,
    total_marks: 50,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(16302, SEED_ENROLLMENTS_BY_ALLOCATION[163], (id) =>
      id === BILAL.student_id ? 44 : 37,
    ),
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/163/assessments/16303/",
    assessment_id: 16303,
    allocation: 163,
    assessment_type: "Exam",
    assessment_name: "Final",
    assessment_date: "2026-07-25",
    weightage: 50,
    total_marks: 100,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: buildAssessmentChecked(16303, SEED_ENROLLMENTS_BY_ALLOCATION[163], (id) =>
      id === BILAL.student_id ? 90 : 78,
    ),
  },
];

// 999: the 100-student scale demo — one Final Exam assessment whose obtained marks are exactly
// BIG_CLASS_MARKS, so the allocation's computed results match the marks used to build the roster.
const alloc999Assessments: Assessment[] = [
  {
    urls: "http://localhost:8000/api/faculty/allocations/999/assessments/99901/",
    assessment_id: 99901,
    allocation: 999,
    assessment_type: "Exam",
    assessment_name: "Final Exam",
    assessment_date: "2026-08-01",
    weightage: 100,
    total_marks: 100,
    student_submission: false,
    submission_deadline: null,
    assessmentchecked_set: BIG_CLASS_ROSTER.map((student, i) => ({
      id: 999010000 + i,
      assessment: 99901,
      enrollment: 6000 + i,
      obtained: BIG_CLASS_MARKS[i],
      student_upload: null,
      student_info: student,
    })),
  },
];

const SEED_ASSESSMENTS_BY_ALLOCATION: Record<number, Assessment[]> = {
  142: alloc142Assessments,
  156: alloc156Assessments,
  163: alloc163Assessments,
  999: alloc999Assessments,
};

let nextSeedAttendanceId = 700000;

function buildAttendance(
  lectureNo: number,
  attendanceDate: string,
  enrollments: AdminEnrollmentSummary[],
  presentFor: (studentId: string) => boolean,
): Attendance[] {
  return enrollments.map((enrollment) => ({
    id: nextSeedAttendanceId++,
    attendance_date: attendanceDate,
    lecture: lectureNo,
    enrollment: enrollment.enrollment_id,
    is_present: presentFor(enrollment.student),
    student_info: enrollment.student === AYESHA.student_id ? AYESHA : enrollment.student === BILAL.student_id ? BILAL : ZARA,
  }));
}

const SEED_LECTURES_BY_ALLOCATION: Record<number, Lecture[]> = {
  142: [
    {
      urls: "http://localhost:8000/api/faculty/allocations/142/lectures/142-1/",
      lecture_id: "142-1",
      lecture_no: 1,
      allocation: 142,
      starting_time: "2026-08-10T09:00:00Z",
      venue: "Room 204",
      duration: 90,
      topic: "Course introduction",
      attendance_set: buildAttendance(1, "2026-08-10", SEED_ENROLLMENTS_BY_ALLOCATION[142], () => true),
    },
    {
      urls: "http://localhost:8000/api/faculty/allocations/142/lectures/142-2/",
      lecture_id: "142-2",
      lecture_no: 2,
      allocation: 142,
      starting_time: "2026-08-13T09:00:00Z",
      venue: "Room 204",
      duration: 90,
      topic: "Process synchronization",
      attendance_set: buildAttendance(2, "2026-08-13", SEED_ENROLLMENTS_BY_ALLOCATION[142], (id) => id === AYESHA.student_id),
    },
  ],
  156: [
    {
      urls: "http://localhost:8000/api/faculty/allocations/156/lectures/156-1/",
      lecture_id: "156-1",
      lecture_no: 1,
      allocation: 156,
      starting_time: "2026-08-11T11:00:00Z",
      venue: "Room 310",
      duration: 90,
      topic: "Introduction to algorithms",
      attendance_set: buildAttendance(1, "2026-08-11", SEED_ENROLLMENTS_BY_ALLOCATION[156], () => true),
    },
  ],
  163: [
    {
      urls: "http://localhost:8000/api/faculty/allocations/163/lectures/163-1/",
      lecture_id: "163-1",
      lecture_no: 1,
      allocation: 163,
      starting_time: "2026-07-02T08:00:00Z",
      venue: "Room 118",
      duration: 60,
      topic: "Linear equations",
      attendance_set: buildAttendance(1, "2026-07-02", SEED_ENROLLMENTS_BY_ALLOCATION[163], () => true),
    },
  ],
  999: [
    {
      urls: "http://localhost:8000/api/faculty/allocations/999/lectures/999-1/",
      lecture_id: "999-1",
      lecture_no: 1,
      allocation: 999,
      starting_time: "2026-07-20T09:00:00Z",
      venue: "Main Auditorium",
      duration: 90,
      topic: "Final review session",
      attendance_set: BIG_CLASS_ROSTER.map((student, i) => ({
        id: 999020000 + i,
        attendance_date: "2026-07-20",
        lecture: 1,
        enrollment: 6000 + i,
        is_present: i % 6 !== 0,
        student_info: student,
      })),
    },
  ],
};

const mockEnrollmentsByAllocation: Record<number, AdminEnrollmentSummary[]> = loadPersisted(
  "facultyAllocationDetail:enrollments",
  SEED_ENROLLMENTS_BY_ALLOCATION,
);
const mockAssessmentsByAllocation: Record<number, Assessment[]> = loadPersisted(
  "facultyAllocationDetail:assessments",
  SEED_ASSESSMENTS_BY_ALLOCATION,
);
const mockLecturesByAllocation: Record<number, Lecture[]> = loadPersisted(
  "facultyAllocationDetail:lectures",
  SEED_LECTURES_BY_ALLOCATION,
);

function saveEnrollments(): void {
  persist("facultyAllocationDetail:enrollments", mockEnrollmentsByAllocation);
}
function saveAssessments(): void {
  persist("facultyAllocationDetail:assessments", mockAssessmentsByAllocation);
}
function saveLectures(): void {
  persist("facultyAllocationDetail:lectures", mockLecturesByAllocation);
}

/** Finds the highest id already in use across every allocation's list, so freshly-generated ids
 * after a reload continue past whatever was persisted instead of restarting from the seed floor
 * and colliding with records created in an earlier session. */
function maxId<T>(byAllocation: Record<number, T[]>, idOf: (item: T) => number): number {
  let max = 0;
  for (const list of Object.values(byAllocation)) {
    for (const item of list) {
      const id = idOf(item);
      if (id > max) max = id;
    }
  }
  return max;
}

let nextAssessmentId = Math.max(90000, maxId(mockAssessmentsByAllocation, (a) => a.assessment_id) + 1);
let nextCheckedId = Math.max(
  900000,
  maxId(mockAssessmentsByAllocation, (a) => Math.max(0, ...a.assessmentchecked_set.map((c) => c.id))) + 1,
);
let nextAttendanceId = Math.max(
  800000,
  maxId(mockLecturesByAllocation, (l) => Math.max(0, ...l.attendance_set.map((a) => a.id))) + 1,
);

export function getFacultyAllocationDetail(allocationId: number): FacultyAllocationDetail | undefined {
  const base = mockFacultyAllocations.find((a) => a.allocation_id === allocationId);
  if (!base) return undefined;
  return {
    ...base,
    enrollment_set: mockEnrollmentsByAllocation[allocationId] ?? [],
    lecture_set: mockLecturesByAllocation[allocationId] ?? [],
    assessment_set: mockAssessmentsByAllocation[allocationId] ?? [],
  };
}

export function countUngradedForAllocation(allocationId: number): number {
  const assessments = mockAssessmentsByAllocation[allocationId] ?? [];
  return assessments.reduce((sum, a) => sum + a.assessmentchecked_set.filter((c) => c.obtained === null).length, 0);
}

function allocationStatus(allocationId: number): CourseAllocationStatus | undefined {
  return mockFacultyAllocations.find((a) => a.allocation_id === allocationId)?.status;
}

export interface AssessmentFormValue {
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  weightage: number;
  total_marks: number;
  student_submission: boolean;
  submission_deadline: string;
}

/** Mirrors AssessmentListCreateAPIView.create(): weightage sum <=100 across the allocation's
 * assessments, no duplicate type+name pair, student_submission requires a deadline, and one
 * AssessmentChecked row is auto-created per currently-enrolled student. */
export function createAssessment(allocationId: number, input: AssessmentFormValue): Assessment | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — assessments are read-only.";
  const existing = mockAssessmentsByAllocation[allocationId] ?? (mockAssessmentsByAllocation[allocationId] = []);
  const weightageSum = existing.reduce((sum, a) => sum + a.weightage, 0) + input.weightage;
  if (weightageSum > 100) return `Total weightage would be ${weightageSum}% — assessments for one allocation can't exceed 100%.`;
  if (existing.some((a) => a.assessment_type === input.assessment_type && a.assessment_name === input.assessment_name)) {
    return "An assessment with this type and name already exists for this allocation.";
  }
  if (input.student_submission && !input.submission_deadline) {
    return "Submission deadline is required when student submission is enabled.";
  }
  const assessment_id = nextAssessmentId++;
  const roster = mockEnrollmentsByAllocation[allocationId] ?? [];
  const assessment: Assessment = {
    urls: `http://localhost:8000/api/faculty/allocations/${allocationId}/assessments/${assessment_id}/`,
    assessment_id,
    allocation: allocationId,
    assessment_type: input.assessment_type,
    assessment_name: input.assessment_name,
    assessment_date: input.assessment_date,
    weightage: input.weightage,
    total_marks: input.total_marks,
    student_submission: input.student_submission,
    submission_deadline: input.student_submission ? input.submission_deadline : null,
    assessmentchecked_set: roster.map((enrollment, index) => ({
      id: nextCheckedId + index,
      assessment: assessment_id,
      enrollment: enrollment.enrollment_id,
      obtained: null,
      student_upload: null,
      student_info: enrollment.student === AYESHA.student_id ? AYESHA : enrollment.student === BILAL.student_id ? BILAL : ZARA,
    })),
  };
  nextCheckedId += roster.length;
  existing.push(assessment);
  saveAssessments();
  return assessment;
}

export function updateAssessment(
  allocationId: number,
  assessmentId: number,
  patch: Partial<AssessmentFormValue>,
): Assessment | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — assessments are read-only.";
  const existing = mockAssessmentsByAllocation[allocationId] ?? [];
  const assessment = existing.find((a) => a.assessment_id === assessmentId);
  if (!assessment) return "Assessment not found.";
  if (patch.weightage !== undefined) {
    const weightageSum = existing.reduce((sum, a) => sum + (a.assessment_id === assessmentId ? 0 : a.weightage), 0) + patch.weightage;
    if (weightageSum > 100) return `Total weightage would be ${weightageSum}% — assessments for one allocation can't exceed 100%.`;
  }
  const nextStudentSubmission = patch.student_submission ?? assessment.student_submission;
  const nextDeadline = patch.submission_deadline ?? assessment.submission_deadline ?? "";
  if (nextStudentSubmission && !nextDeadline) return "Submission deadline is required when student submission is enabled.";
  Object.assign(assessment, {
    assessment_type: patch.assessment_type ?? assessment.assessment_type,
    assessment_name: patch.assessment_name ?? assessment.assessment_name,
    assessment_date: patch.assessment_date ?? assessment.assessment_date,
    weightage: patch.weightage ?? assessment.weightage,
    total_marks: patch.total_marks ?? assessment.total_marks,
    student_submission: nextStudentSubmission,
    submission_deadline: nextStudentSubmission ? nextDeadline : null,
  });
  saveAssessments();
  return assessment;
}

export function deleteAssessment(allocationId: number, assessmentId: number): void | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — assessments are read-only.";
  const existing = mockAssessmentsByAllocation[allocationId];
  if (!existing) return;
  mockAssessmentsByAllocation[allocationId] = existing.filter((a) => a.assessment_id !== assessmentId);
  saveAssessments();
}

/** Faculty can only ever set `obtained` on a checked row — student_upload stays read-only for
 * Faculty. validate_obtained rejects marks above the assessment's total_marks. */
export function gradeAssessmentChecked(
  allocationId: number,
  assessmentId: number,
  checkedId: number,
  obtained: number | null,
): FacultyAssessmentChecked | string {
  const assessment = (mockAssessmentsByAllocation[allocationId] ?? []).find((a) => a.assessment_id === assessmentId);
  if (!assessment) return "Assessment not found.";
  if (obtained !== null && (obtained < 0 || obtained > assessment.total_marks)) {
    return `Marks must be between 0 and ${assessment.total_marks}.`;
  }
  const checked = assessment.assessmentchecked_set.find((c) => c.id === checkedId);
  if (!checked) return "Roster entry not found.";
  checked.obtained = obtained;
  saveAssessments();
  return checked;
}

export interface LectureFormValue {
  starting_time: string;
  venue: string;
  duration: number;
  topic: string;
}

/** validate_starting_time rejects timestamps in the future. lecture_id/lecture_no are always
 * server-generated; one Attendance row is auto-created per currently-enrolled student. Once the
 * allocation is Completed, lectures and attendance are read-only — same allocation-lifecycle lock
 * already enforced on Assessment. */
export function createLecture(allocationId: number, input: LectureFormValue): Lecture | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — lectures are read-only.";
  if (new Date(input.starting_time).getTime() > Date.now()) return "Starting time can't be in the future.";
  const existing = mockLecturesByAllocation[allocationId] ?? (mockLecturesByAllocation[allocationId] = []);
  const lecture_no = existing.length + 1;
  const lecture_id = `${allocationId}-${lecture_no}`;
  const roster = mockEnrollmentsByAllocation[allocationId] ?? [];
  const lecture: Lecture = {
    urls: `http://localhost:8000/api/faculty/allocations/${allocationId}/lectures/${lecture_id}/`,
    lecture_id,
    lecture_no,
    allocation: allocationId,
    starting_time: input.starting_time,
    venue: input.venue,
    duration: input.duration,
    topic: input.topic,
    attendance_set: roster.map((enrollment, index) => ({
      id: nextAttendanceId + index,
      attendance_date: input.starting_time.slice(0, 10),
      lecture: lecture_no,
      enrollment: enrollment.enrollment_id,
      is_present: false,
      student_info: enrollment.student === AYESHA.student_id ? AYESHA : enrollment.student === BILAL.student_id ? BILAL : ZARA,
    })),
  };
  nextAttendanceId += roster.length;
  existing.push(lecture);
  saveLectures();
  return lecture;
}

export function updateLecture(allocationId: number, lectureId: string, patch: Partial<LectureFormValue>): Lecture | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — lectures are read-only.";
  const existing = mockLecturesByAllocation[allocationId] ?? [];
  const lecture = existing.find((l) => l.lecture_id === lectureId);
  if (!lecture) return "Lecture not found.";
  if (patch.starting_time && new Date(patch.starting_time).getTime() > Date.now()) {
    return "Starting time can't be in the future.";
  }
  Object.assign(lecture, {
    starting_time: patch.starting_time ?? lecture.starting_time,
    venue: patch.venue ?? lecture.venue,
    duration: patch.duration ?? lecture.duration,
    topic: patch.topic ?? lecture.topic,
  });
  saveLectures();
  return lecture;
}

export function deleteLecture(allocationId: number, lectureId: string): void | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — lectures are read-only.";
  const existing = mockLecturesByAllocation[allocationId];
  if (!existing) return;
  mockLecturesByAllocation[allocationId] = existing.filter((l) => l.lecture_id !== lectureId);
  saveLectures();
}

/** Marking attendance means PATCHing the parent Lecture's attendance_set — there's no standalone
 * attendance endpoint. Read-only once the allocation is Completed. */
export function setAttendance(allocationId: number, lectureId: string, enrollmentId: number, isPresent: boolean): void | string {
  if (allocationStatus(allocationId) === "Completed") return "This allocation is Completed — attendance is read-only.";
  const lecture = (mockLecturesByAllocation[allocationId] ?? []).find((l) => l.lecture_id === lectureId);
  if (!lecture) return;
  const row = lecture.attendance_set.find((a) => a.enrollment === enrollmentId);
  if (row) {
    row.is_present = isPresent;
    saveLectures();
  }
}

function computeResultForEnrollment(enrollmentId: number, assessments: Assessment[]): { obtained_marks: number; course_gpa: number } {
  let percentTotal = 0;
  for (const assessment of assessments) {
    const checked = assessment.assessmentchecked_set.find((c) => c.enrollment === enrollmentId);
    const obtained = checked?.obtained ?? 0;
    percentTotal += (obtained / assessment.total_marks) * assessment.weightage;
  }
  const obtained_marks = Math.round(percentTotal * 100) / 100;
  const course_gpa = Math.round(Math.min(4, Math.max(0, (obtained_marks / 100) * 4)) * 100) / 100;
  return { obtained_marks, course_gpa };
}

let nextResultId = Math.max(950000, maxId(mockEnrollmentsByAllocation, (e) => e.result?.result_id ?? 0) + 1);

/**
 * Faculty Request detail page's "Apply" action once a result_calculation request is confirmed:
 * blocks if any AssessmentChecked.obtained is still null (same "ungraded blocks the action"
 * pattern as semester-closing/transcript-generation), otherwise writes obtained_marks/course_gpa
 * onto every enrollment, marks each Completed, and flips the allocation itself to Completed.
 */
export function applyResultCalculation(allocationId: number): AdminEnrollmentSummary[] | string {
  const ungraded = countUngradedForAllocation(allocationId);
  if (ungraded > 0) {
    return `${ungraded} assessment mark(s) are still ungraded — grade every student before applying result calculation.`;
  }
  const assessments = mockAssessmentsByAllocation[allocationId] ?? [];
  const enrollments = mockEnrollmentsByAllocation[allocationId] ?? [];
  for (const enrollment of enrollments) {
    const { obtained_marks, course_gpa } = computeResultForEnrollment(enrollment.enrollment_id, assessments);
    enrollment.result = { result_id: nextResultId++, obtained_marks, course_gpa };
    enrollment.status = "Completed" as EnrollmentStatus;
  }
  const allocation = mockFacultyAllocations.find((a) => a.allocation_id === allocationId);
  if (allocation) allocation.status = "Completed";
  saveEnrollments();
  saveFacultyAllocations();
  return enrollments;
}
