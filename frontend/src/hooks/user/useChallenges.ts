import { useState, useEffect } from "react";
import { get } from "../../api/axios";
import type { IconName } from "../../components/ui/Icon";

// ---------------------------------------------------------------------------
// Backend response types (matching Java DTOs)
// ---------------------------------------------------------------------------

export interface ChallengeResponse {
  id: number;
  title: string;
  description: string;
  type: string;
  conditionValue: number;
  xpReward: number;
  isActive: boolean;
  isRepeatable: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface UserChallengeResponse {
  id: number;
  challengeId: number;
  challengeTitle: string;
  type: string;
  xpReward: number;
  currentProgress: number;
  conditionValue: number;
  startDate: string | null;
  completedAt: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
}

interface XPTransactionResponse {
  id: number;
  amount: number;
  sourceType: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Extended types used by the UI
// ---------------------------------------------------------------------------

export type ChallengeCategory =
  | "DAILY"
  | "WEEKLY"
  | "MILESTONE"
  | "STREAK"
  | "SKILL"
  | "SOCIAL";

export interface ChallengeWithProgress {
  challengeId: number;
  userChallengeId?: number;
  title: string;
  description: string;
  type: string;
  conditionValue: number;
  xpReward: number;
  isRepeatable: boolean;
  startDate: string | null;
  endDate: string | null;
  currentProgress: number;
  completedAt: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED";
  category: ChallengeCategory;
  icon: IconName;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isNew: boolean;
}

export interface PlayerStats {
  totalXp: number;
  xpThisWeek: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpForCurrentLevel: number;
  currentStreak: number;
  longestStreak: number;
  completedChallenges: number;
  activeChallenges: number;
  rank: "RECRUIT" | "APPRENTICE" | "JOURNEYMAN" | "EXPERT" | "MASTER" | "LEGEND";
}

export interface UseChallengesReturn {
  challenges: ChallengeWithProgress[];
  completedChallenges: ChallengeWithProgress[];
  playerStats: PlayerStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers — derive UI metadata from ChallengeType
// ---------------------------------------------------------------------------

function getCategory(type: string): ChallengeCategory {
  switch (type) {
    case "DAILY_LOGIN":      return "DAILY";
    case "WEEKLY_ACTIVITY":  return "WEEKLY";
    case "STREAK_DAYS":      return "STREAK";
    case "VERIFY_SKILL":
    case "EARN_BADGE":
    case "EARN_GOLD_BADGE":
    case "MULTI_SKILL_PROGRESS": return "SKILL";
    default:                 return "MILESTONE";
  }
}

function getIcon(type: string): IconName {
  const icons: Record<string, IconName> = {
    VERIFY_SKILL:         "cat-default",
    EARN_BADGE:           "badge",
    EARN_GOLD_BADGE:      "badge-gold",
    MULTI_SKILL_PROGRESS: "cat-data",
    DAILY_LOGIN:          "challenge-daily",
    WEEKLY_ACTIVITY:      "challenge-weekly",
    STREAK_DAYS:          "challenge-streak",
    APPLY_JOB:            "work",
    APPLY_WITH_GOLD:      "badge-gold",
    GET_ACCEPTED:         "success",
    USE_XP_STORE:         "store",
    SPEND_XP:             "xp-spend",
    REACH_XP:             "xp",
    COMPLETE_CHALLENGE:   "trophy",
  };
  return icons[type] ?? "quest";
}

function getDifficulty(type: string, conditionValue: number): 1 | 2 | 3 | 4 | 5 {
  switch (type) {
    case "DAILY_LOGIN":    return 1;
    case "WEEKLY_ACTIVITY":
    case "STREAK_DAYS":
      return conditionValue <= 3 ? 1 : conditionValue <= 7 ? 2 : conditionValue <= 14 ? 3 : 4;
    case "VERIFY_SKILL":
    case "EARN_BADGE":
      return conditionValue === 1 ? 2 : conditionValue <= 3 ? 3 : 4;
    case "EARN_GOLD_BADGE":
    case "APPLY_WITH_GOLD":
    case "GET_ACCEPTED":   return 4;
    case "REACH_XP":
    case "COMPLETE_CHALLENGE":
      return conditionValue >= 500 ? 5 : 3;
    default:               return 2;
  }
}

// ---------------------------------------------------------------------------
// XP level thresholds
// ---------------------------------------------------------------------------

const LEVEL_THRESHOLDS = [
  0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000,
];

function computeLevel(totalXp: number): {
  level: number;
  xpForCurrentLevel: number;
  xpToNextLevel: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const xpForCurrentLevel = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const xpToNextLevel = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return { level, xpForCurrentLevel, xpToNextLevel };
}

function getRank(level: number): PlayerStats["rank"] {
  if (level >= 10) return "LEGEND";
  if (level >= 8)  return "MASTER";
  if (level >= 6)  return "EXPERT";
  if (level >= 4)  return "JOURNEYMAN";
  if (level >= 2)  return "APPRENTICE";
  return "RECRUIT";
}

// ---------------------------------------------------------------------------
// Merge backend responses into ChallengeWithProgress[]
// ---------------------------------------------------------------------------

function mergeData(
  challenges: ChallengeResponse[],
  userChallenges: UserChallengeResponse[]
): ChallengeWithProgress[] {
  const progressMap = new Map<number, UserChallengeResponse>();
  for (const uc of userChallenges) {
    progressMap.set(uc.challengeId, uc);
  }

  return challenges
    .filter((c) => c.isActive)
    .map((c) => {
      const uc = progressMap.get(c.id);
      return {
        challengeId:     c.id,
        userChallengeId: uc?.id,
        title:           c.title,
        description:     c.description,
        type:            c.type,
        conditionValue:  c.conditionValue,
        xpReward:        c.xpReward,
        isRepeatable:    c.isRepeatable,
        startDate:       c.startDate,
        endDate:         c.endDate,
        currentProgress: uc?.currentProgress ?? 0,
        completedAt:     uc?.completedAt ?? null,
        status:          uc?.status ?? "NOT_STARTED",
        category:        getCategory(c.type),
        icon:            getIcon(c.type),
        difficulty:      getDifficulty(c.type, c.conditionValue),
        isNew:           false,
      };
    });
}

function buildPlayerStats(
  merged: ChallengeWithProgress[],
  totalXp: number,
  currentStreak: number,
  xpThisWeek: number
): PlayerStats {
  const completedCount = merged.filter((c) => c.status === "COMPLETED").length;
  const activeCount    = merged.filter((c) => c.status === "IN_PROGRESS").length;
  const { level, xpForCurrentLevel, xpToNextLevel } = computeLevel(totalXp);

  return {
    totalXp,
    xpThisWeek,
    currentLevel: level,
    xpToNextLevel,
    xpForCurrentLevel,
    currentStreak,
    longestStreak:        0,
    completedChallenges:  completedCount,
    activeChallenges:     activeCount,
    rank:                 getRank(level),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChallenges = (): UseChallengesReturn => {
  const [allMerged, setAllMerged]     = useState<ChallengeWithProgress[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [tick, setTick]               = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const [challenges, userProgress, profile, transactions] = await Promise.all([
          get<ChallengeResponse[]>("/user/challenges"),
          get<UserChallengeResponse[]>("/user/challenges/progress"),
          get<{ xpBalance: number; loginStreakDays?: number }>("/user/profile"),
          get<XPTransactionResponse[]>("/user/store/transactions"),
        ]);

        if (cancelled) return;

        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const xpThisWeek = transactions
          .filter((t) => t.amount > 0 && new Date(t.createdAt).getTime() > weekAgo)
          .reduce((sum, t) => sum + t.amount, 0);

        const merged = mergeData(challenges, userProgress);
        setAllMerged(merged);
        setPlayerStats(
          buildPlayerStats(merged, profile.xpBalance ?? 0, profile.loginStreakDays ?? 0, xpThisWeek)
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as any)?.response?.data?.message ??
            (err instanceof Error ? err.message : "Failed to load challenges")
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tick]);

  const completedChallenges = allMerged.filter((c) => c.status === "COMPLETED");
  const activeChallenges    = allMerged.filter((c) => c.status !== "COMPLETED");

  return {
    challenges: activeChallenges,
    completedChallenges,
    playerStats,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
};