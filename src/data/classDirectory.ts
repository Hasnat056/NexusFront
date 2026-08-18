import type { AdminClass, ClassSchemeSemester, SemesterStatus } from "../types/api";
import type { ClassListRow, StatusTone } from "../types/dashboard";
import { mockCourses } from "./courseDirectory";
import { mockPrograms } from "./programDirectory";

export const SEMESTER_STATUS_TONE: Record<SemesterStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
};

/** Mirrors ClassSerializer.create(): Program.total_semesters blank Semester rows (numbered 1..N),
 * each with one blank SemesterDetails row — same scaffold the real backend generates, just built
 * locally instead of by a server round-trip. */
function scaffoldScheme(programId: string): ClassSchemeSemester[] {
  const totalSemesters = mockPrograms.find((p) => p.program_id === programId)?.total_semesters ?? 8;
  const semesters: ClassSchemeSemester[] = [];
  for (let i = 1; i <= totalSemesters; i++) {
    const semesterId = nextSemesterId();
    semesters.push({
      urls: `/api/admin/semesters/${semesterId}/`,
      semester_id: semesterId,
      semester_no: i,
      session: null,
      status: "Inactive",
      semesterdetails_set: [{ course: null, course_name: "None", semester: semesterId }],
    });
  }
  return semesters;
}

let semesterIdCounter = 0;
function nextSemesterId(): number {
  semesterIdCounter += 1;
  return semesterIdCounter;
}

/** Assigns a single course to a semester's SemesterDetails row and stamps a status/session on
 * it — used only to hand-build the two seeded classes below with a semester_id sequence that
 * still comes from nextSemesterId(), so later classes created via createClass() get IDs that
 * don't collide with these. */
function seededSemester(
  semesterNo: number,
  status: SemesterStatus,
  session: number | null,
  courseCodes: (string | null)[],
): ClassSchemeSemester {
  const semesterId = nextSemesterId();
  return {
    urls: `/api/admin/semesters/${semesterId}/`,
    semester_id: semesterId,
    semester_no: semesterNo,
    session,
    status,
    semesterdetails_set: courseCodes.map((code) => ({
      course: code,
      course_name: code ? mockCourses.find((c) => c.course_code === code)?.course_name ?? "None" : "None",
      semester: semesterId,
    })),
  };
}

/**
 * Stand-in for GET /api/admin/classes/. CS-BS 2023 shows a mostly-filled scheme (semesters 1-3
 * assigned a session and courses, the rest still blank) — the ordinary state an admin would be
 * mid-way through populating. Semester 4 is assigned to session 4 (Spring 2028, "Initiated" in
 * sessionDirectory.ts) but has no activation_deadline of its own yet, and can't get one right now
 * either — CS-BS-2023's semester 3 is already Active, and data/semesterDirectory.ts's conflict
 * check only allows one active/activating semester per class at a time. SE-BS 2024's semester 1
 * (id 9) is also assigned session 4 with no activation_deadline, but (unlike CS-BS 2023) this class
 * has no other Active/scheduled semester — data/semesterDirectory.ts uses it to demo successfully
 * setting one, which then makes it the one semester genuinely eligible for a new CourseAllocation
 * (see data/allocationDirectory.ts's eligibleSemestersForAllocation()). The rest of SE-BS 2024 is
 * freshly created: every other semester still blank, exactly what ClassSerializer.create() actually
 * produces before anyone edits scheme_of_studies.
 */
export const mockClasses: AdminClass[] = [
  {
    urls: "/api/admin/classes/1/",
    class_id: 1,
    program: "CS-BS",
    batch_year: 2023,
    scheme_of_studies: [
      seededSemester(1, "Completed", 3, ["CS-1101", "ENG-1101"]),
      seededSemester(2, "Completed", 3, ["CS-3102", "MATH-2210"]),
      seededSemester(3, "Active", 1, ["CS-4210"]),
      seededSemester(4, "Inactive", 4, ["SE-2201"]),
      seededSemester(5, "Inactive", null, [null]),
      seededSemester(6, "Inactive", null, [null]),
      seededSemester(7, "Inactive", null, [null]),
      seededSemester(8, "Inactive", null, [null]),
    ],
  },
  {
    urls: "/api/admin/classes/2/",
    class_id: 2,
    program: "SE-BS",
    batch_year: 2024,
    scheme_of_studies: [
      seededSemester(1, "Inactive", 4, ["SE-2201"]),
      ...Array.from({ length: 7 }, (_, i) => seededSemester(i + 2, "Inactive", null, [null])),
    ],
  },
];

export function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

export function selectClassListRows(classes: AdminClass[]): ClassListRow[] {
  return classes.map((c) => {
    const semesters = c.scheme_of_studies ?? [];
    const assigned = semesters.filter(
      (s) => s.session !== null || s.semesterdetails_set.some((d) => d.course !== null),
    ).length;
    return {
      classId: c.class_id,
      label: classLabel(c),
      program: c.program,
      batchYear: c.batch_year,
      semesterCount: semesters.length,
      assignedSemesterCount: assigned,
      detailHref: `/admin/classes/${c.class_id}`,
    };
  });
}

export function getClassById(classId: number): AdminClass | undefined {
  return mockClasses.find((c) => c.class_id === classId);
}

export interface ClassFormValue {
  program: string;
  batch_year: string;
}

export function emptyClassFormValue(): ClassFormValue {
  return { program: mockPrograms[0]?.program_id ?? "", batch_year: String(new Date().getFullYear()) };
}

/** Stand-in for POST /api/admin/classes/ — ClassSerializer.create() only ever writes program and
 * batch_year from the payload; scheme_of_studies is accepted but discarded even if submitted, so
 * ClassFormValue deliberately doesn't have a field for it. */
export function createClass(input: ClassFormValue): AdminClass {
  const nextId = mockClasses.reduce((max, c) => Math.max(max, c.class_id), 0) + 1;
  const record: AdminClass = {
    urls: `/api/admin/classes/${nextId}/`,
    class_id: nextId,
    program: input.program,
    batch_year: input.batch_year ? Number(input.batch_year) : null,
    scheme_of_studies: scaffoldScheme(input.program),
  };
  mockClasses.push(record);
  return record;
}

/** Stand-in for PATCH /api/admin/classes/<id>/ with only program/batch_year — the plain
 * setattr-and-save loop in ClassSerializer.update() when scheme_of_studies isn't in the payload. */
export function updateClass(classId: number, input: ClassFormValue): AdminClass | undefined {
  const record = getClassById(classId);
  if (!record) return undefined;
  record.program = input.program;
  record.batch_year = input.batch_year ? Number(input.batch_year) : null;
  return record;
}

/** Editable view of one semester's scheme entry — `courses` is a list of course_codes (never
 * null placeholders) since the UI only needs to express "which courses are assigned", not the
 * raw semesterdetails_set row shape. */
export interface SchemeSemesterEdit {
  semester_id: number;
  semester_no: number;
  status: SemesterStatus;
  session: string;
  courses: string[];
}

export function schemeEditFromRecord(record: AdminClass): SchemeSemesterEdit[] {
  return (record.scheme_of_studies ?? []).map((s) => ({
    semester_id: s.semester_id,
    semester_no: s.semester_no,
    status: s.status,
    session: s.session !== null ? String(s.session) : "",
    courses: s.semesterdetails_set.map((d) => d.course).filter((c): c is string => c !== null),
  }));
}

/**
 * Stand-in for PATCH /api/admin/classes/<id>/ with scheme_of_studies — ClassSerializer.update()'s
 * nested branch: for each semester entry, session (if present) is reassigned directly, and
 * SemesterDetails rows are deleted and recreated from the submitted course codes whenever more
 * than one row is submitted or the single submitted row has a course. Submitting zero courses
 * here mirrors "delete and recreate none" (the real API needs 2+ null rows to achieve the same
 * clearing effect — a quirk of the raw payload shape, not something this mock needs to replicate
 * byte-for-byte). `status` is left untouched, matching the real update() which never writes it.
 */
export function updateClassScheme(classId: number, edits: SchemeSemesterEdit[]): AdminClass | undefined {
  const record = getClassById(classId);
  if (!record || !record.scheme_of_studies) return undefined;

  for (const edit of edits) {
    const semester = record.scheme_of_studies.find((s) => s.semester_id === edit.semester_id);
    if (!semester) continue;
    semester.session = edit.session ? Number(edit.session) : null;
    semester.semesterdetails_set =
      edit.courses.length > 0
        ? edit.courses.map((code) => ({
            course: code,
            course_name: mockCourses.find((c) => c.course_code === code)?.course_name ?? "None",
            semester: semester.semester_id,
          }))
        : [{ course: null, course_name: "None", semester: semester.semester_id }];
  }
  return record;
}
