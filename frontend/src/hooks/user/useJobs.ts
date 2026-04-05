import { useState, useEffect, useCallback } from "react";
import { get, post } from "../../api/axios";
import { BadgeLevel } from "../../types";

// ---------------------------------------------------------------------------
// API response types (mirrors Java DTOs exactly)
// ---------------------------------------------------------------------------

export type ImportanceLevel = "MAJOR" | "MINOR";
export type JobStatus = "ACTIVE" | "CLOSED" | "EXPIRED";
export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE";

export interface JobSkillResponse {
  skillId: number;
  skillName: string;
  importance: ImportanceLevel;
}

export interface JobPostingResponse {
  id: number;
  companyId: number;
  companyName: string;
  title: string;
  description: string;
  location: string;
  jobType: JobType;
  salaryRange: string;
  deadline: string;
  status: JobStatus;
  requiredSkills: JobSkillResponse[];
}

export interface ApplicationResponse {
  id: number;
  userId: number;
  userFullName: string;
  jobId: number;
  jobTitle: string;
  prioritySlotRank: number | null;
  status: string;
  appliedAt: string;
}

/** Mirrors UserSkillVerificationResponse.java */
export interface UserSkillVerificationResponse {
  verificationId: number;
  skillId: number;
  skillName: string;
  category: string;
  currentBadge: BadgeLevel | null;
  attemptCount: number;
  isLocked: boolean;
  lockExpiry: string | null;
  verifiedDate: string | null;
}

// ---------------------------------------------------------------------------
// View-model types consumed by the UI
// ---------------------------------------------------------------------------

export interface JobSkillWithMeta {
  skillId: number;
  skillName: string;
  importance: ImportanceLevel;
  userBadge?: BadgeLevel;
  required: boolean; // MAJOR = true
}

export interface JobWithMeta extends JobPostingResponse {
  skillRequirements: JobSkillWithMeta[];
  matchScore: number;
  /** True only if the user has a badge for EVERY MAJOR skill */
  canApply: boolean;
  /** List of major skill names the user is missing a badge for */
  missingMajorSkills: string[];
  hasApplied: boolean;
  applicationStatus?: string;
}

export interface JobsFilter {
  search: string;
  jobType: JobType | "ALL";
  matchOnly: boolean;
  location: string;
}

export interface UseJobsReturn {
  jobs: JobWithMeta[];
  isLoading: boolean;
  error: string | null;
  filter: JobsFilter;
  setFilter: (f: Partial<JobsFilter>) => void;
  refetch: () => void;
}

export interface UseJobDetailReturn {
  job: JobWithMeta | null;
  isLoading: boolean;
  error: string | null;
  apply: (priorityPurchaseId?: number | null) => Promise<boolean>;
  isApplying: boolean;
  applySuccess: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Match score formula:
 *   - Major skills collectively account for 80% of the total score.
 *   - Minor skills collectively account for 20% of the total score.
 *
 * Within each group the user earns their proportional share per verified skill.
 *
 * Examples:
 *   - 2 major skills, 1 minor: user has all → 100%
 *   - 2 major, 1 minor: user has 1 major + 0 minor → (1/2)*80 = 40%
 *   - 0 minor skills: 100% of score comes from major skills
 *   - 0 major skills: 100% of score comes from minor skills (edge case)
 */
function computeMatchScore(
  skills: JobSkillResponse[],
  userBadges: Record<number, BadgeLevel>
): number {
  if (!skills.length) return 0;

  const majorSkills = skills.filter((s) => s.importance === "MAJOR");
  const minorSkills = skills.filter((s) => s.importance === "MINOR");

  // Determine actual weight split — if one group is empty, the other gets 100%
  const hasMajor = majorSkills.length > 0;
  const hasMinor = minorSkills.length > 0;

  const majorWeight = hasMajor && hasMinor ? 80 : hasMajor ? 100 : 0;
  const minorWeight = hasMajor && hasMinor ? 20 : hasMinor ? 100 : 0;

  const majorVerified = majorSkills.filter((s) => userBadges[s.skillId] != null).length;
  const minorVerified = minorSkills.filter((s) => userBadges[s.skillId] != null).length;

  const majorScore = majorSkills.length > 0
    ? (majorVerified / majorSkills.length) * majorWeight
    : 0;

  const minorScore = minorSkills.length > 0
    ? (minorVerified / minorSkills.length) * minorWeight
    : 0;

  return Math.round(majorScore + minorScore);
}

function buildBadgeMap(
  verifications: UserSkillVerificationResponse[]
): Record<number, BadgeLevel> {
  const map: Record<number, BadgeLevel> = {};
  for (const v of verifications) {
    if (v.currentBadge != null) {
      map[v.skillId] = v.currentBadge;
    }
  }
  return map;
}

function buildJobWithMeta(
  job: JobPostingResponse,
  userBadges: Record<number, BadgeLevel>,
  appliedJobIds: Set<number>,
  applicationStatusMap: Record<number, string>
): JobWithMeta {
  const skillRequirements: JobSkillWithMeta[] = job.requiredSkills.map((s) => ({
    skillId: s.skillId,
    skillName: s.skillName,
    importance: s.importance,
    userBadge: userBadges[s.skillId],   // undefined if no badge — intentional
    required: s.importance === "MAJOR",
  }));

  const majorSkills = skillRequirements.filter((s) => s.required);
  const missingMajorSkills = majorSkills
    .filter((s) => !s.userBadge)
    .map((s) => s.skillName);

  // User can only apply if they have a badge for ALL major skills
  const canApply = missingMajorSkills.length === 0;

  return {
    ...job,
    skillRequirements,
    matchScore: computeMatchScore(job.requiredSkills, userBadges),
    canApply,
    missingMajorSkills,
    hasApplied: appliedJobIds.has(job.id),
    applicationStatus: applicationStatusMap[job.id],
  };
}

// ---------------------------------------------------------------------------
// useJobs hook
// ---------------------------------------------------------------------------

const DEFAULT_FILTER: JobsFilter = {
  search: "",
  jobType: "ALL",
  matchOnly: false,
  location: "",
};

export const useJobs = (): UseJobsReturn => {
  const [allJobs, setAllJobs] = useState<JobWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<JobsFilter>(DEFAULT_FILTER);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [jobs, verifications, applications] = await Promise.all([
          get<JobPostingResponse[]>("/jobs"),
          get<UserSkillVerificationResponse[]>("/user/skills/verifications").catch(
            () => [] as UserSkillVerificationResponse[]
          ),
          get<ApplicationResponse[]>("/user/applications").catch(
            () => [] as ApplicationResponse[]
          ),
        ]);

        if (cancelled) return;

        const userBadges = buildBadgeMap(verifications);

        const appliedJobIds = new Set<number>(applications.map((a) => a.jobId));
        const applicationStatusMap: Record<number, string> = {};
        for (const a of applications) {
          applicationStatusMap[a.jobId] = a.status;
        }

        setAllJobs(
          jobs.map((j) =>
            buildJobWithMeta(j, userBadges, appliedJobIds, applicationStatusMap)
          )
        );
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load jobs. Please try again.";
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const setFilter = useCallback((partial: Partial<JobsFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  const jobs = allJobs.filter((job) => {
    const q = filter.search.toLowerCase();
    if (
      q &&
      !job.title.toLowerCase().includes(q) &&
      !job.companyName.toLowerCase().includes(q) &&
      !(job.location || "").toLowerCase().includes(q) &&
      !job.skillRequirements.some((s) => s.skillName.toLowerCase().includes(q))
    )
      return false;

    if (filter.jobType !== "ALL" && job.jobType !== filter.jobType) return false;
    if (filter.matchOnly && job.matchScore < 50) return false;
    if (
      filter.location &&
      !(job.location || "").toLowerCase().includes(filter.location.toLowerCase())
    )
      return false;

    return true;
  });

  return {
    jobs,
    isLoading,
    error,
    filter,
    setFilter,
    refetch: () => setTick((t) => t + 1),
  };
};

// ---------------------------------------------------------------------------
// useJobDetail hook
// ---------------------------------------------------------------------------

export const useJobDetail = (jobId: number): UseJobDetailReturn => {
  const [job, setJob] = useState<JobWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [jobData, verifications, applications] = await Promise.all([
          get<JobPostingResponse>(`/jobs/${jobId}`),
          get<UserSkillVerificationResponse[]>("/user/skills/verifications").catch(
            () => [] as UserSkillVerificationResponse[]
          ),
          get<ApplicationResponse[]>("/user/applications").catch(
            () => [] as ApplicationResponse[]
          ),
        ]);

        if (cancelled) return;

        const userBadges = buildBadgeMap(verifications);

        const appliedJobIds = new Set<number>(applications.map((a) => a.jobId));
        const applicationStatusMap: Record<number, string> = {};
        for (const a of applications) {
          applicationStatusMap[a.jobId] = a.status;
        }

        setJob(
          buildJobWithMeta(jobData, userBadges, appliedJobIds, applicationStatusMap)
        );
      } catch {
        if (!cancelled) setError("Job not found or failed to load.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const apply = useCallback(async (priorityPurchaseId?: number | null): Promise<boolean> => {
    if (!job) return false;

    // Guard: must have badge for every MAJOR skill
    if (!job.canApply) {
      setError(
        `You must have a verified badge for all required skills before applying. Missing: ${job.missingMajorSkills.join(", ")}.`
      );
      return false;
    }

    setIsApplying(true);
    setError(null);

    try {
      const payload: { jobId: number; priorityPurchaseId?: number | null } = { jobId: job.id };
      if (priorityPurchaseId != null) payload.priorityPurchaseId = priorityPurchaseId;

      await post<ApplicationResponse>("/user/applications", payload);
      setJob((prev) =>
        prev ? { ...prev, hasApplied: true, applicationStatus: "PENDING" } : prev
      );
      setApplySuccess(true);
      return true;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosErr?.response?.data?.message ??
        "Failed to submit application. Please try again.";
      setError(msg);
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [job]);

  return { job, isLoading, error, apply, isApplying, applySuccess };
};