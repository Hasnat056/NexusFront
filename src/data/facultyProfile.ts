import type { FacultyDesignation, FacultyProfileDetail } from "../types/api";
import type { PersonFormShape } from "../types/dashboard";
import { mockFacultyAllocations } from "./facultyAllocations";
import { qualificationFormItemsToWire, qualificationsToFormItems } from "./qualificationForm";

/**
 * Stand-in for GET /api/faculty/profile/ — the signed-in faculty member's own record. Same
 * person as data/facultyDashboard.ts's mockFacultyDashboardResponse.faculty (Marcus Webb,
 * NUM-FAC-2019-231) — kept in sync by hand, same tension already documented across this app's
 * other mock stores. courseallocation_set reuses mockFacultyAllocations directly.
 */
export const mockFacultyProfile: FacultyProfileDetail = {
  url: "http://localhost:8000/api/faculty/profile/",
  person: {
    user: { username: "m.webb@nexus.edu" },
    image: null,
    person_id: "NUM-FAC-2019-231",
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
  courseallocation_set: mockFacultyAllocations,
};

/** FacultySerializer locks these person fields read_only when a Faculty member edits their own
 * record — same mechanism as ADMIN_LOCKED_PERSON_FIELDS in data/adminProfile.ts. */
export const FACULTY_LOCKED_PERSON_FIELDS: (keyof PersonFormShape)[] = [
  "first_name",
  "last_name",
  "father_name",
  "cnic",
  "gender",
  "dob",
  "institutional_email",
];

/** Only the writable subset — department/designation/joining_date are read_only for Faculty's
 * own profile, so they're not part of the editable form at all. */
export interface FacultyProfileFormValue extends PersonFormShape {
  department: string;
  designation: FacultyDesignation;
  joining_date: string;
}

export function facultyProfileFormValueFromRecord(record: FacultyProfileDetail): FacultyProfileFormValue {
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

/** Stand-in for PUT /api/faculty/profile/ — only writes the fields FacultySerializer actually
 * leaves editable for Faculty's own profile; identity fields and department/designation/
 * joining_date are locked server-side and never sent even though PersonFormFields renders them
 * (read-only). */
export function updateFacultyProfile(input: FacultyProfileFormValue): FacultyProfileDetail {
  mockFacultyProfile.person.personal_email = input.personal_email || null;
  mockFacultyProfile.person.contact_number = input.contact_number;
  mockFacultyProfile.person.religion = input.religion || null;
  mockFacultyProfile.person.image = input.image;
  mockFacultyProfile.person.address = {
    country: input.address.country,
    province: input.address.province || null,
    city: input.address.city,
    zipcode: input.address.zipcode ? Number(input.address.zipcode) : null,
    street_address: input.address.street_address || null,
  };
  mockFacultyProfile.person.qualification_set = qualificationFormItemsToWire(input.qualification_set);
  return mockFacultyProfile;
}
