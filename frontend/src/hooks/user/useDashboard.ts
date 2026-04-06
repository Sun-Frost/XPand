/* ============================================================
   useDashboard.ts  — v2  (real API)
   GET /api/user/dashboard
   ============================================================ */

import { useState, useEffect, useCallback } from "react";
import { get } from "../../api/axios";

// ── Types mirror DashboardResponse.java exactly ──────────────────────────────

export interface SkillBadgeSummary {
  skillId: number;
  skillName: string;
  category: string;
  badge: "GOLD" | "SILVER" | "BRONZE";
}

export interface ActivityItem {
  type: "XP_GAIN" | "XP_SPEND" | "APPLICATION" | "BADGE";
  label: string;
  detail: string;
  amount: number | null;
  timestamp: string; // ISO
}

export interface MarketSkillItem {
  skillName: string;
  category: string;
  jobCount: number;
  userHasIt: boolean;
}

export interface DashboardData {
  userId: number;
  firstName: string;
  lastName: string;
  professionalTitle: string | null;
  profilePicture: string | null;
  country: string | null;

  xpBalance: number;
  xpGainedThisWeek: number;
  level: number;
  xpToNextLevel: number;
  xpForCurrentLevel: number;

  goldBadges: number;
  silverBadges: number;
  bronzeBadges: number;
  totalBadges: number;

  verifiedSkills: number;
  activeChallenges: number;
  completedChallenges: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;

  topSkills: SkillBadgeSummary[];
  recentActivity: ActivityItem[];
  topMarketSkills: MarketSkillItem[];
  missingSkills: string[];
  recommendedSkills: string[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDashboard = (): UseDashboardReturn => {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get<DashboardData>("/user/dashboard");
      setData(result);
    } catch (err: unknown) {
      setError(
        (err as any)?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to load dashboard.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};