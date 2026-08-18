import { Link } from "react-router-dom";
import styles from "./ComingSoonPage.module.css";

interface ComingSoonPageProps {
  title: string;
  backHref: string;
  backLabel: string;
}

export function ComingSoonPage({ title, backHref, backLabel }: ComingSoonPageProps) {
  return (
    <div className={styles.page}>
      <Link to={backHref} className={styles.back}>
        ← {backLabel}
      </Link>
      <div className={styles.card}>
        <h1 className={styles.headline}>{title}</h1>
        <p className={styles.body}>This page isn't built yet.</p>
      </div>
    </div>
  );
}
