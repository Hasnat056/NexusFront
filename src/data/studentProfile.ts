import type { StudentProfileDetail } from "../types/api";
import type { PersonFormShape } from "../types/dashboard";
import { qualificationFormItemsToWire, qualificationsToFormItems } from "./qualificationForm";

/**
 * Stand-in for GET /api/student/profile/ — the signed-in student's own record
 * (AdminModule's StudentSerializer, reused by StudentProfileView). Same person as
 * data/studentDashboard.ts's mockStudentDashboardResponse (Lucia Ferreira, NUM-STU-2023-114)
 * and data/studentEnrollments.ts's enrollments — kept in sync by hand, same tension already
 * documented across this app's other mock stores.
 */
export const mockStudentProfile: StudentProfileDetail = {
  person: {
    user: { username: "l.ferreira@nexus.edu" },
    image: null,
    person_id: "NUM-STU-2023-114",
    first_name: "Lucia",
    last_name: "Ferreira",
    father_name: "Mateus Ferreira",
    gender: "Female",
    dob: "2004-11-02",
    cnic: "35202-9871234-5",
    institutional_email: "l.ferreira@nexus.edu",
    personal_email: "lucia.ferreira@gmail.com",
    contact_number: "+92-300-9871234",
    religion: "Christianity",
    address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "Hostel C, Room 214" },
    qualification_set: [
      { degree_title: "FSc Pre-Engineering", education_board: "BISE Mianwali", passing_year: 2022, institution: "Namal Degree College", total_marks: 1100, obtained_marks: 987, is_current: false },
    ],
  },
  program: "BS Computer Science",
  student_class: 12,
  admission_date: "2023-09-01",
  status: "Active",
};

/** get_fields() locks these person fields read_only whenever the caller is in the Student group
 * (self-editing) — first_name/last_name/father_name/person_id/institutional_email/cnic/gender/dob
 * all become read_only; person_id isn't part of PersonFormShape at all so it needs no entry here. */
export const STUDENT_LOCKED_PERSON_FIELDS: (keyof PersonFormShape)[] = [
  "first_name",
  "last_name",
  "father_name",
  "cnic",
  "gender",
  "dob",
  "institutional_email",
];

/** Only the writable subset — program/student_class/admission_date/status are read_only for a
 * Student editing their own record (get_extra_kwargs), so they're not part of the editable form. */
export type StudentProfileFormValue = PersonFormShape;

export function studentProfileFormValueFromRecord(record: StudentProfileDetail): StudentProfileFormValue {
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
  };
}

/** Stand-in for PUT /api/student/profile/ — only writes the fields the serializer actually
 * leaves editable for Student's own profile; identity and program/class/status fields are locked
 * server-side and never sent even though PersonFormFields renders them (read-only). */
export function updateStudentProfile(input: StudentProfileFormValue): StudentProfileDetail {
  mockStudentProfile.person.personal_email = input.personal_email || null;
  mockStudentProfile.person.contact_number = input.contact_number;
  mockStudentProfile.person.religion = input.religion || null;
  mockStudentProfile.person.image = input.image;
  mockStudentProfile.person.address = {
    country: input.address.country,
    province: input.address.province || null,
    city: input.address.city,
    zipcode: input.address.zipcode ? Number(input.address.zipcode) : null,
    street_address: input.address.street_address || null,
  };
  mockStudentProfile.person.qualification_set = qualificationFormItemsToWire(input.qualification_set);
  return mockStudentProfile;
}
