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
import type { Assessment, FacultyAllocationDetail, FacultyAssessmentChecked, FacultyDashboardResponse } from "../types/api";
import { apiGet, apiMutate } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import tableStyles from "../components/ui/Table.module.css";
import styles from "./PersonDetailPage.module.css";

interface AssessmentFormValue {
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  weightage: number;
  total_marks: number;
  student_submission: boolean;
  submission_deadline: string;
}

const EMPTY_ASSESSMENT_FORM: AssessmentFormValue = {
  assessment_type: "",
  assessment_name: "",
  assessment_date: "",
  weightage: 0,
  total_marks: 0,
  student_submission: false,
  submission_deadline: "",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacultyAllocationAssessmentsPage() {
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

  const [addingAssessment, setAddingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormValue>(EMPTY_ASSESSMENT_FORM);
  const [editingAssessmentId, setEditingAssessmentId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [expandedAssessmentId, setExpandedAssessmentId] = useState<number | null>(null);
  const [expandedAssessment, setExpandedAssessment] = useState<Assessment | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");
  const [rosterDraft, setRosterDraft] = useState<FacultyAssessmentChecked[] | null>(null);
  const [savingRoster, setSavingRoster] = useState(false);

  // AssessmentSerializer.__init__ (FacultyModule/serializers.py) only keeps assessmentchecked_set
  // when `self.instance` is a single Assessment — for a many=True context (this page's list, and
  // the assessment_set nested under GET .../allocations/<id>/) self.instance is the whole
  // queryset/list instead, so the field is always popped there. assessmentchecked_set is only ever
  // present on the single-instance retrieve response, hence the per-assessment fetches below.
  const [gradedCounts, setGradedCounts] = useState<Record<number, { graded: number; total: number }>>({});

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
      detail.assessment_set.map((a) =>
        apiGet<Assessment>(`/faculty/allocations/${allocationId}/assessments/${a.assessment_id}/`),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const counts: Record<number, { graded: number; total: number }> = {};
        for (const r of results) {
          counts[r.assessment_id] = {
            graded: r.assessmentchecked_set.filter((c) => c.obtained !== null).length,
            total: r.assessmentchecked_set.length,
          };
        }
        setGradedCounts(counts);
      })
      .catch(() => {
        // Best-effort — the "Graded" column just stays blank if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [detail, allocationId]);

  const filteredRoster = useMemo(() => {
    const roster = rosterDraft ?? expandedAssessment?.assessmentchecked_set ?? [];
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((c) => {
      const name = `${c.student_info.first_name} ${c.student_info.last_name} ${c.student_info.student_id}`.toLowerCase();
      return name.includes(q);
    });
  }, [rosterDraft, expandedAssessment, rosterFilter]);

  const avatarInitials = dashboard ? `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="allocations" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Assessments" subtitle="">
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
        pageTitle="Assessments"
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
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="allocations" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Assessments" subtitle="">
        <p className={styles.notFound}>Loading assessments…</p>
      </DashboardShell>
    );
  }

  const locked = detail.status === "Completed";

  function startAddAssessment() {
    setAssessmentForm(EMPTY_ASSESSMENT_FORM);
    setAddingAssessment(true);
    setEditingAssessmentId(null);
    setError(null);
    setFieldErrors({});
  }

  function startEditAssessment(a: Assessment) {
    setAssessmentForm({
      assessment_type: a.assessment_type,
      assessment_name: a.assessment_name,
      assessment_date: a.assessment_date,
      weightage: a.weightage,
      total_marks: a.total_marks,
      student_submission: a.student_submission,
      submission_deadline: a.submission_deadline ?? "",
    });
    setEditingAssessmentId(a.assessment_id);
    setAddingAssessment(false);
    setError(null);
    setFieldErrors({});
  }

  function cancelAssessmentForm() {
    setAddingAssessment(false);
    setEditingAssessmentId(null);
  }

  async function handleSaveAssessment(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = {
      assessment_type: assessmentForm.assessment_type,
      assessment_name: assessmentForm.assessment_name,
      assessment_date: assessmentForm.assessment_date,
      weightage: assessmentForm.weightage,
      total_marks: assessmentForm.total_marks,
      student_submission: assessmentForm.student_submission,
      submission_deadline: assessmentForm.student_submission ? assessmentForm.submission_deadline : null,
    };
    try {
      if (editingAssessmentId !== null) {
        await apiMutate(`/faculty/allocations/${allocationId}/assessments/${editingAssessmentId}/`, "PATCH", body);
      } else {
        await apiMutate(`/faculty/allocations/${allocationId}/assessments/`, "POST", body);
      }
      setAddingAssessment(false);
      setEditingAssessmentId(null);
      showToast("Assessment saved.");
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

  async function handleDeleteAssessment(assessmentId: number) {
    setError(null);
    try {
      await apiMutate(`/faculty/allocations/${allocationId}/assessments/${assessmentId}/`, "DELETE");
      if (expandedAssessmentId === assessmentId) {
        setExpandedAssessmentId(null);
        setExpandedAssessment(null);
        setRosterDraft(null);
      }
      showToast("Assessment deleted.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    }
  }

  async function toggleExpanded(assessmentId: number) {
    if (expandedAssessmentId === assessmentId) {
      setExpandedAssessmentId(null);
      setExpandedAssessment(null);
      setRosterDraft(null);
      setRosterFilter("");
      return;
    }
    setExpandedAssessmentId(assessmentId);
    setRosterFilter("");
    setError(null);
    try {
      // The list/nested assessment_set never carries assessmentchecked_set (see the comment above
      // gradedCounts) — fetch this one assessment's own detail to get its roster.
      const fresh = await apiGet<Assessment>(`/faculty/allocations/${allocationId}/assessments/${assessmentId}/`);
      setExpandedAssessment(fresh);
      setRosterDraft(fresh.assessmentchecked_set);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
      setExpandedAssessmentId(null);
    }
  }

  function handleGradeDraft(checkedId: number, value: string) {
    const obtained = value === "" ? null : Number(value);
    setRosterDraft((prev) => (prev ? prev.map((c) => (c.id === checkedId ? { ...c, obtained } : c)) : prev));
  }

  async function handleSaveRoster() {
    if (!expandedAssessment || !rosterDraft) return;
    setSavingRoster(true);
    setError(null);
    try {
      await apiMutate(`/faculty/allocations/${allocationId}/assessments/${expandedAssessment.assessment_id}/`, "PATCH", {
        assessment_type: expandedAssessment.assessment_type,
        assessment_name: expandedAssessment.assessment_name,
        assessment_date: expandedAssessment.assessment_date,
        weightage: expandedAssessment.weightage,
        total_marks: expandedAssessment.total_marks,
        student_submission: expandedAssessment.student_submission,
        assessmentchecked_set: rosterDraft.map((c) => ({
          id: c.id,
          assessment: expandedAssessment.assessment_id,
          enrollment: c.enrollment,
          obtained: c.obtained,
        })),
      });
      setExpandedAssessmentId(null);
      setExpandedAssessment(null);
      setRosterDraft(null);
      showToast("Grades saved.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setSavingRoster(false);
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
      pageTitle={`${detail.course} — Assessments`}
      subtitle={`${detail.session} · Semester ${detail.semester} · ${dashboard.faculty.institutional_email}`}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/faculty/dashboard" },
          { label: "Allocations", href: "/faculty/allocations" },
          { label: detail.course, href: `/faculty/allocations/${allocationId}` },
          { label: "Assessments" },
        ]}
      />

      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <Panel
        title="Assessments"
        headerExtra={
          !locked && (
            <button type="button" className={formStyles.linkButton} onClick={startAddAssessment}>
              + Add assessment
            </button>
          )
        }
      >
        <div className={styles.panelBody}>
          {(addingAssessment || editingAssessmentId !== null) && (
            <form className={formStyles.qualRow} onSubmit={handleSaveAssessment}>
              <div className={formStyles.row}>
                <div className={formStyles.field} data-invalid={fieldErrors.assessment_type ? "true" : undefined}>
                  <label htmlFor="assessment_type">Type</label>
                  <input
                    id="assessment_type"
                    required
                    value={assessmentForm.assessment_type}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}
                  />
                  {fieldErrors.assessment_type && <span className={formStyles.fieldError}>{fieldErrors.assessment_type}</span>}
                </div>
                <div className={formStyles.field} data-invalid={fieldErrors.assessment_name ? "true" : undefined}>
                  <label htmlFor="assessment_name">Name</label>
                  <input
                    id="assessment_name"
                    required
                    value={assessmentForm.assessment_name}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_name: e.target.value })}
                  />
                  {fieldErrors.assessment_name && <span className={formStyles.fieldError}>{fieldErrors.assessment_name}</span>}
                </div>
                <div className={formStyles.field} data-invalid={fieldErrors.assessment_date ? "true" : undefined}>
                  <label htmlFor="assessment_date">Date</label>
                  <input
                    id="assessment_date"
                    type="date"
                    required
                    value={assessmentForm.assessment_date}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })}
                  />
                  {fieldErrors.assessment_date && <span className={formStyles.fieldError}>{fieldErrors.assessment_date}</span>}
                </div>
              </div>
              <div className={formStyles.row}>
                <div className={formStyles.field} data-invalid={fieldErrors.weightage ? "true" : undefined}>
                  <label htmlFor="weightage">Weightage %</label>
                  <input
                    id="weightage"
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={assessmentForm.weightage}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, weightage: Number(e.target.value) })}
                  />
                  {fieldErrors.weightage && <span className={formStyles.fieldError}>{fieldErrors.weightage}</span>}
                </div>
                <div className={formStyles.field} data-invalid={fieldErrors.total_marks ? "true" : undefined}>
                  <label htmlFor="total_marks">Total marks</label>
                  <input
                    id="total_marks"
                    type="number"
                    min={1}
                    required
                    value={assessmentForm.total_marks}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, total_marks: Number(e.target.value) })}
                  />
                  {fieldErrors.total_marks && <span className={formStyles.fieldError}>{fieldErrors.total_marks}</span>}
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.checkboxField} htmlFor="student_submission">
                    <input
                      id="student_submission"
                      type="checkbox"
                      checked={assessmentForm.student_submission}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, student_submission: e.target.checked })}
                    />
                    Accepts student submission
                  </label>
                </div>
              </div>
              {assessmentForm.student_submission && (
                <div className={formStyles.field} data-invalid={fieldErrors.submission_deadline ? "true" : undefined}>
                  <label htmlFor="submission_deadline">Submission deadline</label>
                  <input
                    id="submission_deadline"
                    type="datetime-local"
                    required
                    value={assessmentForm.submission_deadline}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, submission_deadline: e.target.value })}
                  />
                  {fieldErrors.submission_deadline && <span className={formStyles.fieldError}>{fieldErrors.submission_deadline}</span>}
                </div>
              )}
              <div className={formStyles.qualRowFooter}>
                <button type="submit" className={formStyles.primaryButton} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className={formStyles.secondaryButton} onClick={cancelAssessmentForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <Table
            columns={[
              {
                key: "assessment",
                header: "Assessment",
                render: (a) => (
                  <>
                    <strong>{a.assessment_name}</strong>
                    <div className={formStyles.hint}>{a.assessment_type}</div>
                  </>
                ),
              },
              { key: "date", header: "Date", render: (a) => a.assessment_date },
              { key: "weightage", header: "Weightage", align: "right", render: (a) => `${a.weightage}%` },
              { key: "total", header: "Total", align: "right", render: (a) => a.total_marks },
              {
                key: "graded",
                header: "Graded",
                align: "right",
                render: (a) => {
                  const counts = gradedCounts[a.assessment_id];
                  if (!counts) return <span className={formStyles.hint}>…</span>;
                  return (
                    <Tag tone={counts.graded === counts.total ? "good" : "warning"}>
                      {`${counts.graded}/${counts.total}`}
                    </Tag>
                  );
                },
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (a) => (
                  <div className={formStyles.actions}>
                    <button type="button" className={formStyles.secondaryButton} onClick={() => toggleExpanded(a.assessment_id)}>
                      {expandedAssessmentId === a.assessment_id ? "Hide roster" : "Grade"}
                    </button>
                    {!locked && (
                      <>
                        <button type="button" className={formStyles.secondaryButton} onClick={() => startEditAssessment(a)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={formStyles.dangerButton}
                          onClick={() => handleDeleteAssessment(a.assessment_id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            rows={detail.assessment_set}
            rowKey={(a) => String(a.assessment_id)}
          />
          {detail.assessment_set.length === 0 && <p className={styles.empty}>No assessments yet.</p>}
        </div>
      </Panel>

      {expandedAssessment && (
        <Panel
          title={`Grading — ${expandedAssessment.assessment_name}`}
          hint={`${expandedAssessment.assessment_date} · ${expandedAssessment.weightage}% · out of ${expandedAssessment.total_marks}${
            expandedAssessment.student_submission && expandedAssessment.submission_deadline
              ? ` · due ${formatDateTime(expandedAssessment.submission_deadline)}`
              : ""
          }`}
          headerExtra={
            <button type="button" className={formStyles.primaryButton} onClick={handleSaveRoster} disabled={savingRoster || locked}>
              {savingRoster ? "Saving…" : "Save"}
            </button>
          }
        >
          <div className={styles.panelBody}>
            {(rosterDraft ?? []).length > 8 && (
              <input
                type="text"
                placeholder="Filter by student name or ID…"
                value={rosterFilter}
                onChange={(e) => setRosterFilter(e.target.value)}
              />
            )}
            <Table
              columns={[
                {
                  key: "avatar",
                  header: "",
                  render: (c) => <Avatar src={c.student_info.image} name={`${c.student_info.first_name} ${c.student_info.last_name}`} />,
                },
                {
                  key: "student",
                  header: "Student",
                  render: (c) => (
                    <>
                      <strong>
                        {c.student_info.first_name} {c.student_info.last_name}
                      </strong>
                      <div className={formStyles.hint}>{c.student_info.student_id}</div>
                    </>
                  ),
                },
                {
                  key: "obtained",
                  header: "Obtained",
                  align: "right",
                  render: (c) => (
                    <input
                      type="number"
                      min={0}
                      max={expandedAssessment.total_marks}
                      value={c.obtained ?? ""}
                      onChange={(e) => handleGradeDraft(c.id, e.target.value)}
                      disabled={locked}
                      className={tableStyles.cellInput}
                    />
                  ),
                },
              ]}
              rows={filteredRoster}
              rowKey={(c) => String(c.id)}
            />
            {filteredRoster.length === 0 && rosterFilter && <p className={styles.empty}>No students match "{rosterFilter}".</p>}
          </div>
        </Panel>
      )}
    </DashboardShell>
  );
}
