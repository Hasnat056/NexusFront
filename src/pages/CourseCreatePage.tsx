import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { createCourse, emptyCourseFormValue, mockCourses, validateCreditHours } from "../data/courseDirectory";
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

export function CourseCreatePage() {
  const navigate = useNavigate();
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [value, setValue] = useState(emptyCourseFormValue());
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const creditHoursError = validateCreditHours(Number(value.credit_hours));
    if (creditHoursError) {
      setError(creditHoursError);
      return;
    }
    const record = createCourse(value);
    navigate(`/admin/courses/${record.course_code}`);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="courses"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="New course"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Courses", href: "/admin/courses" },
          { label: "New course" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New course</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/courses/ (AdminModule/views.py::CourseListCreateAPIView) —
          course_code has no server-side generation, so it's entered here directly.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="course_code">Course code</label>
            <input
              id="course_code"
              value={value.course_code}
              onChange={(e) => setValue({ ...value, course_code: e.target.value })}
              placeholder="CS-1101"
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="course_name">Course name</label>
            <input
              id="course_name"
              value={value.course_name}
              onChange={(e) => setValue({ ...value, course_name: e.target.value })}
              required
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="pre_requisite">Prerequisite</label>
            <select
              id="pre_requisite"
              value={value.pre_requisite}
              onChange={(e) => setValue({ ...value, pre_requisite: e.target.value })}
            >
              <option value="">None</option>
              {mockCourses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="credit_hours">Lecture credit hours</label>
            <input
              id="credit_hours"
              inputMode="numeric"
              value={value.credit_hours}
              onChange={(e) => setValue({ ...value, credit_hours: e.target.value })}
            />
            <span className={formStyles.hint}>
              If this course has a lab, 1 credit hour is added automatically on save — enter the
              lecture portion only.
            </span>
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.checkboxField}>
              <input
                type="checkbox"
                checked={value.lab}
                onChange={(e) => setValue({ ...value, lab: e.target.checked })}
              />
              Has a lab component
            </label>
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              value={value.description}
              onChange={(e) => setValue({ ...value, description: e.target.value })}
            />
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton}>
            Create course
          </button>
          <Link to="/admin/courses" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
