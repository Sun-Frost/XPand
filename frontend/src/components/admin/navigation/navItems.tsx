/* ============================================================
   adminNavItems.tsx
   Single source of truth for admin navigation items.
   ============================================================ */

import type { ReactNode } from "react";

export interface AdminNavItem {
  id:    string;
  label: string;
  path:  string;
  color: string;
  icon:  ReactNode;
}

const OverviewIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.2" />
    <rect x="14" y="3" width="7" height="7" rx="1.2" />
    <rect x="14" y="14" width="7" height="7" rx="1.2" />
    <rect x="3" y="14" width="7" height="7" rx="1.2" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CompaniesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ChallengesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const SkillsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id:    "overview",
    label: "Overview",
    path:  "/admin/overview",
    color: "rgba(167, 139, 250, 0.40)",
    icon:  <OverviewIcon />,
  },
  {
    id:    "users",
    label: "Users",
    path:  "/admin/users",
    color: "rgba(34, 211, 238, 0.40)",
    icon:  <UsersIcon />,
  },
  {
    id:    "companies",
    label: "Companies",
    path:  "/admin/companies",
    color: "rgba(52, 211, 153, 0.40)",
    icon:  <CompaniesIcon />,
  },
  {
    id:    "challenges",
    label: "Challenges",
    path:  "/admin/challenges",
    color: "rgba(245, 158, 11, 0.40)",
    icon:  <ChallengesIcon />,
  },
  {
    id:    "store",
    label: "XP Store",
    path:  "/admin/store",
    color: "rgba(139, 92, 246, 0.40)",
    icon:  <StoreIcon />,
  },
  {
    id:    "skills",
    label: "Skills",
    path:  "/admin/skills",
    color: "rgba(248, 113, 113, 0.40)",
    icon:  <SkillsIcon />,
  },
];