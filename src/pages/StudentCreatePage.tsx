import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { CLASSES, PROGRAMS, classLabel } from "../data/academicStructure";
import { STUDENT_STATUSES, createStudentRecord, emptyStudentFormValue } from "../data/studentDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { StudentStatus } from "../types/api";
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

export function StudentCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyStudentFormValue());
  const [error, setError] = useState<string | null>(null);
  const classesForProgram = CLASSES.filter((c) => c.program === value.program);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.password !== value.confirm_password) {
      setError("Passwords don't match.");
      return;
    }
    const record = createStudentRecord(value);
    navigate(`/admin/students/${record.person.person_id}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="students"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New student"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Students", href: "/admin/students" },
          { label: "New student" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New student</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/students/ (AdminModule/views.py::StudentListCreateAPIView) — person_id and
          username are generated server-side, not entered here.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <PersonFormFields value={value} onChange={setValue} isCreate />

        <h3 className={formStyles.sectionTitle}>Enrollment details</h3>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="program">Program</label>
            <select
              id="program"
              value={value.program}
              onChange={(e) => {
                const program = e.target.value;
                const firstClass = CLASSES.find((c) => c.program === program);
                setValue({ ...value, program, student_class: firstClass?.class_id ?? value.student_class });
              }}
            >
              {PROGRAMS.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="student_class">Class</label>
            <select
              id="student_class"
              value={value.student_class}
              onChange={(e) => setValue({ ...value, student_class: Number(e.target.value) })}
            >
              {classesForProgram.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {classLabel(c.class_id)}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={value.status}
              onChange={(e) => setValue({ ...value, status: e.target.value as StudentStatus })}
            >
              {STUDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="admission_date">Admission date</label>
            <input
              id="admission_date"
              type="date"
              value={value.admission_date}
              onChange={(e) => setValue({ ...value, admission_date: e.target.value })}
              required
            />
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton}>
            Create student
          </button>
          <Link to="/admin/students" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
