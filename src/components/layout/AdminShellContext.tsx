import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AdminShellConfig {
  pageTitle: string;
  sidePanel: ReactNode | null;
}

interface AdminShellContextValue {
  config: AdminShellConfig;
  setConfig: (config: AdminShellConfig) => void;
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AdminShellConfig>({ pageTitle: "", sidePanel: null });
  return <AdminShellContext.Provider value={{ config, setConfig }}>{children}</AdminShellContext.Provider>;
}

export function useAdminShellConfig(): AdminShellConfig {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShellConfig must be used within AdminShellProvider");
  return ctx.config;
}

/**
 * Called once by each admin page to tell the persistent AdminLayout what to
 * show in its top bar (and, rarely, its side panel) — the layout itself stays
 * mounted across navigation, so this is how page-specific chrome reaches it.
 * `sidePanel`, if given, must be a stable reference (wrap it in useMemo keyed
 * on its real inputs) — a fresh element every render would re-fire this
 * effect on every render of the page, which re-triggers AdminLayout's own
 * re-render, which re-renders the page... memoizing breaks that loop.
 */
export function useAdminPageConfig(pageTitle: string, sidePanel: ReactNode | null = null) {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminPageConfig must be used within AdminShellProvider");
  const { setConfig } = ctx;
  useEffect(() => {
    setConfig({ pageTitle, sidePanel });
  }, [pageTitle, sidePanel, setConfig]);
}
