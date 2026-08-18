import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconGrid, IconLayers, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { DEPARTMENTS } from "../data/academicStructure";
import { createProgram, emptyProgramFormValue } from "../data/programDirectory";
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

export function ProgramCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyProgramFormValue());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createProgram(value);
    navigate(`/admin/programs/${value.program_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="programs"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New program"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Programs", href: "/admin/programs" },
          { label: "New program" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New program</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/programs/ (AdminModule/views.py::ProgramListCreateAPIView) — unlike
          Faculty/Student, program_id has no server-side generation, so it's entered here directly.
        </p>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="program_id">Program ID</label>
            <input
              id="program_id"
              value={value.program_id}
              onChange={(e) => setValue({ ...value, program_id: e.target.value })}
              placeholder="CS-BS"
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="program_name">Program name</label>
            <input
              id="program_name"
              value={value.program_name}
              onChange={(e) => setValue({ ...value, program_name: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="department">Department</label>
            <select id="department" value={value.department} onChange={(e) => setValue({ ...value, department: e.target.value })}>
              {DEPARTMENTS.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="total_semesters">Total semesters</label>
            <input
              id="total_semesters"
              inputMode="numeric"
              value={value.total_semesters}
              onChange={(e) => setValue({ ...value, total_semesters: e.target.value })}
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="fee_per_semester">Fee per semester</label>
            <input
              id="fee_per_semester"
              inputMode="numeric"
              value={value.fee_per_semester}
              onChange={(e) => setValue({ ...value, fee_per_semester: e.target.value })}
            />
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton}>
            Create program
          </button>
          <Link to="/admin/programs" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
