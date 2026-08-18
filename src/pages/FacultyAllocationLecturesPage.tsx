import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { Avatar } from "../components/ui/Avatar";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import type { Lecture } from "../types/api";
import {
  createLecture,
  deleteLecture,
  getFacultyAllocationDetail,
  setAttendance,
  updateLecture,
  type LectureFormValue,
} from "../data/facultyAllocationDetail";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

const EMPTY_LECTURE_FORM: LectureFormValue = { starting_time: "", venue: "", duration: 60, topic: "" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacultyAllocationLecturesPage() {
  const { id } = useParams<{ id: string }>();
  const allocationId = id ? Number(id) : NaN;
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [addingLecture, setAddingLecture] = useState(false);
  const [lectureForm, setLectureForm] = useState<LectureFormValue>(EMPTY_LECTURE_FORM);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);

  const [expandedLectureId, setExpandedLectureId] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");

  const dashboard = mockFacultyDashboardResponse;
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();

  const detail = getFacultyAllocationDetail(allocationId);

  function refresh() {
    setTick((t) => t + 1);
  }

  const expandedLecture = detail?.lecture_set.find((l) => l.lecture_id === expandedLectureId) ?? null;

  const filteredRoster = useMemo(() => {
    if (!expandedLecture) return [];
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return expandedLecture.attendance_set;
    return expandedLecture.attendance_set.filter((a) => {
      const name = `${a.student_info.first_name} ${a.student_info.last_name} ${a.student_info.student_id}`.toLowerCase();
      return name.includes(q);
    });
  }, [expandedLecture, rosterFilter]);

  if (!detail) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Lectures"
        subtitle={dashboard.faculty.institutional_email}
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/faculty/dashboard" },
            { label: "Allocations", href: "/faculty/allocations" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Allocation {id} was not found.</p>
      </DashboardShell>
    );
  }

  const locked = detail.status === "Completed";

  function startAddLecture() {
    setLectureForm(EMPTY_LECTURE_FORM);
    setAddingLecture(true);
    setEditingLectureId(null);
    setError(null);
  }

  function startEditLecture(l: Lecture) {
    setLectureForm({ starting_time: l.starting_time.slice(0, 16), venue: l.venue, duration: l.duration, topic: l.topic });
    setEditingLectureId(l.lecture_id);
    setAddingLecture(false);
    setError(null);
  }

  function cancelLectureForm() {
    setAddingLecture(false);
    setEditingLectureId(null);
  }

  function handleSaveLecture(e: FormEvent) {
    e.preventDefault();
    const result =
      editingLectureId !== null
        ? updateLecture(allocationId, editingLectureId, lectureForm)
        : createLecture(allocationId, lectureForm);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setAddingLecture(false);
    setEditingLectureId(null);
    setError(null);
    setMessage("Lecture saved.");
    refresh();
  }

  function handleDeleteLecture(lectureId: string) {
    const result = deleteLecture(allocationId, lectureId);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    if (expandedLectureId === lectureId) setExpandedLectureId(null);
    setError(null);
    refresh();
  }

  function toggleExpanded(lectureId: string) {
    setExpandedLectureId((prev) => (prev === lectureId ? null : lectureId));
    setRosterFilter("");
  }

  function handleAttendance(lectureId: string, enrollmentId: number, isPresent: boolean) {
    const result = setAttendance(allocationId, lectureId, enrollmentId, isPresent);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setError(null);
    refresh();
  }

  function markAll(isPresent: boolean) {
    if (!expandedLecture) return;
    for (const row of filteredRoster) {
      setAttendance(allocationId, expandedLecture.lecture_id, row.enrollment, isPresent);
    }
    refresh();
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={`${detail.course} — Lectures`}
      subtitle={`${detail.session} · Semester ${detail.semester} · ${dashboard.faculty.institutional_email}`}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/faculty/dashboard" },
          { label: "Allocations", href: "/faculty/allocations" },
          { label: detail.course, href: `/faculty/allocations/${allocationId}` },
          { label: "Lectures" },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <Panel
        title="Lectures"
        headerExtra={
          !locked && (
            <button type="button" className={formStyles.linkButton} onClick={startAddLecture}>
              + Add lecture
            </button>
          )
        }
      >
        <div className={styles.panelBody}>
          {!locked && (addingLecture || editingLectureId !== null) && (
            <form className={formStyles.qualRow} onSubmit={handleSaveLecture}>
              <div className={formStyles.row}>
                <div className={formStyles.field}>
                  <label htmlFor="starting_time">Starting time</label>
                  <input
                    id="starting_time"
                    type="datetime-local"
                    required
                    value={lectureForm.starting_time}
                    onChange={(e) => setLectureForm({ ...lectureForm, starting_time: e.target.value })}
                  />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    required
                    value={lectureForm.venue}
                    onChange={(e) => setLectureForm({ ...lectureForm, venue: e.target.value })}
                  />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="duration">Duration (min)</label>
                  <input
                    id="duration"
                    type="number"
                    min={1}
                    required
                    value={lectureForm.duration}
                    onChange={(e) => setLectureForm({ ...lectureForm, duration: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="topic">Topic</label>
                <input
                  id="topic"
                  required
                  value={lectureForm.topic}
                  onChange={(e) => setLectureForm({ ...lectureForm, topic: e.target.value })}
                />
              </div>
              <div className={formStyles.qualRowFooter}>
                <button type="submit" className={formStyles.primaryButton}>
                  Save
                </button>
                <button type="button" className={formStyles.secondaryButton} onClick={cancelLectureForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <Table
            columns={[
              {
                key: "lecture",
                header: "Lecture",
                render: (l) => (
                  <>
                    <strong>
                      #{l.lecture_no} — {l.topic}
                    </strong>
                    <div className={formStyles.hint}>{l.venue}</div>
                  </>
                ),
              },
              { key: "when", header: "When", render: (l) => formatDateTime(l.starting_time) },
              { key: "duration", header: "Duration", align: "right", render: (l) => `${l.duration} min` },
              {
                key: "present",
                header: "Present",
                align: "right",
                render: (l) => {
                  const presentCount = l.attendance_set.filter((a) => a.is_present).length;
                  return (
                    <Tag tone={presentCount === l.attendance_set.length ? "good" : "warning"}>
                      {`${presentCount}/${l.attendance_set.length}`}
                    </Tag>
                  );
                },
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (l) => (
                  <div className={formStyles.actions}>
                    <button type="button" className={formStyles.secondaryButton} onClick={() => toggleExpanded(l.lecture_id)}>
                      {expandedLectureId === l.lecture_id ? "Hide roster" : "Attendance"}
                    </button>
                    {!locked && (
                      <>
                        <button type="button" className={formStyles.secondaryButton} onClick={() => startEditLecture(l)}>
                          Edit
                        </button>
                        <button type="button" className={formStyles.dangerButton} onClick={() => handleDeleteLecture(l.lecture_id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            rows={detail.lecture_set}
            rowKey={(l) => l.lecture_id}
          />
          {detail.lecture_set.length === 0 && <p className={styles.empty}>No lectures yet.</p>}
        </div>
      </Panel>

      {expandedLecture && (
        <Panel
          title={`Attendance — Lecture ${expandedLecture.lecture_no}`}
          hint={`${formatDateTime(expandedLecture.starting_time)} · ${expandedLecture.venue} · ${expandedLecture.duration} min`}
          headerExtra={
            <button type="button" className={formStyles.primaryButton} onClick={() => setExpandedLectureId(null)}>
              Save
            </button>
          }
        >
          <div className={styles.panelBody}>
            <div className={formStyles.actions}>
              {expandedLecture.attendance_set.length > 8 && (
                <input
                  type="text"
                  placeholder="Filter by student name or ID…"
                  value={rosterFilter}
                  onChange={(e) => setRosterFilter(e.target.value)}
                />
              )}
              {!locked && (
                <>
                  <button type="button" className={formStyles.secondaryButton} onClick={() => markAll(true)}>
                    Mark all present
                  </button>
                  <button type="button" className={formStyles.secondaryButton} onClick={() => markAll(false)}>
                    Mark all absent
                  </button>
                </>
              )}
            </div>
            <Table
              columns={[
                {
                  key: "avatar",
                  header: "",
                  render: (att) => (
                    <Avatar src={att.student_info.image} name={`${att.student_info.first_name} ${att.student_info.last_name}`} />
                  ),
                },
                {
                  key: "student",
                  header: "Student",
                  render: (att) => (
                    <>
                      <strong>
                        {att.student_info.first_name} {att.student_info.last_name}
                      </strong>
                      <div className={formStyles.hint}>{att.student_info.student_id}</div>
                    </>
                  ),
                },
                {
                  key: "present",
                  header: "Present",
                  align: "right",
                  render: (att) => (
                    <input
                      type="checkbox"
                      checked={att.is_present}
                      onChange={(e) => handleAttendance(expandedLecture.lecture_id, att.enrollment, e.target.checked)}
                      disabled={locked}
                    />
                  ),
                },
              ]}
              rows={filteredRoster}
              rowKey={(att) => String(att.id)}
            />
            {filteredRoster.length === 0 && rosterFilter && <p className={styles.empty}>No students match "{rosterFilter}".</p>}
          </div>
        </Panel>
      )}
    </DashboardShell>
  );
}
