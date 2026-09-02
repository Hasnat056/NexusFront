import { useState } from "react";
import type { Notification } from "../../types/api";
import { formatRelativeTime } from "../../data/changeRequests";
import { IconBars } from "../icons/Icons";
import styles from "./NotificationsPanel.module.css";

interface NotificationsPanelProps {
  items: Notification[];
  unreadCount: number;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: number) => void;
}

export function NotificationsPanel({
  items,
  unreadCount,
  open,
  onClose,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
}: NotificationsPanelProps) {
  if (!open) {
    return (
      <button type="button" className={styles.reopenTab} onClick={onOpen} aria-label="Show notifications">
        <IconBars />
        Notifications
        {unreadCount > 0 && <span className={styles.count}>{unreadCount}</span>}
      </button>
    );
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <h3>Notifications</h3>
        <div className={styles.headExtra}>
          {unreadCount > 0 && (
            <button type="button" className={styles.markAllBtn} onClick={onMarkAllRead}>
              Mark all read
            </button>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close notifications">
            ×
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Nothing new right now.</p>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onMarkRead={onMarkRead} onDismiss={onDismiss} />
          ))}
        </div>
      )}
    </aside>
  );
}

interface NotificationRowProps {
  item: Notification;
  onMarkRead: (id: number) => void;
  onDismiss: (id: number) => void;
}

/** Own component so each row can animate itself out before actually leaving the list — a plain
 * onDismiss(id) that filters items immediately would just pop the row away with no transition. */
function NotificationRow({ item, onMarkRead, onDismiss }: NotificationRowProps) {
  const [leaving, setLeaving] = useState(false);
  const unread = item.read_at === null;

  return (
    <div
      className={styles.row}
      data-unread={unread || undefined}
      data-leaving={leaving || undefined}
      onTransitionEnd={(e) => {
        if (leaving && e.propertyName === "opacity") onDismiss(item.id);
      }}
    >
      <button type="button" className={styles.rowContent} onClick={() => onMarkRead(item.id)}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.rowBody}>
          <span className={styles.message}>{item.message}</span>
          <span className={styles.meta}>
            {item.level === "action_required" && <span className={styles.actionRequired}>Action required</span>}
            <span className={styles.time}>{formatRelativeTime(item.created_at)}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => setLeaving(true)}
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
