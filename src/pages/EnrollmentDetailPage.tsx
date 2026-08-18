import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconHourglass,
  IconInbox,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconLayers,
  IconGrid,
  IconPeople,
  IconPerson,
  IconUserCheck,
} from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Tag } from "../components/ui/Tag";
import { getAllocationById, semesterRefById } from "../data/allocationDirectory";
import {
  ENROLLMENT_STATUS_TONE,
  deleteEnrollment,
  getEnrollmentById,
  isEnrollmentDeletable,
  isEnrollmentEditable,
  updateEnrollmentStatus,
} from "../data/enrollmentDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { EnrollmentStatus } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

const STATUS_OPTIONS: EnrollmentStatus[] = ["Inactive", "Active", "Completed", "Dropped"];

export function EnrollmentDetailPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const record = enrollmentId ? getEnrollmentById(Number(enrollmentId)) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [statusInput, setStatusInput] = useState<EnrollmentStatus>(record?.status ?? "Inactive");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="enrollments"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Enrollment"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Enrollments", href: "/admin/enrollments" },
            { label: enrollmentId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Enrollment {enrollmentId} was not found.</p>
      </DashboardShell>
    );
  }

  const allocation = getAllocationById(record.allocation);
  const semester = allocation ? semesterRefById(allocation.semester) : undefined;
  const editable = isEnrollmentEditable(record);
  const deletable = isEnrollmentDeletable(record);

  function handleSetStatus(e: React.FormEvent) {
    e.preventDefault();
    updateEnrollmentStatus(record!.enrollment_id, statusInput);
    setMessage("Enrollment updated.");
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteEnrollment(record!.enrollment_id);
    navigate("/admin/enrollments");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Enrollment"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Enrollments", href: "/admin/enrollments" },
          { label: record.student_info?.student_name ?? record.student },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      <div className={styles.profileCard}>
        <div className={styles.profileMain}>
          <h1 className={styles.name}>{record.student_info?.student_name ?? record.student}</h1>
          <p className={styles.subline}>
            Enrollment #{record.enrollment_id} · {record.student} · enrolled {record.enrollment_date}
          </p>
          <p className={styles.subline}>
            {allocation ? `${allocation.course} · ${allocation.faculty} · ${allocation.session}` : `Allocation #${record.allocation}`}
            {semester && ` · ${semester.classLabel} · Semester ${semester.semesterNo}`}
          </p>
        </div>
        <div className={formStyles.actions}>
          <Tag tone={ENROLLMENT_STATUS_TONE[record.status]}>{record.status}</Tag>
          <button type="button" className={formStyles.dangerButton} onClick={handleDelete} disabled={!deletable}>
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </button>
          {confirmingDelete && (
            <button type="button" className={formStyles.secondaryButton} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {record.result && (
        <div className={styles.editCard}>
          <h3 className={formStyles.sectionTitle}>Result</h3>
          <dl className={styles.fields}>
            <dt>Obtained marks</dt>
            <dd>{record.result.obtained_marks}</dd>
            <dt>Course GPA</dt>
            <dd>{record.result.course_gpa}</dd>
          </dl>
        </div>
      )}

      <div className={styles.editCard}>
        <h3 className={formStyles.sectionTitle}>Status</h3>
        <form className={formStyles.row} onSubmit={handleSetStatus}>
          <div className={formStyles.field}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value as EnrollmentStatus)}
              disabled={!editable}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label>&nbsp;</label>
            <button type="submit" className={formStyles.primaryButton} disabled={!editable}>
              Save status
            </button>
          </div>
        </form>
        <span className={formStyles.hint}>
          {editable
            ? "AdminEnrollmentPermissions allows Admin to change status while it's Active/Inactive/Dropped."
            : "Locked — once status is Completed, AdminEnrollmentPermissions makes this record read-only for Admin."}
        </span>
      </div>

      {!deletable && editable && (
        <p className={formStyles.hint}>
          Delete is locked — a Result with a course GPA already exists for this enrollment
          (EnrollmentRetrieveUpdateDestroyAPIView.perform_destroy raises PermissionDenied once
          result.course_gpa is set).
        </p>
      )}
    </DashboardShell>
  );
}
