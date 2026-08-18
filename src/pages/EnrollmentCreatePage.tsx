import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { semesterRefById } from "../data/allocationDirectory";
import { createEnrollment, eligibleAllocationsForEnrollment, emptyEnrollmentFormValue } from "../data/enrollmentDirectory";
import { mockStudentDirectory } from "../data/studentDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

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

export function EnrollmentCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyEnrollmentFormValue());
  const [error, setError] = useState<string | null>(null);

  const eligibleAllocations = eligibleAllocationsForEnrollment();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createEnrollment(value);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    navigate(`/admin/enrollments/${result.enrollment_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New enrollment"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Enrollments", href: "/admin/enrollments" },
          { label: "New enrollment" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New enrollment</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/enrollments/ (AdminModule/views.py::EnrollmentListCreateAPIView)
          — the allocation list below is restricted to allocations with status "Ongoing"
          (EnrollmentSerializer.get_fields()), same rule the real API enforces.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {eligibleAllocations.length === 0 ? (
          <p className={formStyles.hint}>
            No allocation is currently "Ongoing" — an allocation needs to move past "Inactive"
            before a student can enroll in it.
          </p>
        ) : (
          <>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label htmlFor="student">Student</label>
                <select id="student" value={value.student} onChange={(e) => setValue({ ...value, student: e.target.value })} required>
                  <option value="">Select student…</option>
                  {mockStudentDirectory.map((s) => (
                    <option key={s.person.person_id} value={s.person.person_id}>
                      {s.person.person_id} — {s.person.first_name} {s.person.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="allocation">Allocation</label>
                <select
                  id="allocation"
                  value={value.allocation}
                  onChange={(e) => setValue({ ...value, allocation: e.target.value })}
                  required
                >
                  <option value="">Select allocation…</option>
                  {eligibleAllocations.map((a) => {
                    const semester = semesterRefById(a.semester);
                    return (
                      <option key={a.allocation_id} value={a.allocation_id}>
                        {a.course} · {a.faculty} · {semester ? semester.classLabel : `Semester #${a.semester}`} · {a.session}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton}>
                Create enrollment
              </button>
              <Link to="/admin/enrollments" className={formStyles.secondaryButton}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </DashboardShell>
  );
}
