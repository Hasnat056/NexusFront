import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { DEPARTMENTS } from "../data/academicStructure";
import { DESIGNATIONS, createFacultyRecord, emptyFacultyFormValue } from "../data/facultyDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { FacultyDesignation } from "../types/api";
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

export function FacultyCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyFacultyFormValue());
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.password !== value.confirm_password) {
      setError("Passwords don't match.");
      return;
    }
    const record = createFacultyRecord(value);
    navigate(`/admin/faculty/${record.person.person_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="faculty"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New faculty"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Faculty", href: "/admin/faculty" },
          { label: "New faculty" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New faculty member</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/faculty/ (AdminModule/views.py::FacultyListCreateAPIView) — person_id and
          username are generated server-side, not entered here.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <PersonFormFields value={value} onChange={setValue} isCreate />

        <h3 className={formStyles.sectionTitle}>Faculty details</h3>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="department">Department</label>
            <select
              id="department"
              value={value.department}
              onChange={(e) => setValue({ ...value, department: e.target.value })}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="designation">Designation</label>
            <select
              id="designation"
              value={value.designation}
              onChange={(e) => setValue({ ...value, designation: e.target.value as FacultyDesignation })}
            >
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="joining_date">Joining date</label>
            <input
              id="joining_date"
              type="date"
              value={value.joining_date}
              onChange={(e) => setValue({ ...value, joining_date: e.target.value })}
              required
            />
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton}>
            Create faculty
          </button>
          <Link to="/admin/faculty" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
