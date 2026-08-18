/**
 * Wire types for NexusAPI responses. Field names and shapes mirror the backend
 * exactly (see AdminModule/views.py::AdminDashboardAPIView) — this is the
 * contract, not a UI-convenient reshaping of it. UI-facing types live in
 * ./dashboard.ts and are derived from these via the selectors in
 * src/data/adminDashboard.ts.
 */

export interface AdminProfile {
  admin_id: string;
  first_name: string;
  last_name: string;
  institutional_email: string;
  image: string | null;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ClassStudentCount {
  class_id: number;
  count: number;
}

export interface DepartmentDatum {
  department_id: string;
  student_count: number;
  faculty_count: number;
  program_count: number;
}

export interface YearlyCount {
  year: number;
  count: number;
}

export interface YearlyAdmissionRow {
  "program_id__department_id__department_name": string;
  year: number;
  count: number;
}

export interface AdminDashboardResponse {
  admin: AdminProfile;
  students_total: number;
  faculty_total: number;
  programs_total: number;
  courses_total: number;
  classes_total: number;
  allocation_total: number;
  enrollment_total: number;
  students_status_count: StatusCount[];
  allocations_status_count: StatusCount[];
  enrollments_status_count: StatusCount[];
  classes_student_count: ClassStudentCount[];
  departments_data: DepartmentDatum[];
  enrollment_yearly: YearlyCount[];
  yearly_admission: YearlyAdmissionRow[];
}

/**
 * GET /api/admin/requests/ (AdminModule/views.py::ChangeRequestListAPIView).
 * ChangeRequestSerializer uses `fields = "__all__"` plus a hyperlinked `urls`
 * field to the detail route — there is no server-rendered headline, so the
 * frontend builds one from change_type + whichever target field is set.
 * FK fields come back as the related PK only (no nested name), matching what
 * the serializer actually returns.
 */
export type ChangeRequestType = "hod_change" | "faculty_delete" | "student_delete" | "result_calculation";
export type ChangeRequestStatus = "pending" | "confirmed" | "declined" | "applied" | "expired";

export interface ChangeRequest {
  id: number;
  change_type: ChangeRequestType;
  status: ChangeRequestStatus;
  department: string | null;
  new_hod: string | null;
  target_allocation: number | null;
  target_faculty: string | null;
  target_student: string | null;
  requested_by: number;
  requested_at: string;
  confirmed_at: string | null;
  applied_at: string | null;
}

/**
 * GET /api/faculty/dashboard/ (FacultyModule/views.py::FacultyDashboardView).
 * allocation_average_success keys are allocation_id (JSON object keys are always
 * strings, but the Python dict is built with the int allocation_id — the
 * Swagger doc's "ALLOC-001" string-key example is stale/wrong, verified against
 * the actual view code).
 */
export interface FacultyProfile {
  employee_id: string;
  image: string | null;
  first_name: string;
  last_name: string;
  institutional_email: string;
}

export interface FacultyDashboardResponse {
  faculty: FacultyProfile;
  course_allocation_count: number;
  active_allocations: number;
  completed_allocations: number;
  allocation_average_success: Record<string, number>;
}

/**
 * GET /api/faculty/allocations/?status=Ongoing (FacultyModule/views.py::
 * FacultyCourseAllocationView). Shares AdminModule's CourseAllocationSerializer,
 * whose __init__ pops enrollment_set/lecture_set/assessment_set whenever it's
 * serializing a list (self.instance isn't a single CourseAllocation) — so list
 * rows never carry those nested fields, only the detail view does. `course` is
 * the bare Course PK (course_code) — there's no nested course_name here.
 */
export type CourseAllocationStatus = "Inactive" | "Ongoing" | "Completed" | "Cancelled";

export interface FacultyCourseAllocation {
  urls: string;
  allocation_id: number;
  faculty: string;
  course: string;
  semester: number;
  session: string;
  status: CourseAllocationStatus;
  result_calculation_url: string;
}

/**
 * GET/PUT /api/faculty/profile/ (FacultyModule/views.py::FacultyProfileView) — the signed-in
 * faculty member's own record, reusing AdminModule's FacultySerializer (AdminModule/serializers.py)
 * the same way Admin's own faculty-editing views do. When the caller is in the Faculty group
 * editing their own record, `department`, `designation`, `joining_date` are always read-only,
 * plus these PersonSerializer sub-fields: `user`, `person_id`, `first_name`, `last_name`,
 * `father_name`, `cnic`, `dob`, `gender`, `institutional_email`. Writable: `personal_email`,
 * `contact_number`, `religion`, `address`, `qualification_set`, `image`.
 */
export interface FacultyProfileDetail {
  url: string;
  person: PersonRecord;
  department: string;
  designation: FacultyDesignation;
  joining_date: string;
  courseallocation_set: FacultyCourseAllocation[];
}

/**
 * GET /api/faculty/requests/ (FacultyModule/views.py::FacultyRequestsListView).
 * Filtered to `requested_by=self.request.user` — this is faculty's own
 * submitted requests (in practice almost always change_type="result_calculation",
 * created via the calculate-result action), a status tracker, not an approval
 * queue like Admin's list. Note: no `id` field in FacultyRequestsSerializer —
 * only `urls`, which embeds the pk.
 */
export interface FacultyChangeRequest {
  urls: string;
  change_type: ChangeRequestType;
  status: ChangeRequestStatus;
  target_allocation: number | null;
  requested_by: number;
  requested_at: string;
  confirmed_at: string | null;
  applied_at: string | null;
}

/** Shared by AssessmentChecked and Attendance — both nest a computed summary of the enrolled
 * student rather than a bare FK, so a faculty grading/marking view doesn't need a second lookup. */
export interface RosterStudentInfo {
  image: string | null;
  student_id: string;
  first_name: string;
  last_name: string;
}

/**
 * GET/PUT /api/faculty/allocations/<id>/ (FacultyModule/views.py::FacultyCourseAllocationRetrieveView)
 * — the single-instance view of a faculty's own allocation, which (unlike the list view backing
 * FacultyCourseAllocation above) nests enrollment_set/lecture_set/assessment_set. On PUT, `faculty`,
 * `course`, `semester`, `status`, `session` are all read-only for Faculty — this endpoint is
 * read-only in practice for the allocation's own fields; the nested sets are managed through their
 * own dedicated endpoints below, not by PUTting this resource.
 */
export interface FacultyAllocationDetail extends FacultyCourseAllocation {
  enrollment_set: AdminEnrollmentSummary[];
  lecture_set: Lecture[];
  assessment_set: Assessment[];
}

/**
 * Nested under Assessment.assessmentchecked_set — one row per enrolled student, auto-created
 * (one per Enrollment) when the Assessment itself is created. For Faculty editing an existing
 * instance, `student_upload` is forced read-only (only the student can upload their own
 * submission) — Faculty can only set `obtained`. validate_obtained rejects marks above the
 * assessment's total_marks. Named distinctly from the pre-existing (Student-facing) `AssessmentChecked`
 * below — same model, a different serializer (FacultyModule's AssessmentCheckedSerializer nests
 * `student_info` and omits `urls`; the student-facing one is the reverse).
 */
export interface FacultyAssessmentChecked {
  id: number;
  assessment: number;
  enrollment: number;
  obtained: number | null;
  student_upload: string | null;
  student_info: RosterStudentInfo;
}

/**
 * GET/POST /api/faculty/allocations/<id>/assessments/ (AssessmentListCreateAPIView) and
 * GET/PUT/PATCH/DELETE /api/faculty/allocations/<id>/assessments/<assessment_id>/
 * (AssessmentRetrieveUpdateDestroyAPIView) — full CRUD, Faculty-only (object-permission checks
 * `allocation.faculty.employee_id.user == request.user`; Admin gets read-only). `create()`
 * auto-creates one AssessmentChecked row per currently-enrolled student. If the allocation's
 * status is 'Completed', every field here becomes read-only. validate(): the sum of `weightage`
 * across all of this allocation's assessments can't exceed 100; `assessment_type`+
 * `assessment_name` can't duplicate an existing assessment; `student_submission=true` requires a
 * `submission_deadline`. DELETE cascades to remove every assessmentchecked_set row first.
 */
export interface Assessment {
  urls: string;
  assessment_id: number;
  allocation: number;
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  weightage: number;
  total_marks: number;
  student_submission: boolean;
  submission_deadline: string | null;
  assessmentchecked_set: FacultyAssessmentChecked[];
}

/** Nested under Lecture.attendance_set — one row per enrolled student, auto-created when the
 * lecture itself is created. Marking attendance means PUT/PATCH-ing the parent Lecture with an
 * updated attendance_set (`{enrollment, is_present}` pairs) — there's no standalone attendance
 * endpoint. */
export interface Attendance {
  id: number;
  attendance_date: string;
  lecture: number;
  enrollment: number;
  is_present: boolean;
  student_info: RosterStudentInfo;
}

/**
 * GET/POST /api/faculty/allocations/<id>/lectures/ (LectureListCreateAPIView) and
 * GET/PUT/PATCH/DELETE /api/faculty/allocations/<id>/lectures/<lecture_id>/
 * (LectureRetrieveUpdateDestroyAPIView) — full CRUD, Faculty-only, same per-allocation ownership
 * check as Assessment. `lecture_id` is server-generated as "{allocation_id}-{lecture_no}";
 * `lecture_no` auto-increments and, like `allocation`, is always read-only. `create()` auto-
 * creates one Attendance row per enrolled student unless attendance_set is supplied directly (in
 * which case the given enrollments are validated against the allocation's actual roster).
 * validate_starting_time rejects timestamps in the future.
 */
export interface Lecture {
  urls: string;
  lecture_id: string;
  lecture_no: number;
  allocation: number;
  starting_time: string;
  venue: string;
  duration: number;
  topic: string;
  attendance_set: Attendance[];
}

/**
 * GET /api/student/dashboard/ (StudentModule/views.py::StudentDashboardView).
 * Response is a flat dict (built field-by-field into student_data), not nested
 * under a "student" key like Admin/Faculty's dashboards.
 */
export interface StudentDashboardResponse {
  student_id: string;
  first_name: string;
  last_name: string;
  institutional_email: string;
  class: string;
  program: string;
  department: string;
  image: string | null;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
}

/**
 * GET /api/student/enrollments/?status=Active (StudentModule/views.py::
 * StudentEnrollmentsListView + serializers). Paginated
 * (DEFAULT_PAGINATION_CLASS=PageNumberPagination, PAGE_SIZE=10).
 */
export interface FacultyDetails {
  teacher_id: string;
  first_name: string;
  last_name: string;
}

export interface CourseDetails {
  course_code: string;
  course_name: string;
  credit_hours: number;
  lab: boolean;
  pre_requisite: string | null;
}

/**
 * assessmentchecked_set is a single object (not an array, despite the model's
 * `_set` name) — StudentAssessmentSerializer.to_representation() scopes it to
 * the requesting student via .first(); null if no AssessmentChecked row exists
 * yet for this student+assessment.
 */
export interface AssessmentChecked {
  urls: string;
  id: number;
  assessment: number;
  enrollment: number;
  obtained: number | null;
  student_upload: string | null;
}

/**
 * submission_deadline is only ever present when it's still in the future —
 * to_representation() strips the key entirely otherwise (not null). Treat its
 * absence as "no open deadline," never as "overdue."
 */
export interface StudentAssessment {
  assessment_id: number;
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  total_marks: number;
  submission_deadline?: string;
  assessmentchecked_set: AssessmentChecked | null;
}

export interface StudentAllocationDetails {
  faculty_details: FacultyDetails | Record<string, never>;
  course_details: CourseDetails | null;
  semester_id: number;
  session: string;
  assessment_set: StudentAssessment[];
}

export type EnrollmentStatus = "Inactive" | "Active" | "Completed" | "Dropped";

export interface StudentEnrollment {
  url: string;
  enrollment_id: number;
  student: string;
  allocation: number;
  status: EnrollmentStatus;
  allocation_details: StudentAllocationDetails;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type StudentEnrollmentsResponse = PaginatedResponse<StudentEnrollment>;

/** Nested under StudentAttendanceSummary.attendance_details — one row per lecture the student's
 * enrollment has an Attendance record for (StudentModule/serializers.py::AttendanceSerializer).
 * Bare `lecture` is the Lecture pk, not a nested object — there's no course context here because
 * the parent object already carries course_details. */
export interface LectureAttendanceEntry {
  lecture: number;
  attendance_date: string;
  is_present: boolean;
}

/**
 * GET /api/student/attendance/ (list, one per enrollment) and GET /api/student/attendance/<enrollment_id>/
 * (StudentModule/views.py::StudentAttendanceListAPIView/StudentAttendanceRetrieveAPIView,
 * StudentAttendanceSerializer). Unlike StudentAllocationDetails, this is course-attendance-only —
 * no assessment_set. `percentage` is server-computed (attended/total, rounded, 0 if no lectures
 * yet) — never derive it client-side from attendance_details since rounding could drift.
 */
export interface StudentAttendanceSummary {
  url: string;
  faculty_details: FacultyDetails | null;
  course_details: CourseDetails | null;
  attendance_details: LectureAttendanceEntry[];
  percentage: number;
}

/**
 * GET/PUT/PATCH /api/student/profile/ (StudentModule/views.py::StudentProfileView, reusing
 * AdminModule's StudentSerializer). `url` and `enrollment_set` are both popped by the serializer's
 * __init__ whenever the requester is in the Student group — this is a self-view, not a directory
 * entry, so neither field is ever present here (unlike AdminStudentDetail, which is Admin's own
 * shape for the same underlying model and does carry both).
 */
export interface StudentProfileDetail {
  person: PersonRecord;
  program: string;
  student_class: number;
  admission_date: string;
  status: StudentStatus;
}

/**
 * GET/POST /api/student/<student_id>/enrollments/reviews/ and .../enrollments/<enrollment_id>/reviews/
 * (StudentModule/views.py::ReviewListAPIView/ReviewCreateAPIView/ReviewRetrieveUpdateDestroyAPIView,
 * ReviewsSerializer). `review_id`, `enrollment`, `timestamp` are all read-only — only `review_text`/
 * `rating` are ever written. ReviewPermission blocks DELETE for everyone (Student included) — a
 * review can be created and edited but never removed via the API, so no delete action exists.
 * Faculty/Admin get read-only access (SAFE_METHODS only); Student can only see/edit their own.
 */
export interface Review {
  urls: string;
  review_id: number;
  enrollment: number;
  review_text: string;
  rating: number;
  timestamp: string;
}

/**
 * GET/POST /api/student/enrollments/create/ (StudentModule/views.py::
 * StudentEnrollmentCreateAPIView). The whole endpoint 403s (StudentEnrollmentCreatePermission)
 * when the enrollment-window cache key isn't set — "window closed" isn't a
 * field here, it's the request failing entirely. `confirm` is stamped onto
 * each row by the view itself; `faculty_data`/`course_data` come from whatever
 * AdminModule/tasks.py::cache_semester_enrollment_data_task wrote into the
 * `enrollments:{class_id}:semester:allocations` cache key in the first place
 * (it builds one row per CourseAllocation with `.select_related('faculty__
 * employee_id', 'course')`) — the view passes those keys through untouched,
 * so they're present on every real row even though the test fixtures only
 * ever prime the bare allocation_id/confirm shape.
 */
export interface EnrollmentCreateAllocation {
  allocation_id: number;
  confirm: boolean;
  faculty_data: {
    faculty_id: string;
    faculty_name: string;
  };
  course_data: {
    course_code: string;
    course_name: string;
    credit_hours: number;
    lab: boolean;
  };
}

/**
 * Admin Faculty/Student directory — GET/POST /api/admin/faculty/, /api/admin/students/,
 * GET/PUT/PATCH/DELETE /api/admin/faculty/<employee_id>/, /api/admin/students/<student_id>/
 * (AdminModule/views.py::FacultyListCreateAPIView, FacultyRetrieveUpdateAPIView,
 * StudentListCreateAPIView, StudentRetrieveUpdateAPIView). Both serializers extend
 * PersonSerializerMixin and nest a `person` object (Meta.source='employee_id'/'student_id',
 * but the wire field is always called "person" — `source` only renames the internal
 * attribute, not the JSON key). DELETE never hard-deletes: PersonSerializerMixin.destroy_mixin()
 * creates a pending ChangeRequest (change_type "faculty_delete"/"student_delete") and emails
 * the person a confirmation link that expires in 48h; the row still exists until that link is
 * clicked. `courseallocation_set`/`enrollment_set` are popped by the serializer's __init__
 * whenever self.instance isn't a single model instance, so LIST rows never carry them — only
 * RETRIEVE does (same list-vs-detail pattern as CourseAllocationSerializer, confirmed earlier
 * for Faculty/Student's own dashboards).
 */
export type Gender = "Male" | "Female" | "Others";

/** UserSerializer: username is always read_only, password is always write_only — they never
 * appear in the same request/response. GET responses carry {username}; POST/PUT bodies that set
 * a password carry {password} (create_mixin derives username from institutional_email server-side). */
export interface PersonUser {
  username?: string;
  password?: string;
}

export interface PersonAddress {
  country: string;
  province?: string | null;
  city: string;
  zipcode?: number | null;
  street_address?: string | null;
}

export interface PersonQualification {
  degree_title: string;
  education_board?: string | null;
  passing_year?: number | null;
  institution: string;
  total_marks?: number | null;
  obtained_marks?: number | null;
  is_current: boolean;
}

/** person_id is read-only — server-generates it as NUM-{department/program}-{year}-{count} in
 * PersonSerializerMixin.create_mixin, it's never client-supplied. */
export interface PersonRecord {
  user: PersonUser;
  image: string | null;
  person_id: string;
  first_name: string;
  last_name: string;
  father_name: string;
  gender: Gender;
  dob: string;
  cnic: string;
  institutional_email: string;
  personal_email?: string | null;
  contact_number: string;
  religion?: string | null;
  address?: PersonAddress;
  qualification_set?: PersonQualification[];
}

export type FacultyDesignation =
  | "Lab Engineer"
  | "Lecturer"
  | "Senior Lecturer"
  | "Associate Professor"
  | "Assistant Professor"
  | "Professor";

export type StudentStatus = "Active" | "Dropped" | "Frozen" | "Graduated" | "On Probation";

/**
 * Nested courseallocation_set item — same base CourseAllocationSerializer used elsewhere, but
 * here it's the plain Admin serializer (no faculty-scoped `urls`/`result_calculation_url` that
 * FacultyCourseAllocation adds), and its own enrollment_set/lecture_set/assessment_set are popped
 * too since it's serialized with many=True (self.instance is the queryset, not one row).
 *
 * This exact shape is also what GET/POST /api/admin/allocations/ and GET/PUT/PATCH/DELETE
 * /api/admin/allocations/<id>/ return (AdminModule/views.py::CourseAllocationListCreateAPIView,
 * CourseAllocationRetrieveUpdateDestroyAPIView) — used directly as the standalone CRUD resource
 * type in data/allocationDirectory.ts, since this frontend doesn't model the extra
 * assessment_set/enrollment_set/lecture_set the real detail view nests (Assessment/Lecture aren't
 * built as resources here).
 *
 * `unique_together = ('faculty', 'course', 'semester')` on the model (Models/models.py::
 * CourseAllocation). `session` is a plain string copied from `semester.session` at creation time
 * (not a live FK) and is never client-writable, same as `status` — CourseAllocationSerializer
 * never lets either be set directly through this endpoint. get_fields() restricts the writable
 * `semester` choices to Semester rows that are status='Inactive' AND whose session.status ==
 * 'Initiated' (plus the semester's own activation_deadline must be set — not tracked in this
 * frontend, see data/allocationDirectory.ts's eligibleSemestersForAllocation()); create() also
 * 400s if the chosen `course` isn't one of that semester's scheme_of_studies courses.
 * AdminCourseAllocationPermissions additionally locks the whole record read-only for Admin once
 * `status` moves past 'Inactive' (Ongoing/Completed/Cancelled) — no edit, no delete.
 */
export interface AdminCourseAllocationSummary {
  urls: string;
  allocation_id: number;
  faculty: string;
  course: string;
  semester: number;
  session: string;
  status: CourseAllocationStatus;
}

export interface AdminFacultyListItem {
  url: string;
  person: PersonRecord;
  department: string;
  designation: FacultyDesignation;
  joining_date: string;
}

export interface AdminFacultyDetail extends AdminFacultyListItem {
  courseallocation_set: AdminCourseAllocationSummary[];
}

/**
 * Nested enrollment_set item — EnrollmentSerializer as used directly (not Student-scoped);
 * `result`/`student_info` are SerializerMethodFields, null until a Result row exists.
 *
 * This shape is also what GET/POST /api/admin/enrollments/ and GET/PUT/PATCH/DELETE
 * /api/admin/enrollments/<id>/ return (AdminModule/views.py::EnrollmentListCreateAPIView,
 * EnrollmentRetrieveUpdateDestroyAPIView) — used directly as the standalone CRUD resource type in
 * data/enrollmentDirectory.ts. The real serializer also carries a `reviews` field
 * (ReviewsSerializer, read-only) not modeled here since Reviews isn't built as its own resource.
 *
 * `enrollment_date` is `auto_now_add`, never client-writable. `unique_together = ('student',
 * 'allocation')` on the model (Models/models.py::Enrollment) — one enrollment per student per
 * allocation. get_fields() restricts the writable `allocation` choices to CourseAllocation rows
 * with status='Ongoing'; create() also auto-creates a blank Result row and an AssessmentChecked
 * row per existing Assessment on that allocation (side effects, not modeled here). Deletion is
 * blocked once `result.course_gpa` is set (EnrollmentRetrieveUpdateDestroyAPIView.perform_destroy
 * raises PermissionDenied) and once `status` is 'Completed' (permission layer, GET-only past
 * that point).
 */
export interface AdminEnrollmentResult {
  result_id: number;
  obtained_marks: number;
  course_gpa: number;
}

export interface AdminEnrollmentSummary {
  urls: string;
  enrollment_id: number;
  student: string;
  student_info: { student_id: string; student_name: string } | null;
  allocation: number;
  enrollment_date: string;
  status: EnrollmentStatus;
  result: AdminEnrollmentResult | null;
}

export interface AdminStudentListItem {
  url: string;
  person: PersonRecord;
  program: string;
  student_class: number;
  admission_date: string;
  status: StudentStatus;
}

export interface AdminStudentDetail extends AdminStudentListItem {
  enrollment_set: AdminEnrollmentSummary[];
}

export type AdminFacultyListResponse = PaginatedResponse<AdminFacultyListItem>;
export type AdminStudentListResponse = PaginatedResponse<AdminStudentListItem>;

/**
 * GET/PUT /api/admin/profile/ (AdminModule/views.py::AdminProfileAPIView, AdminSerializer).
 * This is an admin editing THEIR OWN record, not the Faculty/Student directory's admin-manages-
 * others case — AdminSerializer.get_fields()/get_extra_kwargs() lock a much larger set of fields
 * read_only whenever `request.user.groups.filter(name='Admin').exists()`, which is always true
 * here: first_name, last_name, father_name, person_id, institutional_email, cnic, gender, dob,
 * user, plus joining_date/leaving_date/status on the Admin model itself. Only personal_email,
 * contact_number, religion, image, address, qualification_set, marital_status, and
 * office_location are actually writable through this endpoint. No `url`/courseallocation_set-style
 * nested list — Admin has no such relation — and no DELETE (self-service, not directory management).
 */
export type AdminMaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";
export type AdminStatus = "Active" | "Suspended" | "Acting";

export interface AdminSelfProfile {
  person: PersonRecord;
  joining_date: string;
  leaving_date: string | null;
  marital_status: AdminMaritalStatus | null;
  office_location: string | null;
  status: AdminStatus;
}

/**
 * GET /api/admin/departments/ (list, no create) and GET/PUT/PATCH /api/admin/departments/<department_id>/
 * (AdminModule/views.py::DepartmentListAPIView, DepartmentRetrieveUpdateAPIView; DepartmentSerializer,
 * Meta.fields = '__all__'). DepartmentPermissions caps non-superuser Admins at GET/PUT/PATCH —
 * there's no POST or DELETE anywhere on this resource, so departments are provisioned outside this
 * API entirely (this is Retrieve+Update only, no Create/Delete, despite what "Department CRUD"
 * might suggest). On update, department_name and department_inauguration_date become read_only
 * (DepartmentSerializer.get_extra_kwargs) — HOD is the "writable" field, but PUTting a new HOD does
 * NOT set it directly: DepartmentSerializer.update() pops HOD out of validated_data and instead
 * creates a ChangeRequest(change_type='hod_change', department=this, new_hod=<faculty>,
 * status='pending') and emails a confirmation link — this.HOD is left untouched by the PUT itself.
 * The field only actually changes once that ChangeRequest is later moved to status='applied' via
 * PATCH /api/admin/requests/<pk>/ (ChangeRequestSerializer.update(), change_type == 'hod_change'
 * branch) — same "PUT only opens a pending ChangeRequest; a separate applied-status PATCH performs
 * the real mutation" shape as Faculty/Student deletion (PersonSerializerMixin.destroy_mixin +
 * ChangeRequestSerializer.update()'s faculty_delete/student_delete branches).
 */
export interface AdminDepartment {
  urls: string;
  department_id: string;
  department_name: string;
  department_inauguration_date: string | null;
  HOD: string | null;
}

/**
 * GET/POST /api/admin/programs/ and GET/PUT/PATCH/DELETE /api/admin/programs/<program_id>/
 * (AdminModule/views.py::ProgramListCreateAPIView, ProgramRetrieveUpdateDestroyAPIView;
 * ProgramSerializer, Meta.fields = '__all__', no extra_kwargs overrides at all). Unlike
 * Faculty/Student, program_id is a genuine client-supplied required field on create (Program.
 * program_id is a plain CharField primary_key=True with no server-side generation) and DELETE is
 * a real, synchronous `instance.delete()` — no ChangeRequest gate, no confirmation email, unlike
 * every other delete path in this API. filterset_fields=['department','total_semesters'],
 * search_fields=['program_id','program_name']. `department` is the bare Department pk (no nested
 * name), same bare-FK pattern used throughout this API.
 */
export interface AdminProgram {
  urls: string;
  program_id: string;
  program_name: string;
  department: string;
  total_semesters: number;
  fee_per_semester: number | null;
}

/**
 * GET/POST /api/admin/sessions/ and GET/PUT/PATCH /api/admin/sessions/<id>/ (AdminModule/
 * views.py::SessionListCreateAPIView, SessionRetrieveUpdateAPIView; SessionSerializer). No
 * DELETE at all — not even a ChangeRequest-gated one, this resource simply can't be removed
 * through the API. `unique_together = ('period', 'year')` on the model (Models/models.py::
 * AcademicSession), so e.g. only one "Fall 2026" can ever exist.
 *
 * `status` is always read_only — the client can never set it directly. It only ever moves via
 * SessionSerializer.update()'s two special branches, and only one branch runs per request
 * (whichever field is present in the payload takes over the whole update):
 *   - payload includes `activation_deadline` → every field in the payload is applied, then
 *     status is forced to 'Initiated' synchronously, and two Celery tasks are scheduled:
 *     session_availability_task (eta=availability_deadline, sets status → 'Available' — note
 *     availability_deadline = activation_deadline - availability_delta days, so this fires
 *     *before* activation_deadline) and session_activation_task (eta=activation_deadline, sets
 *     status → 'Active'). Any previously-scheduled tasks for this session are revoked first, so
 *     resubmitting activation_deadline reschedules cleanly.
 *   - payload includes `closing_deadline` (and not `activation_deadline`) → only that one field
 *     is written, then session_closing_task is scheduled (eta=closing_deadline, sets status →
 *     'Completed'). closing_deadline is itself read_only unless the session's current status is
 *     already 'Active' (SessionSerializer.get_extra_kwargs).
 *   - otherwise → a plain field update (e.g. availability_delta alone, before activation).
 * `year` is client-supplied on create but becomes read_only on every subsequent update.
 * `availability_deadline` is a read-only computed property, never stored or writable.
 * Validation: year can't be in the past; activation_deadline can't be in the past or more than
 * 4 weeks out; closing_deadline can't be in the past and must be after activation_deadline.
 */
export type SessionPeriod = "Fall" | "Spring";
export type SessionStatus = "Inactive" | "Initiated" | "Available" | "Active" | "Completed";

export interface AdminSession {
  url: string;
  id: number;
  period: SessionPeriod;
  year: number;
  status: SessionStatus;
  activation_deadline: string | null;
  availability_delta: number;
  availability_deadline: string | null;
  closing_deadline: string | null;
}

/**
 * GET/POST /api/admin/courses/ and GET/PUT/PATCH/DELETE /api/admin/courses/<course_code>/
 * (AdminModule/views.py::CourseListCreateAPIView, CourseRetrieveUpdateDestroyAPIView;
 * CourseSerializer, Meta.fields = '__all__'). Like Program: course_code is a genuine
 * client-supplied CharField primary key (no server generation), and DELETE is a real synchronous
 * `instance.delete()` — no ChangeRequest gate. filterset_class=CourseFilter gives `prefix`
 * (course_code startswith, choices built from the distinct prefixes actually in the DB — the
 * part before the first "-"), `lab`, and `pre_requisite` (exact FK match); search_fields =
 * course_code, course_name, pre_requisite__course_code.
 *
 * The one real quirk: credit_hours isn't stored as submitted. validate_credit_hours only checks
 * the raw submitted value is in [0, 5] — that check runs *before* these adjustments, so it's
 * possible to end up with a stored value outside that range:
 *   - create(): if lab is true, credit_hours is incremented by 1 before saving (submit the
 *     lecture credit hours; the lab component is added automatically).
 *   - update(): if `lab` is present in the payload and its value is actually changing —
 *     True→False decrements credit_hours by 1, False→True increments it by 1 (using whatever
 *     credit_hours value is also in the payload, or the instance's current one otherwise).
 * `pre_requisite` is the bare course_code of another Course (self-referencing FK) or null —
 * same bare-FK pattern used throughout this API.
 */
export interface AdminCourse {
  urls: string;
  course_code: string;
  course_name: string;
  credit_hours: number;
  lab: boolean;
  pre_requisite: string | null;
  description: string | null;
}

/**
 * GET/POST /api/admin/classes/ and GET/PUT/PATCH /api/admin/classes/<class_id>/
 * (AdminModule/views.py::ClassListCreateAPIView, ClassRetrieveUpdateAPIView; ClassSerializer).
 * No DELETE at all — like Session, this resource can't be removed through the API.
 * filterset_fields = ['program', 'program__department', 'batch_year']; search_fields =
 * ['program', 'batch_year']. Unlike Session, there's no unique_together on (program, batch_year)
 * at the model level (Models/models.py::Class) — duplicate classes for the same program/year are
 * not blocked.
 *
 * `scheme_of_studies` is NOT a real model field — Class only has class_id, program, batch_year.
 * It's a custom write-only-shaped/read-computed field (SchemeOfStudiesField):
 *   - On read: lists every Semester row associated with this class (SemesterClassSerializer),
 *     each carrying its own session, status, and assigned course(s) (via the SemesterDetails
 *     join table, semesterdetails_set). null if the class somehow has zero semesters.
 *   - On create: ClassSerializer.create() ignores whatever scheme_of_studies is submitted and
 *     instead auto-generates Program.total_semesters blank Semester rows (numbered 1..N, each
 *     with one blank/null SemesterDetails row) — so a class's semester scaffold always comes from
 *     its program's total_semesters at creation time, never from client input on create.
 *   - On update: submitting scheme_of_studies (a list of {semester_id, semesterdetails_set,
 *     session?}) assigns a session and/or course(s) to existing semesters. For each entry: 404s
 *     if semester_id doesn't belong to an existing Semester. If semesterdetails_set has more than
 *     one row, or exactly one row with a non-null course, every existing SemesterDetails row for
 *     that semester is deleted and recreated from the given course codes (404 if any course code
 *     is invalid) — submitting a single {course: null} row is a no-op that leaves existing rows
 *     untouched, so there's no direct "clear to zero courses" short of submitting 2+ null rows.
 *     `session` (if present in the entry) reassigns semester.session directly with no validation.
 *   - `status` on each semester is read-only through this path — nothing here ever writes it.
 */
export type SemesterStatus = "Active" | "Inactive" | "Completed";

export interface ClassSchemeCourse {
  course: string | null;
  course_name: string;
  semester: number;
}

export interface ClassSchemeSemester {
  urls: string;
  semester_id: number;
  semester_no: number;
  session: number | null;
  status: SemesterStatus;
  semesterdetails_set: ClassSchemeCourse[];
}

export interface AdminClass {
  urls: string;
  class_id: number;
  program: string;
  batch_year: number | null;
  scheme_of_studies: ClassSchemeSemester[] | null;
}

/**
 * GET /api/admin/semesters/ (SemesterListAPIView — list-only, no create; semesters only ever come
 * into existence via ClassSerializer.create()'s auto-scaffold) and GET/PUT/PATCH /api/admin/
 * semesters/<semester_id>/ (SemesterRetrieveUpdateAPIView, name='semester-detail' — no destroy
 * either). A different serializer (SemesterSerializer) than the one Class's nested scheme_of_studies
 * uses (SemesterClassSerializer above) — this one adds the real lifecycle fields that view never
 * exposes.
 *
 * `associated_class` is a SerializerMethodField returning a string repr (Class.__str__, e.g.
 * "CS-BS-2023"), not the class_id — there's no PK to link back to the class's own detail page from
 * this field alone. `semester_no` and `status` are always read-only; `status` only ever moves via
 * semester_activation_task/semester_closing_task, Celery jobs scheduled with eta=activation_deadline
 * /eta=closing_deadline respectively (not modeled here — no scheduler in this mock, same
 * simplification already applied to AcademicSession's status transitions in data/sessionDirectory.ts).
 *
 * get_extra_kwargs() dynamic locking:
 *   - activation_deadline unset → closing_deadline locked (can't close before activating).
 *   - activation_deadline set and already past → activation_deadline AND session locked.
 *   - activation_deadline set, still future, status still Inactive → closing_deadline locked
 *     (can't close a semester that hasn't activated yet).
 *   - both deadlines set and closing_deadline already past → activation_deadline, closing_deadline,
 *     and session all locked (fully historical).
 * validate_activation_deadline/validate_closing_deadline reject past dates and, per the real
 * backend, anything less than 7 minutes out — a very tight window, likely a bug in that code,
 * reproduced here rather than silently loosened.
 *
 * update() with activation_deadline also 400s if the semester's class already has another semester
 * that's Active, or another Inactive semester with its own activation_deadline already scheduled —
 * only one semester per class can be active or activating at a time. update() with closing_deadline
 * 400s unless every enrollment under this semester's allocations already has a Result with a
 * course_gpa set.
 *
 * The real payload also nests `semesterdetails_set`/`courseallocation_set`/`transcript_set`
 * (read-only) — not independently re-typed here since equivalent data already exists in this
 * frontend via data/semesterDirectory.ts (course codes) and data/allocationDirectory.ts
 * (allocations), composed directly on the Semester detail page instead of duplicated in this type.
 */
export interface AdminSemester {
  url: string;
  transcript_generation_url?: string;
  semester_id: number;
  semester_no: number;
  session: number | null;
  status: SemesterStatus;
  activation_deadline: string | null;
  closing_deadline: string | null;
  associated_class: string;
}

/**
 * GET/POST /api/admin/transcripts/ (TranscriptListCreateAPIView, AdminModule/urls.py:44;
 * TranscriptSerializer, AdminModule/serializers.py:808-849). `Meta.fields` is exactly
 * `['student','semester','total_credits','semester_gpa']` — no `id`/`url` field at all, and there
 * is no RetrieveUpdateDestroyAPIView for Transcript anywhere in the backend, so there's no detail
 * route and no way to edit or delete one once created. `unique_together = ('student','semester')`
 * on the model (Models/models.py::Transcript) — one transcript per student per semester.
 * `total_credits`/`semester_gpa` are always read-only, computed server-side, never client-supplied.
 *
 * A Transcript is purely a semester-level summary snapshot — student, semester, total credit
 * hours, and a semester GPA (0.00-4.00, `CheckConstraint`). No cumulative/CGPA field, no
 * course-by-course breakdown, no generated file or document URL — it's just these two numbers.
 *
 * The real single-record POST here (TranscriptSerializer.create()) is a thinner, less-guarded path
 * than the intended bulk workflow: it silently returns `None` (no error) if the student has no
 * enrollments in that semester, or if any of them aren't 'Completed' — worth knowing if this
 * endpoint is ever called directly, but the real admin workflow is the bulk one below.
 *
 * POST /api/admin/semesters/<semester_id>/transcripts-create/ (TranscriptBulkCreateAPIView,
 * urls.py:33, name='semester-transcripts-create'; BulkTranscriptSerializer, serializers.py:854-924)
 * is the real generation workflow — body is just `{"confirm": true}`, semester comes from the URL.
 * `create()`: 400s immediately if `semester.status == 'Completed'` ("Transcripts already exists" —
 * this checks status as a proxy, not the Transcript table itself); then, for every student enrolled
 * under this semester's allocations, 400s (listing every offending student, transaction rolled
 * back, nothing created) if any of their enrollments lack a Result with `course_gpa` set. Only then,
 * per student with every enrollment 'Completed', it computes `semester_gpa` as the credit-hour-
 * weighted average of `course_gpa` across their enrollments and `total_credits` as the summed
 * credit hours — 400s immediately (aborting the whole batch) if that sum is 0 for any student.
 * Students whose enrollments aren't all 'Completed' are silently skipped (no transcript, no error) —
 * same quirk as the single-record path. No Celery task, no file generation, no email sent.
 *
 * `transcript_generation_url` on AdminSemester above is only present once `closing_deadline` is
 * set (SerializerMethodField gated on that, not on `status`) — this frontend mirrors that as the
 * visibility condition for a "Generate transcripts" action on the semester detail page.
 */
export interface AdminTranscript {
  student: string;
  semester: number;
  total_credits: number;
  semester_gpa: number;
}
