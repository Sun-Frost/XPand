import { useState, useEffect, useCallback, useRef } from "react";
import { get, put, post, del } from "../../api/axios";

// ---------------------------------------------------------------------------
// Types — mirroring backend DTOs exactly
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  country?: string | null;
  city?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  profilePicture?: string | null;
  professionalTitle?: string | null;
  aboutMe?: string | null;
  xpBalance: number;
  createdAt: string;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  country?: string | null;
  city?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  profilePicture?: string | null;
  professionalTitle?: string | null;
  aboutMe?: string | null;
}

export interface Education {
  id: number;
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;   // LocalDate → "YYYY-MM-DD"
  endDate?: string | null;
  description?: string | null;
}

export interface EducationPayload {
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

export interface WorkExperience {
  id: number;
  jobTitle: string;
  companyName: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

export interface WorkExperiencePayload {
  jobTitle: string;
  companyName: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

export interface Certification {
  id: number;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string | null;
}

export interface CertificationPayload {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string | null;
}

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  technologiesUsed?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export interface ProjectPayload {
  title: string;
  description?: string | null;
  technologiesUsed?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseProfileReturn {
  // State
  profile: UserProfile | null;
  educations: Education[];
  workExperiences: WorkExperience[];
  certifications: Certification[];
  projects: Project[];

  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
  saveSuccess: boolean;

  // Profile
  updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
  refetch: () => void;
  clearSaveStatus: () => void;

  // Education CRUD
  addEducation: (payload: EducationPayload) => Promise<boolean>;
  updateEducation: (id: number, payload: EducationPayload) => Promise<boolean>;
  deleteEducation: (id: number) => Promise<boolean>;

  // Work Experience CRUD
  addWorkExperience: (payload: WorkExperiencePayload) => Promise<boolean>;
  updateWorkExperience: (id: number, payload: WorkExperiencePayload) => Promise<boolean>;
  deleteWorkExperience: (id: number) => Promise<boolean>;

  // Certification CRUD
  addCertification: (payload: CertificationPayload) => Promise<boolean>;
  updateCertification: (id: number, payload: CertificationPayload) => Promise<boolean>;
  deleteCertification: (id: number) => Promise<boolean>;

  // Project CRUD
  addProject: (payload: ProjectPayload) => Promise<boolean>;
  updateProject: (id: number, payload: ProjectPayload) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Helper — extract error message from axios errors
// ---------------------------------------------------------------------------

const extractError = (err: unknown, fallback: string): string =>
  (err as any)?.response?.data?.message ??
  (err instanceof Error ? err.message : fallback);

// ---------------------------------------------------------------------------
// Helpers — duplicate-detection
// ---------------------------------------------------------------------------

/**
 * Normalise a URL so that cosmetic differences (trailing slash, case,
 * http vs https, www prefix) don't let duplicates slip through.
 * Returns null when the value is empty / null / undefined.
 */
function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    // lower-case hostname, drop trailing slash on pathname
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`.toLowerCase();
  } catch {
    // Not a valid URL — fall back to plain lower-cased string
    return raw.trim().toLowerCase().replace(/\/$/, "");
  }
}

/**
 * Returns true when two URL strings point to the same resource
 * (after normalisation), ignoring nulls.
 */
function urlsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeUrl(a);
  const nb = normalizeUrl(b);
  return na !== null && nb !== null && na === nb;
}

/**
 * Throw if the project payload duplicates the title, projectUrl, or githubUrl
 * of an already-saved project. Title is always checked (it is the mandatory
 * uniqueness anchor when URLs are absent). URL fields are only checked when
 * the payload actually provides them. Pass `excludeId` when editing so the
 * project isn't compared against itself.
 */
function assertUniqueProject(
  existing: Project[],
  payload: ProjectPayload,
  excludeId?: number
): void {
  const peers = excludeId !== undefined
    ? existing.filter((p) => p.id !== excludeId)
    : existing;

  const newTitle = payload.title.trim().toLowerCase();

  for (const p of peers) {
    if (p.title.trim().toLowerCase() === newTitle) {
      throw new Error(
        `You already have a project named "${p.title}". `
         +
        "Adding a fake project might cost you losing your account."
      );
    }
    if (payload.projectUrl && urlsMatch(payload.projectUrl, p.projectUrl)) {
      throw new Error(
        `A project with this Project URL already exists ("${p.title}"). `  +
        "Adding a fake project might cost you losing your account."
      );
    }
    if (payload.githubUrl && urlsMatch(payload.githubUrl, p.githubUrl)) {
      throw new Error(
        `A project with this GitHub URL already exists ("${p.title}"). `  +
        "Adding a fake project might cost you losing your account."
      );
    }
  }
}

/**
 * Throw if the certification payload shares the same name + issuing
 * organisation combination with an already-saved certification.
 * Pass `excludeId` when editing.
 */
function assertUniqueCertification(
  existing: Certification[],
  payload: CertificationPayload,
  excludeId?: number
): void {
  const peers = excludeId !== undefined
    ? existing.filter((c) => c.id !== excludeId)
    : existing;

  const newName = payload.name.trim().toLowerCase();
  const newOrg  = payload.issuingOrganization.trim().toLowerCase();

  for (const c of peers) {
    if (
      c.name.trim().toLowerCase() === newName &&
      c.issuingOrganization.trim().toLowerCase() === newOrg
    ) {
      throw new Error(
        `You already have the certification "${c.name}" from "${c.issuingOrganization}". ` +
        "Adding a fake certification might cost you losing your account."
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [educations, setEducations] = useState<Education[]>([]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Refs that mirror state so validation can read the current list
  // synchronously without going through a state updater (throwing inside
  // a state updater crashes React's reconciler).
  const projectsRef       = useRef<Project[]>([]);
  const certificationsRef = useRef<Certification[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tick, setTick] = useState(0);

  // ── Fetch all data on mount / refetch ───────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      get<UserProfile>("/user/profile"),
      get<Education[]>("/user/education"),
      get<WorkExperience[]>("/user/work-experience"),
      get<Certification[]>("/user/certifications"),
      get<Project[]>("/user/projects"),
    ])
      .then(([prof, edu, work, certs, projs]) => {
        if (cancelled) return;
        setProfile(prof);
        setEducations(edu);
        setWorkExperiences(work);
        setCertifications(certs);
        setProjects(projs);
        projectsRef.current       = projs;
        certificationsRef.current = certs;
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractError(err, "Failed to load profile."));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const clearSaveStatus = useCallback(() => {
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  // Shared save wrapper — reduces boilerplate below
  const withSave = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await fn();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: unknown) {
      setSaveError(extractError(err, "Save failed. Please try again."));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── Profile ─────────────────────────────────────────────────
  const updateProfile = useCallback((payload: UpdateProfilePayload) =>
    withSave(async () => {
      const updated = await put<UserProfile>("/user/profile", payload);
      setProfile(updated);
    }), [withSave]);

  // ── Education ───────────────────────────────────────────────
  const addEducation = useCallback((payload: EducationPayload) =>
    withSave(async () => {
      const item = await post<Education>("/user/education", payload);
      setEducations((prev) => [...prev, item]);
    }), [withSave]);

  const updateEducation = useCallback((id: number, payload: EducationPayload) =>
    withSave(async () => {
      const item = await put<Education>(`/user/education/${id}`, payload);
      setEducations((prev) => prev.map((e) => (e.id === id ? item : e)));
    }), [withSave]);

  const deleteEducation = useCallback((id: number) =>
    withSave(async () => {
      await del(`/user/education/${id}`);
      setEducations((prev) => prev.filter((e) => e.id !== id));
    }), [withSave]);

  // ── Work Experience ──────────────────────────────────────────
  const addWorkExperience = useCallback((payload: WorkExperiencePayload) =>
    withSave(async () => {
      const item = await post<WorkExperience>("/user/work-experience", payload);
      setWorkExperiences((prev) => [...prev, item]);
    }), [withSave]);

  const updateWorkExperience = useCallback((id: number, payload: WorkExperiencePayload) =>
    withSave(async () => {
      const item = await put<WorkExperience>(`/user/work-experience/${id}`, payload);
      setWorkExperiences((prev) => prev.map((w) => (w.id === id ? item : w)));
    }), [withSave]);

  const deleteWorkExperience = useCallback((id: number) =>
    withSave(async () => {
      await del(`/user/work-experience/${id}`);
      setWorkExperiences((prev) => prev.filter((w) => w.id !== id));
    }), [withSave]);

  // ── Certifications ───────────────────────────────────────────
  const addCertification = useCallback((payload: CertificationPayload) =>
    withSave(async () => {
      // Reject if name + issuing organisation duplicate an existing certification
      assertUniqueCertification(certificationsRef.current, payload);
      const item = await post<Certification>("/user/certifications", payload);
      setCertifications((prev) => { const next = [...prev, item]; certificationsRef.current = next; return next; });
    }), [withSave]);

  const updateCertification = useCallback((id: number, payload: CertificationPayload) =>
    withSave(async () => {
      // Reject if name + issuing organisation duplicate another existing certification
      assertUniqueCertification(certificationsRef.current, payload, id);
      const item = await put<Certification>(`/user/certifications/${id}`, payload);
      setCertifications((prev) => { const next = prev.map((c) => (c.id === id ? item : c)); certificationsRef.current = next; return next; });
    }), [withSave]);

  const deleteCertification = useCallback((id: number) =>
    withSave(async () => {
      await del(`/user/certifications/${id}`);
      setCertifications((prev) => { const next = prev.filter((c) => c.id !== id); certificationsRef.current = next; return next; });
    }), [withSave]);

  // ── Projects ─────────────────────────────────────────────────
  const addProject = useCallback((payload: ProjectPayload) =>
    withSave(async () => {
      // Reject if title/URLs duplicate an existing project
      assertUniqueProject(projectsRef.current, payload);
      const item = await post<Project>("/user/projects", payload);
      setProjects((prev) => { const next = [...prev, item]; projectsRef.current = next; return next; });
    }), [withSave]);

  const updateProject = useCallback((id: number, payload: ProjectPayload) =>
    withSave(async () => {
      // Reject if title/URLs duplicate another existing project
      assertUniqueProject(projectsRef.current, payload, id);
      const item = await put<Project>(`/user/projects/${id}`, payload);
      setProjects((prev) => { const next = prev.map((p) => (p.id === id ? item : p)); projectsRef.current = next; return next; });
    }), [withSave]);

  const deleteProject = useCallback((id: number) =>
    withSave(async () => {
      await del(`/user/projects/${id}`);
      setProjects((prev) => { const next = prev.filter((p) => p.id !== id); projectsRef.current = next; return next; });
    }), [withSave]);

  return {
    profile,
    educations,
    workExperiences,
    certifications,
    projects,
    isLoading,
    isSaving,
    error,
    saveError,
    saveSuccess,
    updateProfile,
    refetch,
    clearSaveStatus,
    addEducation, updateEducation, deleteEducation,
    addWorkExperience, updateWorkExperience, deleteWorkExperience,
    addCertification, updateCertification, deleteCertification,
    addProject, updateProject, deleteProject,
  };
};