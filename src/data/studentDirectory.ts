import type { AdminStudentDetail, Gender, StudentStatus } from "../types/api";
import type { PersonFormShape, StatusTone, StudentListRow } from "../types/dashboard";
import { classLabel } from "./academicStructure";
import { qualificationFormItemsToWire, qualificationsToFormItems } from "./qualificationForm";
import { createChangeRequest } from "./changeRequests";

/**
 * Stand-in for GET /api/admin/students/ (paginated) / GET /api/admin/students/<student_id>/.
 * Stored as full AdminStudentDetail[] (enrollment_set included), same list-vs-detail
 * relationship as facultyDirectory.ts — see that file's header comment.
 */
export interface MockStudentRecord extends AdminStudentDetail {
  pendingDeletion?: boolean;
}

export const mockStudentDirectory: MockStudentRecord[] = [
  {
    url: "/api/admin/students/NUM-CS-BS-2023-114/",
    person: {
      user: { username: "l.ferreira@nexus.edu" },
      image: null,
      person_id: "NUM-CS-BS-2023-114",
      first_name: "Lucia",
      last_name: "Ferreira",
      father_name: "Paulo Ferreira",
      gender: "Female",
      dob: "2004-05-19",
      cnic: "35202-9998887-4",
      institutional_email: "l.ferreira@nexus.edu",
      personal_email: "lucia.f@gmail.com",
      contact_number: "+92-321-1112233",
      religion: "Christianity",
      address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "Hostel B, Room 14" },
      qualification_set: [
        { degree_title: "FSc Pre-Engineering", education_board: "BISE Lahore", passing_year: 2023, institution: "Punjab College", total_marks: 1100, obtained_marks: 1010, is_current: false },
      ],
    },
    program: "CS-BS",
    student_class: 1,
    admission_date: "2023-09-01",
    status: "Active",
    enrollment_set: [
      { urls: "/api/admin/enrollments/4471/", enrollment_id: 4471, student: "NUM-CS-BS-2023-114", student_info: { student_id: "NUM-CS-BS-2023-114", student_name: "Lucia Ferreira" }, allocation: 142, enrollment_date: "2026-08-01", status: "Active", result: null },
      { urls: "/api/admin/enrollments/4472/", enrollment_id: 4472, student: "NUM-CS-BS-2023-114", student_info: { student_id: "NUM-CS-BS-2023-114", student_name: "Lucia Ferreira" }, allocation: 156, enrollment_date: "2026-08-01", status: "Active", result: null },
    ],
  },
  {
    url: "/api/admin/students/NUM-EE-BS-2024-057/",
    person: {
      user: { username: "h.raza@nexus.edu" },
      image: null,
      person_id: "NUM-EE-BS-2024-057",
      first_name: "Hassan",
      last_name: "Raza",
      father_name: "Imran Raza",
      gender: "Male",
      dob: "2005-02-11",
      cnic: "35202-4443332-5",
      institutional_email: "h.raza@nexus.edu",
      personal_email: null,
      contact_number: "+92-345-6667788",
      religion: "Islam",
      address: { country: "Pakistan", province: "Punjab", city: "Sargodha", zipcode: 40100, street_address: null },
      qualification_set: [],
    },
    program: "EE-BS",
    student_class: 4,
    admission_date: "2024-09-01",
    status: "Active",
    enrollment_set: [],
  },
  {
    url: "/api/admin/students/NUM-CS-BS-2022-039/",
    person: {
      user: { username: "a.tariq@nexus.edu" },
      image: null,
      person_id: "NUM-CS-BS-2022-039",
      first_name: "Aiman",
      last_name: "Tariq",
      father_name: "Shahid Tariq",
      gender: "Female",
      dob: "2003-12-30",
      cnic: "35202-2221110-6",
      institutional_email: "a.tariq@nexus.edu",
      personal_email: "aiman.tariq@gmail.com",
      contact_number: "+92-333-2223344",
      religion: "Islam",
      address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "Hostel A, Room 3" },
      qualification_set: [],
    },
    program: "CS-BS",
    student_class: 1,
    admission_date: "2022-09-01",
    status: "On Probation",
    enrollment_set: [],
  },
];

export const STUDENT_STATUSES: StudentStatus[] = ["Active", "Dropped", "Frozen", "Graduated", "On Probation"];

export const GENDERS: Gender[] = ["Male", "Female", "Others"];

const STATUS_TONE: Record<StudentStatus, StatusTone> = {
  Active: "good",
  Graduated: "good",
  "On Probation": "warning",
  Frozen: "warning",
  Dropped: "critical",
};

export function selectStudentListRows(records: MockStudentRecord[]): StudentListRow[] {
  return records.map((s) => ({
    studentId: s.person.person_id,
    name: `${s.person.first_name} ${s.person.last_name}`,
    image: s.person.image,
    program: s.program,
    studentClass: classLabel(s.student_class),
    status: { label: s.status, tone: STATUS_TONE[s.status] },
    admissionDate: s.admission_date,
    email: s.person.institutional_email,
    detailHref: `/admin/students/${s.person.person_id}`,
  }));
}

export function getStudentById(studentId: string): MockStudentRecord | undefined {
  return mockStudentDirectory.find((s) => s.person.person_id === studentId);
}

/** Mirrors PersonSerializerMixin.create_mixin's flat input shape for model='Student' —
 * person_id/username are server-derived, never supplied here. */
export interface StudentFormValue extends PersonFormShape {
  program: string;
  student_class: number;
  admission_date: string;
  status: StudentStatus;
}

export function emptyStudentFormValue(): StudentFormValue {
  return {
    first_name: "",
    last_name: "",
    father_name: "",
    gender: "Male",
    dob: "",
    cnic: "",
    institutional_email: "",
    personal_email: "",
    contact_number: "",
    religion: "",
    image: null,
    password: "",
    confirm_password: "",
    address: { country: "Pakistan", province: "", city: "", zipcode: "", street_address: "" },
    qualification_set: [],
    program: "CS-BS",
    student_class: 1,
    admission_date: "",
    status: "Active",
  };
}

export function studentFormValueFromRecord(record: MockStudentRecord): StudentFormValue {
  return {
    first_name: record.person.first_name,
    last_name: record.person.last_name,
    father_name: record.person.father_name,
    gender: record.person.gender,
    dob: record.person.dob,
    cnic: record.person.cnic,
    institutional_email: record.person.institutional_email,
    personal_email: record.person.personal_email ?? "",
    contact_number: record.person.contact_number,
    religion: record.person.religion ?? "",
    image: record.person.image,
    password: "",
    confirm_password: "",
    address: {
      country: record.person.address?.country ?? "",
      province: record.person.address?.province ?? "",
      city: record.person.address?.city ?? "",
      zipcode: record.person.address?.zipcode ? String(record.person.address.zipcode) : "",
      street_address: record.person.address?.street_address ?? "",
    },
    qualification_set: qualificationsToFormItems(record.person.qualification_set),
    program: record.program,
    student_class: record.student_class,
    admission_date: record.admission_date,
    status: record.status,
  };
}

/** Stand-in for POST /api/admin/students/ — mutates the in-memory mock array; person_id follows
 * create_mixin's scheme: NUM-{program}-{year}-{count of students in that program admitted this year}. */
export function createStudentRecord(input: StudentFormValue): MockStudentRecord {
  const year = new Date().getFullYear();
  const countInProgram = mockStudentDirectory.filter(
    (s) => s.program === input.program && new Date(s.admission_date).getFullYear() === year,
  ).length;
  const personId = `NUM-${input.program}-${year}-${countInProgram + 1}`;
  const record: MockStudentRecord = {
    url: `/api/admin/students/${personId}/`,
    person: {
      user: { username: input.institutional_email },
      image: input.image,
      person_id: personId,
      first_name: input.first_name,
      last_name: input.last_name,
      father_name: input.father_name,
      gender: input.gender as Gender,
      dob: input.dob,
      cnic: input.cnic,
      institutional_email: input.institutional_email,
      personal_email: input.personal_email || null,
      contact_number: input.contact_number,
      religion: input.religion || null,
      address: input.address.country || input.address.city
        ? {
            country: input.address.country,
            province: input.address.province || null,
            city: input.address.city,
            zipcode: input.address.zipcode ? Number(input.address.zipcode) : null,
            street_address: input.address.street_address || null,
          }
        : undefined,
      qualification_set: qualificationFormItemsToWire(input.qualification_set),
    },
    program: input.program,
    student_class: input.student_class,
    admission_date: input.admission_date,
    status: input.status,
    enrollment_set: [],
  };
  mockStudentDirectory.push(record);
  return record;
}

/** Stand-in for PUT/PATCH /api/admin/students/<student_id>/ — update_mixin() semantics. */
export function updateStudentRecord(studentId: string, input: StudentFormValue): MockStudentRecord | undefined {
  const record = getStudentById(studentId);
  if (!record) return undefined;
  record.person.first_name = input.first_name;
  record.person.last_name = input.last_name;
  record.person.father_name = input.father_name;
  record.person.gender = input.gender as Gender;
  record.person.dob = input.dob;
  record.person.cnic = input.cnic;
  record.person.institutional_email = input.institutional_email;
  record.person.personal_email = input.personal_email || null;
  record.person.contact_number = input.contact_number;
  record.person.religion = input.religion || null;
  record.person.image = input.image;
  record.person.address = {
    country: input.address.country,
    province: input.address.province || null,
    city: input.address.city,
    zipcode: input.address.zipcode ? Number(input.address.zipcode) : null,
    street_address: input.address.street_address || null,
  };
  record.person.qualification_set = qualificationFormItemsToWire(input.qualification_set);
  record.program = input.program;
  record.student_class = input.student_class;
  record.admission_date = input.admission_date;
  record.status = input.status;
  return record;
}

/** Stand-in for DELETE /api/admin/students/<student_id>/ — destroy_mixin() opens a pending
 * ChangeRequest(change_type='student_delete') + emails a 48h confirmation link rather than
 * deleting synchronously; see removeStudentRecord for the actual delete, fired only once an
 * admin applies that request. */
export function requestStudentDeletion(studentId: string): { message: string } {
  const record = getStudentById(studentId);
  if (!record) return { message: "Student record not found." };
  if (record.pendingDeletion) {
    return { message: `${record.person.person_id} already has a pending deletion request.` };
  }
  record.pendingDeletion = true;
  createChangeRequest({
    change_type: "student_delete",
    department: null,
    new_hod: null,
    target_allocation: null,
    target_faculty: null,
    target_student: studentId,
    requested_by: 1,
  });
  return { message: `Deletion email has been sent successfully to ${record.person.person_id}` };
}

/** Stand-in for delete_student_task (AdminModule/tasks.py) — only ever called once an admin
 * applies the student_delete ChangeRequest (ChangeRequestSerializer.update()). */
export function removeStudentRecord(studentId: string): boolean {
  const index = mockStudentDirectory.findIndex((s) => s.person.person_id === studentId);
  if (index === -1) return false;
  mockStudentDirectory.splice(index, 1);
  return true;
}
