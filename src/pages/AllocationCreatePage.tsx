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
import { createAllocation, eligibleSemestersForAllocation, emptyAllocationFormValue } from "../data/allocationDirectory";
import { mockFacultyDirectory } from "../data/facultyDirectory";
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

export function AllocationCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyAllocationFormValue());
  const [error, setError] = useState<string | null>(null);

  const eligibleSemesters = eligibleSemestersForAllocation();
  const selectedSemester = eligibleSemesters.find((s) => String(s.semesterId) === value.semester);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createAllocation(value);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    navigate(`/admin/allocations/${result.allocation_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New allocation"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Allocations", href: "/admin/allocations" },
          { label: "New allocation" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New allocation</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/allocations/ (AdminModule/views.py::CourseAllocationListCreateAPIView)
          — session and status aren't set here: CourseAllocationSerializer.create() copies session
          from the semester automatically and always starts status at "Inactive". The semester list
          below is restricted to semesters that are still Inactive, assigned to a session that's
          Initiated, AND already have their own activation deadline scheduled
          (CourseAllocationSerializer.get_fields()), and course is restricted to that semester's own
          scheme of studies.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {eligibleSemesters.length === 0 ? (
          <p className={formStyles.hint}>
            No semester is currently eligible. Three things have to line up: a session with an
            activation deadline set (Sessions), that session assigned to a blank semester on a class
            (Classes), and that semester's own activation deadline set too (Semesters).
          </p>
        ) : (
          <>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label htmlFor="faculty">Faculty</label>
                <select id="faculty" value={value.faculty} onChange={(e) => setValue({ ...value, faculty: e.target.value })} required>
                  <option value="">Select faculty…</option>
                  {mockFacultyDirectory.map((f) => (
                    <option key={f.person.person_id} value={f.person.person_id}>
                      {f.person.person_id} — {f.person.first_name} {f.person.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="semester">Semester</label>
                <select
                  id="semester"
                  value={value.semester}
                  onChange={(e) => setValue({ ...value, semester: e.target.value, course: "" })}
                  required
                >
                  <option value="">Select semester…</option>
                  {eligibleSemesters.map((s) => (
                    <option key={s.semesterId} value={s.semesterId}>
                      {s.classLabel} · Semester {s.semesterNo}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="course">Course</label>
                <select
                  id="course"
                  value={value.course}
                  onChange={(e) => setValue({ ...value, course: e.target.value })}
                  disabled={!selectedSemester}
                  required
                >
                  <option value="">{selectedSemester ? "Select course…" : "Pick a semester first"}</option>
                  {selectedSemester?.courseCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton}>
                Create allocation
              </button>
              <Link to="/admin/allocations" className={formStyles.secondaryButton}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </DashboardShell>
  );
}
