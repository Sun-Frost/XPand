/* ============================================================
   companyNavItems.tsx
   Single source of truth for company navigation items.
   Mirrors the pattern from navItems.tsx for users.
   ============================================================ */

import type { ReactNode } from "react";

export interface CompanyNavItem {
  id:    string;
  label: string;
  path:  string;
  color: string;
  icon:  ReactNode;
}

// ── Icons ─────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7"  rx="1.2" />
    <rect x="14" y="3"  width="7" height="7"  rx="1.2" />
    <rect x="14" y="14" width="7" height="7"  rx="1.2" />
    <rect x="3"  y="14" width="7" height="7"  rx="1.2" />
  </svg>
);

const JobsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

const ApplicantsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const InsightsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4"  />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

// ── Nav items ──────────────────────────────────────────────────

export const COMPANY_NAV_ITEMS: CompanyNavItem[] = [
  {
    id:    "dashboard",
    label: "Dashboard",
    path:  "/company/dashboard",
    color: "rgba(167, 139, 250, 0.40)",
    icon:  <DashboardIcon />,
  },
  {
    id:    "jobs",
    label: "Manage Jobs",
    path:  "/company/jobs",
    color: "rgba(52, 211, 153, 0.40)",
    icon:  <JobsIcon />,
  },
  {
    id:    "post",
    label: "Post Job",
    path:  "/company/jobs/create",
    color: "rgba(245, 158, 11, 0.40)",
    icon:  (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8"  y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id:    "insights",
    label: "Insights",
    path:  "/company/insights",
    color: "rgba(34, 211, 238, 0.40)",
    icon:  <InsightsIcon />,
  },
  {
    id:    "profile",
    label: "Profile",
    path:  "/company/profile",
    color: "rgba(251, 113, 133, 0.40)",
    icon:  <ProfileIcon />,
  },
];