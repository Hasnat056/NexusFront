import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, ROLES, type Role } from "../lib/auth";
import { apiErrorMessage } from "../lib/api";
import { useCurrentSessionLabel } from "../hooks/useCurrentSession";
import { IconEye, IconEyeOff } from "../components/icons/Icons";
import styles from "./LoginPage.module.css";

const ROLE_HOME: Record<Role, string> = {
  Admin: "/admin/dashboard",
  Faculty: "/faculty/dashboard",
  Student: "/student/dashboard",
};

export function LoginPage() {
  const navigate = useNavigate();
  const sessionLabel = useCurrentSessionLabel();
  const [role, setRole] = useState<Role>("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: { username?: string; password?: string } = {};
    if (!username) errors.username = "Enter your username.";
    if (!password) errors.password = "Enter your password.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    setFieldErrors({});
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password, role);
      navigate(ROLE_HOME[role]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
          <div className={styles.field} data-invalid={fieldErrors.username ? "true" : undefined}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((f) => ({ ...f, username: undefined }));
                if (error) setError(null);
              }}
              placeholder="r.hays"
            />
            {fieldErrors.username && <span className={styles.fieldError}>{fieldErrors.username}</span>}
          </div>
          <div className={styles.field} data-invalid={fieldErrors.password ? "true" : undefined}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordRow}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
          </div>
          <div className={styles.meta}>
            {sessionLabel ? (
              <span className={styles.sessionPill}>
                <span className={styles.dot} />
                {sessionLabel}
              </span>
            ) : (
              <span />
            )}
            <Link to="/forgot-password" className={styles.metaLink}>
              Forgot password?
            </Link>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
