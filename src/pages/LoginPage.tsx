import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";

const ROLES = ["Admin", "Faculty", "Student"] as const;
type Role = (typeof ROLES)[number];

const ROLE_HOME: Record<Role, string> = {
  Admin: "/admin/dashboard",
  Faculty: "/faculty/dashboard",
  Student: "/student/dashboard",
};

export function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    navigate(ROLE_HOME[role]);
  }

  return (
    <div className={styles.stage}>
      <div className={styles.bgDecor} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
        <div className={styles.skyline} />
      </div>
      <div className={styles.card}>
        <div className={styles.brandmark}>
          <span className={styles.mark}>N</span>
          <span className={styles.wordmark}>Nexus</span>
        </div>
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Meridian Institute of Technology</p>

        <div className={styles.roleSeg} role="tablist" aria-label="Sign in as">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              className={styles.roleTab}
              data-active={role === r}
              onClick={() => {
                setRole(r);
                setError(null);
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="r.hays"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>
          <div className={styles.meta}>
            <span>Fall 2026 · Active term</span>
            <a href="#forgot-password">Forgot password?</a>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
