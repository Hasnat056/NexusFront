import type { StudentProfileDetail } from "../types/api";
import type { PersonFormShape } from "../types/dashboard";
import { qualificationsToFormItems } from "./qualificationForm";

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
