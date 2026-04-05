/* ============================================================
   CompanyPageLayout.tsx
   Authenticated shell for all company pages.

   Mirrors PageLayout.tsx exactly in structure, but:
   - Uses CompanyNavbar instead of user Navbar
   - Uses CompanyBottomDock instead of user BottomDock
   - Reads company data from localStorage ("user" key)
   - No XP display

   Usage:
     import CompanyPageLayout from "../components/company/CompanyPageLayout";
     // (adjust path relative to your page file)

     const MyCompanyPage = () => (
       <CompanyPageLayout pageTitle="Manage Jobs">
         ...
       </CompanyPageLayout>
     );
   ============================================================ */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import CompanyNavbar from "./companyNavBar";
import CompanyBottomDock from "./navigation/companyBottomDeck";

// ── Theme helpers (same as PageLayout) ───────────────────────
const THEME_KEY = "xpand_theme";

function getSavedTheme(): "dark" | "light" {
  try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

// ── Read stored company info ──────────────────────────────────
function getStoredCompany(): { companyName: string | null; isApproved: boolean } {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { companyName: null, isApproved: false };
    const parsed = JSON.parse(raw);
    // After login, we store { userId, email, role }
    // companyName isn't in the auth response — we store it separately
    // after the first profile fetch. Check both sources.
    const name = localStorage.getItem("company_name") ?? parsed.companyName ?? null;
    const approved = localStorage.getItem("company_approved") === "true";
    return { companyName: name, isApproved: approved };
  } catch { return { companyName: null, isApproved: false }; }
}

// ── Page animation (matches PageLayout) ──────────────────────
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
  pageTitle?: string;
  hideNav?:   boolean;
  maxWidth?:  string;
}

// ── Component ─────────────────────────────────────────────────
const CompanyPageLayout = ({
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

  const { companyName, isApproved } = getStoredCompany();

  return (
    <div className="pagelayout-root">

      {!hideNav && (
        <CompanyNavbar
          companyName={companyName}
          isApproved={isApproved}
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