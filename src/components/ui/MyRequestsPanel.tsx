import { Link } from "react-router-dom";
import type { FacultyRequestListItem } from "../../data/facultyRequests";
import type { ChangeRequestStatus } from "../../types/api";
import type { StatusTone } from "../../types/dashboard";
import { SidePanel } from "./SidePanel";
import { Tag } from "./Tag";
import styles from "./MyRequestsPanel.module.css";

interface MyRequestsPanelProps {
  items: FacultyRequestListItem[];
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const STATUS_TONE: Record<ChangeRequestStatus, StatusTone> = {
  pending: "warning",
  confirmed: "good",
  applied: "good",
  declined: "critical",
  expired: "critical",
};

const STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  applied: "Applied",
  declined: "Declined",
  expired: "Expired",
};

export function MyRequestsPanel({ items, open, onClose, onOpen }: MyRequestsPanelProps) {
  return (
    <SidePanel
      title="My requests"
      count={items.length}
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      reopenLabel="Requests"
      emptyMessage="No requests submitted."
    >
      {items.map((item) => (
        <div className={styles.row} key={item.key}>
          <Link to={item.detailHref} className={styles.headline}>
            {item.headline}
          </Link>
          <div className={styles.meta}>
            <Tag tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Tag>
            <span className={styles.time}>{item.relativeTime}</span>
          </div>
        </div>
      ))}
    </SidePanel>
  );
}
