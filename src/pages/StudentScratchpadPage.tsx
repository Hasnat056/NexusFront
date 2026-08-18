import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./StudentScratchpadPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

const API_BASE = "http://localhost:8000/api";

type Language = "python" | "c" | "cpp";

const LANGUAGES: { id: Language; label: string; filename: string; template: string }[] = [
  {
    id: "python",
    label: "Python",
    filename: "main.py",
    template: 'print("Hello from Nexus!")\n',
  },
  {
    id: "c",
    label: "C",
    filename: "main.c",
    template: '#include <stdio.h>\n\nint main() {\n    printf("Hello from Nexus!\\n");\n    return 0;\n}\n',
  },
  {
    id: "cpp",
    label: "C++",
    filename: "main.cpp",
    template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from Nexus!" << std::endl;\n    return 0;\n}\n',
  },
];

const TOKEN_STORAGE_KEY = "nexus_scratchpad_token";

interface RunResult {
  stdout: string;
  stderr: string;
}

export function StudentScratchpadPage() {
  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [stdin, setStdin] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = LANGUAGES.find((l) => l.id === language)!;

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    setCode(LANGUAGES.find((l) => l.id === next)!.template);
    setResult(null);
    setError(null);
  }

  function handleTokenChange(value: string) {
    setToken(value);
    if (value) localStorage.setItem(TOKEN_STORAGE_KEY, value);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const file = new File([code], active.filename, { type: "text/plain" });
      const body = new FormData();
      body.append("file", file);
      if (stdin.trim()) body.append("input_list", stdin);

      const res = await fetch(`${API_BASE}/student/compilers/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError((data && (data.detail ?? data.error)) || `Request failed (${res.status})`);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setResult({ stdout: data?.stdout ?? "", stderr: data?.stderr ?? "" });
      }
    } catch {
      setError("Couldn't reach the compiler service — is the backend running on localhost:8000?");
    } finally {
      setRunning(false);
    }
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="scratchpad"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Scratchpad"
      subtitle={dashboard.institutional_email}
    >
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/student/dashboard" }, { label: "Scratchpad" }]}
      />

      <Panel
        title="Run code"
        headerExtra={
          <div className={styles.toolbar}>
            <div className={styles.langTabs} role="tablist" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={language === l.id}
                  className={styles.langTab}
                  data-active={language === l.id}
                  onClick={() => handleLanguageChange(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button type="button" className={formStyles.primaryButton} onClick={handleRun} disabled={running || !code.trim()}>
              {running ? "Running…" : "Run"}
            </button>
          </div>
        }
      >
        <div className={styles.editorRow}>
          <div className={styles.editorRowHead}>
            <label className={styles.editorLabel} htmlFor="code-input">
              {active.filename}
            </label>
            <span className={styles.targetHint}>POST {API_BASE}/student/compilers/</span>
          </div>
          <textarea
            id="code-input"
            className={styles.codeInput}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className={styles.lowerRow}>
          <div className={formStyles.field}>
            <label htmlFor="stdin-input">Input (stdin, optional)</label>
            <textarea
              id="stdin-input"
              className={styles.stdinInput}
              placeholder={"One value per line, fed to input() / scanf / cin as the program runs"}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="token-input">Access token</label>
            <input
              id="token-input"
              type="password"
              placeholder="Paste a JWT from POST /api/token/"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
            />
            <span className={formStyles.hint}>
              Stored in this browser only. The compiler endpoint requires a logged-in student.
            </span>
          </div>
        </div>

      </Panel>

      <Panel title="Output" hint={result || error ? undefined : "Nothing run yet"}>
        {error && <div className={formStyles.errorBanner}>{error}</div>}
        {result && (
          <div className={styles.outputGrid}>
            <div>
              <div className={styles.outputLabel}>stdout</div>
              <pre className={styles.outputBlock}>{result.stdout || "(empty)"}</pre>
            </div>
            <div>
              <div className={styles.outputLabel} data-tone={result.stderr ? "critical" : undefined}>
                stderr
              </div>
              <pre className={styles.outputBlock} data-tone={result.stderr ? "critical" : undefined}>
                {result.stderr || "(empty)"}
              </pre>
            </div>
          </div>
        )}
        {!result && !error && <p className={styles.empty}>Write some code above and hit Run to see stdout and stderr here.</p>}
      </Panel>
    </DashboardShell>
  );
}
