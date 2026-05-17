/**
 * CompanyPageLayout.tsx
 *
 * Authenticated shell for all company pages.
 * Fetches the company profile via API (not localStorage) so the navbar
 * always displays current data without requiring a page reload after edits.
 */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import CompanyNavbar from "./companyNavBar";
import CompanyBottomDock from "./navigation/companyBottomDeck";
import { useCompanyProfile } from "../../hooks/company/useCompany";

// ── Theme helpers ─────────────────────────────────────────────

const THEME_KEY = "xpand_theme";

function getSavedTheme(): "dark" | "light" {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
}

// ── Page enter animation ──────────────────────────────────────

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

interface CompanyPageLayoutProps {
  children:   ReactNode;
  /** Sets the browser tab title to "<pageTitle> · XPand". */
  pageTitle?: string;
  /** When true, hides the navbar and bottom dock (e.g. full-screen flows). */
  hideNav?:   boolean;
  /** Overrides the default max-width of the content area. */
  maxWidth?:  string;
}

// ── Component ─────────────────────────────────────────────────

export const CompanyPageLayout = ({
  children,
  pageTitle,
  hideNav  = false,
  maxWidth,
}: CompanyPageLayoutProps) => {

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const theme = getSavedTheme();
    if (typeof document !== "undefined") applyTheme(theme);
    return theme === "dark";
  });

  useEffect(() => { applyTheme(isDarkMode ? "dark" : "light"); }, [isDarkMode]);
  const handleToggleTheme = useCallback(() => setIsDarkMode((p) => !p), []);

  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} · XPand`;
  }, [pageTitle]);

  // Fetch company profile from API — never read from localStorage
  const { profile } = useCompanyProfile();
  const companyName = profile?.companyName ?? null;

  return (
    <div className="pagelayout-root">
      {!hideNav && (
        <CompanyNavbar
          companyName={companyName}
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

      {!hideNav && <CompanyBottomDock />}
    </div>
  );
};

export default CompanyPageLayout;
