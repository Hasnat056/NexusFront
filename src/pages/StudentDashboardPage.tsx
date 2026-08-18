import { useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { ProfileStrip } from "../components/ui/ProfileStrip";
import { CourseCard } from "../components/ui/CourseCard";
import { EnrollmentPickCard } from "../components/ui/EnrollmentPickCard";
import { WhatsDuePanel } from "../components/ui/WhatsDuePanel";
import { NotificationsPanel } from "../components/ui/NotificationsPanel";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import { mockActiveEnrollmentsResponse, mockAllEnrollmentsResponse, selectStudentCourseCards, selectWhatsDue } from "../data/studentEnrollments";
import {
  isEnrollmentWindowOpen,
  mockEnrollmentCreateAllocations,
  setEnrollmentWindowOpen,
  submitEnrollmentSelections,
} from "../data/enrollmentCreate";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import styles from "./StudentDashboardPage.module.css";

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

export function StudentDashboardPage() {
  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();
  const [panelOpen, setPanelOpen] = useState(true);
  const [confirmedIds, setConfirmedIds] = useState<Set<number>>(
    () => new Set(mockEnrollmentCreateAllocations.filter((a) => a.confirm).map((a) => a.allocation_id)),
  );
  const baselineRef = useRef(new Set(confirmedIds));
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const isDirty = !setsEqual(confirmedIds, baselineRef.current);

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

  function handleSubmit() {
    const message = submitEnrollmentSelections(confirmedIds);
    baselineRef.current = new Set(confirmedIds);
    setSubmitMessage(message);
  }

  const [windowOpen, setWindowOpen] = useState(() => isEnrollmentWindowOpen());

  function handleToggleWindow() {
    const next = !windowOpen;
    setEnrollmentWindowOpen(next);
    setWindowOpen(next);
    setSubmitMessage(null);
  }

  const activeCourseCards = selectStudentCourseCards(mockActiveEnrollmentsResponse());
  const allEnrollments = mockAllEnrollmentsResponse().results;
  const completedCount = allEnrollments.filter((e) => e.status === "Completed").length;

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Student dashboard"
      sessionLabel={mockCurrentSession}
      subtitle={dashboard.institutional_email}
      sidePanel={
        windowOpen ? (
          <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} onOpen={() => setPanelOpen(true)} />
        ) : (
          <WhatsDuePanel
            items={selectWhatsDue(mockActiveEnrollmentsResponse())}
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
          { value: allEnrollments.length, label: "Total" },
          { value: windowOpen ? 0 : activeCourseCards.length, label: "Active" },
          { value: completedCount, label: "Completed" },
        ]}
      />

      {windowOpen ? (
        <>
          <div className={styles.windowBanner}>
            <p>
              Enrollment window is open — select your courses for next session, then submit. Active shows zero on
              purpose: nothing becomes Active until the window closes.
            </p>
            <p className={styles.devNote}>
              No admin control or scheduler decides this in the real backend yet (see
              data/sessionDirectory.ts) — this button just simulates it for testing:{" "}
              <button type="button" className={formStyles.linkButton} onClick={handleToggleWindow}>
                Close enrollment window
              </button>
            </p>
          </div>

          <div className={styles.pickGrid}>
            {mockEnrollmentCreateAllocations.map((allocation) => (
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
            <button type="button" className={styles.submitBtn} disabled={!isDirty} onClick={handleSubmit}>
              Submit selections
            </button>
          </div>
          {submitMessage && <div className={formStyles.banner}>{submitMessage}</div>}
        </>
      ) : (
        <>
          <p className={styles.devNote}>
            Enrollment window is closed —{" "}
            <button type="button" className={formStyles.linkButton} onClick={handleToggleWindow}>
              Reopen enrollment window
            </button>
          </p>
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
