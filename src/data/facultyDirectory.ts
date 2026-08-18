import type { AdminFacultyDetail, FacultyDesignation, Gender } from "../types/api";
import type { FacultyListRow, PersonFormShape } from "../types/dashboard";
import { qualificationFormItemsToWire, qualificationsToFormItems } from "./qualificationForm";
import { createChangeRequest } from "./changeRequests";

/**
 * Stand-in for GET /api/admin/faculty/ (paginated) / GET /api/admin/faculty/<employee_id>/.
 * Stored as full AdminFacultyDetail[] (courseallocation_set included) since that's a superset
 * of what the LIST endpoint returns — selectFacultyListRows() below drops it, same as the real
 * list serializer would. Only "pending" for pendingDeletion means destroy_mixin() has fired
 * (a ChangeRequest was created + confirmation email sent) but the record hasn't been confirmed
 * away yet — the real API keeps returning the row until the email link is clicked.
 */
export interface MockFacultyRecord extends AdminFacultyDetail {
  pendingDeletion?: boolean;
}

export const mockFacultyDirectory: MockFacultyRecord[] = [
  {
    url: "/api/admin/faculty/NUM-CS-2019-008/",
    person: {
      user: { username: "m.webb@nexus.edu" },
      image: null,
      person_id: "NUM-CS-2019-008",
      first_name: "Marcus",
      last_name: "Webb",
      father_name: "Daniel Webb",
      gender: "Male",
      dob: "1985-03-14",
      cnic: "35202-1234567-1",
      institutional_email: "m.webb@nexus.edu",
      personal_email: "marcus.webb@gmail.com",
      contact_number: "+92-300-1234567",
      religion: "Islam",
      address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "12 Faculty Colony" },
      qualification_set: [
        { degree_title: "PhD Computer Science", education_board: null, passing_year: 2014, institution: "LUMS", total_marks: null, obtained_marks: null, is_current: false },
      ],
    },
    department: "CS",
    designation: "Associate Professor",
    joining_date: "2019-08-01",
    courseallocation_set: [
      { urls: "/api/admin/allocations/142/", allocation_id: 142, faculty: "NUM-CS-2019-008", course: "CS-3102", semester: 7, session: "Fall 2026", status: "Ongoing" },
      { urls: "/api/admin/allocations/156/", allocation_id: 156, faculty: "NUM-CS-2019-008", course: "CS-4210", semester: 7, session: "Fall 2026", status: "Ongoing" },
    ],
  },
  {
    url: "/api/admin/faculty/NUM-EE-2021-014/",
    person: {
      user: { username: "s.ahmed@nexus.edu" },
      image: null,
      person_id: "NUM-EE-2021-014",
      first_name: "Sana",
      last_name: "Ahmed",
      father_name: "Tariq Ahmed",
      gender: "Female",
      dob: "1990-11-02",
      cnic: "35202-7654321-2",
      institutional_email: "s.ahmed@nexus.edu",
      personal_email: null,
      contact_number: "+92-301-9876543",
      religion: null,
      address: { country: "Pakistan", province: "Punjab", city: "Lahore", zipcode: 54000, street_address: null },
      qualification_set: [],
    },
    department: "EE",
    designation: "Assistant Professor",
    joining_date: "2021-01-15",
    courseallocation_set: [
      { urls: "/api/admin/allocations/171/", allocation_id: 171, faculty: "NUM-EE-2021-014", course: "EE-2101", semester: 7, session: "Fall 2026", status: "Ongoing" },
    ],
  },
  {
    url: "/api/admin/faculty/NUM-MATH-2016-002/",
    person: {
      user: { username: "j.khan@nexus.edu" },
      image: null,
      person_id: "NUM-MATH-2016-002",
      first_name: "Javeria",
      last_name: "Khan",
      father_name: "Rashid Khan",
      gender: "Female",
      dob: "1979-06-22",
      cnic: "35202-1112223-3",
      institutional_email: "j.khan@nexus.edu",
      personal_email: "javeria.k@gmail.com",
      contact_number: "+92-333-4445556",
      religion: "Islam",
      address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "5 University Road" },
      qualification_set: [
        { degree_title: "PhD Mathematics", education_board: null, passing_year: 2010, institution: "GIKI", total_marks: null, obtained_marks: null, is_current: false },
      ],
    },
    department: "MATH",
    designation: "Professor",
    joining_date: "2016-09-01",
    courseallocation_set: [],
  },
];

export const DESIGNATIONS: FacultyDesignation[] = [
  "Lab Engineer",
  "Lecturer",
  "Senior Lecturer",
  "Associate Professor",
  "Assistant Professor",
  "Professor",
];

export const GENDERS: Gender[] = ["Male", "Female", "Others"];

export function selectFacultyListRows(records: MockFacultyRecord[]): FacultyListRow[] {
  return records.map((f) => ({
    employeeId: f.person.person_id,
    name: `${f.person.first_name} ${f.person.last_name}`,
    image: f.person.image,
    department: f.department,
    designation: f.designation,
    joiningDate: f.joining_date,
    email: f.person.institutional_email,
    detailHref: `/admin/faculty/${f.person.person_id}`,
  }));
}

export function getFacultyById(employeeId: string): MockFacultyRecord | undefined {
  return mockFacultyDirectory.find((f) => f.person.person_id === employeeId);
}

/** Mirrors PersonSerializerMixin.create_mixin's flat input shape for model='Faculty' —
 * person_id/username are server-derived, never supplied here. */
export interface FacultyFormValue extends PersonFormShape {
  department: string;
  designation: FacultyDesignation;
  joining_date: string;
}

export function emptyFacultyFormValue(): FacultyFormValue {
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
    department: "CS",
    designation: "Lecturer",
    joining_date: "",
  };
}

export function facultyFormValueFromRecord(record: MockFacultyRecord): FacultyFormValue {
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
    department: record.department,
    designation: record.designation,
    joining_date: record.joining_date,
  };
}

/** Stand-in for POST /api/admin/faculty/ — mutates the in-memory mock array (there's no real
 * fetch() wired up yet anywhere in this app); person_id is generated the same way
 * create_mixin does: NUM-{department}-{year}-{count of faculty already in that department}. */
export function createFacultyRecord(input: FacultyFormValue): MockFacultyRecord {
  const year = new Date().getFullYear();
  const countInDept = mockFacultyDirectory.filter((f) => f.department === input.department).length;
  const personId = `NUM-${input.department}-${year}-${countInDept + 1}`;
  const record: MockFacultyRecord = {
    url: `/api/admin/faculty/${personId}/`,
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
    department: input.department,
    designation: input.designation,
    joining_date: input.joining_date,
    courseallocation_set: [],
  };
  mockFacultyDirectory.push(record);
  return record;
}

/** Stand-in for PUT/PATCH /api/admin/faculty/<employee_id>/ — update_mixin() semantics: person
 * fields, address, and model fields (department/designation/joining_date) all update in place. */
export function updateFacultyRecord(employeeId: string, input: FacultyFormValue): MockFacultyRecord | undefined {
  const record = getFacultyById(employeeId);
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
  record.department = input.department;
  record.designation = input.designation;
  record.joining_date = input.joining_date;
  return record;
}

/** Stand-in for DELETE /api/admin/faculty/<employee_id>/ — destroy_mixin() never hard-deletes;
 * it opens a pending ChangeRequest(change_type='faculty_delete') and emails a 48h confirmation
 * link. The row stays visible (flagged pendingDeletion) until an admin actually applies that
 * request (see removeFacultyRecord, called from ChangeRequestDetailPage) — there's no synchronous
 * "it's gone" response, and the real destroy_mixin() checks for an existing pending ChangeRequest
 * the same way this checks pendingDeletion. */
export function requestFacultyDeletion(employeeId: string): { message: string } {
  const record = getFacultyById(employeeId);
  if (!record) return { message: "Faculty record not found." };
  if (record.pendingDeletion) {
    return { message: `${record.person.person_id} already has a pending deletion request.` };
  }
  record.pendingDeletion = true;
  createChangeRequest({
    change_type: "faculty_delete",
    department: null,
    new_hod: null,
    target_allocation: null,
    target_faculty: employeeId,
    target_student: null,
    requested_by: 1,
  });
  return { message: `Deletion email has been sent successfully to ${record.person.person_id}` };
}

/** Stand-in for delete_faculty_task (AdminModule/tasks.py) — only ever called once an admin
 * applies the faculty_delete ChangeRequest (ChangeRequestSerializer.update()); this is the actual
 * hard delete, not requestFacultyDeletion() above. */
export function removeFacultyRecord(employeeId: string): boolean {
  const index = mockFacultyDirectory.findIndex((f) => f.person.person_id === employeeId);
  if (index === -1) return false;
  mockFacultyDirectory.splice(index, 1);
  return true;
}

/** For the Department detail page's faculty roster — mirrors what GET /api/admin/faculty/
 * ?department=<id> would return (FacultyListCreateAPIView.filterset_fields includes 'department'). */
export function getFacultyByDepartment(departmentId: string): MockFacultyRecord[] {
  return mockFacultyDirectory.filter((f) => f.department === departmentId);
}
