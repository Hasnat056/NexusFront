import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiMutate, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminSession, SessionPeriod, SessionStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";

const SESSION_PERIODS: SessionPeriod[] = ["Fall", "Spring"];
const SESSION_STATUS_TONE: Record<SessionStatus, StatusTone> = {
  Inactive: "warning",
  Initiated: "warning",
  Available: "good",
  Active: "good",
  Completed: "critical",
};

// UI-only guard rail (not enforced by SessionSerializer, which only checks status == 'Active') —
// requires a session to have run 12 weeks before it can be closed, stricter than what the real
// API currently accepts.
const CLOSING_MIN_WEEKS_AFTER_ACTIVATION = 12;

function formatSessionDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function closingUnlocksAt(activationDeadline: string | null): string | null {
  if (!activationDeadline) return null;
  const d = new Date(activationDeadline);
  d.setUTCDate(d.getUTCDate() + CLOSING_MIN_WEEKS_AFTER_ACTIVATION * 7);
  return d.toISOString();
}

function isClosingDeadlineUnlocked(session: AdminSession): boolean {
  if (session.status !== "Active" || !session.activation_deadline) return false;
  const unlocksAt = closingUnlocksAt(session.activation_deadline);
  return unlocksAt !== null && new Date() >= new Date(unlocksAt);
}

function isPeriodLocked(session: AdminSession): boolean {
  return session.activation_deadline !== null;
}

function validateActivationDeadline(iso: string): string | null {
  const value = new Date(iso);
  const now = new Date();
  if (value < now) return "Activation deadline cannot be in the past.";
  const fourWeeksOut = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  if (value > fourWeeksOut) return "Activation deadline cannot be more than 4 weeks in the future.";
  return null;
}

function validateClosingDeadline(iso: string, activationDeadline: string | null): string | null {
  const value = new Date(iso);
  if (value < new Date()) return "Closing deadline cannot be in the past.";
  if (activationDeadline && value <= new Date(activationDeadline)) {
    return "Closing deadline must be after the activation deadline.";
  }
  return null;
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [periodInput, setPeriodInput] = useState<SessionPeriod>("Fall");
  const [activationInput, setActivationInput] = useState("");
  const [deltaInput, setDeltaInput] = useState("7");
  const [closingInput, setClosingInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useAdminPageConfig("Session");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiGet<AdminSession>(`/admin/sessions/${id}/`)
      .then((res) => {
        if (cancelled) return;
        setSession(res);
        setPeriodInput(res.period);
        setActivationInput(toLocalInputValue(res.activation_deadline));
        setDeltaInput(String(res.availability_delta));
        setClosingInput(toLocalInputValue(res.closing_deadline));
      })
      .catch((err: unknown) => {
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
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, refreshKey]);

  async function handleSetPeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminSession>(`/admin/sessions/${id}/`, "PATCH", { period: periodInput });
      invalidateCache("admin:sessions");
      showToast("Term updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleSetActivation(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setFieldErrors({});
    const iso = new Date(activationInput).toISOString();
    const validationError = validateActivationDeadline(iso);
    if (validationError) {
      setFieldErrors({ activation_deadline: validationError });
      return;
    }
    try {
      await apiMutate<AdminSession>(`/admin/sessions/${id}/`, "PATCH", { activation_deadline: iso });
      invalidateCache("admin:sessions");
      showToast("Activation deadline set — status moved to Initiated. Availability and activation happen automatically at those times.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleSetDelta(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminSession>(`/admin/sessions/${id}/`, "PATCH", { availability_delta: Number(deltaInput) || 0 });
      invalidateCache("admin:sessions");
      showToast("Availability window updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleSetClosing(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !session) return;
    setError(null);
    setFieldErrors({});
    const iso = new Date(closingInput).toISOString();
    const validationError = validateClosingDeadline(iso, session.activation_deadline);
    if (validationError) {
      setFieldErrors({ closing_deadline: validationError });
      return;
    }
    try {
      await apiMutate<AdminSession>(`/admin/sessions/${id}/`, "PATCH", { closing_deadline: iso });
      invalidateCache("admin:sessions");
      showToast("Closing deadline set.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Sessions", href: "/admin/sessions" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Session {id} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!session) {
    return <p className={detailStyles.empty}>Loading session…</p>;
  }

  const periodLocked = isPeriodLocked(session);
  const closingUnlocked = isClosingDeadlineUnlocked(session);
  const closingUnlockDate = closingUnlocksAt(session.activation_deadline);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Sessions", href: "/admin/sessions" },
          { label: `${session.period} ${session.year}` },
        ]}
      />

      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>
            {session.period} {session.year}
          </h1>
          <p className={detailStyles.subline}>Session #{session.id}</p>
        </div>
        <Tag tone={SESSION_STATUS_TONE[session.status]}>{session.status}</Tag>
      </div>

      <Panel title="Term">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetPeriod}>
            <div className={formStyles.field} data-invalid={fieldErrors.period ? "true" : undefined}>
              <label htmlFor="period">Period</label>
              <Select
                id="period"
                value={periodInput}
                onChange={(next) => setPeriodInput(next as SessionPeriod)}
                disabled={periodLocked}
                placeholder="Select period…"
                invalid={Boolean(fieldErrors.period)}
                options={SESSION_PERIODS.map((p) => ({ value: p, label: p }))}
              />
              {fieldErrors.period && <span className={formStyles.fieldError}>{fieldErrors.period}</span>}
            </div>
            <div className={formStyles.field}>
              <label>Year</label>
              <input value={session.year} readOnly />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.secondaryButton} disabled={periodLocked}>
                Save term
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            {periodLocked
              ? "Period is locked once an activation deadline has been set (a guard rail added in this app — SessionSerializer itself never restricts period)."
              : "Year is locked as soon as this session exists (SessionSerializer.get_extra_kwargs) — only settable at creation."}
          </span>
        </div>
      </Panel>

      <Panel title="Availability window">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetDelta}>
            <div className={formStyles.field} data-invalid={fieldErrors.availability_delta ? "true" : undefined}>
              <label htmlFor="availability_delta">Days before activation</label>
              <input
                id="availability_delta"
                inputMode="numeric"
                value={deltaInput}
                onChange={(e) => setDeltaInput(e.target.value)}
              />
              {fieldErrors.availability_delta && <span className={formStyles.fieldError}>{fieldErrors.availability_delta}</span>}
            </div>
            <div className={formStyles.field}>
              <label>Availability deadline (computed)</label>
              <input value={formatSessionDateTime(session.availability_deadline)} readOnly />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.secondaryButton}>
                Save window
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <Panel title="Activation">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetActivation}>
            <div className={formStyles.field} data-invalid={fieldErrors.activation_deadline ? "true" : undefined}>
              <label htmlFor="activation_deadline">Activation deadline</label>
              <input
                id="activation_deadline"
                type="datetime-local"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                required
              />
              {fieldErrors.activation_deadline && <span className={formStyles.fieldError}>{fieldErrors.activation_deadline}</span>}
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton}>
                Set activation deadline
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            Submitting forces status to Initiated immediately. session_availability_task (at the
            availability deadline) and session_activation_task (at the activation deadline) run
            server-side afterwards to move it to Available then Active.
          </span>
        </div>
      </Panel>

      <Panel title="Closing">
        <div className={detailStyles.panelBody}>
          <form className={formStyles.row} onSubmit={handleSetClosing}>
            <div className={formStyles.field} data-invalid={fieldErrors.closing_deadline ? "true" : undefined}>
              <label htmlFor="closing_deadline">Closing deadline</label>
              <input
                id="closing_deadline"
                type="datetime-local"
                value={closingInput}
                onChange={(e) => setClosingInput(e.target.value)}
                readOnly={!closingUnlocked}
                disabled={!closingUnlocked}
                required
              />
              {fieldErrors.closing_deadline && <span className={formStyles.fieldError}>{fieldErrors.closing_deadline}</span>}
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton} disabled={!closingUnlocked}>
                Set closing deadline
              </button>
            </div>
          </form>
          <span className={formStyles.hint}>
            {closingUnlocked
              ? "Submitting schedules session_closing_task, which moves status to Completed at this deadline."
              : session.status !== "Active"
                ? "Locked until the session's status is Active (SessionSerializer marks closing_deadline read_only otherwise)."
                : `Locked for 12 weeks after activation (a guard rail added in this app, on top of the real Active-only check) — unlocks ${formatSessionDateTime(closingUnlockDate)}.`}
          </span>
        </div>
      </Panel>
    </>
  );
}
