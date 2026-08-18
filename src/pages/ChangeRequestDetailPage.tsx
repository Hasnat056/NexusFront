import { useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import {
  CHANGE_REQUEST_STATUS_TONE,
  changeRequestHeadline,
  getChangeRequestById,
  markChangeRequestApplied,
  markChangeRequestConfirmed,
  markChangeRequestDeclined,
} from "../data/changeRequests";
import { getDepartmentById, setDepartmentHod } from "../data/departmentDirectory";
import { getFacultyById, removeFacultyRecord } from "../data/facultyDirectory";
import { getStudentById, removeStudentRecord } from "../data/studentDirectory";
import { Tag } from "../components/ui/Tag";
import type { ChangeRequest } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./ChangeRequestDetailPage.module.css";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function facultyName(employeeId: string | null): string | null {
  if (!employeeId) return null;
  const faculty = getFacultyById(employeeId);
  return faculty ? `${faculty.person.first_name} ${faculty.person.last_name} — ${employeeId}` : employeeId;
}

function studentName(studentId: string | null): string | null {
  if (!studentId) return null;
  const student = getStudentById(studentId);
  return student ? `${student.person.first_name} ${student.person.last_name} — ${studentId}` : studentId;
}

/**
 * Applies the type-specific side effect ChangeRequestSerializer.update()'s status=='applied'
 * branch performs inline for each change_type — hod_change sets Department.HOD, faculty_delete/
 * student_delete actually remove the person (delete_faculty_task/delete_student_task).
 * result_calculation is never routed through here — canApply excludes it below, since applying it
 * means actually computing a result, which only the owning Faculty member can do (see
 * FacultyRequestDetailPage/applyResultCalculation).
 */
function applySideEffect(cr: ChangeRequest) {
  if (cr.change_type === "hod_change" && cr.department) {
    setDepartmentHod(cr.department, cr.new_hod);
  } else if (cr.change_type === "faculty_delete" && cr.target_faculty) {
    removeFacultyRecord(cr.target_faculty);
  } else if (cr.change_type === "student_delete" && cr.target_student) {
    removeStudentRecord(cr.target_student);
  }
}

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const changeRequest = id ? getChangeRequestById(Number(id)) : undefined;
  const [, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!changeRequest) {
    return (
      <div className={styles.page}>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Requests", href: "/admin/requests" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Change request #{id} was not found.</p>
      </div>
    );
  }

  const resolvable = changeRequest.status !== "applied" && changeRequest.status !== "declined" && changeRequest.status !== "expired";
  // result_calculation is the one type Admin can't directly execute — only the Faculty member who
  // owns the allocation has the grading data to actually compute a result. Admin's role for this
  // type stops at confirming; the Faculty applies it themselves from their own request page.
  const isResultCalculation = changeRequest.change_type === "result_calculation";
  const canConfirm = isResultCalculation && changeRequest.status === "pending";
  const canApply = !isResultCalculation && resolvable;
  const waitingOnFaculty = isResultCalculation && changeRequest.status === "confirmed";

  function handleConfirm() {
    markChangeRequestConfirmed(changeRequest!.id);
    setMessage("Confirmed — the faculty member can now apply it.");
    setTick((t) => t + 1);
  }

  function handleApply() {
    applySideEffect(changeRequest!);
    markChangeRequestApplied(changeRequest!.id);
    setMessage("Change applied.");
    setTick((t) => t + 1);
  }

  function handleDecline() {
    markChangeRequestDeclined(changeRequest!.id);
    setMessage("Change request declined.");
    setTick((t) => t + 1);
  }

  const departmentName = changeRequest.department ? (getDepartmentById(changeRequest.department)?.department_name ?? changeRequest.department) : null;

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Requests", href: "/admin/requests" },
          { label: changeRequestHeadline(changeRequest) },
        ]}
      />
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.headline}>{changeRequestHeadline(changeRequest)}</h1>
          <Tag tone={CHANGE_REQUEST_STATUS_TONE[changeRequest.status]}>{changeRequest.status}</Tag>
        </div>

        {message && <div className={formStyles.banner}>{message}</div>}

        <dl className={styles.fields}>
          <dt>ID</dt>
          <dd>#{changeRequest.id}</dd>
          <dt>Type</dt>
          <dd>{changeRequest.change_type}</dd>
          <dt>Requested at</dt>
          <dd>{formatDateTime(changeRequest.requested_at)}</dd>
          <dt>Confirmed at</dt>
          <dd>{formatDateTime(changeRequest.confirmed_at)}</dd>
          <dt>Applied at</dt>
          <dd>{formatDateTime(changeRequest.applied_at)}</dd>
          {changeRequest.department && (
            <>
              <dt>Department</dt>
              <dd>{departmentName}</dd>
            </>
          )}
          {changeRequest.new_hod && (
            <>
              <dt>Proposed HOD</dt>
              <dd>{facultyName(changeRequest.new_hod)}</dd>
            </>
          )}
          {changeRequest.target_allocation !== null && (
            <>
              <dt>Allocation</dt>
              <dd>#{changeRequest.target_allocation}</dd>
            </>
          )}
          {changeRequest.target_faculty && (
            <>
              <dt>Faculty</dt>
              <dd>{facultyName(changeRequest.target_faculty)}</dd>
            </>
          )}
          {changeRequest.target_student && (
            <>
              <dt>Student</dt>
              <dd>{studentName(changeRequest.target_student)}</dd>
            </>
          )}
        </dl>

        {canConfirm && (
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.primaryButton} onClick={handleConfirm}>
              Confirm
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={handleDecline}>
              Decline
            </button>
          </div>
        )}
        {canApply && (
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.primaryButton} onClick={handleApply}>
              Apply
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={handleDecline}>
              Decline
            </button>
          </div>
        )}
        {waitingOnFaculty && (
          <p className={formStyles.hint}>Confirmed — waiting for the faculty member to apply it from their own request page.</p>
        )}
      </div>
    </div>
  );
}
