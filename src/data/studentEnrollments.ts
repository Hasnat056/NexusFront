import type {
  EnrollmentStatus,
  FacultyDetails,
  StudentAssessment,
  StudentEnrollment,
  StudentEnrollmentsResponse,
} from "../types/api";
import type { CourseCardData, StatusTone } from "../types/dashboard";
import { mockEnrollmentCreateAllocations } from "./enrollmentCreate";
import { mockCurrentSession } from "./session";

/**
 * Shaped like GET /api/student/enrollments/?status=Active — paginated
 * (PAGE_SIZE=10), nested allocation_details per StudentEnrollmentSerializer's
 * chain. submission_deadline only appears on assessments still in the future
 * (see StudentAssessment doc comment in types/api.ts); assessmentchecked_set
 * is a single object (or null), not an array.
 */
export const mockStudentEnrollmentsResponse: StudentEnrollmentsResponse = {
  count: 5,
  next: null,
  previous: null,
  results: [
    {
      url: "http://localhost:8000/api/student/enrollments/4471/",
      enrollment_id: 4471,
      student: "NUM-STU-2023-114",
      allocation: 142,
      status: "Active",
      allocation_details: {
        faculty_details: { teacher_id: "NUM-FAC-2019-231", first_name: "Amara", last_name: "Osei" },
        course_details: {
          course_code: "CS-3102",
          course_name: "Operating Systems",
          credit_hours: 3,
          lab: false,
          pre_requisite: "CS-2101",
        },
        semester_id: 9,
        session: "Fall 2026",
        assessment_set: [
          {
            assessment_id: 8801,
            assessment_type: "Assignment",
            assessment_name: "Assignment 2 — Scheduling",
            assessment_date: "2026-10-14",
            total_marks: 20,
            submission_deadline: "2026-10-14T23:59:00Z",
            assessmentchecked_set: {
              urls: "http://localhost:8000/api/student/enrollments/4471/assessments/8801/file-upload/305/",
              id: 305,
              assessment: 8801,
              enrollment: 4471,
              obtained: null,
              student_upload: null,
            },
          },
          {
            assessment_id: 8790,
            assessment_type: "Quiz",
            assessment_name: "Quiz 1",
            assessment_date: "2026-07-20",
            total_marks: 20,
            assessmentchecked_set: {
              urls: "http://localhost:8000/api/student/enrollments/4471/assessments/8790/file-upload/301/",
              id: 301,
              assessment: 8790,
              enrollment: 4471,
              obtained: 17,
              student_upload: null,
            },
          },
        ],
      },
    },
    {
      url: "http://localhost:8000/api/student/enrollments/4472/",
      enrollment_id: 4472,
      student: "NUM-STU-2023-114",
      allocation: 156,
      status: "Active",
      allocation_details: {
        faculty_details: { teacher_id: "NUM-FAC-2020-062", first_name: "Naveen", last_name: "Rao" },
        course_details: {
          course_code: "CS-4210",
          course_name: "Distributed Systems",
          credit_hours: 3,
          lab: true,
          pre_requisite: "CS-3102",
        },
        semester_id: 9,
        session: "Fall 2026",
        assessment_set: [
          {
            assessment_id: 8812,
            assessment_type: "Project",
            assessment_name: "Project proposal",
            assessment_date: "2026-10-21",
            total_marks: 50,
            submission_deadline: "2026-10-21T23:59:00Z",
            assessmentchecked_set: null,
          },
          {
            assessment_id: 8795,
            assessment_type: "Exam",
            assessment_name: "Midterm",
            assessment_date: "2026-07-25",
            total_marks: 100,
            assessmentchecked_set: {
              urls: "http://localhost:8000/api/student/enrollments/4472/assessments/8795/file-upload/312/",
              id: 312,
              assessment: 8795,
              enrollment: 4472,
              obtained: null,
              student_upload: "https://res.cloudinary.com/nexus/midterm-4472.pdf",
            },
          },
        ],
      },
    },
    {
      url: "http://localhost:8000/api/student/enrollments/4473/",
      enrollment_id: 4473,
      student: "NUM-STU-2023-114",
      allocation: 163,
      status: "Active",
      allocation_details: {
        faculty_details: { teacher_id: "NUM-FAC-2018-019", first_name: "Elena", last_name: "Popescu" },
        course_details: {
          course_code: "MATH-2210",
          course_name: "Linear Algebra",
          credit_hours: 3,
          lab: false,
          pre_requisite: null,
        },
        semester_id: 9,
        session: "Fall 2026",
        assessment_set: [
          {
            assessment_id: 8820,
            assessment_type: "Assignment",
            assessment_name: "Problem set 4",
            assessment_date: "2026-07-18",
            total_marks: 20,
            assessmentchecked_set: null,
          },
        ],
      },
    },
    {
      url: "http://localhost:8000/api/student/enrollments/4474/",
      enrollment_id: 4474,
      student: "NUM-STU-2023-114",
      allocation: 171,
      status: "Active",
      allocation_details: {
        faculty_details: { teacher_id: "NUM-FAC-2021-004", first_name: "Priya", last_name: "Shah" },
        course_details: {
          course_code: "ENG-1101",
          course_name: "Technical Writing",
          credit_hours: 2,
          lab: false,
          pre_requisite: null,
        },
        semester_id: 9,
        session: "Fall 2026",
        assessment_set: [
          {
            assessment_id: 8830,
            assessment_type: "Assignment",
            assessment_name: "Essay 2",
            assessment_date: "2026-07-22",
            total_marks: 20,
            assessmentchecked_set: {
              urls: "http://localhost:8000/api/student/enrollments/4474/assessments/8830/file-upload/330/",
              id: 330,
              assessment: 8830,
              enrollment: 4474,
              obtained: 18,
              student_upload: null,
            },
          },
        ],
      },
    },
    {
      url: "http://localhost:8000/api/student/enrollments/4475/",
      enrollment_id: 4475,
      student: "NUM-STU-2023-114",
      allocation: 179,
      status: "Active",
      allocation_details: {
        faculty_details: { teacher_id: "NUM-FAC-2017-033", first_name: "Owen", last_name: "Barrett" },
        course_details: {
          course_code: "PHYS-2101",
          course_name: "Modern Physics",
          credit_hours: 4,
          lab: true,
          pre_requisite: "PHYS-1101",
        },
        semester_id: 9,
        session: "Fall 2026",
        assessment_set: [
          {
            assessment_id: 8841,
            assessment_type: "Quiz",
            assessment_name: "Quiz 2 — Wave mechanics",
            assessment_date: "2026-10-09",
            total_marks: 15,
            submission_deadline: "2026-10-09T23:59:00Z",
            assessmentchecked_set: null,
          },
          {
            assessment_id: 8845,
            assessment_type: "Lab",
            assessment_name: "Lab report 3",
            assessment_date: "2026-11-02",
            total_marks: 25,
            submission_deadline: "2026-11-02T23:59:00Z",
            assessmentchecked_set: null,
          },
        ],
      },
    },
  ],
};

/**
 * A completed course's full grade breakdown — matches how Assessment rows actually look
 * (Quiz/Assignment/Exam types, each with its own total_marks). The per-assessment weightage that
 * would combine these into a Result.obtained_marks (see data/studentResults.ts) is never sent to
 * students at all — StudentAssessmentSerializer's fields list has no `weightage` key — so it isn't
 * modeled on these objects; only the shipped fields (type/name/date/total_marks/obtained) appear.
 */
const COMPLETED_COURSE_ASSESSMENT_SPECS: { type: string; name: string; total: number }[] = [
  { type: "Quiz", name: "Quiz 1", total: 20 },
  { type: "Assignment", name: "Assignment 1", total: 20 },
  { type: "Exam", name: "Midterm", total: 50 },
  { type: "Exam", name: "Final Exam", total: 100 },
];

const COMPLETED_SEMESTER_ASSESSMENT_DATES: Record<number, [string, string, string, string]> = {
  6: ["2024-09-20", "2024-10-10", "2024-10-25", "2024-12-08"],
  7: ["2025-02-20", "2025-03-10", "2025-03-25", "2025-05-08"],
  8: ["2025-09-20", "2025-10-10", "2025-10-25", "2025-12-08"],
};

function completedAssessmentSet(
  enrollmentId: number,
  assessmentIdBase: number,
  checkedIdBase: number,
  semesterId: number,
  scores: [number, number, number, number],
): StudentAssessment[] {
  const dates = COMPLETED_SEMESTER_ASSESSMENT_DATES[semesterId];
  return COMPLETED_COURSE_ASSESSMENT_SPECS.map((spec, i) => {
    const assessmentId = assessmentIdBase + i;
    const checkedId = checkedIdBase + i;
    return {
      assessment_id: assessmentId,
      assessment_type: spec.type,
      assessment_name: spec.name,
      assessment_date: dates[i],
      total_marks: spec.total,
      assessmentchecked_set: {
        urls: `http://localhost:8000/api/student/enrollments/${enrollmentId}/assessments/${assessmentId}/file-upload/${checkedId}/`,
        id: checkedId,
        assessment: assessmentId,
        enrollment: enrollmentId,
        obtained: scores[i],
        student_upload: null,
      },
    };
  });
}

function completedEnrollment(
  enrollmentId: number,
  allocation: number,
  teacherId: string,
  firstName: string,
  lastName: string,
  courseCode: string,
  courseName: string,
  creditHours: number,
  lab: boolean,
  semesterId: number,
  session: string,
  assessmentIdBase: number,
  checkedIdBase: number,
  scores: [number, number, number, number],
): StudentEnrollment {
  return {
    url: `http://localhost:8000/api/student/enrollments/${enrollmentId}/`,
    enrollment_id: enrollmentId,
    student: "NUM-STU-2023-114",
    allocation,
    status: "Completed",
    allocation_details: {
      faculty_details: { teacher_id: teacherId, first_name: firstName, last_name: lastName },
      course_details: { course_code: courseCode, course_name: courseName, credit_hours: creditHours, lab, pre_requisite: null },
      semester_id: semesterId,
      session,
      assessment_set: completedAssessmentSet(enrollmentId, assessmentIdBase, checkedIdBase, semesterId, scores),
    },
  };
}

/**
 * Backs data/studentDashboard.ts's completed_enrollments: 13 stat, which had no actual records
 * behind it since the student portal's first pass — GET /api/student/enrollments/ with no status
 * filter returns Enrollment rows whose allocation__semester__status is 'Active' or 'Completed'
 * (StudentEnrollmentListAPIView.get_queryset), i.e. exactly "current + finished", never 'Inactive'
 * ones still pending window confirmation. Faculty here reuse the same personas already teaching
 * this student's active courses (Amara Osei, Naveen Rao, Elena Popescu — kept for continuity even
 * though Elena/Priya/Owen aren't otherwise referenced below) plus two new ones for gen-ed/foundation
 * courses. CS-1101/CS-2101/PHYS-1101 deliberately match the pre_requisite values already on the
 * active CS-3102/PHYS-2101 rows above — this student actually took the course their current
 * enrollment claims as a prerequisite.
 */
const SEED_COMPLETED_ENROLLMENTS: StudentEnrollment[] = [
  // Fall 2024 (semester 6)
  completedEnrollment(4501, 300, "NUM-FAC-2019-231", "Amara", "Osei", "CS-1101", "Introduction to Programming", 4, true, 6, "Fall 2024", 8900, 500, [17, 17, 48, 86]),
  completedEnrollment(4502, 301, "NUM-FAC-2015-050", "Fatima", "Zafar", "MATH-1101", "Calculus I", 3, false, 6, "Fall 2024", 8910, 510, [16, 14, 40, 76]),
  completedEnrollment(4503, 302, "NUM-FAC-2021-004", "Priya", "Shah", "ENG-1201", "Composition", 2, false, 6, "Fall 2024", 8920, 520, [17, 19, 47, 99]),
  completedEnrollment(4504, 303, "NUM-FAC-2017-033", "Owen", "Barrett", "PHYS-1101", "Mechanics I", 4, true, 6, "Fall 2024", 8930, 530, [14, 14, 32, 74]),
  // Spring 2025 (semester 7)
  completedEnrollment(4505, 304, "NUM-FAC-2019-231", "Amara", "Osei", "CS-2101", "Data Structures", 4, true, 7, "Spring 2025", 8940, 540, [17, 18, 42, 80]),
  completedEnrollment(4506, 305, "NUM-FAC-2015-050", "Fatima", "Zafar", "MATH-1201", "Calculus II", 3, false, 7, "Spring 2025", 8950, 550, [14, 16, 34, 69]),
  completedEnrollment(4507, 306, "NUM-FAC-2020-062", "Naveen", "Rao", "CS-2201", "Digital Logic Design", 3, true, 7, "Spring 2025", 8960, 560, [18, 19, 47, 87]),
  completedEnrollment(4508, 307, "NUM-FAC-2016-071", "Bilal", "Chaudhry", "HUM-1101", "Pakistan Studies", 2, false, 7, "Spring 2025", 8970, 570, [19, 18, 46, 91]),
  // Fall 2025 (semester 8)
  completedEnrollment(4509, 308, "NUM-FAC-2015-050", "Fatima", "Zafar", "CS-2301", "Discrete Mathematics", 3, false, 8, "Fall 2025", 8980, 580, [17, 15, 42, 72]),
  completedEnrollment(4510, 309, "NUM-EE-2021-014", "Sana", "Ahmed", "EE-1101", "Basic Electrical Engineering", 3, true, 8, "Fall 2025", 8990, 590, [17, 16, 41, 87]),
  completedEnrollment(4511, 310, "NUM-FAC-2020-062", "Naveen", "Rao", "CS-2401", "Object Oriented Programming", 3, true, 8, "Fall 2025", 9000, 600, [19, 17, 46, 99]),
  completedEnrollment(4512, 311, "NUM-FAC-2015-050", "Fatima", "Zafar", "STAT-2101", "Probability & Statistics", 3, false, 8, "Fall 2025", 9010, 610, [16, 15, 36, 81]),
  completedEnrollment(4513, 312, "NUM-FAC-2016-071", "Bilal", "Chaudhry", "MGT-1101", "Introduction to Management", 2, false, 8, "Fall 2025", 9020, 620, [17, 17, 39, 81]),
];

/**
 * GET /api/student/enrollments/ with no status filter — every enrollment the queryset covers
 * (Active + Completed, see doc comment on SEED_COMPLETED_ENROLLMENTS above), merged with this
 * window's freshly confirmed picks the same way the closed-window dashboard already does
 * (mockActiveEnrollmentsResponse). Chronological by semester_id, which is assigned in the same
 * increasing order the semesters actually happened in throughout this file's seed data.
 */
export function mockAllEnrollmentsResponse(): StudentEnrollmentsResponse {
  const merged = [...SEED_COMPLETED_ENROLLMENTS, ...mockActiveEnrollmentsResponse().results];
  const sorted = [...merged].sort((a, b) => a.allocation_details.semester_id - b.allocation_details.semester_id);
  return { count: sorted.length, next: null, previous: null, results: sorted };
}

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

function facultyName(enrollment: StudentEnrollment): string | null {
  const details = enrollment.allocation_details.faculty_details;
  return "first_name" in details ? `${details.first_name} ${details.last_name}` : null;
}

const SYNTHETIC_ENROLLMENT_ID_BASE = 9000;

function facultyDetailsFromFullName(facultyId: string, fullName: string): FacultyDetails {
  const [first, ...rest] = fullName.split(" ");
  return { teacher_id: facultyId, first_name: first, last_name: rest.join(" ") || first };
}

/**
 * Enrollment.objects.create() (StudentEnrollmentCreateSerializerB.create()) always starts a row
 * at status='Inactive' (Models/models.py::Enrollment.status default='Inactive') — nothing in the
 * real backend flips it to 'Active' once the enrollment window closes (grepped the repo: no code
 * anywhere sets status='Active' except test fixtures), so that transition is simulated here:
 * whatever the student confirmed while the window was open (mockEnrollmentCreateAllocations,
 * confirm=true) is treated as an Active enrollment once isEnrollmentWindowOpen() flips to false,
 * same as the enrollments that were already Active before this window opened. IDs are derived
 * deterministically from allocation_id so they're stable across renders and
 * getStudentEnrollmentById can still resolve them; already-enrolled allocation_ids are skipped
 * so re-running this after the seed data grows doesn't double up.
 */
function confirmedAllocationsAsEnrollments(): StudentEnrollment[] {
  const existingAllocationIds = new Set(mockStudentEnrollmentsResponse.results.map((e) => e.allocation));
  return mockEnrollmentCreateAllocations
    .filter((a) => a.confirm && !existingAllocationIds.has(a.allocation_id))
    .map((a) => ({
      url: `http://localhost:8000/api/student/enrollments/${SYNTHETIC_ENROLLMENT_ID_BASE + a.allocation_id}/`,
      enrollment_id: SYNTHETIC_ENROLLMENT_ID_BASE + a.allocation_id,
      student: mockStudentEnrollmentsResponse.results[0].student,
      allocation: a.allocation_id,
      status: "Active" as const,
      allocation_details: {
        faculty_details: facultyDetailsFromFullName(a.faculty_data.faculty_id, a.faculty_data.faculty_name),
        course_details: { ...a.course_data, pre_requisite: null },
        semester_id: 10,
        session: mockCurrentSession,
        assessment_set: [],
      },
    }));
}

/**
 * Everything the closed-window dashboard needs to show: enrollments already Active from before
 * this window opened, plus this window's confirmed picks (see confirmedAllocationsAsEnrollments).
 */
export function mockActiveEnrollmentsResponse(): StudentEnrollmentsResponse {
  const merged = [...mockStudentEnrollmentsResponse.results, ...confirmedAllocationsAsEnrollments()];
  return { count: merged.length, next: null, previous: null, results: merged };
}

/**
 * The dashboard's closed-window course grid mirrors GET /api/student/enrollments/?status=Active
 * (StudentEnrollmentListAPIView.filterset_fields includes 'status') — filtered here rather than
 * assumed from the seed data, since every mock row happens to be Active today but the real
 * endpoint would return Completed/Dropped rows too once the `status` param is left off.
 */
export function selectStudentCourseCards(response: StudentEnrollmentsResponse): CourseCardData[] {
  return response.results
    .filter((enrollment) => enrollment.status === "Active")
    .map((enrollment) => {
      const course = enrollment.allocation_details.course_details;
      const meta = [
        facultyName(enrollment),
        course ? `${course.credit_hours} credits` : null,
        course?.lab ? "Lab" : null,
        enrollment.allocation_details.session,
      ].filter((part): part is string => part !== null);

      return {
        id: String(enrollment.enrollment_id),
        kicker: course?.course_code ?? "—",
        title: course?.course_name ?? "Untitled course",
        status: { label: enrollment.status, tone: ENROLLMENT_STATUS_TONE[enrollment.status] },
        meta,
        href: `/student/enrollments/${enrollment.enrollment_id}`,
      };
    });
}

export function getStudentEnrollmentById(enrollmentId: number): StudentEnrollment | undefined {
  return mockAllEnrollmentsResponse().results.find((e) => e.enrollment_id === enrollmentId);
}

/** An assessment's submission window is only open — and only then does the real API even expose
 * the `urls` upload link — while student_submission is true, the deadline (if any) hasn't
 * passed, and the enrollment itself isn't Completed (see StudentAssessmentCheckedSerializer.
 * __init__/get_extra_kwargs in StudentModule/serializers.py). Mirrors that gate client-side so the
 * upload control only ever renders when the real API would actually accept it. */
export function isSubmissionWindowOpen(
  enrollmentStatus: EnrollmentStatus,
  submissionDeadline: string | null | undefined,
): boolean {
  if (enrollmentStatus === "Completed") return false;
  if (!submissionDeadline) return false;
  return new Date(submissionDeadline).getTime() > Date.now();
}

const ALLOWED_UPLOAD_EXTENSIONS = ["jpeg", "jpg", "png", "docx", "pptx", "zip", "pdf", "xlsx", "csv"];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Stand-in for PUT/PATCH .../assessments/<assessment_id>/file-upload/<id>/ — validates extension
 * and size the same way validate_student_upload does, then stores a fake Cloudinary-shaped URL
 * (no real upload target in this mock). */
export function uploadAssessmentSubmission(enrollmentId: number, assessmentId: number, file: File): { url: string } | string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
    return "Invalid file type. Allowed formats are: jpeg, png, docx, pptx, zip, pdf, xlsx, csv.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File size must not exceed 50 MB.";
  }
  const enrollment = getStudentEnrollmentById(enrollmentId);
  const assessment = enrollment?.allocation_details.assessment_set.find((a) => a.assessment_id === assessmentId);
  const checked = assessment?.assessmentchecked_set;
  if (!checked) return "Submission record not found.";
  checked.student_upload = `https://res.cloudinary.com/nexus/${enrollmentId}-${assessmentId}-${file.name}`;
  return { url: checked.student_upload };
}

export interface AssessmentGroup {
  label: string;
  items: StudentAssessment[];
}

/** assessment_type is a free-form string on the backend (no fixed choices), so this only fixes
 * the *display order and label* for the types this app's seed data actually uses — any type that
 * doesn't match one of these just gets its own group titled by the raw value, sorted after the
 * known ones. */
const ASSESSMENT_TYPE_GROUPS: { type: string; label: string }[] = [
  { type: "Quiz", label: "Quizzes" },
  { type: "Assignment", label: "Assignments" },
  { type: "Lab", label: "Labs" },
  { type: "Exam", label: "Midterms & Finals" },
  { type: "Project", label: "Projects" },
];

/** Groups a course's assessments by type (Quizzes/Assignments/Labs/Exams/…) instead of one long
 * flat list, each sorted chronologically — requested explicitly, since a mixed list makes it hard
 * to see e.g. "how am I doing on quizzes" at a glance. */
export function groupAssessmentsByType(assessments: StudentAssessment[]): AssessmentGroup[] {
  const byType = new Map<string, StudentAssessment[]>();
  for (const a of assessments) {
    const list = byType.get(a.assessment_type);
    if (list) list.push(a);
    else byType.set(a.assessment_type, [a]);
  }

  const sortByDate = (items: StudentAssessment[]) =>
    [...items].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));

  const groups: AssessmentGroup[] = [];
  for (const { type, label } of ASSESSMENT_TYPE_GROUPS) {
    const items = byType.get(type);
    if (items) {
      groups.push({ label, items: sortByDate(items) });
      byType.delete(type);
    }
  }
  for (const [type, items] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups.push({ label: type, items: sortByDate(items) });
  }
  return groups;
}

export interface DueItem {
  id: string;
  name: string;
  courseLabel: string;
  date: Date;
}

/** Only Active enrollments have coursework still due — a Completed/Dropped enrollment's
 * assessments (if any carry a future submission_deadline in the seed data) shouldn't surface here. */
export function selectWhatsDue(response: StudentEnrollmentsResponse): DueItem[] {
  const items: DueItem[] = [];
  for (const enrollment of response.results) {
    if (enrollment.status !== "Active") continue;
    const courseCode = enrollment.allocation_details.course_details?.course_code ?? "—";
    for (const assessment of enrollment.allocation_details.assessment_set) {
      if (assessment.submission_deadline) {
        items.push({
          id: `${enrollment.enrollment_id}-${assessment.assessment_id}`,
          name: assessment.assessment_name,
          courseLabel: courseCode,
          date: new Date(assessment.submission_deadline),
        });
      }
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
