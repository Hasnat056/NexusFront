import styles from "./SessionCountdownStepper.module.css";

interface SessionCountdownStepperProps {
  availabilityDeadline: string | null;
  activationDeadline: string | null;
  closingDeadline: string | null;
  now?: Date;
  /** "md" (default) is the full version on SessionDetailPage — dots, lines, and a text label under
   * each step. "sm" drops the text labels (kept as a `title` tooltip instead) and shrinks
   * everything else, for sitting inline in the TopBar next to the session pill. */
  size?: "md" | "sm";
}

type StepState = "passed" | "upcoming" | "unset";

interface StepData {
  key: string;
  label: string;
  tone: "info" | "good" | "critical";
  state: StepState;
  daysLeft: number | null;
}

function daysUntil(iso: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000));
}

function buildStep(key: string, label: string, tone: StepData["tone"], iso: string | null, now: Date): StepData {
  if (!iso) return { key, label, tone, state: "unset", daysLeft: null };
  const date = new Date(iso);
  if (date <= now) return { key, label, tone, state: "passed", daysLeft: null };
  return { key, label, tone, state: "upcoming", daysLeft: daysUntil(iso, now) };
}

/**
 * A single session's lifecycle as a compact stepper — no prose, just where "today" sits relative to
 * the three deadlines that drive its status (SessionDetailPage's own Activation/Closing panels set
 * these). A day count only appears on a step that's still ahead; a step already crossed shows just
 * its name (or nothing, in the "sm" TopBar variant) and its line fills in solid — that fill animates
 * in on mount so it reads as *progress happening*, not a static diagram. A deadline that hasn't been
 * set yet gets a muted, un-animated track instead of a colored one. Distinct from
 * SessionTimelineChart, which compares many sessions against a shared date axis — this is one
 * session, evenly spaced, meant to sit right under (or beside) its status Tag/pill.
 */
export function SessionCountdownStepper({
  availabilityDeadline,
  activationDeadline,
  closingDeadline,
  now = new Date(),
  size = "md",
}: SessionCountdownStepperProps) {
  const steps: StepData[] = [
    buildStep("availability", "Available", "info", availabilityDeadline, now),
    buildStep("activation", "Active", "good", activationDeadline, now),
    buildStep("closing", "Closing", "critical", closingDeadline, now),
  ];

  return (
    <div className={styles.stepper} data-size={size} role="list" aria-label="Session lifecycle countdown">
      <div className={styles.step} role="listitem">
        <span className={styles.dot} data-state="passed" title="Today" />
        {size === "md" && <span className={styles.label}>Today</span>}
      </div>
      {steps.map((step, i) => {
        const stepLabel = step.state === "unset" ? `${step.label}: not set` : step.label;
        return (
          <div className={styles.segment} key={step.key}>
            <span
              className={styles.connector}
              data-state={step.state}
              data-tone={step.tone}
              style={{ animationDelay: `${i * 120}ms` }}
            />
            <div className={styles.step} role="listitem" title={size === "sm" ? stepLabel : undefined}>
              {step.state === "upcoming" && (
                <span className={styles.days} data-tone={step.tone}>
                  {step.daysLeft}d
                </span>
              )}
              <span className={styles.dot} data-state={step.state} data-tone={step.tone} />
              {size === "md" && <span className={styles.label}>{step.state === "unset" ? "Not set" : step.label}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
