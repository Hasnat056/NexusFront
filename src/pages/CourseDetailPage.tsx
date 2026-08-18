import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import {
  courseFormValueFromRecord,
  deleteCourse,
  getCourseById,
  mockCourses,
  updateCourse,
  validateCreditHours,
  type CourseFormValue,
} from "../data/courseDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
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

export function CourseDetailPage() {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  const record = courseCode ? getCourseById(courseCode) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<CourseFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="courses"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Course"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Courses", href: "/admin/courses" },
            { label: courseCode ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Course {courseCode} was not found.</p>
      </DashboardShell>
    );
  }

  function startEditing() {
    setFormValue(courseFormValueFromRecord(record!));
    setEditing(true);
    setMessage(null);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !courseCode) return;
    const creditHoursError = validateCreditHours(Number(formValue.credit_hours));
    if (creditHoursError) {
      setError(creditHoursError);
      return;
    }
    updateCourse(courseCode, formValue);
    setEditing(false);
    setMessage("Course updated.");
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!courseCode) return;
    deleteCourse(courseCode);
    navigate("/admin/courses");
  }

  const otherCourses = mockCourses.filter((c) => c.course_code !== record.course_code);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="courses"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit course" : "Course"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Courses", href: "/admin/courses" },
          { label: record.course_name },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Course</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="course_code">Course code</label>
              <input id="course_code" value={formValue.course_code} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="course_name">Course name</label>
              <input
                id="course_name"
                value={formValue.course_name}
                onChange={(e) => setFormValue({ ...formValue, course_name: e.target.value })}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="pre_requisite">Prerequisite</label>
              <select
                id="pre_requisite"
                value={formValue.pre_requisite}
                onChange={(e) => setFormValue({ ...formValue, pre_requisite: e.target.value })}
              >
                <option value="">None</option>
                {otherCourses.map((c) => (
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
                value={formValue.credit_hours}
                onChange={(e) => setFormValue({ ...formValue, credit_hours: e.target.value })}
              />
              <span className={formStyles.hint}>
                Toggling the lab checkbox adjusts the stored credit hours by ±1 on save.
              </span>
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.checkboxField}>
                <input
                  type="checkbox"
                  checked={formValue.lab}
                  onChange={(e) => setFormValue({ ...formValue, lab: e.target.checked })}
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
                value={formValue.description}
                onChange={(e) => setFormValue({ ...formValue, description: e.target.value })}
              />
            </div>
          </div>

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton}>
              Save changes
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.profileCard}>
          <div className={styles.profileMain}>
            <h1 className={styles.name}>{record.course_name}</h1>
            <p className={styles.subline}>
              {record.course_code} · {record.credit_hours} credit hours
              {record.lab && " · Lab"}
            </p>
            {record.pre_requisite && (
              <p className={styles.subline}>Requires {record.pre_requisite}</p>
            )}
          </div>
          <div className={formStyles.actions}>
            {record.lab && <Tag tone="good">Lab</Tag>}
            <button type="button" className={formStyles.secondaryButton} onClick={startEditing}>
              Edit
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete}>
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmingDelete && (
              <button type="button" className={formStyles.secondaryButton} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <Panel title="Description">
          <p className={styles.empty}>{record.description ?? "No description on file."}</p>
        </Panel>
      )}
    </DashboardShell>
  );
}
