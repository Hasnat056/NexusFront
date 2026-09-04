import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { Table, type Column } from "../components/ui/Table";
import { StatStrip } from "../components/ui/StatStrip";
import { Avatar } from "../components/ui/Avatar";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type {
  AdminDashboardResponse,
  AdminDepartment,
  AdminFacultyDetail,
  AdminFacultyListItem,
  AdminProgram,
  ChangeRequest,
} from "../types/api";
import type { StatStripItem } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import listStyles from "./FacultyListPage.module.css";
import styles from "./DepartmentDetailPage.module.css";

const programColumns: Column<AdminProgram>[] = [
  { key: "program_id", header: "Program ID", render: (p) => p.program_id },
  {
    key: "name",
    header: "Name",
    render: (p) => (
      <Link to={`/admin/programs/${p.program_id}`} className={listStyles.nameLink}>
        {p.program_name}
      </Link>
    ),
  },
  { key: "semesters", header: "Semesters", render: (p) => p.total_semesters },
];

export function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [department, setDepartment] = useState<AdminDepartment | null>(null);
  const [currentHod, setCurrentHod] = useState<AdminFacultyDetail | null>(null);
  const [facultyOptions, setFacultyOptions] = useState<AdminFacultyListItem[]>([]);
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [departmentFaculty, setDepartmentFaculty] = useState<AdminFacultyListItem[]>([]);
  const [pendingHodRequest, setPendingHodRequest] = useState<ChangeRequest | null>(null);
  const [stats, setStats] = useState<StatStripItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hod, setHod] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [hodFieldError, setHodFieldError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useAdminPageConfig("Department");

  useEffect(() => {
    if (!departmentId) return;
    let cancelled = false;

    async function load() {
      try {
        const [dept, dashboard, allFaculty, programsRes, deptFaculty, hodRequests] = await Promise.all([
          apiGet<AdminDepartment>(`/admin/departments/${departmentId}/`),
          apiGet<AdminDashboardResponse>("/admin/dashboard/"),
          cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
          apiGetAllPages<AdminProgram>(`/admin/programs/?department=${departmentId}`),
          apiGetAllPages<AdminFacultyListItem>(`/admin/faculty/?department=${departmentId}`),
          apiGetAllPages<ChangeRequest>("/admin/requests/?change_type=hod_change"),
        ]);
        if (cancelled) return;

        const hodDetail = dept.HOD ? await apiGet<AdminFacultyDetail>(`/admin/faculty/${dept.HOD}/`) : null;
        if (cancelled) return;

        setDepartment(dept);
        setCurrentHod(hodDetail);
        setHod(dept.HOD ?? "");
        setFacultyOptions(allFaculty);
        setPrograms(programsRes);
        setDepartmentFaculty(deptFaculty);
        const deptStats = dashboard.departments_data.find((d) => d.department_id === departmentId);
        setStats([
          { value: deptStats?.student_count ?? 0, label: "Students" },
          { value: deptStats?.faculty_count ?? 0, label: "Faculty" },
          { value: deptStats?.program_count ?? 0, label: "Programs" },
        ]);
        const pending = hodRequests.find(
          (cr) => cr.department === departmentId && cr.status !== "applied" && cr.status !== "declined" && cr.status !== "expired",
        );
        setPendingHodRequest(pending ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [departmentId, navigate, refreshKey]);

  async function handleSubmitHodChange(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentId) return;
    setActionError(null);
    setHodFieldError(null);
    if (!hod) {
      showToast("Choose a faculty member first.", "info");
      return;
    }
    if (department?.HOD === hod) {
      showToast("That faculty member is already the HOD.", "info");
      return;
    }
    try {
      await apiMutate(`/admin/departments/${departmentId}/`, "PATCH", { HOD: hod });
      showToast("HOD change request submitted — a confirmation email has been sent. The HOD won't change until it's confirmed and applied.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setActionError(banner);
      setHodFieldError(fields.HOD ?? null);
    }
  }

  async function handleApplyHod() {
    if (!pendingHodRequest) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/requests/${pendingHodRequest.id}/`, "PATCH", { status: "applied" });
      showToast("HOD change applied.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  async function handleDeclineHod() {
    if (!pendingHodRequest) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/requests/${pendingHodRequest.id}/`, "PATCH", { status: "declined" });
      showToast("HOD change declined.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return notFound || loadError ? (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Departments", href: "/admin/departments" },
          { label: departmentId ?? "Not found" },
        ]}
      />
      <p className={detailStyles.notFound}>{loadError ?? `Department ${departmentId} was not found.`}</p>
    </>
  ) : !department ? (
    <p className={listStyles.empty}>Loading department…</p>
  ) : (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Departments", href: "/admin/departments" },
          { label: department.department_name },
        ]}
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>{department.department_name}</h1>
          <p className={detailStyles.subline}>
            {department.department_id} · Inaugurated {department.department_inauguration_date ?? "—"}
          </p>
        </div>
        <StatStrip items={stats} />
      </div>

      <Panel title="Head of department">
        <div className={styles.hodRow}>
          <Avatar
            src={currentHod?.person.image ?? null}
            name={currentHod ? `${currentHod.person.first_name} ${currentHod.person.last_name}` : "?"}
            size={44}
          />
          <div className={styles.hodInfo}>
            <div className={styles.hodRole}>Current HOD</div>
            <div className={styles.hodName}>
              {currentHod ? `${currentHod.person.first_name} ${currentHod.person.last_name}` : "Unassigned"}
            </div>
            {currentHod && (
              <div className={styles.hodSub}>
                {currentHod.person.person_id} · {currentHod.designation}
              </div>
            )}
          </div>
          <form className={styles.hodEditRow} onSubmit={handleSubmitHodChange}>
            <div className={styles.hodSelect}>
              <Select
                ariaLabel="Head of department"
                value={hod}
                onChange={setHod}
                placeholder="Unassigned"
                invalid={Boolean(hodFieldError)}
                options={[
                  { value: "", label: "Unassigned" },
                  ...facultyOptions.map((f) => ({
                    value: f.person.person_id,
                    label: `${f.person.first_name} ${f.person.last_name} — ${f.person.person_id}`,
                  })),
                ]}
              />
            </div>
            <button type="submit" className={formStyles.primaryButton}>
              Submit change
            </button>
          </form>
        </div>
        {hodFieldError && <span className={formStyles.fieldError}>{hodFieldError}</span>}

        {pendingHodRequest && (
          <div className={styles.pillReview}>
            <Tag tone="warning">{`HOD change ${pendingHodRequest.status}`}</Tag>
            <span className={styles.pillWho}>
              {currentHod ? currentHod.person.first_name : "Unassigned"} →{" "}
              {facultyOptions.find((f) => f.person.person_id === pendingHodRequest.new_hod)?.person.first_name ??
                pendingHodRequest.new_hod}
            </span>
            <span className={styles.pillDivider} />
            <button type="button" className={`${styles.pillBtn} ${styles.apply}`} onClick={handleApplyHod}>
              Apply
            </button>
            <button type="button" className={`${styles.pillBtn} ${styles.decline}`} onClick={handleDeclineHod}>
              Decline
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Programs" hint={`${programs.length} offered`}>
        {programs.length > 0 ? (
          <Table columns={programColumns} rows={programs} rowKey={(p) => p.program_id} />
        ) : (
          <p className={detailStyles.empty}>No programs in this department yet.</p>
        )}
      </Panel>

      <Panel title="Faculty" hint={`${departmentFaculty.length} members`}>
        {departmentFaculty.length > 0 ? (
          <Table
            columns={[
              { key: "id", header: "Employee ID", render: (f: AdminFacultyListItem) => f.person.person_id },
              {
                key: "name",
                header: "Name",
                render: (f: AdminFacultyListItem) => (
                  <Link to={`/admin/faculty/${f.person.person_id}`} className={listStyles.nameLink}>
                    {f.person.first_name} {f.person.last_name}
                  </Link>
                ),
              },
              { key: "designation", header: "Designation", render: (f: AdminFacultyListItem) => f.designation },
              {
                key: "role",
                header: "",
                render: (f: AdminFacultyListItem) => (f.person.person_id === department.HOD ? <Tag tone="good">HOD</Tag> : null),
              },
            ]}
            rows={departmentFaculty}
            rowKey={(f) => f.person.person_id}
          />
        ) : (
          <p className={detailStyles.empty}>No faculty in this department yet.</p>
        )}
      </Panel>
    </>
  );
}
