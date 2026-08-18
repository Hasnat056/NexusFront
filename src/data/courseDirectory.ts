import type { AdminCourse } from "../types/api";
import type { CourseListRow } from "../types/dashboard";

/**
 * Stand-in for GET /api/admin/courses/. Reuses the same course_codes already referenced
 * elsewhere in this app's mock data (Faculty allocations, Student enrollments) so those pages'
 * course references resolve to something real here too. credit_hours values below are the
 * *stored* numbers (post lab-adjustment) — see types/api.ts::AdminCourse for what create()/
 * update() actually do to a client-submitted value.
 */
export const mockCourses: AdminCourse[] = [
  {
    urls: "/api/admin/courses/CS-1101/",
    course_code: "CS-1101",
    course_name: "Introduction to Programming",
    credit_hours: 4,
    lab: true,
    pre_requisite: null,
    description: "Foundations of programming using Python: variables, control flow, functions, and basic data structures.",
  },
  {
    urls: "/api/admin/courses/CS-3102/",
    course_code: "CS-3102",
    course_name: "Data Structures and Algorithms",
    credit_hours: 4,
    lab: true,
    pre_requisite: "CS-1101",
    description: "Core data structures and algorithm design/analysis techniques.",
  },
  {
    urls: "/api/admin/courses/CS-4210/",
    course_code: "CS-4210",
    course_name: "Database Systems",
    credit_hours: 3,
    lab: false,
    pre_requisite: "CS-3102",
    description: "Relational database design, SQL, transactions, and indexing.",
  },
  {
    urls: "/api/admin/courses/SE-2201/",
    course_code: "SE-2201",
    course_name: "Software Engineering Principles",
    credit_hours: 3,
    lab: false,
    pre_requisite: "CS-1101",
    description: null,
  },
  {
    urls: "/api/admin/courses/EE-2101/",
    course_code: "EE-2101",
    course_name: "Circuit Analysis",
    credit_hours: 4,
    lab: true,
    pre_requisite: null,
    description: "DC/AC circuit analysis techniques and network theorems.",
  },
  {
    urls: "/api/admin/courses/MATH-2210/",
    course_code: "MATH-2210",
    course_name: "Linear Algebra",
    credit_hours: 3,
    lab: false,
    pre_requisite: null,
    description: null,
  },
  {
    urls: "/api/admin/courses/ENG-1101/",
    course_code: "ENG-1101",
    course_name: "Academic Writing",
    credit_hours: 3,
    lab: false,
    pre_requisite: null,
    description: null,
  },
  {
    urls: "/api/admin/courses/PHYS-2101/",
    course_code: "PHYS-2101",
    course_name: "Mechanics",
    credit_hours: 4,
    lab: true,
    pre_requisite: null,
    description: "Classical mechanics: kinematics, dynamics, energy, and momentum.",
  },
];

export function selectCourseListRows(courses: AdminCourse[]): CourseListRow[] {
  return courses.map((c) => ({
    courseCode: c.course_code,
    courseName: c.course_name,
    creditHours: c.credit_hours,
    lab: c.lab,
    prerequisite: c.pre_requisite,
    detailHref: `/admin/courses/${c.course_code}`,
  }));
}

export function getCourseById(courseCode: string): AdminCourse | undefined {
  return mockCourses.find((c) => c.course_code === courseCode);
}

/** Mirrors CourseFilter's dynamic `prefix` choices — the part of course_code before the first
 * "-", derived from whatever courses actually exist (not a fixed list). */
export function coursePrefixes(courses: AdminCourse[]): string[] {
  return Array.from(new Set(courses.map((c) => c.course_code.split("-")[0]))).sort();
}

/** Mirrors CourseSerializer.validate_credit_hours — applied to the raw value the form submits,
 * same timing as the backend (before the lab adjustment below), so it's possible in both places
 * for the *stored* value to end up outside [0, 5] once a lab bump is added. */
export function validateCreditHours(value: number): string | null {
  if (value < 0) return "Credit hours cannot be negative.";
  if (value > 5) return "Credit hours cannot be greater than 5.";
  return null;
}

export interface CourseFormValue {
  course_code: string;
  course_name: string;
  credit_hours: string;
  lab: boolean;
  pre_requisite: string;
  description: string;
}

export function emptyCourseFormValue(): CourseFormValue {
  return { course_code: "", course_name: "", credit_hours: "3", lab: false, pre_requisite: "", description: "" };
}

export function courseFormValueFromRecord(record: AdminCourse): CourseFormValue {
  return {
    course_code: record.course_code,
    course_name: record.course_name,
    credit_hours: String(record.credit_hours),
    lab: record.lab,
    pre_requisite: record.pre_requisite ?? "",
    description: record.description ?? "",
  };
}

/** Stand-in for POST /api/admin/courses/ — CourseSerializer.create(): if lab is true, the
 * submitted credit_hours is incremented by 1 before saving (submit the lecture credit hours;
 * the lab component is added automatically). */
export function createCourse(input: CourseFormValue): AdminCourse {
  let creditHours = Number(input.credit_hours) || 0;
  if (input.lab) creditHours += 1;

  const record: AdminCourse = {
    urls: `/api/admin/courses/${input.course_code}/`,
    course_code: input.course_code,
    course_name: input.course_name,
    credit_hours: creditHours,
    lab: input.lab,
    pre_requisite: input.pre_requisite || null,
    description: input.description || null,
  };
  mockCourses.push(record);
  return record;
}

/** Stand-in for PUT/PATCH /api/admin/courses/<course_code>/ — CourseSerializer.update(): if lab
 * is actually changing, credit_hours is adjusted by ±1 (True→False decrements, False→True
 * increments) using whatever credit_hours value is also in the payload. */
export function updateCourse(courseCode: string, input: CourseFormValue): AdminCourse | undefined {
  const record = getCourseById(courseCode);
  if (!record) return undefined;

  let creditHours = Number(input.credit_hours) || 0;
  if (record.lab && !input.lab) creditHours -= 1;
  else if (!record.lab && input.lab) creditHours += 1;

  record.course_name = input.course_name;
  record.credit_hours = creditHours;
  record.lab = input.lab;
  record.pre_requisite = input.pre_requisite || null;
  record.description = input.description || null;
  return record;
}

/** Stand-in for DELETE /api/admin/courses/<course_code>/ — CourseRetrieveUpdateDestroyAPIView.
 * perform_destroy() calls instance.delete() directly: a real, synchronous, unconfirmed delete,
 * same as Program — no ChangeRequest gate. */
export function deleteCourse(courseCode: string): boolean {
  const index = mockCourses.findIndex((c) => c.course_code === courseCode);
  if (index === -1) return false;
  mockCourses.splice(index, 1);
  return true;
}
