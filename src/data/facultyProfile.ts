import type { FacultyDesignation, FacultyProfileDetail } from "../types/api";
import type { PersonFormShape } from "../types/dashboard";
import { qualificationsToFormItems } from "./qualificationForm";

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
