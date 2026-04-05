import { useState, useEffect, useCallback } from "react";
import { get, post, put, del, patch } from "../../api/axios";

// ---------------------------------------------------------------------------
// Types — mirroring backend DTOs exactly
// ---------------------------------------------------------------------------

export interface CompanyProfile {
  id: number;
  email: string;
  companyName: string;
  description: string | null;
  websiteUrl: string | null;
  industry: string | null;
  location: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface UpdateCompanyProfilePayload {
  companyName?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  location?: string | null;
}

export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE";
export type JobStatus = "ACTIVE" | "CLOSED" | "EXPIRED";
export type ImportanceLevel = "MAJOR" | "MINOR";
export type ApplicationStatus = "PENDING" | "SHORTLISTED" | "REJECTED" | "WITHDRAWN";

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
  description: string | null;
  location: string | null;
  jobType: JobType | null;
  salaryRange: string | null;
  deadline: string | null;
  status: JobStatus;
  requiredSkills: JobSkillResponse[];
}

export interface JobSkillRequest {
  skillId: number;
  importance: ImportanceLevel;
}

export interface CreateJobPayload {
  title: string;
  description: string | null;
  location: string | null;
  jobType: JobType | null;
  salaryRange: string | null;
  deadline: string | null;  // ISO datetime string
  skills: JobSkillRequest[];
}

export interface ApplicationResponse {
  id: number;
  userId: number;
  userFullName: string;
  jobId: number;
  jobTitle: string;
  prioritySlotRank: number | null;
  status: ApplicationStatus;
  appliedAt: string;
}

// ---------------------------------------------------------------------------
// Company-view user profile types — mirror backend DTOs exactly
// ---------------------------------------------------------------------------

export interface CompanyViewUserProfileResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  country: string | null;
  city: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  profilePicture: string | null;
  professionalTitle: string | null;
  aboutMe: string | null;
  createdAt: string;
  xpBalance: number;
}

export interface EducationResponse {
  id: number;
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface WorkExperienceResponse {
  id: number;
  jobTitle: string;
  companyName: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface ProjectResponse {
  id: number;
  title: string;
  description: string | null;
  technologiesUsed: string | null;
  projectUrl: string | null;
  githubUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CertificationResponse {
  id: number;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string | null;
  credentialUrl: string | null;
}

export interface CompanyUserFullProfileResponse {
  profile: CompanyViewUserProfileResponse;
  educations: EducationResponse[];
  workExperiences: WorkExperienceResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
}

// ---------------------------------------------------------------------------
// Shared error extractor
// ---------------------------------------------------------------------------

const extractError = (err: unknown, fallback: string): string =>
  (err as any)?.response?.data?.message ??
  (err instanceof Error ? err.message : fallback);

// ---------------------------------------------------------------------------
// useCompanyProfile
// ---------------------------------------------------------------------------

export interface UseCompanyProfileReturn {
  profile: CompanyProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
  saveSuccess: boolean;
  updateProfile: (payload: UpdateCompanyProfilePayload) => Promise<boolean>;
  refetch: () => void;
  clearSaveStatus: () => void;
}

export const useCompanyProfile = (): UseCompanyProfileReturn => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    get<CompanyProfile>("/company/profile")
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err) => { if (!cancelled) setError(extractError(err, "Failed to load company profile.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const clearSaveStatus = useCallback(() => { setSaveError(null); setSaveSuccess(false); }, []);

  const updateProfile = useCallback(async (payload: UpdateCompanyProfilePayload): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await put<CompanyProfile>("/company/profile", payload);
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err) {
      setSaveError(extractError(err, "Failed to update profile."));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { profile, isLoading, isSaving, error, saveError, saveSuccess, updateProfile, refetch, clearSaveStatus };
};

// ---------------------------------------------------------------------------
// useCompanyJobs — list + CRUD
// ---------------------------------------------------------------------------

export interface UseCompanyJobsReturn {
  jobs: JobPostingResponse[];
  isLoading: boolean;
  error: string | null;
  createJob: (payload: CreateJobPayload) => Promise<JobPostingResponse | null>;
  updateJob: (jobId: number, payload: CreateJobPayload) => Promise<boolean>;
  closeJob: (jobId: number) => Promise<boolean>;
  refetch: () => void;
}

export const useCompanyJobs = (): UseCompanyJobsReturn => {
  const [jobs, setJobs] = useState<JobPostingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    get<JobPostingResponse[]>("/company/jobs")
      .then((data) => { if (!cancelled) setJobs(data); })
      .catch((err) => { if (!cancelled) setError(extractError(err, "Failed to load jobs.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const createJob = useCallback(async (payload: CreateJobPayload): Promise<JobPostingResponse | null> => {
    try {
      const job = await post<JobPostingResponse>("/company/jobs", payload);
      setJobs((prev) => [job, ...prev]);
      return job;
    } catch (err) {
      throw new Error(extractError(err, "Failed to create job."));
    }
  }, []);

  const updateJob = useCallback(async (jobId: number, payload: CreateJobPayload): Promise<boolean> => {
    try {
      const updated = await put<JobPostingResponse>(`/company/jobs/${jobId}`, payload);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      return true;
    } catch (err) {
      throw new Error(extractError(err, "Failed to update job."));
    }
  }, []);

  // Backend DELETE sets status to CLOSED — reflect optimistically
  const closeJob = useCallback(async (jobId: number): Promise<boolean> => {
    try {
      await del(`/company/jobs/${jobId}`);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "CLOSED" as JobStatus } : j));
      return true;
    } catch (err) {
      throw new Error(extractError(err, "Failed to close job."));
    }
  }, []);

  return { jobs, isLoading, error, createJob, updateJob, closeJob, refetch };
};

// ---------------------------------------------------------------------------
// useJobApplicants — for a specific job
// ---------------------------------------------------------------------------

export interface UseJobApplicantsReturn {
  applications: ApplicationResponse[];
  isLoading: boolean;
  error: string | null;
  updateStatus: (applicationId: number, status: ApplicationStatus) => Promise<boolean>;
  refetch: () => void;
}

export const useJobApplicants = (jobId: number | null): UseJobApplicantsReturn => {
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    get<ApplicationResponse[]>(`/company/jobs/${jobId}/applications`)
      .then((data) => { if (!cancelled) setApplications(data); })
      .catch((err) => { if (!cancelled) setError(extractError(err, "Failed to load applicants.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [jobId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const updateStatus = useCallback(async (applicationId: number, status: ApplicationStatus): Promise<boolean> => {
    try {
      const updated = await patch<ApplicationResponse>(
        `/company/applications/${applicationId}/status?status=${status}`
      );
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? updated : a)));
      return true;
    } catch (err) {
      throw new Error(extractError(err, "Failed to update application status."));
    }
  }, []);

  return { applications, isLoading, error, updateStatus, refetch };
};

// ---------------------------------------------------------------------------
// useMarketInsights — derived from public jobs + skills endpoints
// ---------------------------------------------------------------------------

export interface SkillDemand {
  skillId: number;
  skillName: string;
  jobCount: number;
  majorCount: number;   // jobs requiring it as MAJOR
  minorCount: number;
}

export interface MarketInsights {
  totalActiveJobs: number;
  skillDemand: SkillDemand[];           // sorted by jobCount desc
  topSkills: SkillDemand[];             // top 5
  jobTypeBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

export interface UseMarketInsightsReturn {
  insights: MarketInsights | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMarketInsights = (): UseMarketInsightsReturn => {
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    get<JobPostingResponse[]>("/jobs")
      .then((jobs) => {
        if (cancelled) return;

        const activeJobs = jobs.filter((j) => j.status === "ACTIVE");

        // Aggregate skill demand
        const skillMap = new Map<number, SkillDemand>();
        for (const job of activeJobs) {
          for (const skill of job.requiredSkills) {
            const existing = skillMap.get(skill.skillId) ?? {
              skillId: skill.skillId,
              skillName: skill.skillName,
              jobCount: 0,
              majorCount: 0,
              minorCount: 0,
            };
            existing.jobCount += 1;
            if (skill.importance === "MAJOR") existing.majorCount += 1;
            else existing.minorCount += 1;
            skillMap.set(skill.skillId, existing);
          }
        }

        const skillDemand = Array.from(skillMap.values()).sort((a, b) => b.jobCount - a.jobCount);

        // Job type breakdown
        const jobTypeBreakdown: Record<string, number> = {};
        for (const job of activeJobs) {
          const t = job.jobType ?? "UNSPECIFIED";
          jobTypeBreakdown[t] = (jobTypeBreakdown[t] ?? 0) + 1;
        }

        // Location breakdown (top locations)
        const locationBreakdown: Record<string, number> = {};
        for (const job of activeJobs) {
          const loc = job.location?.trim() || "Remote / Unspecified";
          locationBreakdown[loc] = (locationBreakdown[loc] ?? 0) + 1;
        }

        setInsights({
          totalActiveJobs: activeJobs.length,
          skillDemand,
          topSkills: skillDemand.slice(0, 8),
          jobTypeBreakdown,
          locationBreakdown,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err, "Failed to load market insights."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { insights, isLoading, error, refetch };
};