import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { Icon } from "../../components/ui/Icon";
import { useCompanyJobs, useJobApplicants } from "../../hooks/company/useCompany";
import { exportApplicantCvPdf } from "../../utils/pdfExport";
import type {
  ApplicationResponse,
  ApplicationStatus,
  CompanyUserFullProfileResponse,
  CompanyViewUserProfileResponse,
  EducationResponse,
  WorkExperienceResponse,
  ProjectResponse,
  CertificationResponse,
} from "../../hooks/company/useCompany";
import { get } from "../../api/axios";

// ---------------------------------------------------------------------------
// Local hook state shape for rich applicant profile
// ---------------------------------------------------------------------------
interface ApplicantRichProfile {
  profile: CompanyViewUserProfileResponse | null;
  workExperience: WorkExperienceResponse[];
  education: EducationResponse[];
  certifications: CertificationResponse[];
  projects: ProjectResponse[];
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: string): string => {
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const fmtMonthYear = (d: string): string => {
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

const fmtYear = (d: string): string => {
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.getFullYear().toString();
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  PENDING: { label: "Pending", color: "#94A3B8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)", dot: "#94A3B8" },
  SHORTLISTED: { label: "Shortlisted", color: "#22D3EE", bg: "rgba(34,211,238,.1)", border: "rgba(34,211,238,.28)", dot: "#22D3EE" },
  REJECTED: { label: "Rejected", color: "#F87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.28)", dot: "#F87171" },
  WITHDRAWN: { label: "Withdrawn", color: "#64748B", bg: "rgba(100,116,139,.08)", border: "rgba(100,116,139,.2)", dot: "#64748B" },
};

const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REJECTED"],
  REJECTED: ["SHORTLISTED"],
  WITHDRAWN: [],
};

const STATUS_WEIGHT: Record<ApplicationStatus, number> = {
  PENDING: 0, SHORTLISTED: 1, REJECTED: 2, WITHDRAWN: 3,
};

function xpLevel(xp: number): { level: number; title: string; color: string } {
  if (xp >= 10000) return { level: 5, title: "Elite", color: "#F59E0B" };
  if (xp >= 5000) return { level: 4, title: "Expert", color: "#A78BFA" };
  if (xp >= 2000) return { level: 3, title: "Advanced", color: "#22D3EE" };
  if (xp >= 500) return { level: 2, title: "Intermediate", color: "#34D399" };
  return { level: 1, title: "Beginner", color: "#94A3B8" };
}

// ---------------------------------------------------------------------------
// Badge strength scoring (for regular applicant ordering)
// Formula: (goldCount × 3) + (silverCount × 2) + (bronzeCount × 1)
// e.g. 3 gold + 4 silver + 2 bronze = 9 + 8 + 2 = 19
// Data comes from GET /company/user/{userId}/skill-verifications
// ---------------------------------------------------------------------------

type BadgeTier = "GOLD" | "SILVER" | "BRONZE";

// UserSkillVerificationResponse shape (mirrors backend DTO)
interface ApplicantVerification {
  verificationId: number;
  skillId: number;
  skillName: string;
  category: string;
  currentBadge: BadgeTier | null;
  attemptCount: number;
  isLocked: boolean;
  lockExpiry: string | null;
  verifiedDate: string | null;
}

function badgeScore(verifications: ApplicantVerification[]): number {
  let gold = 0, silver = 0, bronze = 0;
  for (const v of verifications) {
    if (v.currentBadge === "GOLD")        gold++;
    else if (v.currentBadge === "SILVER") silver++;
    else if (v.currentBadge === "BRONZE") bronze++;
  }
  return gold * 3 + silver * 2 + bronze * 1;
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

const StatusBadge: React.FC<{ status: ApplicationStatus; size?: "sm" | "md" }> = ({ status, size = "md" }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`ja-status-badge ja-status-badge--${size}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span className="ja-status-badge__dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Hook: fetch applicant rich profile
// ---------------------------------------------------------------------------
function useApplicantProfile(userId: number | null): ApplicantRichProfile {
  const [state, setState] = useState<ApplicantRichProfile>({
    profile: null,
    workExperience: [],
    education: [],
    certifications: [],
    projects: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!userId) return;
    setState((p) => ({ ...p, isLoading: true, error: null }));
    get<CompanyUserFullProfileResponse>(`/company/user/${userId}`)
      .then((res) => {
        setState({
          profile: res.profile,
          workExperience: res.workExperiences,
          education: res.educations,
          certifications: res.certifications,
          projects: res.projects,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        setState((p) => ({
          ...p,
          isLoading: false,
          error: err.message || "Failed to load profile",
        }));
      });
  }, [userId]);

  return state;
}

const mapWorkExperience = (w: WorkExperienceResponse) => ({
  jobTitle: w.jobTitle,
  companyName: w.companyName,
  location: w.location ?? undefined,
  startDate: w.startDate,
  endDate: w.endDate ?? undefined,
  description: w.description ?? undefined,
});
const mapEducation = (e: EducationResponse) => ({
  degree: e.degree,
  fieldOfStudy: e.fieldOfStudy,
  institutionName: e.institutionName,
  startDate: e.startDate,
  endDate: e.endDate ?? undefined,
  description: e.description ?? undefined,
});
const mapCertification = (c: CertificationResponse) => ({
  name: c.name,
  issuingOrganization: c.issuingOrganization,
  issueDate: c.issueDate,
  expirationDate: c.expirationDate ?? undefined,
});
const mapProject = (proj: ProjectResponse) => ({
  title: proj.title,
  description: proj.description ?? undefined,
  technologiesUsed: proj.technologiesUsed ?? undefined,
  projectUrl: proj.projectUrl ?? undefined,
  githubUrl: proj.githubUrl ?? undefined,
  startDate: proj.startDate ?? undefined,
  endDate: proj.endDate ?? undefined,
});
// ---------------------------------------------------------------------------
// CV Modal
// ---------------------------------------------------------------------------

const CVModal: React.FC<{
  app: ApplicationResponse;
  onClose: () => void;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  isUpdating: boolean;
  isPriority: boolean;
  allPriorityDone: boolean;
  pendingPriorityCount: number;
}> = ({ app, onClose, onStatusChange, isUpdating, isPriority, allPriorityDone, pendingPriorityCount }) => {
  const rich = useApplicantProfile(app.userId);
  const [actionLoading, setActionLoading] = useState<ApplicationStatus | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const p = rich.profile;
  const initials = getInitials(app.userFullName);
  const level = p ? xpLevel(p.xpBalance) : null;
  const nextStatuses = NEXT_STATUSES[app.status] ?? [];

  const isLocked = !isPriority && !allPriorityDone;

  const handleAction = async (status: ApplicationStatus) => {
    if (isLocked) return;
    setActionLoading(status);
    try {
      await onStatusChange(app.id, status);
    } finally {
      setActionLoading(null);
    }
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      await exportApplicantCvPdf({
        app: {
          userFullName: app.userFullName,
          jobTitle: app.jobTitle,
          appliedAt: app.appliedAt,
          status: app.status,
          prioritySlotRank: app.prioritySlotRank,
        },
        profile: p ? {
          professionalTitle: p.professionalTitle ?? undefined,
          aboutMe: p.aboutMe ?? undefined,
          email: p.email ?? undefined,
          phoneNumber: p.phoneNumber ?? undefined,
          city: p.city ?? undefined,
          country: p.country ?? undefined,
          xpBalance: p.xpBalance,
          linkedinUrl: p.linkedinUrl ?? undefined,
          githubUrl: p.githubUrl ?? undefined,
          portfolioUrl: p.portfolioUrl ?? undefined,
        } : null,
        workExperience: rich.workExperience.map(mapWorkExperience),
        education: rich.education.map(mapEducation),
        certifications: rich.certifications.map(mapCertification),
        projects: rich.projects.map(mapProject),
      });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExportingPdf(false);
    }
  }, [app, p, rich]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="cv-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cv-modal">

        {/* TOP BAR */}
        <div className="cv-modal__topbar">
          <div className="cv-modal__topbar-left">
            <button className="cv-close-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={14} label="Close" /></button>
            <span className="cv-modal__topbar-label">
              Applicant CV
              {isPriority && (
                <span className={`cv-modal__topbar-priority cv-modal__topbar-priority--rank${app.prioritySlotRank}`}>
                  {app.prioritySlotRank === 1 ? <span className="ja-inline-icon-text"><Icon name="trophy" size={12} label="" /> 1st Priority — Auto-surfaced</span>
                    : app.prioritySlotRank === 2 ? <span className="ja-inline-icon-text"><Icon name="badge-silver" size={12} label="" /> 2nd Priority — Must Review</span>
                      : <span className="ja-inline-icon-text"><Icon name="badge-bronze" size={12} label="" /> 3rd Priority</span>}
                </span>
              )}
            </span>
          </div>
          <div className="cv-modal__topbar-actions">
            <StatusBadge status={app.status} size="md" />

            {/* ── Export CV as PDF ── */}
            <button
              className="cv-export-btn"
              onClick={handleExportPdf}
              disabled={isExportingPdf || rich.isLoading}
              title="Download this applicant's CV as PDF"
            >
              {isExportingPdf
                ? <><span className="cv-spinner" /> Exporting…</>
                : <>⬇ Export CV</>}
            </button>

            {/* Locked state */}
            {isLocked && nextStatuses.length > 0 && app.status !== "WITHDRAWN" && (
              <div className="cv-locked-notice">
                <span className="ja-inline-icon-text"><Icon name="locked" size={14} label="" /> Review {pendingPriorityCount} priority applicant{pendingPriorityCount !== 1 ? "s" : ""} first</span>
              </div>
            )}
            {/* Actions */}
            {!isLocked && nextStatuses.length > 0 && app.status !== "WITHDRAWN" && (
              <div className="cv-action-group">
                {nextStatuses.map((s) => {
                  const busy = isUpdating || actionLoading === s;
                  const isShortlist = s === "SHORTLISTED";
                  const isReject = s === "REJECTED";
                  return (
                    <button
                      key={s}
                      className={`cv-action-btn ${isShortlist ? "cv-action-btn--shortlist" : isReject ? "cv-action-btn--reject" : "cv-action-btn--ghost"}`}
                      onClick={() => handleAction(s)}
                      disabled={isUpdating}
                    >
                      {busy
                        ? <span className="cv-spinner" />
                        : <><Icon name={isShortlist ? "check" : "close"} size={12} label="" /> {STATUS_CONFIG[s].label}</>
                      }
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="cv-modal__body">

          {/* SIDEBAR */}
          <aside className="cv-sidebar">
            <div className="cv-sidebar__identity">
              <div className="cv-sidebar__avatar">
                {p?.profilePicture
                  ? <img src={p.profilePicture} alt={app.userFullName} className="cv-sidebar__avatar-img" />
                  : <span className="cv-sidebar__avatar-initials">{initials}</span>
                }
              </div>
              <h2 className="cv-sidebar__name">{app.userFullName}</h2>
              {p?.professionalTitle && <p className="cv-sidebar__title">{p.professionalTitle}</p>}
              {level && p && (
                <div className="cv-sidebar__level">
                  <span className="cv-sidebar__level-badge" style={{ color: level.color, borderColor: level.color, background: `${level.color}18` }}>
                    Lv.{level.level} {level.title}
                  </span>
                  <span className="cv-sidebar__xp">{p.xpBalance.toLocaleString()} XP</span>
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="cv-sidebar__section">
              <h3 className="cv-sidebar__section-title">Contact</h3>
              <ul className="cv-sidebar__contact-list">
                {p?.email && (
                  <li className="cv-sidebar__contact-item">
                    <span className="cv-sidebar__contact-icon"><Icon name="contact" size={14} label="" /></span>
                    <a href={`mailto:${p.email}`} className="cv-sidebar__contact-val cv-sidebar__contact-val--link">{p.email}</a>
                  </li>
                )}
                {p?.phoneNumber && (
                  <li className="cv-sidebar__contact-item">
                    <span className="cv-sidebar__contact-icon"><Icon name="contact" size={14} label="" /></span>
                    <span className="cv-sidebar__contact-val">{p.phoneNumber}</span>
                  </li>
                )}
                {(p?.city || p?.country) && (
                  <li className="cv-sidebar__contact-item">
                    <span className="cv-sidebar__contact-icon"><Icon name="location" size={14} label="" /></span>
                    <span className="cv-sidebar__contact-val">{[p.city, p.country].filter(Boolean).join(", ")}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Links */}
            {(p?.linkedinUrl || p?.githubUrl || p?.portfolioUrl) && (
              <div className="cv-sidebar__section">
                <h3 className="cv-sidebar__section-title">Links</h3>
                <div className="cv-sidebar__links">
                  {p?.linkedinUrl && (
                    <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="cv-sidebar__link cv-sidebar__link--linkedin">
                      <span className="cv-sidebar__link-icon">in</span>LinkedIn<span className="cv-sidebar__link-arrow">↗</span>
                    </a>
                  )}
                  {p?.githubUrl && (
                    <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="cv-sidebar__link">
                      <span className="cv-sidebar__link-icon">⌥</span>GitHub<span className="cv-sidebar__link-arrow">↗</span>
                    </a>
                  )}
                  {p?.portfolioUrl && (
                    <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer" className="cv-sidebar__link">
                      <span className="cv-sidebar__link-icon"><Icon name="portfolio" size={14} label="" /></span>Portfolio<span className="cv-sidebar__link-arrow">↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Application info */}
            <div className="cv-sidebar__section cv-sidebar__app-card">
              <h3 className="cv-sidebar__section-title">Application</h3>
              <div className="cv-sidebar__app-rows">
                <div className="cv-sidebar__app-row">
                  <span className="cv-sidebar__app-lbl">Position</span>
                  <span className="cv-sidebar__app-val">{app.jobTitle}</span>
                </div>
                <div className="cv-sidebar__app-row">
                  <span className="cv-sidebar__app-lbl">Applied</span>
                  <span className="cv-sidebar__app-val">{fmtDate(app.appliedAt)}</span>
                </div>
                {app.prioritySlotRank && (
                  <div className="cv-sidebar__app-row">
                    <span className="cv-sidebar__app-lbl">Slot</span>
                    <span className={`cv-sidebar__priority cv-sidebar__priority--rank${app.prioritySlotRank}`}>
                      {app.prioritySlotRank === 1
                        ? <span className="ja-inline-icon-text"><Icon name="trophy" size={12} label="" /> 1st Priority</span>
                        : app.prioritySlotRank === 2
                          ? <span className="ja-inline-icon-text"><Icon name="badge-silver" size={12} label="" /> 2nd Priority</span>
                          : <span className="ja-inline-icon-text"><Icon name="badge-bronze" size={12} label="" /> 3rd Priority</span>}
                    </span>
                  </div>
                )}
                <div className="cv-sidebar__app-row">
                  <span className="cv-sidebar__app-lbl">Status</span>
                  <StatusBadge status={app.status} size="sm" />
                </div>
              </div>
            </div>

            {p?.createdAt && (
              <p className="cv-sidebar__member-since">Member since {fmtMonthYear(p.createdAt)}</p>
            )}
          </aside>

          {/* MAIN CONTENT */}
          <main className="cv-main">

            {rich.isLoading && (
              <div className="cv-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="cv-loading__section">
                    <div className="cv-skel" style={{ height: 13, width: "28%", marginBottom: 16 }} />
                    <div className="cv-skel" style={{ height: 16, width: "65%" }} />
                    <div className="cv-skel" style={{ height: 12, width: "45%", marginTop: 8 }} />
                    <div className="cv-skel" style={{ height: 12, width: "80%", marginTop: 8 }} />
                  </div>
                ))}
              </div>
            )}

            {!rich.isLoading && !p && (
              <div className="cv-empty">
                <div className="cv-empty__icon"><Icon name="question-personal" size={40} label="" /></div>
                <p className="cv-empty__title">Profile not available</p>
                <p className="cv-empty__sub">This applicant hasn't completed their profile yet.</p>
              </div>
            )}

            {!rich.isLoading && p && (
              <>
                {/* About */}
                {p.aboutMe && (
                  <section className="cv-section">
                    <h3 className="cv-section__title"><span className="cv-section__line" />About</h3>
                    <p className="cv-about">{p.aboutMe}</p>
                  </section>
                )}

                {/* Work Experience */}
                {rich.workExperience.length > 0 && (
                  <section className="cv-section">
                    <h3 className="cv-section__title"><span className="cv-section__line" />Work Experience</h3>
                    <div className="cv-timeline">
                      {rich.workExperience.map((w, i) => (
                        <div key={w.id} className="cv-timeline__item">
                          <div className="cv-timeline__marker">
                            <div className="cv-timeline__dot" />
                            {i < rich.workExperience.length - 1 && <div className="cv-timeline__line" />}
                          </div>
                          <div className="cv-timeline__content">
                            <div className="cv-timeline__header">
                              <div>
                                <div className="cv-timeline__role">{w.jobTitle}</div>
                                <div className="cv-timeline__org">
                                  {w.companyName}
                                  {w.location && <span className="cv-timeline__loc"> · {w.location}</span>}
                                </div>
                              </div>
                              <span className="cv-timeline__period">
                                {fmtMonthYear(w.startDate)} — {w.endDate ? fmtMonthYear(w.endDate) : "Present"}
                              </span>
                            </div>
                            {w.description && <p className="cv-desc">{w.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education */}
                {rich.education.length > 0 && (
                  <section className="cv-section">
                    <h3 className="cv-section__title"><span className="cv-section__line" />Education</h3>
                    <div className="cv-edu-list">
                      {rich.education.map((e) => (
                        <div key={e.id} className="cv-edu-item">
                          <div className="cv-edu-item__years">
                            <span>{fmtYear(e.startDate)}</span>
                            <span className="cv-edu-item__sep">—</span>
                            <span>{e.endDate ? fmtYear(e.endDate) : "Now"}</span>
                          </div>
                          <div className="cv-edu-item__body">
                            <div className="cv-edu-item__degree">{e.degree}</div>
                            <div className="cv-edu-item__field">{e.fieldOfStudy}</div>
                            <div className="cv-edu-item__inst"><span className="ja-inline-icon-text"><Icon name="education" size={14} label="" /> {e.institutionName}</span></div>
                            {e.description && <p className="cv-desc" style={{ marginTop: 6 }}>{e.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Projects */}
                {rich.projects.length > 0 && (
                  <section className="cv-section">
                    <h3 className="cv-section__title"><span className="cv-section__line" />Projects</h3>
                    <div className="cv-project-grid">
                      {rich.projects.map((proj) => (
                        <div key={proj.id} className="cv-project-card">
                          <div className="cv-project-card__header">
                            <span className="cv-project-card__name">{proj.title}</span>
                            <div className="cv-project-card__links">
                              {proj.projectUrl && (
                                <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="cv-ext-link"><Icon name="portfolio" size={12} label="" /> Live</a>
                              )}
                              {proj.githubUrl && (
                                <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="cv-ext-link">⌥ Code</a>
                              )}
                            </div>
                          </div>
                          {proj.description && <p className="cv-project-card__desc">{proj.description}</p>}
                          {proj.technologiesUsed && (
                            <div className="cv-project-card__tech">
                              {proj.technologiesUsed.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                                <span key={t} className="cv-tech-chip">{t}</span>
                              ))}
                            </div>
                          )}
                          {(proj.startDate || proj.endDate) && (
                            <div className="cv-project-card__period">
                              {proj.startDate ? fmtMonthYear(proj.startDate) : ""}
                              {proj.endDate ? ` — ${fmtMonthYear(proj.endDate)}` : proj.startDate ? " — Present" : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Certifications */}
                {rich.certifications.length > 0 && (
                  <section className="cv-section">
                    <h3 className="cv-section__title"><span className="cv-section__line" />Certifications</h3>
                    <div className="cv-cert-list">
                      {rich.certifications.map((c) => (
                        <div key={c.id} className="cv-cert-item">
                          <span className="cv-cert-item__icon"><Icon name="badge" size={16} label="" /></span>
                          <div className="cv-cert-item__body">
                            <div className="cv-cert-item__name">{c.name}</div>
                            <div className="cv-cert-item__org">{c.issuingOrganization}</div>
                            <div className="cv-cert-item__date">
                              Issued {fmtMonthYear(c.issueDate)}
                              {c.expirationDate && ` · Expires ${fmtMonthYear(c.expirationDate)}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Applicant Row Card
// ---------------------------------------------------------------------------

const ApplicantCard: React.FC<{
  app: ApplicationResponse;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  isUpdating: boolean;
  isLocked: boolean;
  isBeforeDeadline: boolean;
  onViewCV: () => void;
}> = ({ app, onStatusChange, isUpdating, isLocked, isBeforeDeadline, onViewCV }) => {
  const initials = getInitials(app.userFullName);
  const nextStatuses = NEXT_STATUSES[app.status] ?? [];
  const canAct = nextStatuses.length > 0 && app.status !== "WITHDRAWN" && !isLocked && !isBeforeDeadline;

  return (
    <div className={`ja-row ${app.status === "WITHDRAWN" ? "ja-row--withdrawn" : ""} ${app.prioritySlotRank ? `ja-row--priority ja-row--priority-rank${app.prioritySlotRank}` : ""} ${isLocked ? "ja-row--locked" : ""} ${isBeforeDeadline ? "ja-row--pre-deadline" : ""}`}>
      {app.prioritySlotRank && (
        <div className={`ja-row__priority-strip ja-row__priority-strip--rank${app.prioritySlotRank}`}>
          <span>{app.prioritySlotRank === 1 ? <span className="ja-inline-icon-text"><Icon name="trophy" size={14} label="" /></span> : app.prioritySlotRank === 2 ? <span className="ja-inline-icon-text"><Icon name="badge-silver" size={14} label="" /></span> : <span className="ja-inline-icon-text"><Icon name="badge-bronze" size={14} label="" /></span>}</span>
          <span>
            {app.prioritySlotRank === 1 ? "1st Priority" : app.prioritySlotRank === 2 ? "2nd Priority" : "3rd Priority"}
          </span>
          {app.prioritySlotRank === 1 && (
            <span className="ja-row__priority-strip__perk">Auto-surfaced · Top pick</span>
          )}
          {app.prioritySlotRank === 2 && (
            <span className="ja-row__priority-strip__perk">Must Review</span>
          )}
          <span className="ja-row__priority-strip__reviewed">
            {app.status !== "PENDING" ? <span className="ja-inline-icon-text"><Icon name="check" size={12} label="" /> Reviewed</span> : "Pending review"}
          </span>
        </div>
      )}
      <div className="ja-row__inner">
        <button
          className={`ja-row__avatar ${isBeforeDeadline ? "ja-row__avatar--locked" : ""}`}
          onClick={onViewCV}
          title={isBeforeDeadline ? "CV available after deadline" : "View CV"}
          disabled={isBeforeDeadline}
        >{initials}</button>
        <div className="ja-row__info">
          <button
            className="ja-row__name"
            onClick={onViewCV}
            disabled={isBeforeDeadline}
          >{app.userFullName}</button>
          <div className="ja-row__meta">
            <span className="ja-row__date">Applied {fmtDate(app.appliedAt)}</span>
          </div>
        </div>
        <StatusBadge status={app.status} size="md" />
        <div className="ja-row__actions">
          {isBeforeDeadline ? (
            <span className="ja-row__deadline-lock">
              <span className="ja-inline-icon-text"><Icon name="locked" size={12} label="" /> Available after deadline</span>
            </span>
          ) : (
            <>
              {canAct && nextStatuses.map((s) => {
                const isShortlist = s === "SHORTLISTED";
                const isReject = s === "REJECTED";
                return (
                  <button
                    key={s}
                    className={`ja-row__quick-btn ${isShortlist ? "ja-row__quick-btn--shortlist" : isReject ? "ja-row__quick-btn--reject" : ""}`}
                    onClick={() => onStatusChange(app.id, s)}
                    disabled={isUpdating}
                    title={STATUS_CONFIG[s].label}
                  >
                    {isUpdating
                      ? <span className="ja-spinner" />
                      : isShortlist ? <Icon name="check" size={12} label="" /> : <Icon name="close" size={12} label="" />
                    }
                  </button>
                );
              })}
              <button className="ja-row__cv-btn" onClick={onViewCV}>View CV →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PriorityCard — horizontal card shown in the post-deadline priority grid
// ---------------------------------------------------------------------------

const PRIORITY_RANK_CONFIG = {
  1: {
    icon: "🥇",
    label: "1st Priority",
    perk: "CV opens automatically · Can't skip",
    borderColor: "rgba(252,211,77,.55)",
    glowColor: "rgba(252,211,77,.12)",
    stripGradient: "linear-gradient(90deg,#B45309,#FCD34D,#B45309)",
    textColor: "#FCD34D",
    bgColor: "rgba(252,211,77,.06)",
  },
  2: {
    icon: "🥈",
    label: "2nd Priority",
    perk: "Must Review before dismiss",
    borderColor: "rgba(96,165,250,.45)",
    glowColor: "rgba(96,165,250,.08)",
    stripGradient: "linear-gradient(90deg,#1D4ED8,#93C5FD)",
    textColor: "#93C5FD",
    bgColor: "rgba(96,165,250,.05)",
  },
  3: {
    icon: "🥉",
    label: "3rd Priority",
    perk: "Priority section · Priority strip badge",
    borderColor: "rgba(245,158,11,.35)",
    glowColor: "rgba(245,158,11,.06)",
    stripGradient: "linear-gradient(90deg,#D97706,#FCD34D)",
    textColor: "#F59E0B",
    bgColor: "rgba(245,158,11,.04)",
  },
} as const;

const PriorityCard: React.FC<{
  app: ApplicationResponse;
  onViewCV: () => void;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  isUpdating: boolean;
  isViewed: boolean;
}> = ({ app, onViewCV, onStatusChange, isUpdating, isViewed }) => {
  const rank = (app.prioritySlotRank ?? 3) as 1 | 2 | 3;
  const cfg = PRIORITY_RANK_CONFIG[rank];
  const initials = getInitials(app.userFullName);
  const nextStatuses = NEXT_STATUSES[app.status] ?? [];
  const canAct = nextStatuses.length > 0 && app.status !== "WITHDRAWN";
  const reviewed = app.status !== "PENDING";

  return (
    <div
      className="ja-priority-card"
      style={{
        borderColor: cfg.borderColor,
        boxShadow: `0 0 0 1px ${cfg.glowColor}, 0 4px 24px ${cfg.glowColor}`,
        background: `var(--color-bg-surface)`,
      }}
    >
      {/* Top gradient strip */}
      <div className="ja-priority-card__strip" style={{ background: cfg.stripGradient }} />

      {/* Rank badge */}
      <div className="ja-priority-card__rank-badge" style={{ color: cfg.textColor, borderColor: cfg.borderColor, background: cfg.bgColor }}>
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </div>

      {/* Avatar + identity */}
      <div className="ja-priority-card__identity">
        <div className="ja-priority-card__avatar">{initials}</div>
        <div className="ja-priority-card__name">{app.userFullName}</div>
        <div className="ja-priority-card__date">Applied {fmtDate(app.appliedAt)}</div>
      </div>

      {/* Perk description */}
      <div className="ja-priority-card__perk" style={{ color: cfg.textColor }}>
        {cfg.perk}
      </div>

      {/* Status */}
      <div className="ja-priority-card__status-row">
        <StatusBadge status={app.status} size="sm" />
        {reviewed && <span className="ja-priority-card__reviewed">✓ Reviewed</span>}
      </div>

      {/* Actions */}
      <div className="ja-priority-card__actions">
        <button
          className="ja-priority-card__cv-btn"
          style={{ borderColor: cfg.borderColor, color: cfg.textColor, background: cfg.bgColor }}
          onClick={onViewCV}
        >
          {rank === 1 && !isViewed ? "📋 View CV (Required)" : "View CV →"}
        </button>
        {canAct && (
          <div className="ja-priority-card__quick-actions">
            {nextStatuses.map((s) => {
              const isShortlist = s === "SHORTLISTED";
              return (
                <button
                  key={s}
                  className={`ja-row__quick-btn ${isShortlist ? "ja-row__quick-btn--shortlist" : "ja-row__quick-btn--reject"}`}
                  onClick={() => onStatusChange(app.id, s)}
                  disabled={isUpdating}
                  title={STATUS_CONFIG[s].label}
                >
                  {isUpdating
                    ? <span className="ja-spinner" />
                    : isShortlist ? <Icon name="check" size={12} label="" /> : <Icon name="close" size={12} label="" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// JobApplicantsPage
// ---------------------------------------------------------------------------

const JobApplicantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const jobIdNum = jobId ? Number(jobId) : null;

  const { jobs } = useCompanyJobs();
  const { applications, isLoading, error, updateStatus } = useJobApplicants(jobIdNum);
  const job = jobs.find((j) => j.id === jobIdNum);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [cvApp, setCvApp] = useState<ApplicationResponse | null>(null);

  // ── Split applications into priority vs regular ────────────────────────
  const { priorityApps, regularApps } = useMemo(() => {
    const sorted = [...applications].sort((a, b) => {
      // Priority applicants always come before regular ones
      if (a.prioritySlotRank && !b.prioritySlotRank) return -1;
      if (!a.prioritySlotRank && b.prioritySlotRank) return 1;
      // Among priority applicants: rank 1 (most expensive) comes first
      if (a.prioritySlotRank && b.prioritySlotRank) return a.prioritySlotRank - b.prioritySlotRank;
      // Regular applicants: insertion order preserved here;
      // badge-score sort happens in profileFilteredRegularApps once verifications load
      return 0;
    });
    return {
      priorityApps: sorted.filter((a) => a.prioritySlotRank !== null),
      regularApps: sorted.filter((a) => a.prioritySlotRank === null),
    };
  }, [applications]);

  const allPriorityDone = useMemo(() =>
    priorityApps.every((a) => a.status !== "PENDING"), [priorityApps]);

  const pendingPriorityCount = useMemo(() =>
    priorityApps.filter((a) => a.status === "PENDING").length, [priorityApps]);

  // ── Profile filter for regular applicants ────────────────────────────────
  // Cache of fetched skill verifications for regular applicants (userId → verifications)
  const [regularVerifications, setRegularVerifications] = useState<Record<number, ApplicantVerification[]>>({});

  // Fetch skill verifications for all regular applicants (used for badge-score sorting)
  useEffect(() => {
    if (regularApps.length === 0) return;
    regularApps.forEach((app) => {
      if (!(app.userId in regularVerifications)) {
        setRegularVerifications((prev) => ({ ...prev, [app.userId]: [] }));
        get<ApplicantVerification[]>(`/company/user/${app.userId}/skill-verifications`)
          .then((res) => setRegularVerifications((prev) => ({ ...prev, [app.userId]: res })))
          .catch(() => setRegularVerifications((prev) => ({ ...prev, [app.userId]: [] })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regularApps]);

  const profileFilteredRegularApps = useMemo(() => {
    // Sort by badge score descending: (goldCount×3) + (silverCount×2) + (bronzeCount×1)
    // Falls back to status weight when scores are tied.
    return [...regularApps].sort((a, b) => {
      const scoreA = badgeScore(regularVerifications[a.userId] ?? []);
      const scoreB = badgeScore(regularVerifications[b.userId] ?? []);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (STATUS_WEIGHT[a.status] ?? 9) - (STATUS_WEIGHT[b.status] ?? 9);
    });
  }, [regularApps, regularVerifications]);

  // Deadline gate: CV and actions are locked until the job deadline has passed
  const isBeforeDeadline = useMemo(() => {
    if (!job?.deadline) return false;
    return new Date(job.deadline) > new Date();
  }, [job?.deadline]);

  // ── Rank-1 auto-open: ONLY after deadline, automatically open the CV of the
  // rank-1 priority applicant (if pending). Before deadline nothing opens.
  const autoOpenedRef = React.useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (isLoading) return;
    if (isBeforeDeadline) return;          // ← deadline gate
    const rank1 = priorityApps.find((a) => a.prioritySlotRank === 1 && a.status === "PENDING");
    if (rank1) {
      autoOpenedRef.current = true;
      setCvApp(rank1);
    }
  }, [isLoading, priorityApps, isBeforeDeadline]);

  const filtered = useMemo(() => {
    const all = [...priorityApps, ...regularApps];
    return filterStatus === "ALL" ? all : all.filter((a) => a.status === filterStatus);
  }, [priorityApps, regularApps, filterStatus]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ApplicationStatus | "ALL", number>> = { ALL: applications.length };
    for (const a of applications) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [applications]);

  const handleStatusChange = useCallback(async (id: number, status: ApplicationStatus) => {
    setUpdateError(null);
    setUpdatingId(id);
    try {
      await updateStatus(id, status);
      setCvApp((prev) => prev?.id === id ? { ...prev, status } : prev);
    } catch (err: unknown) {
      setUpdateError((err as Error).message ?? "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }, [updateStatus]);

  if (isLoading) {
    return (
      <CompanyPageLayout pageTitle="Applicants">
        <div className="ja-skeleton-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ja-skeleton-row">
              <div className="cv-skel ja-skeleton-avatar" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="cv-skel" style={{ height: 16, width: "45%" }} />
                <div className="cv-skel" style={{ height: 11, width: "22%" }} />
              </div>
              <div className="cv-skel" style={{ height: 28, width: 96, borderRadius: 20 }} />
              <div className="cv-skel" style={{ height: 36, width: 128, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </CompanyPageLayout>
    );
  }

  return (
    <CompanyPageLayout pageTitle="Job Applicants">

      {/* Page header */}
      <div className="ja-page-header">
        <div className="ja-page-header__left">
          <button className="ja-back-btn" onClick={() => navigate("/company/jobs")}>← Back</button>
          <div>
            <h1 className="ja-page-title">{job?.title ?? "Job Applicants"}</h1>
            <div className="ja-page-header__meta">
              {job?.location && <span className="ja-inline-icon-text"><Icon name="location" size={12} label="" /> {job.location}</span>}
              <span className="ja-inline-icon-text"><Icon name="question-personal" size={14} label="" /> {applications.length} applicant{applications.length !== 1 ? "s" : ""}</span>
              {priorityApps.length > 0 && <span className="ja-page-header__priority">⭐ {priorityApps.length} priority</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat pills */}
      {applications.length > 0 && (
        <div className="ja-stats">
          <button className={`ja-stat-pill ${filterStatus === "ALL" ? "ja-stat-pill--active" : ""}`} onClick={() => setFilterStatus("ALL")}>
            <span className="ja-stat-pill__num">{applications.length}</span>
            <span className="ja-stat-pill__lbl">Total</span>
          </button>
          {(["PENDING", "SHORTLISTED", "REJECTED", "WITHDRAWN"] as ApplicationStatus[]).map((s) => {
            const count = statusCounts[s] ?? 0;
            if (count === 0) return null;
            const cfg = STATUS_CONFIG[s];
            const active = filterStatus === s;
            return (
              <button key={s} className={`ja-stat-pill ${active ? "ja-stat-pill--active" : ""}`}
                style={active ? { borderColor: cfg.border, background: cfg.bg, color: cfg.color } : {}}
                onClick={() => setFilterStatus(active ? "ALL" : s)}>
                <span className="ja-stat-pill__dot" style={{ background: cfg.dot }} />
                <span className="ja-stat-pill__num" style={active ? { color: cfg.color } : {}}>{count}</span>
                <span className="ja-stat-pill__lbl">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {(error || updateError) && (
        <div className="ja-error-banner"><span className="ja-inline-icon-text"><Icon name="warning" size={14} label="" /> {error || updateError}</span></div>
      )}

      {/* Deadline gate banner */}
      {isBeforeDeadline && job?.deadline && (
        <div className="ja-deadline-notice">
          <span className="ja-inline-icon-text"><Icon name="locked" size={16} label="" /></span>
          <div>
            <strong>Applications still open</strong> — CV details and status decisions are locked until the deadline passes.
            <span className="ja-deadline-notice__date"> Deadline: {fmtDate(job.deadline)}</span>
          </div>
        </div>
      )}

      {priorityApps.length > 0 && !allPriorityDone && (
        <div className="ja-priority-notice">
          <span className="ja-inline-icon-text"><Icon name="flag" size={16} label="" /></span>
          <div>
            <strong>Platform Rule:</strong> Review all priority applicants before processing regular applications.
            <span className="ja-priority-notice__count"> {pendingPriorityCount} of {priorityApps.length} priority applicant{priorityApps.length !== 1 ? "s" : ""} still pending.</span>
          </div>
        </div>
      )}
      {priorityApps.length > 0 && allPriorityDone && (
        <div className="ja-priority-done-notice">
          <span className="ja-inline-icon-text"><Icon name="success" size={16} label="" /></span>
          <span>All priority applicants reviewed — regular applications are now unlocked.</span>
        </div>
      )}

      {applications.length === 0 && (
        <div className="ja-empty">
          <div className="ja-empty__icon"><Icon name="work" size={40} label="" /></div>
          <h3 className="ja-empty__title">No applicants yet</h3>
          <p className="ja-empty__sub">Applications will appear here once candidates apply.</p>
        </div>
      )}

      {/* Filter tabs */}
      {applications.length > 0 && (
        <div className="ja-filter-tabs">
          {(["ALL", "PENDING", "SHORTLISTED", "REJECTED", "WITHDRAWN"] as const).map((s) => {
            const count = s === "ALL" ? applications.length : (statusCounts[s] ?? 0);
            if (s !== "ALL" && count === 0) return null;
            const active = filterStatus === s;
            const cfg = s !== "ALL" ? STATUS_CONFIG[s] : null;
            return (
              <button key={s} className={`ja-filter-tab ${active ? "ja-filter-tab--active" : ""}`}
                style={active && cfg ? { color: cfg.color, borderBottomColor: cfg.color } : {}}
                onClick={() => setFilterStatus(s)}>
                {s === "ALL" ? "All" : cfg!.label}
                <span className="ja-filter-tab__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Priority group */}
      {filterStatus === "ALL" && priorityApps.length > 0 && (
        <div className="ja-group">
          <div className="ja-group__label">
            <span>⭐</span> Priority Applications
            <span className="ja-group__count">{priorityApps.length}</span>
            {allPriorityDone
              ? <span className="ja-group__done-badge"><span className="ja-inline-icon-text">All reviewed <Icon name="check" size={12} label="" /></span></span>
              : <span className="ja-group__pending-badge">{pendingPriorityCount} pending</span>
            }
          </div>

          {/* Post-deadline: show as horizontal priority cards */}
          {!isBeforeDeadline ? (
            <div className="ja-priority-cards-grid">
              {priorityApps.map((app) => (
                <PriorityCard
                  key={app.id}
                  app={app}
                  onViewCV={() => setCvApp(app)}
                  onStatusChange={handleStatusChange}
                  isUpdating={updatingId === app.id}
                  isViewed={app.status !== "PENDING"}
                />
              ))}
            </div>
          ) : (
            /* Pre-deadline: show as regular rows (locked) */
            <div className="ja-list">
              {priorityApps.map((app) => (
                <ApplicantCard key={app.id} app={app}
                  onStatusChange={handleStatusChange}
                  isUpdating={updatingId === app.id}
                  isLocked={false}
                  isBeforeDeadline={isBeforeDeadline}
                  onViewCV={() => { if (!isBeforeDeadline) setCvApp(app); }}
                  
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regular group */}
      {filterStatus === "ALL" && regularApps.length > 0 && (
        <div className="ja-group">
          <div className="ja-group__label">
            <span className="ja-inline-icon-text"><Icon name="question-personal" size={16} label="" /></span> Regular Applications
            <span className="ja-group__count">{regularApps.length}</span>
            {priorityApps.length > 0 && !allPriorityDone && (
              <span className="ja-group__locked-note"><span className="ja-inline-icon-text"><Icon name="locked" size={12} label="" /> Review priority first</span></span>
            )}
            {(!priorityApps.length || allPriorityDone) && regularApps.length > 0 && (
              <span className="ja-group__badge-sort-note">🏅 Sorted highest to lowest badge strength</span>
            )}
          </div>

          <div className={`ja-list ${priorityApps.length > 0 && !allPriorityDone ? "ja-list--locked" : ""}`}>
            {profileFilteredRegularApps.map((app) => (
                <ApplicantCard key={app.id} app={app}
                  onStatusChange={handleStatusChange}
                  isUpdating={updatingId === app.id}
                  isLocked={priorityApps.length > 0 && !allPriorityDone}
                  isBeforeDeadline={isBeforeDeadline}
                  onViewCV={() => { if (!isBeforeDeadline) setCvApp(app); }}
                  
                />
              ))
            }
            {priorityApps.length > 0 && !allPriorityDone && (
              <div className="ja-list__lock-cover">
                <div className="ja-lock-cover__inner">
                  <span className="ja-lock-cover__icon"><Icon name="locked" size={32} label="" /></span>
                  <p className="ja-lock-cover__title">
                    {pendingPriorityCount} priority applicant{pendingPriorityCount !== 1 ? "s" : ""} still pending review
                  </p>
                  <p className="ja-lock-cover__sub">
                    Platform rules require all priority applicants to be reviewed before regular applications are processed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtered view */}
      {filterStatus !== "ALL" && (
        <div className="ja-list">
          {filtered.length === 0 ? (
            <div className="ja-empty" style={{ padding: "48px 24px" }}>
              <div className="ja-empty__icon"><Icon name="search" size={40} label="" /></div>
              <h3 className="ja-empty__title">No {STATUS_CONFIG[filterStatus as ApplicationStatus]?.label ?? filterStatus} applications</h3>
            </div>
          ) : filtered.map((app) => (
            <ApplicantCard key={app.id} app={app}
              onStatusChange={handleStatusChange}
              isUpdating={updatingId === app.id}
              isLocked={!app.prioritySlotRank && priorityApps.length > 0 && !allPriorityDone}
              isBeforeDeadline={isBeforeDeadline}
              onViewCV={() => { if (!isBeforeDeadline) setCvApp(app); }}
              
            />
          ))}
        </div>
      )}

      {/* CV Modal */}
      {cvApp && (
        <CVModal
          app={cvApp}
          onClose={() => setCvApp(null)}
          onStatusChange={handleStatusChange}
          isUpdating={updatingId === cvApp.id}
          isPriority={!!cvApp.prioritySlotRank}
          allPriorityDone={allPriorityDone}
          pendingPriorityCount={pendingPriorityCount}
        />
      )}

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* ─── Inline icon + text utility ─── */
  .ja-inline-icon-text { display:inline-flex; align-items:center; gap:5px; vertical-align:middle; }

  /* ─── Priority cards grid (post-deadline) ─── */
  .ja-priority-cards-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-bottom:8px; }
  @media (max-width:900px) { .ja-priority-cards-grid { grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); } }
  @media (max-width:600px) { .ja-priority-cards-grid { grid-template-columns:1fr; } }

  .ja-priority-card { border:1px solid; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; gap:12px; padding:16px; transition:all 160ms; position:relative; }
  .ja-priority-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,.22) !important; }
  .ja-priority-card__strip { height:3px; margin:-16px -16px 0; }
  .ja-priority-card__rank-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:999px; border:1px solid; font-family:var(--font-mono); font-size:10px; font-weight:var(--weight-bold); align-self:flex-start; margin-top:4px; }
  .ja-priority-card__identity { display:flex; flex-direction:column; align-items:center; gap:6px; padding:8px 0; }
  .ja-priority-card__avatar { width:52px; height:52px; border-radius:50%; background:var(--color-bg-overlay); border:2px solid var(--color-border-default); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:16px; font-weight:var(--weight-bold); color:var(--color-text-secondary); flex-shrink:0; }
  .ja-priority-card__name { font-family:var(--font-display); font-size:15px; font-weight:var(--weight-semibold); color:var(--color-text-primary); text-align:center; }
  .ja-priority-card__date { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); }
  .ja-priority-card__perk { font-family:var(--font-mono); font-size:10px; text-align:center; opacity:.85; padding:4px 8px; border-radius:8px; background:rgba(255,255,255,.04); }
  .ja-priority-card__status-row { display:flex; align-items:center; justify-content:center; gap:8px; }
  .ja-priority-card__reviewed { font-family:var(--font-mono); font-size:10px; color:#34D399; }
  .ja-priority-card__actions { display:flex; flex-direction:column; gap:8px; margin-top:auto; }
  .ja-priority-card__cv-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 14px; border-radius:10px; border:1px solid; font-size:13px; font-family:var(--font-body); font-weight:var(--weight-semibold); cursor:pointer; transition:all 130ms; }
  .ja-priority-card__cv-btn:hover { opacity:.85; transform:scale(1.02); }
  .ja-priority-card__quick-actions { display:flex; align-items:center; justify-content:center; gap:8px; }

  /* ─── Badge sort label ─── */
  .ja-group__badge-sort-note { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); margin-left:4px; padding:1px 8px; border-radius:999px; background:var(--color-bg-overlay); border:1px solid var(--color-border-subtle); }
  .ja-profile-chip--active .ja-profile-chip__count { background:rgba(167,139,250,.18); color:var(--color-primary-400,#A78BFA); }

  /* ─── Page header ─── */
  .ja-page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
  .ja-page-header__left { display:flex; align-items:flex-start; gap:16px; }
  .ja-back-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:var(--radius-lg,10px); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:var(--text-sm,13px); color:var(--color-text-secondary); cursor:pointer; white-space:nowrap; transition:all 130ms; font-family:var(--font-body); }
  .ja-back-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .ja-page-title { font-family:var(--font-display); font-size:var(--text-2xl,22px); font-weight:var(--weight-bold); color:var(--color-text-primary); margin:0 0 4px; }
  .ja-page-header__meta { display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); }
  .ja-page-header__meta > span { display:inline-flex; align-items:center; gap:4px; }
  .ja-page-header__priority { color:#F59E0B; }

  /* ─── Stat pills ─── */
  .ja-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
  .ja-stat-pill { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:999px; border:1px solid var(--color-border-subtle); background:var(--color-bg-surface); cursor:pointer; transition:all 140ms; font-family:var(--font-body); color:var(--color-text-secondary); }
  .ja-stat-pill:hover { border-color:var(--color-border-strong); }
  .ja-stat-pill--active { border-color:var(--color-border-strong); background:var(--color-bg-hover); color:var(--color-text-primary); }
  .ja-stat-pill__dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .ja-stat-pill__num { font-family:var(--font-display); font-size:15px; font-weight:var(--weight-bold); color:var(--color-text-primary); line-height:1; }
  .ja-stat-pill__lbl { font-size:12px; }

  /* ─── Errors / notices ─── */
  .ja-error-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:var(--radius-lg,10px); background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.25); color:#F87171; font-size:var(--text-sm,13px); margin-bottom:16px; }
  .ja-priority-notice { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:var(--radius-lg,10px); background:rgba(245,158,11,.07); border:1px solid rgba(245,158,11,.22); font-size:var(--text-sm,13px); color:var(--color-text-secondary); margin-bottom:20px; }
  .ja-priority-notice strong { color:#F59E0B; }
  .ja-priority-notice__count { color:#F59E0B; font-weight:600; }
  .ja-priority-done-notice { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:var(--radius-lg,10px); background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.22); font-size:var(--text-sm,13px); color:var(--color-text-secondary); margin-bottom:20px; }

  /* ─── Filter tabs ─── */
  .ja-filter-tabs { display:flex; gap:0; border-bottom:1px solid var(--color-border-subtle); margin-bottom:24px; overflow-x:auto; }
  .ja-filter-tab { display:flex; align-items:center; gap:6px; padding:10px 18px; border:none; border-bottom:2px solid transparent; background:transparent; font-family:var(--font-body); font-size:var(--text-sm,13px); color:var(--color-text-muted); cursor:pointer; white-space:nowrap; transition:all 130ms; margin-bottom:-1px; }
  .ja-filter-tab:hover { color:var(--color-text-primary); }
  .ja-filter-tab--active { color:var(--color-text-primary); border-bottom-color:var(--color-primary-400,#A78BFA); font-weight:var(--weight-semibold); }
  .ja-filter-tab__count { font-family:var(--font-mono); font-size:10px; padding:1px 6px; background:var(--color-bg-overlay); border-radius:999px; color:var(--color-text-muted); }

  /* ─── Groups ─── */
  .ja-group { margin-bottom:28px; }
  .ja-group__label { display:flex; align-items:center; gap:8px; font-family:var(--font-display); font-size:var(--text-sm,13px); font-weight:var(--weight-semibold); color:var(--color-text-secondary); margin-bottom:12px; }
  .ja-group__count { font-family:var(--font-mono); font-size:11px; padding:1px 8px; background:var(--color-bg-overlay); border-radius:999px; color:var(--color-text-muted); }
  .ja-group__locked-note { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); margin-left:4px; }
  .ja-group__done-badge { font-family:var(--font-mono); font-size:10px; padding:1px 8px; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.25); border-radius:999px; color:#34D399; margin-left:4px; }
  .ja-group__pending-badge { font-family:var(--font-mono); font-size:10px; padding:1px 8px; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.25); border-radius:999px; color:#F59E0B; margin-left:4px; }

  /* ─── List ─── */
  .ja-list { display:flex; flex-direction:column; gap:8px; position:relative; }
  .ja-list--locked { user-select:none; }

  .ja-list__lock-cover { position:absolute; inset:0; z-index:10; background:rgba(10,12,20,.82); backdrop-filter:blur(4px); border-radius:var(--radius-xl,14px); display:flex; align-items:center; justify-content:center; border:1px dashed rgba(245,158,11,.3); }
  .ja-lock-cover__inner { display:flex; flex-direction:column; align-items:center; gap:10px; padding:32px 24px; text-align:center; max-width:360px; }
  .ja-lock-cover__icon { font-size:2rem; }
  .ja-lock-cover__title { font-family:var(--font-display); font-size:15px; font-weight:600; color:#F59E0B; margin:0; }
  .ja-lock-cover__sub { font-size:12px; color:var(--color-text-muted); margin:0; line-height:1.6; }

  /* ─── Applicant row card ─── */
  .ja-row { background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:var(--radius-xl,14px); overflow:hidden; transition:all 150ms; }
  .ja-row:hover { border-color:var(--color-border-strong); box-shadow:0 2px 14px rgba(0,0,0,.16); }
  .ja-row--withdrawn { opacity:.55; }
  .ja-row--priority { border-color:rgba(245,158,11,.28); }
  .ja-row--priority::before { content:""; display:block; height:2px; background:linear-gradient(90deg,#D97706,#FCD34D); }
  /* Rank 1 — gold crown treatment */
  .ja-row--priority-rank1 { border-color:rgba(252,211,77,.45); box-shadow:0 0 0 1px rgba(252,211,77,.15), 0 4px 20px rgba(252,211,77,.08); }
  .ja-row--priority-rank1::before { background:linear-gradient(90deg,#B45309,#FCD34D,#B45309); }
  /* Rank 2 — silver highlight treatment */
  .ja-row--priority-rank2 { border-color:rgba(96,165,250,.35); box-shadow:0 0 0 1px rgba(96,165,250,.1); }
  .ja-row--priority-rank2::before { background:linear-gradient(90deg,#1D4ED8,#93C5FD); }
  /* Rank 3 — standard amber treatment (unchanged) */
  .ja-row--priority-rank3 { }
  .ja-row--locked { opacity:.7; }
  .ja-row__priority-strip { display:flex; align-items:center; gap:6px; padding:5px 16px; background:rgba(245,158,11,.05); font-family:var(--font-mono); font-size:10px; color:#F59E0B; border-bottom:1px solid rgba(245,158,11,.14); }
  /* Rank-1 strip — gold */
  .ja-row__priority-strip--rank1 { background:rgba(252,211,77,.07); border-bottom-color:rgba(252,211,77,.2); color:#FCD34D; }
  /* Rank-2 strip — silver blue */
  .ja-row__priority-strip--rank2 { background:rgba(96,165,250,.06); border-bottom-color:rgba(96,165,250,.18); color:#93C5FD; }
  /* Rank-3 strip — standard amber */
  .ja-row__priority-strip--rank3 { }
  .ja-row__priority-strip__reviewed { margin-left:auto; color:var(--color-text-muted); }
  .ja-row__priority-strip__perk { font-size:9px; padding:1px 6px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); opacity:.85; }
  .ja-row__inner { display:flex; align-items:center; gap:14px; padding:14px 16px; }
  .ja-row__avatar { width:42px; height:42px; border-radius:50%; flex-shrink:0; background:var(--color-bg-overlay); border:1px solid var(--color-border-default); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:14px; font-weight:var(--weight-bold); color:var(--color-text-secondary); cursor:pointer; transition:all 130ms; }
  .ja-row__avatar:hover { border-color:var(--color-primary-500,#7C3AED); color:var(--color-primary-400,#A78BFA); }
  .ja-row__info { flex:1; min-width:0; }
  .ja-row__name { display:block; font-family:var(--font-display); font-size:var(--text-base,15px); font-weight:var(--weight-semibold); color:var(--color-text-primary); background:none; border:none; padding:0; cursor:pointer; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 130ms; }
  .ja-row__name:hover { color:var(--color-primary-400,#A78BFA); }
  .ja-row__date { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); display:block; margin-top:2px; }
  .ja-row__actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .ja-row__cv-btn { padding:7px 14px; border-radius:var(--radius-lg,10px); border:1px solid var(--color-border-default); background:var(--color-bg-base); font-size:var(--text-sm,13px); color:var(--color-text-secondary); cursor:pointer; font-family:var(--font-body); transition:all 130ms; white-space:nowrap; }
  .ja-row__cv-btn:hover { border-color:var(--color-primary-400,#A78BFA); color:var(--color-primary-400,#A78BFA); }

  .ja-row__quick-btn { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid var(--color-border-default); background:var(--color-bg-base); font-size:13px; font-weight:700; cursor:pointer; transition:all 130ms; flex-shrink:0; }
  .ja-row__quick-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ja-row__quick-btn--shortlist { border-color:rgba(52,211,153,.35); color:#34D399; }
  .ja-row__quick-btn--shortlist:hover:not(:disabled) { background:#059669; border-color:#059669; color:#fff; }
  .ja-row__quick-btn--reject { border-color:rgba(248,113,113,.35); color:#F87171; }
  .ja-row__quick-btn--reject:hover:not(:disabled) { background:rgba(248,113,113,.15); }

  /* Status badge */
  .ja-status-badge { display:inline-flex; align-items:center; gap:6px; border-radius:999px; border:1px solid; font-weight:var(--weight-medium); font-family:var(--font-mono); white-space:nowrap; }
  .ja-status-badge--md { padding:4px 12px; font-size:12px; }
  .ja-status-badge--sm { padding:3px 9px; font-size:11px; }
  .ja-status-badge__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  /* Spinner */
  .ja-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.2); border-top-color:currentColor; border-radius:50%; animation:ja-spin .6s linear infinite; display:inline-block; }
  @keyframes ja-spin { to { transform:rotate(360deg); } }

  /* Skeleton */
  .ja-skeleton-wrap { display:flex; flex-direction:column; gap:8px; }
  .ja-skeleton-row { display:flex; align-items:center; gap:14px; padding:16px; background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:14px; }
  .ja-skeleton-avatar { width:42px; height:42px; border-radius:50%; flex-shrink:0; }
  .cv-skel { background:var(--color-bg-overlay); border-radius:var(--radius-md,8px); animation:cv-shimmer 1.4s ease-in-out infinite; }
  @keyframes cv-shimmer { 0%,100%{opacity:.35;} 50%{opacity:.7;} }

  /* Empty */
  .ja-empty { text-align:center; padding:60px 24px; }
  .ja-empty__icon { font-size:3rem; margin-bottom:14px; }
  .ja-empty__title { font-family:var(--font-display); font-size:var(--text-lg,17px); font-weight:var(--weight-semibold); color:var(--color-text-primary); margin:0 0 6px; }
  .ja-empty__sub { font-size:var(--text-sm,13px); color:var(--color-text-muted); margin:0; }

  /* ═════════════════════════════════════════════════════════
     CV MODAL
  ═════════════════════════════════════════════════════════ */
  .cv-overlay { position:fixed; top:var(--navbar-height,60px); left:0; right:0; bottom:var(--bottom-deck-height,64px); z-index:300; background:rgba(4,6,14,.85); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px; animation:cv-fade 160ms ease; }
  @keyframes cv-fade { from{opacity:0;} to{opacity:1;} }

  .cv-modal { width:100%; max-width:1020px; max-height:100%; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:20px; box-shadow:0 40px 100px rgba(0,0,0,.6); display:flex; flex-direction:column; overflow:hidden; animation:cv-in 200ms cubic-bezier(.34,1.2,.64,1); }
  @keyframes cv-in { from{opacity:0;transform:scale(.95) translateY(14px);} to{opacity:1;transform:scale(1) translateY(0);} }

  /* Top bar */
  .cv-modal__topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 20px; border-bottom:1px solid var(--color-border-subtle); background:var(--color-bg-base); flex-shrink:0; flex-wrap:wrap; }
  .cv-modal__topbar-left { display:flex; align-items:center; gap:12px; }
  .cv-close-btn { width:32px; height:32px; border-radius:50%; border:1px solid var(--color-border-default); background:var(--color-bg-surface); color:var(--color-text-muted); font-size:13px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 130ms; flex-shrink:0; }
  .cv-close-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .cv-modal__topbar-label { font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--color-text-muted); display:flex; align-items:center; gap:8px; }
  .cv-modal__topbar-priority { font-family:var(--font-mono); font-size:10px; padding:2px 8px; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.3); border-radius:999px; color:#F59E0B; }
  /* Rank-1 topbar badge — gold */
  .cv-modal__topbar-priority--rank1 { background:rgba(252,211,77,.12); border-color:rgba(252,211,77,.4); color:#FCD34D; }
  /* Rank-2 topbar badge — silver blue */
  .cv-modal__topbar-priority--rank2 { background:rgba(96,165,250,.1); border-color:rgba(96,165,250,.35); color:#93C5FD; }
  /* Rank-3 topbar badge — standard amber (inherits default) */
  .cv-modal__topbar-priority--rank3 { }
  /* Sidebar priority label rank colors */
  .cv-sidebar__priority--rank1 { color:#FCD34D; font-family:var(--font-mono); font-size:11px; font-weight:var(--weight-bold); }
  .cv-sidebar__priority--rank2 { color:#93C5FD; font-family:var(--font-mono); font-size:11px; font-weight:var(--weight-bold); }
  .cv-sidebar__priority--rank3 { color:#F59E0B; font-family:var(--font-mono); font-size:11px; font-weight:var(--weight-bold); }
  .cv-modal__topbar-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .cv-action-group { display:flex; align-items:center; gap:8px; }
  .cv-locked-notice { display:flex; align-items:center; gap:8px; padding:7px 14px; border-radius:var(--radius-lg,10px); background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.25); font-size:12px; color:#F59E0B; font-family:var(--font-mono); white-space:nowrap; }

  /* ── Export CV PDF button ── */
  .cv-export-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:var(--radius-lg,10px); border:1px solid rgba(139,92,246,.35); background:rgba(139,92,246,.08); color:#A78BFA; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.04em; cursor:pointer; transition:all 130ms; white-space:nowrap; flex-shrink:0; }
  .cv-export-btn:hover:not(:disabled) { background:rgba(139,92,246,.14); border-color:rgba(139,92,246,.6); box-shadow:0 0 10px rgba(139,92,246,.18); }
  .cv-export-btn:disabled { opacity:.5; cursor:not-allowed; }

  .cv-action-btn { display:flex; align-items:center; gap:6px; padding:8px 18px; border-radius:var(--radius-lg,10px); border:1px solid; font-size:var(--text-sm,13px); font-family:var(--font-body); font-weight:var(--weight-semibold); cursor:pointer; transition:all 130ms; white-space:nowrap; }
  .cv-action-btn:disabled { opacity:.6; cursor:not-allowed; }
  .cv-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.25); border-top-color:currentColor; border-radius:50%; animation:ja-spin .6s linear infinite; display:inline-block; }
  .cv-action-btn--shortlist { background:#059669; border-color:#059669; color:#fff; }
  .cv-action-btn--shortlist:hover:not(:disabled) { background:#047857; border-color:#047857; }
  .cv-action-btn--reject { background:rgba(248,113,113,.1); border-color:rgba(248,113,113,.32); color:#F87171; }
  .cv-action-btn--reject:hover:not(:disabled) { background:rgba(248,113,113,.18); }
  .cv-action-btn--ghost { background:var(--color-bg-surface); border-color:var(--color-border-default); color:var(--color-text-secondary); }

  /* Body: sidebar + main */
  .cv-modal__body { display:flex; flex:1; overflow:hidden; }

  /* Sidebar */
  .cv-sidebar { width:256px; flex-shrink:0; background:var(--color-bg-base); border-right:1px solid var(--color-border-subtle); overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:22px; }
  .cv-sidebar::-webkit-scrollbar { width:3px; }
  .cv-sidebar::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

  .cv-sidebar__identity { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; }
  .cv-sidebar__avatar { width:80px; height:80px; border-radius:50%; background:var(--color-bg-overlay); border:2px solid var(--color-border-default); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
  .cv-sidebar__avatar-img { width:100%; height:100%; object-fit:cover; }
  .cv-sidebar__avatar-initials { font-family:var(--font-display); font-size:26px; font-weight:var(--weight-bold); color:var(--color-text-secondary); }
  .cv-sidebar__name { font-family:var(--font-display); font-size:17px; font-weight:var(--weight-bold); color:var(--color-text-primary); margin:0; line-height:1.3; }
  .cv-sidebar__title { font-size:12px; color:var(--color-text-secondary); margin:0; line-height:1.4; }
  .cv-sidebar__level { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .cv-sidebar__level-badge { display:inline-flex; align-items:center; padding:3px 12px; border-radius:999px; border:1px solid; font-family:var(--font-mono); font-size:11px; font-weight:var(--weight-bold); }
  .cv-sidebar__xp { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); }

  .cv-sidebar__section { display:flex; flex-direction:column; gap:10px; }
  .cv-sidebar__app-card { background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:12px; padding:14px; }
  .cv-sidebar__section-title { font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:var(--color-text-muted); margin:0; }

  .cv-sidebar__contact-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
  .cv-sidebar__contact-item { display:flex; align-items:flex-start; gap:8px; }
  .cv-sidebar__contact-icon { font-size:13px; flex-shrink:0; margin-top:1px; }
  .cv-sidebar__contact-val { font-size:12px; color:var(--color-text-secondary); word-break:break-all; }
  .cv-sidebar__contact-val--link { color:var(--color-primary-400,#A78BFA); text-decoration:none; }
  .cv-sidebar__contact-val--link:hover { text-decoration:underline; }

  .cv-sidebar__links { display:flex; flex-direction:column; gap:6px; }
  .cv-sidebar__link { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px; border:1px solid var(--color-border-subtle); background:var(--color-bg-surface); font-size:12px; color:var(--color-text-secondary); text-decoration:none; transition:all 130ms; }
  .cv-sidebar__link:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .cv-sidebar__link--linkedin { border-color:rgba(10,102,194,.25); color:#0a66c2; }
  .cv-sidebar__link-icon { font-size:12px; width:18px; text-align:center; flex-shrink:0; }
  .cv-sidebar__link-arrow { margin-left:auto; color:var(--color-text-muted); font-size:11px; }

  .cv-sidebar__app-rows { display:flex; flex-direction:column; gap:10px; }
  .cv-sidebar__app-row { display:flex; flex-direction:column; gap:2px; }
  .cv-sidebar__app-lbl { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.05em; }
  .cv-sidebar__app-val { font-size:12px; color:var(--color-text-primary); font-weight:var(--weight-medium); }
  .cv-sidebar__priority { font-family:var(--font-mono); font-size:11px; color:#F59E0B; font-weight:var(--weight-bold); }
  .cv-sidebar__member-since { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); text-align:center; margin:0; padding-top:10px; border-top:1px solid var(--color-border-subtle); }

  /* Main CV content */
  .cv-main { flex:1; overflow-y:auto; padding:36px 40px; display:flex; flex-direction:column; gap:40px; }
  .cv-main::-webkit-scrollbar { width:4px; }
  .cv-main::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

  /* Loading */
  .cv-loading { display:flex; flex-direction:column; gap:8px; }
  .cv-loading__section { padding:20px 0; border-bottom:1px solid var(--color-border-subtle); display:flex; flex-direction:column; gap:8px; }

  /* Empty */
  .cv-empty { text-align:center; padding:64px 0; }
  .cv-empty__icon { font-size:3rem; margin-bottom:14px; }
  .cv-empty__title { font-family:var(--font-display); font-size:var(--text-lg,17px); font-weight:var(--weight-semibold); color:var(--color-text-primary); margin:0 0 6px; }
  .cv-empty__sub { font-size:var(--text-sm,13px); color:var(--color-text-muted); margin:0; }

  /* Sections */
  .cv-section { display:flex; flex-direction:column; gap:20px; }
  .cv-section__title { display:flex; align-items:center; gap:12px; font-family:var(--font-display); font-size:11px; font-weight:var(--weight-bold); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.1em; margin:0; }
  .cv-section__line { display:inline-block; width:24px; height:2px; background:var(--color-primary-400,#A78BFA); border-radius:1px; flex-shrink:0; }
  .cv-about { font-size:14px; color:var(--color-text-secondary); line-height:1.75; margin:0; }
  .cv-desc { font-size:13px; color:var(--color-text-muted); line-height:1.65; margin:0; }

  /* Timeline */
  .cv-timeline { display:flex; flex-direction:column; }
  .cv-timeline__item { display:flex; gap:16px; padding-bottom:28px; }
  .cv-timeline__item:last-child { padding-bottom:0; }
  .cv-timeline__marker { display:flex; flex-direction:column; align-items:center; flex-shrink:0; padding-top:5px; }
  .cv-timeline__dot { width:12px; height:12px; border-radius:50%; background:var(--color-primary-400,#A78BFA); border:2px solid var(--color-bg-elevated); z-index:1; flex-shrink:0; }
  .cv-timeline__line { flex:1; width:2px; background:var(--color-border-subtle); margin-top:4px; min-height:20px; }
  .cv-timeline__content { flex:1; }
  .cv-timeline__header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .cv-timeline__role { font-size:15px; font-weight:var(--weight-semibold); color:var(--color-text-primary); }
  .cv-timeline__org { font-size:13px; color:var(--color-text-secondary); margin-top:3px; }
  .cv-timeline__loc { color:var(--color-text-muted); font-size:12px; }
  .cv-timeline__period { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); white-space:nowrap; flex-shrink:0; padding-top:3px; }

  /* Education */
  .cv-edu-list { display:flex; flex-direction:column; gap:14px; }
  .cv-edu-item { display:flex; gap:20px; padding:16px; background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:12px; }
  .cv-edu-item__years { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; font-family:var(--font-mono); font-size:12px; color:var(--color-text-muted); min-width:44px; padding-top:2px; }
  .cv-edu-item__sep { font-size:9px; }
  .cv-edu-item__body { flex:1; }
  .cv-edu-item__degree { font-size:14px; font-weight:var(--weight-semibold); color:var(--color-text-primary); }
  .cv-edu-item__field { font-size:13px; color:var(--color-text-secondary); margin-top:2px; }
  .cv-edu-item__inst { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); margin-top:5px; }

  /* Projects */
  .cv-project-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px; }
  .cv-project-card { padding:16px; border-radius:12px; background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); transition:border-color 130ms; }
  .cv-project-card:hover { border-color:var(--color-border-strong); }
  .cv-project-card__header { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:10px; }
  .cv-project-card__name { font-size:14px; font-weight:var(--weight-semibold); color:var(--color-text-primary); }
  .cv-project-card__links { display:flex; gap:5px; flex-shrink:0; }
  .cv-ext-link { padding:3px 9px; border-radius:999px; font-family:var(--font-mono); font-size:10px; border:1px solid var(--color-border-default); background:var(--color-bg-base); color:var(--color-text-muted); text-decoration:none; transition:all 120ms; }
  .cv-ext-link:hover { border-color:var(--color-primary-400,#A78BFA); color:var(--color-primary-400,#A78BFA); }
  .cv-project-card__desc { font-size:12px; color:var(--color-text-muted); line-height:1.6; margin:0 0 10px; }
  .cv-project-card__tech { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
  .cv-tech-chip { padding:2px 8px; border-radius:999px; font-family:var(--font-mono); font-size:10px; background:var(--color-bg-overlay); border:1px solid var(--color-border-subtle); color:var(--color-text-muted); }
  .cv-project-card__period { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); }

  /* Certifications */
  .cv-cert-list { display:flex; flex-direction:column; gap:12px; }
  .cv-cert-item { display:flex; gap:14px; align-items:flex-start; padding:14px; background:var(--color-bg-surface); border:1px solid var(--color-border-subtle); border-radius:12px; }
  .cv-cert-item__icon { font-size:1.2rem; flex-shrink:0; padding-top:1px; }
  .cv-cert-item__body { flex:1; }
  .cv-cert-item__name { font-size:14px; font-weight:var(--weight-semibold); color:var(--color-text-primary); }
  .cv-cert-item__org  { font-size:13px; color:var(--color-text-secondary); margin-top:2px; }
  .cv-cert-item__date { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); margin-top:4px; }

  /* ─── Deadline notice banner ─── */
  .ja-deadline-notice { display:flex; align-items:flex-start; gap:12px; padding:14px 18px; background:rgba(245,158,11,.07); border:1px solid rgba(245,158,11,.25); border-radius:12px; font-size:13px; color:var(--color-text-secondary); line-height:1.5; }
  .ja-deadline-notice strong { color:#F59E0B; }
  .ja-deadline-notice__date { color:#F59E0B; font-family:var(--font-mono); font-size:12px; margin-left:4px; }

  /* ─── Pre-deadline row state ─── */
  .ja-row--pre-deadline .ja-row__avatar { cursor:not-allowed; opacity:.5; }
  .ja-row--pre-deadline .ja-row__name { cursor:not-allowed; color:var(--color-text-secondary); }
  .ja-row__avatar--locked { cursor:not-allowed !important; }
  .ja-row__deadline-lock { display:inline-flex; align-items:center; gap:5px; font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); padding:5px 10px; border:1px solid var(--color-border-subtle); border-radius:8px; background:var(--color-bg-overlay); white-space:nowrap; }

  /* ─── Responsive ─── */
  @media (max-width:760px) {
    .cv-overlay { padding:0; align-items:flex-end; }
    .cv-modal { max-height:100%; border-radius:20px 20px 0 0; max-width:100%; }
    .cv-modal__body { flex-direction:column; }
    .cv-sidebar { width:100%; border-right:none; border-bottom:1px solid var(--color-border-subtle); padding:20px; }
    .cv-sidebar__identity { flex-direction:row; text-align:left; align-items:center; }
    .cv-main { padding:20px 18px; gap:28px; }
    .cv-project-grid { grid-template-columns:1fr; }
    .ja-row__inner { flex-wrap:wrap; gap:10px; }
    .ja-row__actions { width:100%; justify-content:flex-end; }
    .cv-modal__topbar-actions { gap:6px; }
  }
`;

export default JobApplicantsPage;