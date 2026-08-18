export type StatusTone = "good" | "warning" | "critical";

export interface StatBreakdownSegment {
  label: string;
  count: number;
  tone: StatusTone | "flat";
}

export interface StatMetric {
  id: string;
  label: string;
  value: string;
  breakdown?: StatBreakdownSegment[];
}

export interface DepartmentRow {
  departmentId: string;
  studentCount: number;
  facultyCount: number;
  programCount: number;
}

export interface TrendPoint {
  label: string;
  value: number;
  tooltip: string;
}

export interface CategorySlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface StatStripItem {
  value: string | number;
  label: string;
}

export interface CourseCardData {
  id: string;
  kicker: string;
  title: string;
  status: { label: string; tone: StatusTone };
  meta: string[];
  href: string;
}

export interface FacultyListRow {
  employeeId: string;
  name: string;
  image: string | null;
  department: string;
  designation: string;
  joiningDate: string;
  email: string;
  detailHref: string;
}

/** One row of the qualification_set repeatable editor — mirrors PersonQualification (types/api.ts)
 * but with the numeric fields kept as strings while editing, parsed back on submit. */
export interface QualificationFormItem {
  degree_title: string;
  education_board: string;
  passing_year: string;
  institution: string;
  total_marks: string;
  obtained_marks: string;
  is_current: boolean;
}

/** Shared shape for the Faculty/Student create+edit forms' Person section (name, contact,
 * address, image, qualifications, and the create-only password/confirm_password pair) — both
 * FacultyFormValue and StudentFormValue extend this with their own department/designation vs.
 * program/class/status fields. `image` holds an object-URL preview locally (there's no real
 * upload wired up — the backend proxies this to Cloudinary on submit). confirm_password never
 * gets sent anywhere; it's a client-only check before calling create_mixin. */
export interface PersonFormShape {
  first_name: string;
  last_name: string;
  father_name: string;
  gender: string;
  dob: string;
  cnic: string;
  personal_email: string;
  contact_number: string;
  religion: string;
  image: string | null;
  institutional_email: string;
  password: string;
  confirm_password: string;
  address: { country: string; province: string; city: string; zipcode: string; street_address: string };
  qualification_set: QualificationFormItem[];
}

export interface StudentListRow {
  studentId: string;
  name: string;
  image: string | null;
  program: string;
  studentClass: string;
  status: { label: string; tone: StatusTone };
  admissionDate: string;
  email: string;
  detailHref: string;
}

export interface DepartmentListRow {
  departmentId: string;
  departmentName: string;
  inaugurationDate: string | null;
  hodName: string;
  detailHref: string;
}

export interface ProgramListRow {
  programId: string;
  programName: string;
  department: string;
  totalSemesters: number;
  feePerSemester: number | null;
  detailHref: string;
}

export interface SessionListRow {
  id: number;
  label: string;
  status: { label: string; tone: StatusTone };
  activationDeadline: string | null;
  availabilityDeadline: string | null;
  closingDeadline: string | null;
  detailHref: string;
}

export interface CourseListRow {
  courseCode: string;
  courseName: string;
  creditHours: number;
  lab: boolean;
  prerequisite: string | null;
  detailHref: string;
}

export interface ClassListRow {
  classId: number;
  label: string;
  program: string;
  batchYear: number | null;
  semesterCount: number;
  assignedSemesterCount: number;
  detailHref: string;
}

export interface AllocationListRow {
  allocationId: number;
  faculty: string;
  course: string;
  semesterLabel: string;
  session: string;
  status: { label: string; tone: StatusTone };
  detailHref: string;
}

export interface EnrollmentListRow {
  enrollmentId: number;
  student: string;
  studentName: string;
  allocationLabel: string;
  enrollmentDate: string;
  status: { label: string; tone: StatusTone };
  courseGpa: number | null;
  detailHref: string;
}

export interface TranscriptListRow {
  student: string;
  studentName: string;
  studentHref: string;
  semesterId: number;
  semesterLabel: string;
  semesterHref: string;
  totalCredits: number;
  semesterGpa: number;
}
