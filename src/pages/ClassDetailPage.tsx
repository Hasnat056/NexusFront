import { useState } from "react";
import { useParams } from "react-router-dom";
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
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import {
  SEMESTER_STATUS_TONE,
  classLabel,
  getClassById,
  schemeEditFromRecord,
  updateClass,
  updateClassScheme,
  type ClassFormValue,
  type SchemeSemesterEdit,
} from "../data/classDirectory";
import { mockCourses } from "../data/courseDirectory";
import { mockPrograms } from "../data/programDirectory";
import { mockSessions } from "../data/sessionDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import styles from "./ClassDetailPage.module.css";

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

function sessionLabel(sessionId: number): string {
  const session = mockSessions.find((s) => s.id === sessionId);
  return session ? `${session.period} ${session.year}` : `#${sessionId}`;
}

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const record = classId ? getClassById(Number(classId)) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<ClassFormValue | null>(null);
  const [schemeEdits, setSchemeEdits] = useState<SchemeSemesterEdit[]>(() => (record ? schemeEditFromRecord(record) : []));
  const [message, setMessage] = useState<string | null>(null);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="classes"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Class"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Classes", href: "/admin/classes" },
            { label: classId ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Class {classId} was not found.</p>
      </DashboardShell>
    );
  }

  function startEditing() {
    setFormValue({ program: record!.program, batch_year: record!.batch_year !== null ? String(record!.batch_year) : "" });
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    updateClass(record!.class_id, formValue);
    setEditing(false);
    setMessage("Class updated.");
  }

  function setSemesterSession(semesterId: number, session: string) {
    setSchemeEdits((edits) => edits.map((edit) => (edit.semester_id === semesterId ? { ...edit, session } : edit)));
  }

  function addCourseRow(semesterId: number) {
    setSchemeEdits((edits) =>
      edits.map((edit) => (edit.semester_id === semesterId ? { ...edit, courses: [...edit.courses, ""] } : edit)),
    );
  }

  function setCourseRow(semesterId: number, courseIndex: number, courseCode: string) {
    setSchemeEdits((edits) =>
      edits.map((edit) =>
        edit.semester_id === semesterId
          ? { ...edit, courses: edit.courses.map((c, i) => (i === courseIndex ? courseCode : c)) }
          : edit,
      ),
    );
  }

  function removeCourseRow(semesterId: number, courseIndex: number) {
    setSchemeEdits((edits) =>
      edits.map((edit) =>
        edit.semester_id === semesterId ? { ...edit, courses: edit.courses.filter((_, i) => i !== courseIndex) } : edit,
      ),
    );
  }

  function handleSaveScheme(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = schemeEdits.map((edit) => ({ ...edit, courses: edit.courses.filter((c) => c !== "") }));
    updateClassScheme(record!.class_id, cleaned);
    setSchemeEdits(cleaned);
    setMessage("Scheme of studies updated.");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="classes"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit class" : "Class"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Classes", href: "/admin/classes" },
          { label: classLabel(record) },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={detailStyles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Class</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="program">Program</label>
              <select id="program" value={formValue.program} onChange={(e) => setFormValue({ ...formValue, program: e.target.value })}>
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
                value={formValue.batch_year}
                onChange={(e) => setFormValue({ ...formValue, batch_year: e.target.value })}
                required
              />
            </div>
          </div>
          <span className={formStyles.hint}>
            No lock rules here — ClassSerializer has no read_only fields at all, program and batch
            year stay editable for the life of the class.
          </span>
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
        <div className={detailStyles.profileCard}>
          <div className={detailStyles.profileMain}>
            <h1 className={detailStyles.name}>{classLabel(record)}</h1>
            <p className={detailStyles.subline}>Class #{record.class_id} · {record.program}</p>
          </div>
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.secondaryButton} onClick={startEditing}>
              Edit
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <Panel title="Scheme of studies" hint="Not a real field on Class — see the hint below">
          <form className={detailStyles.panelBody} onSubmit={handleSaveScheme}>
            <span className={formStyles.hint}>
              Class (Models/models.py) only stores class_id, program, batch_year — scheme_of_studies
              is a computed field that lists this class's Semester rows and their assigned course(s).
              At creation, ClassSerializer.create() auto-generated {schemeEdits.length} blank
              semesters here (Program.total_semesters for {record.program}). Saving below submits
              the whole list in one PATCH, same shape as ClassSerializer.update() expects.
            </span>

            {schemeEdits.map((edit) => (
              <div className={formStyles.qualRow} key={edit.semester_id}>
                <div className={formStyles.qualRowFooter}>
                  <strong>Semester {edit.semester_no}</strong>
                  <Tag tone={SEMESTER_STATUS_TONE[edit.status]}>{edit.status}</Tag>
                </div>
                <div className={formStyles.row}>
                  <div className={formStyles.field}>
                    <label htmlFor={`session_${edit.semester_id}`}>Session</label>
                    <select
                      id={`session_${edit.semester_id}`}
                      value={edit.session}
                      onChange={(e) => setSemesterSession(edit.semester_id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {mockSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {sessionLabel(s.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {edit.courses.length > 0 && (
                  <>
                    <label>Courses</label>
                    <div className={styles.courseGrid}>
                      {edit.courses.map((code, courseIndex) => (
                        <div className={styles.courseItem} key={courseIndex}>
                          <select
                            aria-label={`Course ${courseIndex + 1} for semester ${edit.semester_no}`}
                            value={code}
                            onChange={(e) => setCourseRow(edit.semester_id, courseIndex, e.target.value)}
                          >
                            <option value="">Select a course…</option>
                            {mockCourses.map((c) => (
                              <option key={c.course_code} value={c.course_code}>
                                {c.course_code} — {c.course_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={formStyles.linkButton}
                            onClick={() => removeCourseRow(edit.semester_id, courseIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button type="button" className={formStyles.linkButton} onClick={() => addCourseRow(edit.semester_id)}>
                  + Add course
                </button>
              </div>
            ))}

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton}>
                Save scheme
              </button>
            </div>
          </form>
        </Panel>
      )}
    </DashboardShell>
  );
}
