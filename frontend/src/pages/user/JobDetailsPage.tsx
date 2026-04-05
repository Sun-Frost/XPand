import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useJobDetail } from "../../hooks/user/useJobs";
import { BadgeLevel } from "../../types";
import { get } from "../../api/axios";
import type { UserPurchaseResponse } from "../../hooks/user/useStore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT:  "Contract",
  REMOTE:    "Remote",
};

const JOB_TYPE_ICONS: Record<string, string> = {
  FULL_TIME: "🏢",
  PART_TIME: "⏰",
  CONTRACT:  "📋",
  REMOTE:    "🌍",
};

const BADGE_CONFIG = {
  [BadgeLevel.BRONZE]: {
    emoji: "🥉",
    cls: "bronze",
    label: "Bronze",
    color: "var(--color-bronze-light)",
    glow: "var(--glow-bronze)",
    bg: "var(--color-bronze-bg)",
    border: "var(--color-bronze-border)",
  },
  [BadgeLevel.SILVER]: {
    emoji: "🥈",
    cls: "silver",
    label: "Silver",
    color: "var(--color-silver-light)",
    glow: "var(--glow-silver)",
    bg: "var(--color-silver-bg)",
    border: "var(--color-silver-border)",
  },
  [BadgeLevel.GOLD]: {
    emoji: "🥇",
    cls: "gold",
    label: "Gold",
    color: "var(--color-badge-gold-light)",
    glow: "var(--glow-gold)",
    bg: "var(--color-badge-gold-bg)",
    border: "var(--color-badge-gold-border)",
  },
};

function getDeadlineInfo(deadline: string | null): { label: string; urgent: boolean; daysLeft: number } {
  if (!deadline) return { label: "No deadline", urgent: false, daysLeft: 999 };
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { label: "Expired", urgent: true, daysLeft: 0 };
  if (daysLeft === 1) return { label: "Last day!", urgent: true, daysLeft: 1 };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, urgent: true, daysLeft };
  return { label: `${daysLeft} days left`, urgent: false, daysLeft };
}

const RichText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  return (
    <div className="jd-rich-text">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="jd-rich-text__gap" />;
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
          return <h4 key={i} className="jd-rich-text__heading">{line.slice(2, -2)}</h4>;
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="jd-rich-text__bullet">
              <span className="jd-rich-text__dot" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        return <p key={i} className="jd-rich-text__para">{line}</p>;
      })}
    </div>
  );
};

// Score ring component
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? "var(--color-green-400)"
    : score >= 50 ? "var(--color-gold-400)"
    : "var(--color-danger)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="jd-score-ring">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-border-default)" strokeWidth="5"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color}
        style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.2, fontWeight: 700 }}
      >
        {score}%
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// JobDetailsPage
// ---------------------------------------------------------------------------

const JobDetailsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, isLoading, error, apply, isApplying, applySuccess } =
    useJobDetail(Number(jobId));

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Priority slot voucher state
  const [prioritySlots, setPrioritySlots] = useState<UserPurchaseResponse[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Live slot availability for this job (max 3 total)
  const [slotAvailability, setSlotAvailability] = useState<{ taken: number; available: number } | null>(null);

  // Load unused priority vouchers + live slot count when the modal opens
  useEffect(() => {
    if (!showApplyModal) { setSelectedSlotId(null); setSlotAvailability(null); return; }
    setSlotsLoading(true);

    Promise.all([
      get<UserPurchaseResponse[]>("/user/store/purchases/unused"),
      get<{ taken: number; available: number; total: number }>(`/jobs/${Number(jobId)}/priority-slots`),
    ])
      .then(([purchases, availability]) => {
        setPrioritySlots(purchases.filter((p) => p.itemType === "PRIORITY_SLOT"));
        setSlotAvailability({ taken: availability.taken, available: availability.available });
      })
      .catch(() => { setPrioritySlots([]); setSlotAvailability(null); })
      .finally(() => setSlotsLoading(false));
  }, [showApplyModal, jobId]);

  const handleApply = async () => {
    setApplyError(null);
    const ok = await apply(selectedSlotId ?? undefined);
    if (ok) {
      setShowApplyModal(false);
    } else {
      setApplyError(
        job?.missingMajorSkills?.length
          ? `Missing required skill badges: ${job.missingMajorSkills.join(", ")}.`
          : "Application failed. Please try again."
      );
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-content">
        <div className="jd-skeleton animate-fade-in">
          <div className="skeleton" style={{ height: 34, width: 120, borderRadius: 8, marginBottom: 24 }} />
          <div className="jd-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
            </div>
            <div className="skeleton" style={{ height: 560, borderRadius: 16 }} />
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <h3>Job not found</h3>
          <p>{error ?? "This role may have been removed."}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/jobs")}>
            ← Back to Jobs
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  const deadline = getDeadlineInfo(job.deadline);
  const majorSkills = job.skillRequirements.filter((s) => s.required);
  const minorSkills = job.skillRequirements.filter((s) => !s.required);
  const verifiedMajor = majorSkills.filter((s) => s.userBadge).length;
  const verifiedMinor = minorSkills.filter((s) => s.userBadge).length;
  const hasApplied = applySuccess || job.hasApplied;

  const scoreColor =
    job.matchScore >= 80 ? "var(--color-green-400)"
    : job.matchScore >= 50 ? "var(--color-gold-400)"
    : "var(--color-danger)";

  return (
    <PageLayout pageTitle="Job Details">

      <button className="btn btn-ghost btn-sm jd-back" onClick={() => navigate("/jobs")}>
        ← Back to Jobs
      </button>

      <div className="jd-layout animate-fade-in">

        {/* ══ Main ══ */}
        <main className="jd-main">

          {/* Hero */}
          <div className="jd-hero card">
            <div
              className="jd-hero__accent"
              style={{
                background:
                  job.matchScore >= 80 ? "var(--gradient-green)"
                  : job.matchScore >= 50 ? "var(--gradient-gold)"
                  : "linear-gradient(90deg, var(--color-border-strong), var(--color-border-strong))",
              }}
            />

            <div className="jd-hero__body">
              {/* Top row: logo + meta + match */}
              <div className="jd-hero__top">
                <div className="jd-hero__logo">
                  {job.companyName.charAt(0).toUpperCase()}
                </div>

                <div className="jd-hero__meta-group">
                  <span className="jd-hero__company">{job.companyName}</span>
                  <div className="jd-hero__chips">
                    {job.jobType && (
                      <span className="jd-chip">
                        {JOB_TYPE_ICONS[job.jobType]} {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                      </span>
                    )}
                    {job.location && (
                      <span className="jd-chip">📍 {job.location}</span>
                    )}
                    {job.salaryRange && (
                      <span className="jd-chip jd-chip--highlight">💰 {job.salaryRange}</span>
                    )}
                    <span className={`jd-chip ${deadline.urgent ? "jd-chip--urgent" : ""}`}>
                      ⏱ {deadline.label}
                    </span>
                  </div>
                </div>

                <div className="jd-hero__match-wrap">
                  <ScoreRing score={job.matchScore} size={72} />
                  <span className="jd-hero__match-label">match</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="jd-hero__title">{job.title}</h1>

              {/* Skill match breakdown bar */}
              <div className="jd-match-breakdown">
                <div className="jd-match-breakdown__track">
                  <div
                    className="jd-match-breakdown__fill jd-match-breakdown__fill--major"
                    style={{ width: `${majorSkills.length > 0 ? (verifiedMajor / majorSkills.length) * 80 : 0}%` }}
                  />
                  <div
                    className="jd-match-breakdown__fill jd-match-breakdown__fill--minor"
                    style={{
                      width: `${minorSkills.length > 0 ? (verifiedMinor / minorSkills.length) * 20 : 0}%`,
                      left: "80%",
                    }}
                  />
                  <div className="jd-match-breakdown__divider" style={{ left: "80%" }} />
                </div>
                <div className="jd-match-breakdown__labels">
                  <span className="label">
                    <span style={{ color: "var(--color-cyan-400)" }}>●</span> Required: {verifiedMajor}/{majorSkills.length} <span style={{ color: "var(--color-text-muted)" }}>(80%)</span>
                  </span>
                  <span className="label">
                    <span style={{ color: "var(--color-purple-300)" }}>●</span> Nice-to-have: {verifiedMinor}/{minorSkills.length} <span style={{ color: "var(--color-text-muted)" }}>(20%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <h2 className="jd-section-title">About this role</h2>
              </div>
              <div className="card-body">
                <RichText text={job.description} />
              </div>
            </div>
          )}

          {/* Skills breakdown in main on mobile / desktop this is in sidebar */}
          <div className="jd-skills-panel-mobile">
            <SkillsPanel majorSkills={majorSkills} minorSkills={minorSkills} navigate={navigate} />
          </div>

        </main>

        {/* ══ Sidebar ══ */}
        <aside className="jd-sidebar">

          {/* Apply card */}
          <div className="jd-apply-card card">
            {hasApplied ? (
              <div className="jd-applied-state">
                <div className="jd-applied-state__icon">✅</div>
                <h3 className="jd-applied-state__title">Application Sent</h3>
                <p className="jd-applied-state__status">
                  {job.applicationStatus === "SHORTLISTED" ? "⭐ Shortlisted!" :
                   job.applicationStatus === "REJECTED"    ? "❌ Not selected"  :
                   job.applicationStatus === "WITHDRAWN"   ? "↩ Withdrawn"      :
                   "🔄 Pending review"}
                </p>
                <button
                  className="btn btn-ghost btn-sm w-full mt-4"
                  onClick={() => navigate("/jobs/applications")}
                >
                  View My Applications →
                </button>
              </div>
            ) : (
              <>
                <div className="jd-apply-card__score-wrap">
                  <ScoreRing score={job.matchScore} size={96} />
                  <div className="jd-apply-card__score-meta">
                    <span className="jd-apply-card__score-title">Skill Match</span>
                    <span className="jd-apply-card__score-sub" style={{ color: scoreColor }}>
                      {job.matchScore >= 80 ? "Excellent fit" :
                       job.matchScore >= 50 ? "Good fit" :
                       "Partial match"}
                    </span>
                  </div>
                </div>

                {/* Badge requirement notice */}
                {!job.canApply ? (
                  <div className="jd-apply-blocked">
                    <div className="jd-apply-blocked__icon">🔒</div>
                    <div>
                      <p className="jd-apply-blocked__title">Badges required to apply</p>
                      <p className="jd-apply-blocked__desc">
                        Earn a badge in: <strong>{job.missingMajorSkills.join(", ")}</strong>
                      </p>
                    </div>
                  </div>
                ) : null}

                <button
                  className={`btn btn-lg w-full ${job.canApply ? "btn-primary" : "btn-disabled"}`}
                  onClick={() => job.canApply && setShowApplyModal(true)}
                  disabled={!job.canApply}
                  title={!job.canApply ? `Missing badge(s) for: ${job.missingMajorSkills.join(", ")}` : ""}
                >
                  {job.canApply ? "Apply Now →" : "🔒 Badges Required"}
                </button>

                <button
                  className="btn btn-ghost btn-sm w-full"
                  onClick={() => navigate("/skills")}
                >
                  🎯 Verify skills
                </button>
              </>
            )}
          </div>

          {/* Skills cards — desktop only */}
          <div className="jd-skills-panel-desktop">
            <SkillsPanel majorSkills={majorSkills} minorSkills={minorSkills} navigate={navigate} />
          </div>

          {/* Company card */}
          <div className="card">
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div className="jd-company-logo">{job.companyName.charAt(0)}</div>
              <div>
                <p className="jd-company-name">{job.companyName}</p>
                {job.location && <p className="label">📍 {job.location}</p>}
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* ══ Apply Modal ══ */}
      {showApplyModal && (
        <div className="modal-backdrop" onClick={() => setShowApplyModal(false)}>
          <div className="modal jd-apply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Application</h3>
              <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Job summary */}
              <div className="jd-modal-summary">
                <div className="jd-modal-logo">{job.companyName.charAt(0)}</div>
                <div>
                  <p className="jd-modal-job-title">{job.title}</p>
                  <p className="label">{job.companyName} · {job.location}</p>
                </div>
                <ScoreRing score={job.matchScore} size={56} />
              </div>

              {/* Match bar */}
              <div className="jd-modal-match">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="label">Skill match</span>
                  <span className="label" style={{ color: scoreColor, fontWeight: 600 }}>{job.matchScore}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${job.matchScore}%`,
                      background: job.matchScore >= 80 ? "var(--gradient-green)"
                        : job.matchScore >= 50 ? "var(--gradient-gold)"
                        : "var(--color-danger)",
                    }}
                  />
                </div>
                <p className="label mt-2" style={{ color: "var(--color-text-muted)" }}>
                  {verifiedMajor}/{majorSkills.length} required · {verifiedMinor}/{minorSkills.length} nice-to-have
                </p>
              </div>

              <p className="jd-modal-disclaimer">
                Your verified skill badges will be shared with {job.companyName} as proof of competency.
              </p>

              {/* ── Priority Slot Section ── */}
              <div className="jd-priority-section">
                <div className="jd-priority-header">
                  <span className="jd-priority-icon">⭐</span>
                  <div style={{ flex: 1 }}>
                    <p className="jd-priority-title">
                      Priority Slot
                      <span className="jd-priority-optional">optional</span>
                    </p>
                    <p className="jd-priority-sub">
                      Jump to the top of the applicant queue — reviewed before all regular applicants.
                    </p>
                  </div>
                  {/* Live availability pill */}
                  {slotAvailability !== null && (
                    <div className={`jd-slot-availability ${slotAvailability.available === 0 ? "jd-slot-availability--full" : ""}`}>
                      {slotAvailability.available === 0
                        ? "🔒 All 3 slots filled"
                        : `${slotAvailability.available} of 3 slots open`}
                    </div>
                  )}
                </div>

                {/* Slot availability meter */}
                {slotAvailability !== null && (
                  <div className="jd-slot-meter">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`jd-slot-meter__pip ${i <= slotAvailability.taken ? "jd-slot-meter__pip--taken" : "jd-slot-meter__pip--open"}`}
                        title={i <= slotAvailability.taken ? `Slot ${i}: Taken` : `Slot ${i}: Available`}
                      />
                    ))}
                    <span className="jd-slot-meter__label">
                      {slotAvailability.taken}/3 slots taken
                    </span>
                  </div>
                )}

                {/* All slots full — no voucher selection */}
                {slotAvailability?.available === 0 ? (
                  <div className="jd-priority-full-notice">
                    <span>🔒</span>
                    <p>All 3 priority slots for this job are filled. Your application will be submitted as a regular applicant and reviewed after all priority applicants.</p>
                  </div>
                ) : slotsLoading ? (
                  <div className="jd-priority-loading">Loading vouchers…</div>
                ) : prioritySlots.length === 0 ? (
                  <div className="jd-priority-empty">
                    <span>No priority vouchers in your inventory.</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => { setShowApplyModal(false); navigate("/store"); }}
                    >
                      Buy one →
                    </button>
                  </div>
                ) : (
                  <div className="jd-priority-slots">
                    {/* No slot option */}
                    <button
                      className={`jd-slot-option ${selectedSlotId === null ? "jd-slot-option--selected" : ""}`}
                      onClick={() => setSelectedSlotId(null)}
                    >
                      <span className="jd-slot-icon">—</span>
                      <span className="jd-slot-label">No priority — regular applicant</span>
                    </button>
                    {prioritySlots.map((slot) => (
                      <button
                        key={slot.id}
                        className={`jd-slot-option ${selectedSlotId === slot.id ? "jd-slot-option--selected jd-slot-option--active" : ""}`}
                        onClick={() => setSelectedSlotId(slot.id)}
                      >
                        <span className="jd-slot-icon">⭐</span>
                        <span className="jd-slot-label">{slot.itemName}</span>
                        <span className="jd-slot-badge">Voucher #{slot.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedSlotId !== null && (
                  <div className="jd-priority-selected-notice">
                    <span>🚀</span>
                    <p>You'll be placed in the priority queue — reviewed before all regular applicants. Priority slots are non-refundable.</p>
                  </div>
                )}
              </div>

              {applyError && (
                <div className="jd-modal-error">
                  <span>⚠️</span>
                  <p>{applyError}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowApplyModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={isApplying}
              >
                {isApplying
                  ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙</span> Submitting…</>
                  : selectedSlotId !== null ? "Apply with Priority →" : "Confirm →"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// SkillsPanel — reused in both mobile main and desktop sidebar
// ---------------------------------------------------------------------------

interface SkillsPanelProps {
  majorSkills: ReturnType<typeof Array.prototype.filter>;
  minorSkills: ReturnType<typeof Array.prototype.filter>;
  navigate: (path: string) => void;
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ majorSkills, minorSkills, navigate }) => (
  <>
    {majorSkills.length > 0 && (
      <div className="card">
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="jd-card-title">Required Skills</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge-muted">{majorSkills.length}</span>
            <span className="label" style={{ color: "var(--color-danger)", fontSize: "var(--text-xs)" }}>
              All badges required
            </span>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {(majorSkills as any[]).map((skill: any) => {
            const badge = skill.userBadge ? BADGE_CONFIG[skill.userBadge as BadgeLevel] : null;
            return (
              <div key={skill.skillId} className={`jd-skill-row ${!badge ? "jd-skill-row--missing" : ""}`}>
                <div className="jd-skill-row__indicator" style={{
                  background: badge ? badge.color : "var(--color-danger)",
                  opacity: badge ? 1 : 0.5,
                }} />
                <span className="jd-skill-row__name">{skill.skillName}</span>
                {badge ? (
                  <span
                    className={`badge badge-${badge.cls}`}
                    style={{ boxShadow: badge.glow }}
                  >
                    {badge.emoji} {badge.label}
                  </span>
                ) : (
                  <button
                    className="btn btn-ghost btn-xs jd-verify-btn"
                    onClick={() => navigate(`/skills/test/${skill.skillId}`)}
                  >
                    Verify →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {minorSkills.length > 0 && (
      <div className="card">
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="jd-card-title">Nice-to-have</h3>
          <span className="badge badge-muted">{minorSkills.length}</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {(minorSkills as any[]).map((skill: any) => {
            const badge = skill.userBadge ? BADGE_CONFIG[skill.userBadge as BadgeLevel] : null;
            return (
              <div key={skill.skillId} className="jd-skill-row jd-skill-row--minor">
                <div className="jd-skill-row__indicator" style={{
                  background: badge ? badge.color : "var(--color-border-strong)",
                }} />
                <span className="jd-skill-row__name" style={{ opacity: 0.8 }}>{skill.skillName}</span>
                {badge ? (
                  <span className={`badge badge-${badge.cls}`}>{badge.emoji} {badge.label}</span>
                ) : (
                  <button
                    className="btn btn-ghost btn-xs jd-verify-btn"
                    onClick={() => navigate(`/skills/test/${skill.skillId}`)}
                  >
                    Verify →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Layout ───────────────────────────────────────────── */
  .jd-back {
    margin-bottom: var(--space-6);
    align-self: flex-start;
    display: inline-flex;
  }

  .jd-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-6);
    align-items: start;
  }

  .jd-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .jd-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    position: sticky;
    top: calc(var(--layout-navbar-height, 64px) + var(--space-6));
  }

  /* Mobile: skills panel inside main, hidden in sidebar */
  .jd-skills-panel-mobile  { display: none; }
  .jd-skills-panel-desktop { display: contents; }

  /* ── Hero card ────────────────────────────────────────── */
  .jd-hero {
    position: relative;
    overflow: hidden;
    padding: 0;
  }

  .jd-hero__accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
  }

  .jd-hero__body {
    padding: var(--space-7) var(--space-8) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .jd-hero__top {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .jd-hero__logo {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-xl);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--text-xl);
    color: var(--color-primary-400);
    flex-shrink: 0;
  }

  .jd-hero__meta-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .jd-hero__company {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-primary-400);
    letter-spacing: 0.02em;
  }

  .jd-hero__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .jd-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .jd-chip--highlight {
    border-color: var(--color-gold-border);
    color: var(--color-gold-300);
    background: rgba(245, 158, 11, 0.08);
  }

  .jd-chip--urgent {
    border-color: var(--color-warning-border);
    color: var(--color-warning);
    background: var(--color-warning-bg);
    font-weight: var(--weight-semibold);
  }

  .jd-hero__match-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .jd-hero__match-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .jd-hero__title {
    font-family: var(--font-display);
    font-size: clamp(var(--text-2xl), 3vw, var(--text-3xl));
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  /* ── Match breakdown bar ──────────────────────────────── */
  .jd-match-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .jd-match-breakdown__track {
    position: relative;
    height: 6px;
    background: var(--color-border-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .jd-match-breakdown__fill {
    position: absolute;
    top: 0;
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .jd-match-breakdown__fill--major {
    left: 0;
    background: var(--gradient-cyan);
  }

  .jd-match-breakdown__fill--minor {
    background: var(--gradient-purple);
  }

  .jd-match-breakdown__divider {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    background: var(--color-bg-base);
    transform: translateX(-50%);
  }

  .jd-match-breakdown__labels {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  /* ── Section titles ───────────────────────────────────── */
  .jd-section-title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .jd-card-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Rich text ────────────────────────────────────────── */
  .jd-rich-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .jd-rich-text__para {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
    margin: 0;
  }

  .jd-rich-text__gap { height: var(--space-3); }

  .jd-rich-text__heading {
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: var(--space-3) 0 var(--space-1);
  }

  .jd-rich-text__bullet {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
  }

  .jd-rich-text__dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-primary-400);
    flex-shrink: 0;
    margin-top: 7px;
  }

  /* ── Apply card ───────────────────────────────────────── */
  .jd-apply-card {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .jd-apply-card__score-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) 0;
  }

  .jd-apply-card__score-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .jd-apply-card__score-title {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .jd-apply-card__score-sub {
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }

  /* Blocked state */
  .jd-apply-blocked {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-lg);
  }

  .jd-apply-blocked__icon { font-size: 1.2em; flex-shrink: 0; }

  .jd-apply-blocked__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-danger);
    margin: 0 0 2px;
  }

  .jd-apply-blocked__desc {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed !important;
    background: var(--color-bg-overlay) !important;
    color: var(--color-text-muted) !important;
    border: 1px solid var(--color-border-default) !important;
    box-shadow: none !important;
  }

  /* Applied state */
  .jd-applied-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }

  .jd-applied-state__icon { font-size: 2.4rem; }

  .jd-applied-state__title {
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .jd-applied-state__status {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  /* ── Skill rows ───────────────────────────────────────── */
  .jd-skill-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .jd-skill-row:last-child { border-bottom: none; padding-bottom: 0; }

  .jd-skill-row--missing .jd-skill-row__name {
    color: var(--color-text-secondary);
  }

  .jd-skill-row__indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .jd-skill-row__name {
    flex: 1;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-primary);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jd-verify-btn {
    white-space: nowrap;
    color: var(--color-primary-400) !important;
    border-color: var(--color-primary-500) !important;
    font-size: var(--text-xs) !important;
  }

  /* ── Company ──────────────────────────────────────────── */
  .jd-company-logo {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--text-lg);
    color: var(--color-primary-400);
    flex-shrink: 0;
  }

  .jd-company-name {
    font-weight: var(--weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    margin: 0 0 2px;
  }

  /* ── Apply modal ──────────────────────────────────────── */
  .jd-apply-modal { max-width: 460px; }

  .jd-modal-summary {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-5);
  }

  .jd-modal-logo {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--text-base);
    color: var(--color-primary-400);
    flex-shrink: 0;
  }

  .jd-modal-job-title {
    font-weight: var(--weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    margin: 0 0 2px;
  }

  .jd-modal-match { margin-bottom: var(--space-5); }

  .jd-modal-disclaimer {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: var(--leading-relaxed);
    margin: 0;
  }

  .jd-modal-error {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-top: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
  }

  .jd-modal-error p { margin: 0; }

  /* ── Priority slot section ────────────────────────────── */
  .jd-priority-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: #0a120a;
    border: 1px solid #FCD34D33;
    border-radius: var(--radius-lg);
    margin-top: var(--space-4);
  }

  .jd-priority-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .jd-priority-icon { font-size: 1.3rem; flex-shrink: 0; line-height: 1.4; }

  .jd-priority-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 2px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .jd-priority-optional {
    font-size: var(--text-xs);
    font-weight: 400;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .jd-priority-sub {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  /* Live availability pill */
  .jd-slot-availability {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    background: rgba(252,211,77,0.10);
    border: 1px solid rgba(252,211,77,0.30);
    color: #FCD34D;
    white-space: nowrap;
  }
  .jd-slot-availability--full {
    background: rgba(248,113,113,0.10);
    border-color: rgba(248,113,113,0.30);
    color: #F87171;
  }

  /* Slot meter — 3 pips */
  .jd-slot-meter {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .jd-slot-meter__pip {
    width: 32px;
    height: 8px;
    border-radius: var(--radius-full);
    transition: background var(--duration-fast);
  }
  .jd-slot-meter__pip--taken { background: #F87171; }
  .jd-slot-meter__pip--open  { background: #34D399; }
  .jd-slot-meter__label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-muted);
    margin-left: var(--space-1);
  }

  /* All slots full notice */
  .jd-priority-full-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: rgba(248,113,113,0.06);
    border: 1px solid rgba(248,113,113,0.20);
    border-radius: var(--radius-lg);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    line-height: var(--leading-relaxed);
  }
  .jd-priority-full-notice p { margin: 0; }

  .jd-priority-loading {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    padding: var(--space-2) 0;
  }

  .jd-priority-empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }

  .jd-priority-slots {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .jd-slot-option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--duration-fast);
    text-align: left;
    width: 100%;
  }

  .jd-slot-option:hover { border-color: var(--color-border-strong); }

  .jd-slot-option--selected {
    border-color: #FCD34D66;
    background: #FCD34D0D;
  }

  .jd-slot-option--active .jd-slot-label { color: #FCD34D; }

  .jd-slot-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }

  .jd-slot-label {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: var(--weight-medium);
  }

  .jd-slot-badge {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  /* Priority selected / confirmation notice */
  .jd-priority-selected-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-3);
    background: rgba(252,211,77,0.06);
    border: 1px solid rgba(252,211,77,0.20);
    border-radius: var(--radius-lg);
    font-size: var(--text-xs);
    color: #FCD34D;
    line-height: var(--leading-relaxed);
  }
  .jd-priority-selected-notice p { margin: 0; }

  /* ── Score ring svg ───────────────────────────────────── */
  .jd-score-ring { display: block; flex-shrink: 0; }

  /* ── Responsive ───────────────────────────────────────── */
  @media (max-width: 900px) {
    .jd-layout { grid-template-columns: 1fr; }
    .jd-sidebar { position: static; }
    .jd-skills-panel-mobile  { display: contents; }
    .jd-skills-panel-desktop { display: none; }
    .jd-hero__title { font-size: var(--text-2xl); }
  }

  @media (max-width: 600px) {
    .jd-hero__body { padding: var(--space-5); }
    .jd-hero__top { flex-wrap: wrap; }
    .jd-apply-card { padding: var(--space-4); }
  }
`;

export default JobDetailsPage;