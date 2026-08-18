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
import type { Assessment } from "../types/api";
import {
  createAssessment,
  deleteAssessment,
  getFacultyAllocationDetail,
  gradeAssessmentChecked,
  updateAssessment,
  type AssessmentFormValue,
} from "../data/facultyAllocationDetail";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import formStyles from "../components/ui/Form.module.css";
import tableStyles from "../components/ui/Table.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

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
  const { id } = useParams<{ id: string }>();
  const allocationId = id ? Number(id) : NaN;
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [addingAssessment, setAddingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormValue>(EMPTY_ASSESSMENT_FORM);
  const [editingAssessmentId, setEditingAssessmentId] = useState<number | null>(null);

  const [expandedAssessmentId, setExpandedAssessmentId] = useState<number | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");

  const dashboard = mockFacultyDashboardResponse;
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();

  const detail = getFacultyAllocationDetail(allocationId);

  function refresh() {
    setTick((t) => t + 1);
  }

  const expandedAssessment = detail?.assessment_set.find((a) => a.assessment_id === expandedAssessmentId) ?? null;

  const filteredRoster = useMemo(() => {
    if (!expandedAssessment) return [];
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return expandedAssessment.assessmentchecked_set;
    return expandedAssessment.assessmentchecked_set.filter((c) => {
      const name = `${c.student_info.first_name} ${c.student_info.last_name} ${c.student_info.student_id}`.toLowerCase();
      return name.includes(q);
    });
  }, [expandedAssessment, rosterFilter]);

  if (!detail) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Assessments"
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

  function startAddAssessment() {
    setAssessmentForm(EMPTY_ASSESSMENT_FORM);
    setAddingAssessment(true);
    setEditingAssessmentId(null);
    setError(null);
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
  }

  function cancelAssessmentForm() {
    setAddingAssessment(false);
    setEditingAssessmentId(null);
  }

  function handleSaveAssessment(e: FormEvent) {
    e.preventDefault();
    const result =
      editingAssessmentId !== null
        ? updateAssessment(allocationId, editingAssessmentId, assessmentForm)
        : createAssessment(allocationId, assessmentForm);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setAddingAssessment(false);
    setEditingAssessmentId(null);
    setError(null);
    setMessage("Assessment saved.");
    refresh();
  }

  function handleDeleteAssessment(assessmentId: number) {
    const result = deleteAssessment(allocationId, assessmentId);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    if (expandedAssessmentId === assessmentId) setExpandedAssessmentId(null);
    setError(null);
    refresh();
  }

  function toggleExpanded(assessmentId: number) {
    setExpandedAssessmentId((prev) => (prev === assessmentId ? null : assessmentId));
    setRosterFilter("");
  }

  function handleGrade(assessmentId: number, checkedId: number, value: string) {
    const obtained = value === "" ? null : Number(value);
    const result = gradeAssessmentChecked(allocationId, assessmentId, checkedId, obtained);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setError(null);
    refresh();
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
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

      {message && <div className={formStyles.banner}>{message}</div>}
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
                <div className={formStyles.field}>
                  <label htmlFor="assessment_type">Type</label>
                  <input
                    id="assessment_type"
                    required
                    value={assessmentForm.assessment_type}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}
                  />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="assessment_name">Name</label>
                  <input
                    id="assessment_name"
                    required
                    value={assessmentForm.assessment_name}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_name: e.target.value })}
                  />
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="assessment_date">Date</label>
                  <input
                    id="assessment_date"
                    type="date"
                    required
                    value={assessmentForm.assessment_date}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })}
                  />
                </div>
              </div>
              <div className={formStyles.row}>
                <div className={formStyles.field}>
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
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="total_marks">Total marks</label>
                  <input
                    id="total_marks"
                    type="number"
                    min={1}
                    required
                    value={assessmentForm.total_marks}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, total_marks: Number(e.target.value) })}
                  />
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
                <div className={formStyles.field}>
                  <label htmlFor="submission_deadline">Submission deadline</label>
                  <input
                    id="submission_deadline"
                    type="datetime-local"
                    required
                    value={assessmentForm.submission_deadline}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, submission_deadline: e.target.value })}
                  />
                </div>
              )}
              <div className={formStyles.qualRowFooter}>
                <button type="submit" className={formStyles.primaryButton}>
                  Save
                </button>
                <button type="button" className={formStyles.secondaryButton} onClick={cancelAssessmentForm}>
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
                  const gradedCount = a.assessmentchecked_set.filter((c) => c.obtained !== null).length;
                  return (
                    <Tag tone={gradedCount === a.assessmentchecked_set.length ? "good" : "warning"}>
                      {`${gradedCount}/${a.assessmentchecked_set.length}`}
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
            <button type="button" className={formStyles.primaryButton} onClick={() => setExpandedAssessmentId(null)}>
              Save
            </button>
          }
        >
          <div className={styles.panelBody}>
            {expandedAssessment.assessmentchecked_set.length > 8 && (
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
                      onChange={(e) => handleGrade(expandedAssessment.assessment_id, c.id, e.target.value)}
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
