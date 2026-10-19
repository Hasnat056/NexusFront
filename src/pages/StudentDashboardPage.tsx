import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { ProfileStrip } from "../components/ui/ProfileStrip";
import { CourseCard } from "../components/ui/CourseCard";
import { EnrollmentPickCard } from "../components/ui/EnrollmentPickCard";
import { WhatsDuePanel } from "../components/ui/WhatsDuePanel";
import { NotificationsPanel } from "../components/ui/NotificationsPanel";
import { useNotifications } from "../hooks/useNotifications";
import { useCurrentSessionPill } from "../hooks/useCurrentSession";
import { selectStudentCourseCards, selectWhatsDue } from "../data/studentEnrollments";
import { apiGet, apiGetAllPages, apiMutate } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { EnrollmentCreateAllocation, StudentDashboardResponse, StudentEnrollment, StudentEnrollmentsResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./StudentDashboardPage.module.css";

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const notifications = useNotifications();
  const sessionPill = useCurrentSessionPill();

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // StudentEnrollmentCreatePermission 403s the whole GET /student/enrollments/create/ request
  // when the enrollment window isn't open — that failure itself IS the signal, not a field on
  // the response (see EnrollmentCreateAllocation's doc comment in types/api.ts).
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null);
  const [pickableAllocations, setPickableAllocations] = useState<EnrollmentCreateAllocation[]>([]);
  const [activeEnrollments, setActiveEnrollments] = useState<StudentEnrollmentsResponse | null>(null);

  const [confirmedIds, setConfirmedIds] = useState<Set<number>>(new Set());
  const baselineRef = useRef(new Set<number>());
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isDirty = !setsEqual(confirmedIds, baselineRef.current);

  useEffect(() => {
    let cancelled = false;
    apiGet<StudentDashboardResponse>("/student/dashboard/")
      .then((res) => {
        if (!cancelled) setDashboard(res);
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
  }, [navigate, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    apiGet<EnrollmentCreateAllocation[]>("/student/enrollments/create/")
      .then((res) => {
        if (cancelled) return;
        setWindowOpen(true);
        setPickableAllocations(res);
        const confirmed = new Set(res.filter((a) => a.confirm).map((a) => a.allocation_id));
        setConfirmedIds(confirmed);
        baselineRef.current = new Set(confirmed);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setWindowOpen(false);
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshKey]);

  useEffect(() => {
    if (windowOpen !== false) return;
    let cancelled = false;
    apiGetAllPages<StudentEnrollment>("/student/enrollments/?status=Active")
      .then((results) => {
        if (!cancelled) setActiveEnrollments({ count: results.length, next: null, previous: null, results });
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
  }, [windowOpen, navigate]);

  function toggleAllocation(allocationId: number) {
    setSubmitMessage(null);
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      if (next.has(allocationId)) {
        next.delete(allocationId);
      } else {
        next.add(allocationId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const body = pickableAllocations.map((a) => ({ allocation_id: a.allocation_id, confirm: confirmedIds.has(a.allocation_id) }));
      const res = await apiMutate<{ message: string }>("/student/enrollments/create/", "POST", body);
      baselineRef.current = new Set(confirmedIds);
      setSubmitMessage(res.message);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setSubmitMessage(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="dashboard" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Student dashboard" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (!dashboard || windowOpen === null || (windowOpen === false && !activeEnrollments)) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="dashboard" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Student dashboard" subtitle="">
        <p className={styles.empty}>Loading dashboard…</p>
      </DashboardShell>
    );
  }

  const activeCourseCards = activeEnrollments ? selectStudentCourseCards(activeEnrollments) : [];

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
      pageTitle="Student dashboard"
      sessionPill={sessionPill}
      subtitle={dashboard.institutional_email}
      sidePanel={
        windowOpen ? (
          <NotificationsPanel
            items={notifications.items}
            unreadCount={notifications.unreadCount}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            onOpen={() => setPanelOpen(true)}
            onMarkRead={notifications.markRead}
            onMarkAllRead={notifications.markAllRead}
            onDismiss={notifications.dismiss}
          />
        ) : (
          <WhatsDuePanel
            items={activeEnrollments ? selectWhatsDue(activeEnrollments) : []}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            onOpen={() => setPanelOpen(true)}
          />
        )
      }
    >
      <ProfileStrip
        avatarInitials={avatarInitials}
        name={`${dashboard.first_name} ${dashboard.last_name}`}
        meta={[dashboard.student_id, dashboard.class, dashboard.department]}
        stats={[
          { value: dashboard.total_enrollments, label: "Total" },
          { value: windowOpen ? 0 : dashboard.active_enrollments, label: "Active" },
          { value: dashboard.completed_enrollments, label: "Completed" },
        ]}
      />

      {windowOpen ? (
        <>
          <div className={styles.windowBanner}>
            <p>
              Enrollment window is open. Select your courses for next session, then submit. Active shows zero on
              purpose: nothing becomes Active until the window closes.
            </p>
          </div>

          <div className={styles.pickGrid}>
            {pickableAllocations.map((allocation) => (
              <EnrollmentPickCard
                key={allocation.allocation_id}
                allocation={allocation}
                confirmed={confirmedIds.has(allocation.allocation_id)}
                onToggle={toggleAllocation}
              />
            ))}
          </div>

          <div className={styles.pickSubmit}>
            <span>{confirmedIds.size} selected</span>
            <button type="button" className={styles.submitBtn} disabled={!isDirty || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Submit selections"}
            </button>
          </div>
          {submitMessage && <div className={formStyles.banner}>{submitMessage}</div>}
        </>
      ) : (
        <>
          {activeCourseCards.length > 0 ? (
            <div className={styles.courseGrid}>
              {activeCourseCards.map((card) => (
                <CourseCard key={card.id} {...card} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No active enrollments right now.</p>
          )}
        </>
      )}
    </DashboardShell>
  );
}
