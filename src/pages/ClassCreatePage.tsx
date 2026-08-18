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
import { createClass, emptyClassFormValue } from "../data/classDirectory";
import { mockPrograms } from "../data/programDirectory";
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

export function ClassCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyClassFormValue());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const record = createClass(value);
    navigate(`/admin/classes/${record.class_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="classes"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New class"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Classes", href: "/admin/classes" },
          { label: "New class" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New class</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/classes/ (AdminModule/views.py::ClassListCreateAPIView) — only
          program and batch year are set here. ClassSerializer.create() ignores scheme_of_studies
          entirely and instead auto-generates a blank semester for each of the program's
          total_semesters; you'll assign sessions and courses to those on the class's own page.
        </p>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="program">Program</label>
            <select id="program" value={value.program} onChange={(e) => setValue({ ...value, program: e.target.value })}>
              {mockPrograms.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.program_id} — {p.program_name}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="batch_year">Batch year</label>
            <input
              id="batch_year"
              inputMode="numeric"
              value={value.batch_year}
              onChange={(e) => setValue({ ...value, batch_year: e.target.value })}
              required
            />
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton}>
            Create class
          </button>
          <Link to="/admin/classes" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
