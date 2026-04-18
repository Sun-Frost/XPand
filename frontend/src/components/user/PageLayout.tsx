/* ============================================================
   PageLayout.tsx
   Authenticated page shell. Used by every protected page.

   What it does
   ─────────────
   1. Sets document.title when pageTitle is supplied.
   2. Wraps page content in a fade-in motion.main.
   3. Renders <BottomDock /> — the dock is self-contained,
      needs zero props, reads its own location and navigates.
   4. That's it. No orb, no context, no phase logic.

   Props
   ─────────────
   children     Required. The page content.
   pageTitle    Optional. Appended to "· XPand" in the tab title.
   hideNav      Optional. Pass true on auth pages (login, register)
                where the dock must not appear.
   maxWidth     Optional. Overrides the default content max-width.

   Removed props (were causing TypeScript errors across pages)
   ─────────────
   user            — pages passed user objects here; layout never
                     needed them. Removed completely.
   initiallyDocked — was part of the orb/phase system. Gone.

   Import path used by pages
   ─────────────
   Pages sitting in  src/pages/         → import from "../components/PageLayout"
   Pages sitting in  src/pages/subdir/  → import from "../../components/PageLayout"
   (Adjust to match your actual folder structure.)
   ============================================================ */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import BottomDock from "./navigation/BottomDock";
import type { User } from "../../types";
import "../../assets/css/PageLayout.css";

/* ── Theme helpers ───────────────────────────────────────────── */
const THEME_KEY = "xpand_theme";

function getSavedTheme(): "dark" | "light" {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user_data");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

/* ── Props ───────────────────────────────────────────────────── */
interface PageLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  hideNav?: boolean;
  maxWidth?: string;
}

/* ── Page enter animation ────────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
};

/* ── Component ───────────────────────────────────────────────── */
const PageLayout = ({
  children,
  pageTitle,
  hideNav = false,
  maxWidth,
}: PageLayoutProps) => {

  /* ── Theme ───────────────────────────────────────────────── */
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const theme = getSavedTheme();
    if (typeof document !== "undefined") applyTheme(theme);
    return theme === "dark";
  });

  useEffect(() => { applyTheme(isDarkMode ? "dark" : "light"); }, [isDarkMode]);

  const handleToggleTheme = useCallback(() => setIsDarkMode((p) => !p), []);

  /* ── Tab title ───────────────────────────────────────────── */
  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} · XPand`;
  }, [pageTitle]);

  /* ── Sidebar stub — Navbar requires these props;
       XPand uses BottomDock so the hamburger is decorative ── */
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const handleToggleSidebar = useCallback(() => setIsSidebarCollapsed((v) => !v), []);

  const user = getStoredUser();

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div
      className="pagelayout-root"
      style={{
        // Expose layout geometry as CSS custom properties.
        // Any fixed modal anywhere in the tree can then use:
        //   top: var(--layout-navbar-height)
        //   bottom: var(--layout-bottom-height)
        // --layout-navbar-height is already set in theme.css (58px/60px).
        // --layout-bottom-height is defined here to match BottomDock's height.
        "--layout-bottom-height": hideNav ? "0px" : "64px",
      } as React.CSSProperties}
    >

      {/* Fixed top navbar */}
      {!hideNav && (
        <Navbar
          user={user}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleTheme={handleToggleTheme}
          isDarkMode={isDarkMode}
        />
      )}

      {/*
        Offset wrapper: pads top to clear the fixed navbar and bottom
        to clear the fixed BottomDock so page content is never hidden.

        NOTE: overflow must NOT be hidden here — PageHeader uses
        position:sticky and requires an ancestor that scrolls
        (i.e. the viewport or a scrollable container). Setting
        overflow:hidden on any ancestor between sticky child and
        the scroll container would break sticky behaviour.
      */}
      <div
        style={hideNav ? undefined : {
          paddingTop: "var(--layout-navbar-height)",
          paddingBottom: "var(--layout-bottom-height)",
          // Intentionally no overflow:hidden — sticky PageHeader needs this
        }}
      >
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

      {/* BottomDock — self-contained, reads its own location */}
      {!hideNav && <BottomDock />}

    </div>
  );
};

export default PageLayout;