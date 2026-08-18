import { Link } from "react-router-dom";
import { CHANGE_REQUEST_STATUS_LABEL, CHANGE_REQUEST_STATUS_TONE, type ChangeRequestListItem } from "../../data/changeRequests";
import { IconBars } from "../icons/Icons";
import { Tag } from "./Tag";
import styles from "./ChangeRequestsPanel.module.css";

interface ChangeRequestsPanelProps {
  items: ChangeRequestListItem[];
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function ChangeRequestsPanel({ items, open, onClose, onOpen }: ChangeRequestsPanelProps) {
  if (!open) {
    return (
      <button type="button" className={styles.reopenTab} onClick={onOpen} aria-label="Show change requests">
        <IconBars />
        Requests
        {items.length > 0 && <span className={styles.count}>{items.length}</span>}
      </button>
    );
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <h3>Change requests</h3>
        <div className={styles.headExtra}>
          {items.length > 0 && <span className={styles.count}>{items.length}</span>}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close change requests">
            ×
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Nothing pending.</p>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div className={styles.row} key={item.id}>
              <Link to={item.detailHref} className={styles.headline}>
                {item.headline}
              </Link>
              <div className={styles.meta}>
                <Tag tone={CHANGE_REQUEST_STATUS_TONE[item.status]}>{CHANGE_REQUEST_STATUS_LABEL[item.status]}</Tag>
                <span className={styles.time}>{item.relativeTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
