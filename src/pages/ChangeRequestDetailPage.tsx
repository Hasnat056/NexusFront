import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import { CHANGE_REQUEST_STATUS_TONE, changeRequestHeadline } from "../data/changeRequests";
import type { AdminDepartment, AdminFacultyListItem, AdminStudentListItem, ChangeRequest } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./ChangeRequestDetailPage.module.css";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [record, setRecord] = useState<ChangeRequest | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [faculty, setFaculty] = useState<AdminFacultyListItem[]>([]);
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useAdminPageConfig(record ? changeRequestHeadline(record) : "Change request");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // ChangeRequestPermissions.has_object_permission (AdminModule/permissions.py) is buggy: for
    // any status other than 'applied' it only allows PATCH/PUT, never GET — so GET /admin/
    // requests/<id>/ 403s for every pending/confirmed/declined/expired request, even for the
    // admin who created it. The list endpoint has no such object-level check (ChangeRequestList
    // APIView only runs has_permission), so this fetches the full list and finds the row there
    // instead of hitting the broken single-object route.
    Promise.all([
      apiGetAllPages<ChangeRequest>("/admin/requests/"),
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
      cached("admin:all-students", () => apiGetAllPages<AdminStudentListItem>("/admin/students/")),
    ])
      .then(([requestsRes, departmentsRes, facultyRes, studentsRes]) => {
        if (cancelled) return;
        const match = requestsRes.find((r) => String(r.id) === id);
        if (!match) {
          setNotFound(true);
          return;
        }
        setRecord(match);
        setDepartments(departmentsRes);
        setFaculty(facultyRes);
        setStudents(studentsRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, refreshKey]);

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Requests", href: "/admin/requests" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Change request #{id} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.notFound}>Loading change request…</p>;
  }

  const departmentName = record.department
    ? (departments.find((d) => d.department_id === record.department)?.department_name ?? record.department)
    : null;
  const newHodName = record.new_hod
    ? (() => {
        const f = faculty.find((x) => x.person.person_id === record.new_hod);
        return f ? `${f.person.first_name} ${f.person.last_name} · ${record.new_hod}` : record.new_hod;
      })()
    : null;
  const targetFacultyName = record.target_faculty
    ? (() => {
        const f = faculty.find((x) => x.person.person_id === record.target_faculty);
        return f ? `${f.person.first_name} ${f.person.last_name} · ${record.target_faculty}` : record.target_faculty;
      })()
    : null;
  const targetStudentName = record.target_student
    ? (() => {
        const s = students.find((x) => x.person.person_id === record.target_student);
        return s ? `${s.person.first_name} ${s.person.last_name} · ${record.target_student}` : record.target_student;
      })()
    : null;

  // ChangeRequestSerializer's `status` field is only writable while the current status isn't
  // already 'applied' or 'declined' (AdminModule/serializers.py::ChangeRequestSerializer.
  // get_extra_kwargs). There's no Admin-side "confirm" action at all — that transition only
  // happens through an unauthenticated, emailed confirmation-token link
  // (ChangeRequestView, AdminModule/views.py) that isn't part of this app.
  const resolvable = record.status !== "applied" && record.status !== "declined" && record.status !== "expired";
  // ChangeRequestSerializer.update()'s status=='applied' branch has no case at all for
  // change_type=='result_calculation' — PATCHing status='applied' on one is a silent no-op
  // server-side (the Faculty member who owns the allocation applies it themselves from their own
  // request page instead), so this app doesn't offer an Apply action for that type.
  const isResultCalculation = record.change_type === "result_calculation";
  const canApply = !isResultCalculation && resolvable;
  const canDecline = resolvable;

  async function patchStatus(status: "applied" | "declined") {
    if (!id) return;
    setActionError(null);
    try {
      await apiMutate<ChangeRequest>(`/admin/requests/${id}/`, "PATCH", { status });
      if (status === "applied" && record) {
        if (record.change_type === "hod_change") invalidateCache("admin:departments");
        if (record.change_type === "faculty_delete") invalidateCache("admin:all-faculty");
        if (record.change_type === "student_delete") invalidateCache("admin:all-students");
      }
      showToast(status === "applied" ? "Change applied." : "Change request declined.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Requests", href: "/admin/requests" },
          { label: changeRequestHeadline(record) },
        ]}
      />
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.headline}>{changeRequestHeadline(record)}</h1>
          <Tag tone={CHANGE_REQUEST_STATUS_TONE[record.status]}>{record.status}</Tag>
        </div>

        {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

        <dl className={styles.fields}>
          <dt>ID</dt>
          <dd>#{record.id}</dd>
          <dt>Type</dt>
          <dd>{record.change_type}</dd>
          <dt>Requested by</dt>
          <dd>User #{record.requested_by}</dd>
          <dt>Requested at</dt>
          <dd>{formatDateTime(record.requested_at)}</dd>
          <dt>Confirmed at</dt>
          <dd>{formatDateTime(record.confirmed_at)}</dd>
          <dt>Applied at</dt>
          <dd>{formatDateTime(record.applied_at)}</dd>
          {record.department && (
            <>
              <dt>Department</dt>
              <dd>{departmentName}</dd>
            </>
          )}
          {record.new_hod && (
            <>
              <dt>Proposed HOD</dt>
              <dd>{newHodName}</dd>
            </>
          )}
          {record.target_allocation !== null && (
            <>
              <dt>Allocation</dt>
              <dd>#{record.target_allocation}</dd>
            </>
          )}
          {record.target_faculty && (
            <>
              <dt>Faculty</dt>
              <dd>{targetFacultyName}</dd>
            </>
          )}
          {record.target_student && (
            <>
              <dt>Student</dt>
              <dd>{targetStudentName}</dd>
            </>
          )}
        </dl>

        {(canApply || canDecline) && (
          <div className={formStyles.actions}>
            {canApply && (
              <button type="button" className={formStyles.primaryButton} onClick={() => patchStatus("applied")}>
                Apply
              </button>
            )}
            {canDecline && (
              <button type="button" className={formStyles.dangerButton} onClick={() => patchStatus("declined")}>
                Decline
              </button>
            )}
          </div>
        )}
        {(canApply || canDecline) && (
          <p className={formStyles.hint}>
            Only the admin account that originally created this request can apply or decline it. A
            different admin will get a permission error attempting either action here.
          </p>
        )}
        {isResultCalculation && record.status === "pending" && (
          <p className={formStyles.hint}>
            Waiting on the requester to confirm via the emailed link, then on the faculty member who
            owns the allocation to apply it from their own request page. Admin has no direct Apply
            action for a result calculation request.
          </p>
        )}
        {isResultCalculation && record.status === "confirmed" && (
          <p className={formStyles.hint}>Confirmed. Waiting for the faculty member to apply it from their own request page.</p>
        )}
      </div>
    </>
  );
}
