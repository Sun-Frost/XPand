/* ============================================================
   navItems.tsx
   Single source of truth for all navigation items.
   Imported by BottomDock — never duplicated elsewhere.

   FIXES vs navItems.ts
   ─────────────────────
   1. File is .tsx  — JSX is only valid in .tsx files.
      In a .ts file every <tag> is a parse error because
      TypeScript interprets < as a comparison operator.

   2. Removed  const I = (children: ReactNode): ReactNode => children
      That was an attempt to smuggle JSX through a .ts file.
      It does not work and is not needed in .tsx.

   3. Each icon is a named React functional component.
      Components are called once ( <DashboardIcon /> ) to produce
      a stable ReactNode stored in NAV_ITEMS[n].icon.
      Named components are easier to debug in React DevTools.
   ============================================================ */

import type { ReactNode } from "react";

/* ── NavItem type ─────────────────────────────────────────────── */
export interface NavItem {
  id:    string;
  label: string;
  path:  string;
  color: string;    // per-item accent glow colour used by BottomDock
  icon:  ReactNode;
}

/* ── Icon components ──────────────────────────────────────────── */

const DashboardIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <rect x="3"  y="3"  width="7" height="7"  rx="1.2" />
    <rect x="14" y="3"  width="7" height="7"  rx="1.2" />
    <rect x="14" y="14" width="7" height="7"  rx="1.2" />
    <rect x="3"  y="14" width="7" height="7"  rx="1.2" />
  </svg>
);

const ProfileIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const SkillsIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const JobsIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

const ChallengesIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const StoreIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3"  y1="6"  x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

/* ── Icon map — exported for any consumer that needs individual icons ── */
export const NAV_ICONS = {
  dashboard:  <DashboardIcon  />,
  profile:    <ProfileIcon    />,
  skills:     <SkillsIcon     />,
  jobs:       <JobsIcon       />,
  challenges: <ChallengesIcon />,
  store:      <StoreIcon      />,
} as const;

/* ── Master navigation list ───────────────────────────────────── */
/*
 * This is the ONLY place nav items are defined.
 * BottomDock reads this list directly — no props, no context.
 * Add, remove, or reorder items here and every consumer updates.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id:    "dashboard",
    label: "Dashboard",
    path:  "/dashboard",
    color: "rgba(167, 139, 250, 0.40)",
    icon:  <DashboardIcon />,
  },
  
  {
    id:    "skills",
    label: "Skills",
    path:  "/skills",
    color: "rgba(245, 158, 11, 0.40)",
    icon:  <SkillsIcon />,
  },
  {
    id:    "jobs",
    label: "Jobs",
    path:  "/jobs",
    color: "rgba(52, 211, 153, 0.40)",
    icon:  <JobsIcon />,
  },
  {
    id:    "challenges",
    label: "Challenges",
    path:  "/challenges",
    color: "rgba(251, 113, 133, 0.40)",
    icon:  <ChallengesIcon />,
  },
  {
    id:    "store",
    label: "Store",
    path:  "/store",
    color: "rgba(139, 92, 246, 0.40)",
    icon:  <StoreIcon />,
  },
  {
    id:    "profile",
    label: "Profile",
    path:  "/profile",
    color: "rgba(34, 211, 238, 0.40)",
    icon:  <ProfileIcon />,
  },
];