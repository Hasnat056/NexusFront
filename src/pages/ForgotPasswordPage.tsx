import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiMutate } from "../lib/auth";
import { apiErrorMessage } from "../lib/api";
import styles from "./LoginPage.module.css";

/**
 * No password-reset endpoint exists in NexusAPI yet — POST /api/password-reset/ is the agreed
 * contract for when it does ({username} in). A real implementation should always return success
 * regardless of whether the username exists (standard practice — never let this endpoint reveal
 * which usernames are registered); this page trusts that and just shows whatever comes back, so
 * it doesn't mask a genuine failure (backend unreachable, 500, endpoint not deployed yet) behind
 * a fake "check your inbox" — that would be misleading rather than protective.
 */
export function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username) {
      setUsernameError("Enter your username.");
      return;
    }
    setUsernameError(null);
    setError(null);
    setSubmitting(true);
    try {
      await apiMutate("/password-reset/", "POST", { username });
      setSubmitted(true);
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
        <h1 className={styles.heading}>Forgot password</h1>
        <p className={styles.subheading}>
          {submitted
            ? "Check your inbox for next steps."
            : "Enter your username and we'll send reset instructions to the email on file."}
        </p>

        {submitted ? (
          <>
            <p className={styles.notice}>
              If an account exists for that username, we've sent password reset instructions to
              its email address.
            </p>
            <Link to="/login" className={styles.submit}>
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field} data-invalid={usernameError ? "true" : undefined}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(null);
                  if (error) setError(null);
                }}
                placeholder="r.hays"
              />
              {usernameError && <span className={styles.fieldError}>{usernameError}</span>}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? "Sending…" : "Send reset instructions"}
            </button>

            <div className={`${styles.meta} ${styles.backRow}`}>
              <Link to="/login" className={styles.metaLink}>
                ← Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
