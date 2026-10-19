import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { Avatar } from "../components/ui/Avatar";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import type { Attendance, FacultyAllocationDetail, FacultyDashboardResponse, Lecture } from "../types/api";
import { apiGet, apiMutate } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

interface LectureFormValue {
  starting_time: string;
  venue: string;
  duration: number;
  topic: string;
}

const EMPTY_LECTURE_FORM: LectureFormValue = { starting_time: "", venue: "", duration: 60, topic: "" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacultyAllocationLecturesPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const allocationId = id ? Number(id) : NaN;
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [detail, setDetail] = useState<FacultyAllocationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [addingLecture, setAddingLecture] = useState(false);
  const [lectureForm, setLectureForm] = useState<LectureFormValue>(EMPTY_LECTURE_FORM);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [expandedLectureId, setExpandedLectureId] = useState<string | null>(null);
  const [expandedLecture, setExpandedLecture] = useState<Lecture | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<Attendance[] | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // LectureSerializer.__init__ (FacultyModule/serializers.py) only keeps attendance_set when
  // `self.instance` is a single Lecture — in a many=True context (this page's list, and the
  // lecture_set nested under GET .../allocations/<id>/) self.instance is the whole queryset
  // instead, so the field is always popped there. Present sums stay blank; the per-lecture detail
  // is fetched fresh whenever a row is expanded for attendance.
  const [presentCounts, setPresentCounts] = useState<Record<string, { present: number; total: number }>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      apiGet<FacultyAllocationDetail>(`/faculty/allocations/${allocationId}/`),
    ])
      .then(([dashboardRes, detailRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setDetail(detailRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, allocationId, refreshKey]);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    Promise.all(
      detail.lecture_set.map((l) => apiGet<Lecture>(`/faculty/allocations/${allocationId}/lectures/${l.lecture_id}/`)),
    )
      .then((results) => {
        if (cancelled) return;
        const counts: Record<string, { present: number; total: number }> = {};
        for (const r of results) {
          counts[r.lecture_id] = {
            present: r.attendance_set.filter((a) => a.is_present).length,
            total: r.attendance_set.length,
          };
        }
        setPresentCounts(counts);
      })
      .catch(() => {
        // Best-effort — the "Present" column just stays blank if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [detail, allocationId]);

  const filteredRoster = useMemo(() => {
    const roster = attendanceDraft ?? expandedLecture?.attendance_set ?? [];
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((a) => {
      const name = `${a.student_info.first_name} ${a.student_info.last_name} ${a.student_info.student_id}`.toLowerCase();
      return name.includes(q);
    });
  }, [attendanceDraft, expandedLecture, rosterFilter]);

  const avatarInitials = dashboard ? `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="allocations" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Lectures" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials={avatarInitials}
        pageTitle="Lectures"
        subtitle={dashboard?.faculty.institutional_email ?? ""}
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

  if (!dashboard || !detail) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="allocations" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Lectures" subtitle="">
        <p className={styles.notFound}>Loading lectures…</p>
      </DashboardShell>
    );
  }

  const locked = detail.status === "Completed";

  function startAddLecture() {
    setLectureForm(EMPTY_LECTURE_FORM);
    setAddingLecture(true);
    setEditingLectureId(null);
    setError(null);
    setFieldErrors({});
  }

  function startEditLecture(l: Lecture) {
    setLectureForm({ starting_time: l.starting_time.slice(0, 16), venue: l.venue, duration: l.duration, topic: l.topic });
    setEditingLectureId(l.lecture_id);
    setAddingLecture(false);
    setError(null);
    setFieldErrors({});
  }

  function cancelLectureForm() {
    setAddingLecture(false);
    setEditingLectureId(null);
  }

  async function handleSaveLecture(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = {
      starting_time: new Date(lectureForm.starting_time).toISOString(),
      venue: lectureForm.venue,
      duration: lectureForm.duration,
      topic: lectureForm.topic,
    };
    try {
      if (editingLectureId !== null) {
        await apiMutate(`/faculty/allocations/${allocationId}/lectures/${editingLectureId}/`, "PATCH", body);
      } else {
        await apiMutate(`/faculty/allocations/${allocationId}/lectures/`, "POST", body);
      }
      setAddingLecture(false);
      setEditingLectureId(null);
      showToast("Lecture saved.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLecture(lectureId: string) {
    setError(null);
    try {
      await apiMutate(`/faculty/allocations/${allocationId}/lectures/${lectureId}/`, "DELETE");
      if (expandedLectureId === lectureId) {
        setExpandedLectureId(null);
        setExpandedLecture(null);
        setAttendanceDraft(null);
      }
      showToast("Lecture deleted.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    }
  }

  async function toggleExpanded(lectureId: string) {
    if (expandedLectureId === lectureId) {
      setExpandedLectureId(null);
      setExpandedLecture(null);
      setAttendanceDraft(null);
      setRosterFilter("");
      return;
    }
    setExpandedLectureId(lectureId);
    setRosterFilter("");
    setError(null);
    try {
      // The list/nested lecture_set never carries attendance_set (see the comment above
      // presentCounts) — fetch this one lecture's own detail to get its roster.
      const fresh = await apiGet<Lecture>(`/faculty/allocations/${allocationId}/lectures/${lectureId}/`);
      setExpandedLecture(fresh);
      setAttendanceDraft(fresh.attendance_set);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
      setExpandedLectureId(null);
    }
  }

  function handleAttendanceDraft(enrollmentId: number, isPresent: boolean) {
    setAttendanceDraft((prev) => (prev ? prev.map((a) => (a.enrollment === enrollmentId ? { ...a, is_present: isPresent } : a)) : prev));
  }

  function markAll(isPresent: boolean) {
    const visibleIds = new Set(filteredRoster.map((row) => row.enrollment));
    setAttendanceDraft((prev) => (prev ? prev.map((a) => (visibleIds.has(a.enrollment) ? { ...a, is_present: isPresent } : a)) : prev));
  }

  async function handleSaveAttendance() {
    if (!expandedLecture || !attendanceDraft) return;
    setSavingAttendance(true);
    setError(null);
    try {
      await apiMutate(`/faculty/allocations/${allocationId}/lectures/${expandedLecture.lecture_id}/`, "PATCH", {
        starting_time: expandedLecture.starting_time,
        venue: expandedLecture.venue,
        duration: expandedLecture.duration,
        topic: expandedLecture.topic,
        attendance_set: attendanceDraft.map((a) => ({ id: a.id, enrollment: a.enrollment, is_present: a.is_present })),
      });
      setExpandedLectureId(null);
      setExpandedLecture(null);
      setAttendanceDraft(null);
      showToast("Attendance saved.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setSavingAttendance(false);
    }
  }

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
      pageTitle={`${detail.course} · Lectures`}
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
                <div className={formStyles.field} data-invalid={fieldErrors.starting_time ? "true" : undefined}>
                  <label htmlFor="starting_time">Starting time</label>
                  <input
                    id="starting_time"
                    type="datetime-local"
                    required
                    value={lectureForm.starting_time}
                    onChange={(e) => setLectureForm({ ...lectureForm, starting_time: e.target.value })}
                  />
                  {fieldErrors.starting_time && <span className={formStyles.fieldError}>{fieldErrors.starting_time}</span>}
                </div>
                <div className={formStyles.field} data-invalid={fieldErrors.venue ? "true" : undefined}>
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    required
                    value={lectureForm.venue}
                    onChange={(e) => setLectureForm({ ...lectureForm, venue: e.target.value })}
                  />
                  {fieldErrors.venue && <span className={formStyles.fieldError}>{fieldErrors.venue}</span>}
                </div>
                <div className={formStyles.field} data-invalid={fieldErrors.duration ? "true" : undefined}>
                  <label htmlFor="duration">Duration (min)</label>
                  <input
                    id="duration"
                    type="number"
                    min={1}
                    required
                    value={lectureForm.duration}
                    onChange={(e) => setLectureForm({ ...lectureForm, duration: Number(e.target.value) })}
                  />
                  {fieldErrors.duration && <span className={formStyles.fieldError}>{fieldErrors.duration}</span>}
                </div>
              </div>
              <div className={formStyles.field} data-invalid={fieldErrors.topic ? "true" : undefined}>
                <label htmlFor="topic">Topic</label>
                <input
                  id="topic"
                  required
                  value={lectureForm.topic}
                  onChange={(e) => setLectureForm({ ...lectureForm, topic: e.target.value })}
                />
                {fieldErrors.topic && <span className={formStyles.fieldError}>{fieldErrors.topic}</span>}
              </div>
              <div className={formStyles.qualRowFooter}>
                <button type="submit" className={formStyles.primaryButton} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className={formStyles.secondaryButton} onClick={cancelLectureForm} disabled={saving}>
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
                      #{l.lecture_no}: {l.topic}
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
                  const counts = presentCounts[l.lecture_id];
                  if (!counts) return <span className={formStyles.hint}>…</span>;
                  return (
                    <Tag tone={counts.present === counts.total ? "good" : "warning"}>
                      {`${counts.present}/${counts.total}`}
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
          title={`Attendance: Lecture ${expandedLecture.lecture_no}`}
          hint={`${formatDateTime(expandedLecture.starting_time)} · ${expandedLecture.venue} · ${expandedLecture.duration} min`}
          headerExtra={
            <button type="button" className={formStyles.primaryButton} onClick={handleSaveAttendance} disabled={savingAttendance || locked}>
              {savingAttendance ? "Saving…" : "Save"}
            </button>
          }
        >
          <div className={styles.panelBody}>
            <div className={formStyles.actions}>
              {(attendanceDraft ?? []).length > 8 && (
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
                      onChange={(e) => handleAttendanceDraft(att.enrollment, e.target.checked)}
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
