/* ============================================================
   AdminPageLayout.tsx
   Authenticated shell for all admin pages.
   Mirrors CompanyPageLayout / PageLayout in structure.
   Usage:
     <AdminPageLayout pageTitle="Manage Users">
       ...children
     </AdminPageLayout>
   ============================================================ */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "./NavBar";
import AdminBottomDock from "./navigation/bottomdock";

// ── Theme helpers ─────────────────────────────────────────────
const THEME_KEY = "xpand_theme";

function getSavedTheme(): "dark" | "light" {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

// ── Read stored admin info ────────────────────────────────────
function getStoredAdmin(): { adminName: string | null } {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { adminName: null };
    const parsed = JSON.parse(raw);
    const name = parsed.firstName
      ? `${parsed.firstName} ${parsed.lastName ?? ""}`.trim()
      : parsed.email ?? null;
    return { adminName: name };
  } catch { return { adminName: null }; }
}

// ── Page animation ────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -6 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
};

// ── Props ─────────────────────────────────────────────────────
interface AdminPageLayoutProps {
  children:   ReactNode;
  pageTitle?: string;
  hideNav?:   boolean;
  maxWidth?:  string;
}

// ── Component ─────────────────────────────────────────────────
const AdminPageLayout = ({
  children,
  pageTitle,
  hideNav  = false,
  maxWidth,
}: AdminPageLayoutProps) => {

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const theme = getSavedTheme();
    if (typeof document !== "undefined") applyTheme(theme);
    return theme === "dark";
  });

  useEffect(() => { applyTheme(isDarkMode ? "dark" : "light"); }, [isDarkMode]);
  const handleToggleTheme = useCallback(() => setIsDarkMode((p) => !p), []);

  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} · XPand Admin`;
  }, [pageTitle]);

  const { adminName } = getStoredAdmin();

  return (
    <>
      <div className="pagelayout-root">

        {!hideNav && (
          <AdminNavbar
            adminName={adminName}
            onToggleTheme={handleToggleTheme}
            isDarkMode={isDarkMode}
          />
        )}

        <div style={hideNav ? undefined : { paddingTop: "var(--layout-navbar-height)" }}>
          <motion.main
            className="pagelayout-content"
            style={maxWidth ? { maxWidth } : undefined}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={pageTransition}
          >
            {children}
          </motion.main>
        </div>

      </div>

      {/* Rendered outside pagelayout-root so no ancestor transform
          (e.g. from Framer Motion) can create a new containing block
          and break position:fixed on the dock. */}
      {!hideNav && <AdminBottomDock />}
    </>
  );
};

export default AdminPageLayout;