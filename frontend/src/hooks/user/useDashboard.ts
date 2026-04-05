import { useState, useEffect, useCallback } from "react";
import type { User, UserSkillVerification, Challenge, UserChallenge } from "../../types";
import { BadgeLevel, ChallengeStatus } from "../../types";

/* ── Extra types used only by the dashboard ────────────────── */
export interface ActiveChallenge extends Challenge {
  currentProgress: number;
  targetValue: number;
  daysLeft: number;
}

export interface RecentActivity {
  id: string;
  icon: string;
  message: string;
  detail?: string;
  timestamp: string;
}

export interface DashboardStats {
  xpBalance: number;
  xpGainedThisWeek: number;
  totalBadges: number;
  goldBadges: number;
  silverBadges: number;
  bronzeBadges: number;
  activeChallenges: number;
  completedChallenges: number;
  verifiedSkills: number;
  totalApplications: number;
}

export interface DashboardData {
  user: User;
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  activeChallenges: ActiveChallenge[];
  topSkills: UserSkillVerification[];
}

/* ── Skill name lookup (replace with API call when ready) ───── */
const SKILL_NAMES: Record<number, string> = {
  1: "React",
  2: "TypeScript",
  3: "Node.js",
  4: "Python",
  5: "System Design",
  6: "SQL",
};

export const getSkillName = (skillId: number): string =>
  SKILL_NAMES[skillId] ?? `Skill #${skillId}`;

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK_DATA: DashboardData = {
  user: {
    userId: 1,
    email: "alex.morgan@example.com",
    firstName: "Alex",
    lastName: "Morgan",
    professionalTitle: "Full-Stack Developer",
    xpBalance: 2_840,
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
  stats: {
    xpBalance: 2_840,
    xpGainedThisWeek: 380,
    totalBadges: 7,
    goldBadges: 2,
    silverBadges: 3,
    bronzeBadges: 2,
    activeChallenges: 3,
    completedChallenges: 11,
    verifiedSkills: 5,
    totalApplications: 4,
  },
  topSkills: [
    { verificationId: 1, userId: 1, skillId: 1, currentBadge: BadgeLevel.GOLD, attemptCount: 3, isLocked: false, verifiedDate: "2024-11-10" },
    { verificationId: 2, userId: 1, skillId: 2, currentBadge: BadgeLevel.GOLD, attemptCount: 2, isLocked: false, verifiedDate: "2024-11-22" },
    { verificationId: 3, userId: 1, skillId: 3, currentBadge: BadgeLevel.SILVER, attemptCount: 2, isLocked: false, verifiedDate: "2024-10-05" },
    { verificationId: 4, userId: 1, skillId: 4, currentBadge: BadgeLevel.SILVER, attemptCount: 1, isLocked: false, verifiedDate: "2024-09-18" },
    { verificationId: 5, userId: 1, skillId: 5, currentBadge: BadgeLevel.BRONZE, attemptCount: 1, isLocked: false, verifiedDate: "2024-08-30" },
  ],
  activeChallenges: [
    {
      challengeId: 1, title: "Skill Verifier",
      description: "Verify 3 skills this month",
      challengeType: "VERIFICATION", targetValue: 3, xpReward: 200, isRepeatable: false,
      currentProgress: 2, daysLeft: 5,
    },
    {
      challengeId: 2, title: "Apply Streak",
      description: "Apply to 5 jobs",
      challengeType: "APPLICATION", targetValue: 5, xpReward: 150, isRepeatable: true,
      currentProgress: 4, daysLeft: 2,
    },
    {
      challengeId: 3, title: "XP Grind",
      description: "Earn 500 XP in a week",
      challengeType: "XP", targetValue: 500, xpReward: 100, isRepeatable: true,
      currentProgress: 380, daysLeft: 8,
    },
  ],
  recentActivity: [
    { id: "a1", icon: "🥇", message: "Earned Gold badge in React", detail: "Score: 94/100", timestamp: "2h ago" },
    { id: "a2", icon: "⚡", message: "+200 XP from Skill Verifier challenge", detail: "Challenge completed", timestamp: "3h ago" },
    { id: "a3", icon: "💼", message: "Applied to Senior Frontend Developer", detail: "TechCorp Inc.", timestamp: "1d ago" },
    { id: "a4", icon: "🥈", message: "Earned Silver badge in Node.js", detail: "Score: 78/100", timestamp: "2d ago" },
    { id: "a5", icon: "🎯", message: "Started TypeScript verification test", detail: "Advanced difficulty", timestamp: "3d ago" },
  ],
};

/* ── Hook ────────────────────────────────────────────────────── */
interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDashboard = (): UseDashboardReturn => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      /* TODO: replace with real API call:
         const result = await get<DashboardData>("/dashboard"); */
      await new Promise((res) => setTimeout(res, 800)); // simulate network
      setData(MOCK_DATA);
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};