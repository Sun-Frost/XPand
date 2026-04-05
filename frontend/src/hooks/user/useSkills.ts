import { useState, useEffect, useCallback } from "react";
import { get } from "../../api/axios";

// ---------------------------------------------------------------------------
// Types — match backend DTOs exactly
// ---------------------------------------------------------------------------

export interface SkillItem {
  id: number;        // backend: Integer id
  name: string;
  category: string;
  isActive: boolean;
}

export type BadgeLevel = "BRONZE" | "SILVER" | "GOLD";

export interface UserSkillVerification {
  id: number;
  skillId: number;
  currentBadge: BadgeLevel | null;
  attemptCount: number;
  isLocked: boolean;
  lockExpiry: string | null;      // ISO datetime or null
  verifiedDate: string | null;
  lastAttemptDate: string | null;
}

export interface SkillWithVerification extends SkillItem {
  verification?: UserSkillVerification;
  /** True if the user has used all 3 monthly attempts */
  attemptsExhausted: boolean;
  /** Remaining attempts this month (0-3) */
  remainingAttempts: number;
}

export interface SkillsData {
  skills: SkillWithVerification[];
  categories: string[];
}

export interface UseSkillsReturn {
  data: SkillsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MONTHLY_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Helper — compute remaining attempts from verification data
// ---------------------------------------------------------------------------

function getRemainingAttempts(v: UserSkillVerification | undefined): number {
  if (!v) return MAX_MONTHLY_ATTEMPTS;
  // Backend tracks total attemptCount — remaining is MAX minus used this month.
  // If backend provides a per-month count, use it directly.
  // For now we treat isLocked as the authoritative "blocked" signal
  // and show remaining = MAX - (attemptCount % MAX) as a proxy.
  if (v.isLocked) return 0;
  const usedThisMonth = v.attemptCount % MAX_MONTHLY_ATTEMPTS;
  return MAX_MONTHLY_ATTEMPTS - usedThisMonth;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useSkills = (): UseSkillsReturn => {
  const [data, setData] = useState<SkillsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      get<SkillItem[]>("/skills"),
      get<UserSkillVerification[]>("/user/skills/verifications"),
    ])
      .then(([skills, verifications]) => {
        if (cancelled) return;

        // Build a map for O(1) verification lookup by skillId
        const verificationMap = new Map<number, UserSkillVerification>();
        verifications.forEach((v) => verificationMap.set(v.skillId, v));

        const enriched: SkillWithVerification[] = skills.map((skill) => {
          const v = verificationMap.get(skill.id);
          const remaining = getRemainingAttempts(v);
          return {
            ...skill,
            verification: v,
            remainingAttempts: remaining,
            attemptsExhausted: remaining === 0,
          };
        });

        const categories = Array.from(new Set(enriched.map((s) => s.category)));

        setData({ skills: enriched, categories });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as any)?.response?.status;
        if (status === 401 || status === 403) {
          setError("Session expired. Please log in again.");
        } else {
          setError(
            (err as any)?.response?.data?.message ??
            (err instanceof Error ? err.message : "Failed to load skills.")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, isLoading, error, refetch };
};