import { SidePanel } from "./SidePanel";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

/**
 * No notifications endpoint exists anywhere in NexusAPI (same gap that led to
 * deleting ActivityLog earlier) — this keeps the side-panel slot present as a
 * placeholder rather than showing assessment data that doesn't apply while
 * the enrollment window is open (there are no active enrollments to derive
 * "what's due" from yet).
 */
export function NotificationsPanel({ open, onClose, onOpen }: NotificationsPanelProps) {
  return (
    <SidePanel
      title="Notifications"
      count={0}
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      reopenLabel="Notifications"
      emptyMessage="Nothing new right now."
    >
      {null}
    </SidePanel>
  );
}
