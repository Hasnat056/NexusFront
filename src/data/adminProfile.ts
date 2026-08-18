import type { AdminMaritalStatus, AdminSelfProfile } from "../types/api";
import type { PersonFormShape } from "../types/dashboard";
import { qualificationFormItemsToWire, qualificationsToFormItems } from "./qualificationForm";

/**
 * Stand-in for GET /api/admin/profile/ — the signed-in admin's own record (AdminProfileAPIView
 * reads `Admin.objects.filter(employee_id__user=request.user)`, so there's exactly one of
 * these per session, not a directory). Keeps the same person as mockAdminDashboardResponse.admin
 * (data/adminDashboard.ts) so the two stay consistent — Renata Hays.
 */
export const mockAdminProfile: AdminSelfProfile = {
  person: {
    user: { username: "r.hays@nexus.edu" },
    image: null,
    person_id: "NUM-ADM-2022-01",
    first_name: "Renata",
    last_name: "Hays",
    father_name: "Oswald Hays",
    gender: "Female",
    dob: "1982-04-09",
    cnic: "35202-5556667-8",
    institutional_email: "r.hays@nexus.edu",
    personal_email: "renata.hays@gmail.com",
    contact_number: "+92-300-5556677",
    religion: "Christianity",
    address: { country: "Pakistan", province: "Punjab", city: "Mianwali", zipcode: 42200, street_address: "Admin Block, Room 2" },
    qualification_set: [
      { degree_title: "MBA", education_board: null, passing_year: 2011, institution: "LUMS", total_marks: null, obtained_marks: null, is_current: false },
    ],
  },
  joining_date: "2022-02-01",
  leaving_date: null,
  marital_status: "Married",
  office_location: "Admin Block, Room 2",
  status: "Active",
};

export const MARITAL_STATUSES: AdminMaritalStatus[] = ["Single", "Married", "Divorced", "Widowed"];

/** AdminSerializer locks these person fields read_only whenever the caller is in the Admin
 * group — which is always true for this self-service endpoint. See types/api.ts::AdminSelfProfile. */
export const ADMIN_LOCKED_PERSON_FIELDS: (keyof PersonFormShape)[] = [
  "first_name",
  "last_name",
  "father_name",
  "cnic",
  "gender",
  "dob",
  "institutional_email",
];

/** Only the writable subset of AdminSerializer's fields — joining_date/leaving_date/status are
 * read_only for Admin's own profile, so they're not part of the editable form at all. */
export interface AdminProfileFormValue extends PersonFormShape {
  marital_status: AdminMaritalStatus;
  office_location: string;
}

export function adminProfileFormValueFromRecord(record: AdminSelfProfile): AdminProfileFormValue {
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
    marital_status: record.marital_status ?? "Single",
    office_location: record.office_location ?? "",
  };
}

/** Stand-in for PUT /api/admin/profile/ — only writes the fields AdminSerializer actually
 * leaves editable; first_name/last_name/father_name/cnic/gender/dob/institutional_email are
 * locked server-side and never sent even though PersonFormFields renders them (read-only). */
export function updateAdminProfile(input: AdminProfileFormValue): AdminSelfProfile {
  mockAdminProfile.person.personal_email = input.personal_email || null;
  mockAdminProfile.person.contact_number = input.contact_number;
  mockAdminProfile.person.religion = input.religion || null;
  mockAdminProfile.person.image = input.image;
  mockAdminProfile.person.address = {
    country: input.address.country,
    province: input.address.province || null,
    city: input.address.city,
    zipcode: input.address.zipcode ? Number(input.address.zipcode) : null,
    street_address: input.address.street_address || null,
  };
  mockAdminProfile.person.qualification_set = qualificationFormItemsToWire(input.qualification_set);
  mockAdminProfile.marital_status = input.marital_status;
  mockAdminProfile.office_location = input.office_location || null;
  return mockAdminProfile;
}
