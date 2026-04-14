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

const JOB_TYPE_META: Record<string, { label: string; icon: string }> = {
  FULL_TIME: { label: "Full-time",  icon: "◈" },
  PART_TIME: { label: "Part-time",  icon: "◑" },
  CONTRACT:  { label: "Contract",   icon: "◻" },
  REMOTE:    { label: "Remote",     icon: "⊕" },
};

const BADGE_CONFIG: Record<BadgeLevel, {
  label: string; tier: string; color: string; bg: string; border: string; glow: string; rank: number;
}> = {
  [BadgeLevel.BRONZE]: {
    label: "Bronze", tier: "I",
    color: "var(--color-bronze-light)",
    bg:    "var(--color-bronze-bg)",
    border:"var(--color-bronze-border)",
    glow:  "var(--glow-bronze)",
    rank: 1,
  },
  [BadgeLevel.SILVER]: {
    label: "Silver", tier: "II",
    color: "var(--color-silver-light)",
    bg:    "var(--color-silver-bg)",
    border:"var(--color-silver-border)",
    glow:  "var(--glow-silver)",
    rank: 2,
  },
  [BadgeLevel.GOLD]: {
    label: "Gold", tier: "III",
    color: "var(--color-gold-light, #F5B731)",
    bg:    "var(--color-gold-bg)",
    border:"var(--color-gold-border)",
    glow:  "var(--glow-gold)",
    rank: 3,
  },
};

function getDeadlineInfo(deadline: string | null) {
  if (!deadline) return { label: "No deadline", urgent: false, expired: false };
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0)  return { label: "Expired",       urgent: true,  expired: true };
  if (daysLeft === 1) return { label: "Last day",       urgent: true,  expired: false };
  if (daysLeft <= 7)  return { label: `${daysLeft}d left`, urgent: true,  expired: false };
  return                     { label: `${daysLeft} days left`, urgent: false, expired: false };
}

function getMatchVerdict(score: number) {
  if (score >= 80) return { label: "Strong Match",   color: "var(--color-green-400)",  trackColor: "var(--gradient-green, linear-gradient(90deg,#10A87C,#2DD4A0))" };
  if (score >= 50) return { label: "Good Potential", color: "var(--color-gold-light, #F5B731)", trackColor: "linear-gradient(90deg,#D4940A,#F5B731)" };
  return                  { label: "Partial Match",  color: "var(--color-danger)",     trackColor: "var(--color-danger)" };
}

const APPLICATION_STATUS_DISPLAY: Record<string, { label: string; color: string; glyph: string }> = {
  SHORTLISTED: { label: "Shortlisted",   color: "#A78BFA", glyph: "◈" },
  REJECTED:    { label: "Not Selected",  color: "var(--color-danger)", glyph: "✕" },
  WITHDRAWN:   { label: "Withdrawn",     color: "var(--color-text-muted)", glyph: "↩" },
  PENDING:     { label: "Under Review",  color: "var(--color-cyan-400)", glyph: "◎" },
};

// ---------------------------------------------------------------------------
// RichText
// ---------------------------------------------------------------------------

const RichText: React.FC<{ text: string }> = ({ text }) => (
  <div className="jd-rich-text">
    {text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: "var(--space-3)" }} />;
      if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
        return <h4 key={i} className="jd-rt-heading">{line.slice(2, -2)}</h4>;
      if (line.startsWith("- "))
        return (
          <div key={i} className="jd-rt-bullet">
            <span className="jd-rt-bullet__dot" />
            <span>{line.slice(2)}</span>
          </div>
        );
      return <p key={i} className="jd-rt-para">{line}</p>;
    })}
  </div>
);

// ---------------------------------------------------------------------------
// ScoreRing
// ---------------------------------------------------------------------------

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const r      = size / 2 - 7;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { color } = getMatchVerdict(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="5.5" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="5.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <text
        x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.195, fontWeight: 700 }}
      >
        {score}%
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// BadgeTile — the core building block, elevated
// ---------------------------------------------------------------------------

const BadgeTile: React.FC<{
  skillName: string;
  skillId: number;
  userBadge: BadgeLevel | null;
  required: boolean;
  navigate: (path: string) => void;
}> = ({ skillName, skillId, userBadge, required, navigate }) => {
  const cfg = userBadge ? BADGE_CONFIG[userBadge] : null;
  const verified = !!cfg;

  return (
    <div className={[
      "jd-badge-tile",
      verified ? "jd-badge-tile--verified" : required ? "jd-badge-tile--missing" : "jd-badge-tile--optional",
    ].join(" ")}
      style={verified ? { borderColor: cfg!.border, boxShadow: cfg!.glow } : undefined}
    >
      {/* Skill name + status */}
      <div className="jd-badge-tile__left">
        <div className={`jd-badge-tile__indicator ${verified ? "is-verified" : required ? "is-missing" : "is-optional"}`} />
        <span className="jd-badge-tile__name">{skillName}</span>
      </div>

      {/* Badge or CTA */}
      <div className="jd-badge-tile__right">
        {verified ? (
          <div
            className="jd-badge-pill"
            style={{ color: cfg!.color, background: cfg!.bg, borderColor: cfg!.border }}
          >
            <span className="jd-badge-pill__tier">TIER {cfg!.tier}</span>
            <span className="jd-badge-pill__label">{cfg!.label}</span>
          </div>
        ) : (
          <button
            className={`jd-verify-cta ${required ? "jd-verify-cta--required" : ""}`}
            onClick={() => navigate(`/skills/test/${skillId}`)}
          >
            {required ? "Verify now" : "Verify"}
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SkillsSection — the centrepiece block
// ---------------------------------------------------------------------------

interface SkillsSectionProps {
  majorSkills: any[];
  minorSkills: any[];
  navigate: (path: string) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ majorSkills, minorSkills, navigate }) => {
  const verifiedMajor = majorSkills.filter((s) => s.userBadge).length;
  const canApply      = verifiedMajor === majorSkills.length;

  return (
    <div className="jd-skills-section">

      {/* Section header */}
      <div className="jd-skills-section__header">
        <div className="jd-skills-section__title-row">
          <h2 className="jd-skills-section__title">Skill Requirements</h2>
          <div className={`jd-skills-section__gate ${canApply ? "is-open" : "is-locked"}`}>
            <span className="jd-skills-section__gate-glyph">{canApply ? "◈" : "◎"}</span>
            <span>{canApply ? "All required badges earned" : `${verifiedMajor}/${majorSkills.length} required verified`}</span>
          </div>
        </div>
        <p className="jd-skills-section__sub">
          Earn a badge in every required skill to unlock your application. Badge level is proof of competency — shared directly with {`the company`}.
        </p>
      </div>

      {/* Required skills */}
      {majorSkills.length > 0 && (
        <div className="jd-skills-group">
          <div className="jd-skills-group__label">
            <span className="jd-skills-group__tag jd-skills-group__tag--required">REQUIRED</span>
            <span className="jd-skills-group__note">All badges must be earned · counts 80% of match score</span>
          </div>
          <div className="jd-badge-grid">
            {majorSkills.map((s) => (
              <BadgeTile
                key={s.skillId}
                skillName={s.skillName}
                skillId={s.skillId}
                userBadge={s.userBadge}
                required={true}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Nice-to-have skills */}
      {minorSkills.length > 0 && (
        <div className="jd-skills-group">
          <div className="jd-skills-group__label">
            <span className="jd-skills-group__tag jd-skills-group__tag--optional">NICE TO HAVE</span>
            <span className="jd-skills-group__note">Optional · counts 20% of match score</span>
          </div>
          <div className="jd-badge-grid">
            {minorSkills.map((s) => (
              <BadgeTile
                key={s.skillId}
                skillName={s.skillName}
                skillId={s.skillId}
                userBadge={s.userBadge}
                required={false}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Apply Modal
// ---------------------------------------------------------------------------

interface ApplyModalProps {
  job: any;
  majorSkills: any[];
  minorSkills: any[];
  jobId: string;
  onClose: () => void;
  onApply: (slotId?: number) => Promise<void>;
  isApplying: boolean;
  applyError: string | null;
}

const ApplyModal: React.FC<ApplyModalProps> = ({
  job, majorSkills, minorSkills, jobId, onClose, onApply, isApplying, applyError,
}) => {
  const navigate = useNavigate();
  const [prioritySlots, setPrioritySlots]       = useState<UserPurchaseResponse[]>([]);
  const [selectedSlotId, setSelectedSlotId]     = useState<number | null>(null);
  const [slotsLoading, setSlotsLoading]         = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<{ taken: number; available: number } | null>(null);

  const verifiedMajor = majorSkills.filter((s) => s.userBadge).length;
  const verifiedMinor = minorSkills.filter((s) => s.userBadge).length;
  const verdict       = getMatchVerdict(job.matchScore);

  useEffect(() => {
    setSlotsLoading(true);
    Promise.all([
      get<UserPurchaseResponse[]>("/user/store/purchases/unused"),
      get<{ taken: number; available: number; total: number }>(`/jobs/${jobId}/priority-slots`),
    ])
      .then(([purchases, avail]) => {
        setPrioritySlots(purchases.filter((p) => p.itemType === "PRIORITY_SLOT"));
        setSlotAvailability({ taken: avail.taken, available: avail.available });
      })
      .catch(() => { setPrioritySlots([]); setSlotAvailability(null); })
      .finally(() => setSlotsLoading(false));
  }, [jobId]);

  return (
    <div className="jd-modal-backdrop" onClick={onClose}>
      <div className="jd-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="jd-modal__header">
          <div className="jd-modal__header-left">
            <div className="jd-modal__logo">{job.companyName.charAt(0)}</div>
            <div>
              <p className="jd-modal__job-title">{job.title}</p>
              <p className="jd-modal__company">{job.companyName}{job.location ? ` · ${job.location}` : ""}</p>
            </div>
          </div>
          <button className="jd-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Match summary */}
        <div className="jd-modal__match">
          <div className="jd-modal__match-score">
            <ScoreRing score={job.matchScore} size={52} />
            <div>
              <span className="jd-modal__match-verdict" style={{ color: verdict.color }}>
                {verdict.label}
              </span>
              <p className="jd-modal__match-detail">
                {verifiedMajor}/{majorSkills.length} required · {verifiedMinor}/{minorSkills.length} nice-to-have
              </p>
            </div>
          </div>
          <div className="jd-modal__progress-track">
            <div
              className="jd-modal__progress-fill"
              style={{ width: `${job.matchScore}%`, background: verdict.trackColor }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="jd-modal__body">
          <p className="jd-modal__disclaimer">
            Your verified skill badges will be shared with <strong>{job.companyName}</strong> as proof of competency.
          </p>

          {/* Priority slot section */}
          <div className="jd-modal__priority">
            <div className="jd-modal__priority-header">
              <div className="jd-modal__priority-icon">⭐</div>
              <div className="jd-modal__priority-info">
                <span className="jd-modal__priority-title">Priority Slot</span>
                <span className="jd-modal__priority-optional">optional</span>
              </div>
              {slotAvailability !== null && (
                <div className={`jd-slot-pill ${slotAvailability.available === 0 ? "is-full" : ""}`}>
                  {slotAvailability.available === 0 ? "Full" : `${slotAvailability.available}/3 open`}
                </div>
              )}
            </div>

            <p className="jd-modal__priority-sub">
              Jump to the top of the queue — reviewed before all regular applicants.
            </p>

            {/* Slot meter */}
            {slotAvailability !== null && (
              <div className="jd-slot-meter">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`jd-slot-meter__pip ${i <= slotAvailability.taken ? "is-taken" : "is-open"}`}
                    title={i <= slotAvailability.taken ? `Slot ${i}: Taken` : `Slot ${i}: Open`}
                  />
                ))}
                <span className="jd-slot-meter__label">{slotAvailability.taken}/3 taken</span>
              </div>
            )}

            {/* Slot options */}
            {slotAvailability?.available === 0 ? (
              <div className="jd-slot-notice jd-slot-notice--full">
                <span>🔒</span>
                <p>All 3 priority slots are filled. You'll be submitted as a regular applicant.</p>
              </div>
            ) : slotsLoading ? (
              <div className="jd-slot-loading">Loading vouchers…</div>
            ) : prioritySlots.length === 0 ? (
              <div className="jd-slot-empty">
                <span>No priority vouchers in inventory.</span>
                <button
                  className="jd-link-btn"
                  onClick={() => { onClose(); navigate("/store"); }}
                >
                  Get one →
                </button>
              </div>
            ) : (
              <div className="jd-slot-options">
                <button
                  className={`jd-slot-opt ${selectedSlotId === null ? "is-selected" : ""}`}
                  onClick={() => setSelectedSlotId(null)}
                >
                  <span className="jd-slot-opt__glyph">—</span>
                  <span className="jd-slot-opt__label">Regular applicant</span>
                </button>
                {prioritySlots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`jd-slot-opt ${selectedSlotId === slot.id ? "is-selected is-priority" : ""}`}
                    onClick={() => setSelectedSlotId(slot.id)}
                  >
                    <span className="jd-slot-opt__glyph">⭐</span>
                    <span className="jd-slot-opt__label">{slot.itemName}</span>
                    <span className="jd-slot-opt__badge">#{slot.id}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedSlotId !== null && (
              <div className="jd-slot-notice jd-slot-notice--active">
                <span>🚀</span>
                <p>You'll be placed in the priority queue — reviewed before all regular applicants. Non-refundable once submitted.</p>
              </div>
            )}
          </div>

          {applyError && (
            <div className="jd-modal__error">
              <span>⚠</span>
              <p>{applyError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="jd-modal__footer">
          <button className="jd-btn jd-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="jd-btn jd-btn--primary"
            onClick={() => onApply(selectedSlotId ?? undefined)}
            disabled={isApplying}
          >
            {isApplying
              ? <><span className="jd-spinner" />Submitting…</>
              : selectedSlotId !== null
                ? <>Apply with Priority <span>→</span></>
                : <>Confirm Application <span>→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// JobDetailsPage
// ---------------------------------------------------------------------------

const JobDetailsPage: React.FC = () => {
  const { jobId }   = useParams<{ jobId: string }>();
  const navigate    = useNavigate();
  const { job, isLoading, error, apply, isApplying, applySuccess } = useJobDetail(Number(jobId));

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyError, setApplyError]         = useState<string | null>(null);

  const handleApply = async (slotId?: number) => {
    setApplyError(null);
    const ok = await apply(slotId);
    if (ok) { setShowApplyModal(false); }
    else {
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
      <PageLayout pageTitle="Job Details">
        <div className="jd-skeleton animate-fade-in">
          <div className="skeleton" style={{ height: 28, width: 110, borderRadius: 6, marginBottom: 28 }} />
          <div className="jd-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 380, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            </div>
          </div>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  if (error || !job) {
    return (
      <PageLayout pageTitle="Job Details">
        <div className="jd-error-state">
          <div className="jd-error-state__glyph">◻</div>
          <h3>Job not found</h3>
          <p>{error ?? "This role may have been removed."}</p>
          <button className="jd-btn jd-btn--primary" onClick={() => navigate("/jobs")}>← Back to Jobs</button>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  const deadline    = getDeadlineInfo(job.deadline);
  const verdict     = getMatchVerdict(job.matchScore);
  const majorSkills = job.skillRequirements.filter((s: any) => s.required);
  const minorSkills = job.skillRequirements.filter((s: any) => !s.required);
  const hasApplied  = applySuccess || job.hasApplied;
  const appStatus   = job.applicationStatus ? APPLICATION_STATUS_DISPLAY[job.applicationStatus] : APPLICATION_STATUS_DISPLAY["PENDING"];
  const typeInfo    = job.jobType ? JOB_TYPE_META[job.jobType] : null;

  return (
    <PageLayout pageTitle="Job Details">

      {/* Back */}
      <button className="jd-back-btn" onClick={() => navigate("/jobs")}>
        ← Back to Jobs
      </button>

      <div className="jd-layout animate-fade-in">

        {/* ══════ MAIN COLUMN ══════ */}
        <main className="jd-main">

          {/* ── Hero ── */}
          <div className="jd-hero">
            {/* Score bar on top edge */}
            <div
              className="jd-hero__score-bar"
              style={{ background: verdict.trackColor, width: `${job.matchScore}%` }}
            />

            <div className="jd-hero__content">
              {/* Company row */}
              <div className="jd-hero__company-row">
                <div className="jd-hero__logo">{job.companyName.charAt(0)}</div>
                <div className="jd-hero__company-info">
                  <span className="jd-hero__company-name">{job.companyName}</span>
                  <div className="jd-hero__chips">
                    {typeInfo && (
                      <span className="jd-chip">
                        <span className="jd-chip__icon">{typeInfo.icon}</span>
                        {typeInfo.label}
                      </span>
                    )}
                    {job.location && (
                      <span className="jd-chip">
                        <span className="jd-chip__icon">◍</span>
                        {job.location}
                      </span>
                    )}
                    {job.salaryRange && (
                      <span className="jd-chip jd-chip--highlight">
                        <span className="jd-chip__icon">◎</span>
                        {job.salaryRange}
                      </span>
                    )}
                    <span className={`jd-chip ${deadline.urgent ? "jd-chip--urgent" : ""}`}>
                      <span className="jd-chip__icon">◷</span>
                      {deadline.label}
                    </span>
                  </div>
                </div>

                {/* Match ring */}
                <div className="jd-hero__match">
                  <ScoreRing score={job.matchScore} size={68} />
                  <span className="jd-hero__match-verdict" style={{ color: verdict.color }}>
                    {verdict.label}
                  </span>
                </div>
              </div>

              {/* Job title */}
              <h1 className="jd-hero__title">{job.title}</h1>

              {/* Match progress bar */}
              <div className="jd-hero__breakdown">
                <div className="jd-hero__breakdown-track">
                  <div
                    className="jd-hero__breakdown-fill jd-hero__breakdown-fill--major"
                    style={{ width: `${majorSkills.length > 0 ? (majorSkills.filter((s:any)=>s.userBadge).length / majorSkills.length) * 80 : 0}%` }}
                  />
                  <div
                    className="jd-hero__breakdown-fill jd-hero__breakdown-fill--minor"
                    style={{ left: "80%", width: `${minorSkills.length > 0 ? (minorSkills.filter((s:any)=>s.userBadge).length / minorSkills.length) * 20 : 0}%` }}
                  />
                  <div className="jd-hero__breakdown-divider" style={{ left: "80%" }} />
                </div>
                <div className="jd-hero__breakdown-labels">
                  <span>
                    <span style={{ color: "var(--color-cyan-400)" }}>◆</span>
                    {" "}Required {majorSkills.filter((s:any)=>s.userBadge).length}/{majorSkills.length}{" "}
                    <span className="jd-dim">· 80% weight</span>
                  </span>
                  <span>
                    <span style={{ color: "#A78BFA" }}>◆</span>
                    {" "}Nice-to-have {minorSkills.filter((s:any)=>s.userBadge).length}/{minorSkills.length}{" "}
                    <span className="jd-dim">· 20% weight</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Skills — THE CENTREPIECE ── */}
          <SkillsSection
            majorSkills={majorSkills}
            minorSkills={minorSkills}
            navigate={navigate}
          />

          {/* ── About this role ── */}
          {job.description && (
            <div className="jd-card">
              <div className="jd-card__header">
                <h2 className="jd-card__title">About this role</h2>
              </div>
              <div className="jd-card__body">
                <RichText text={job.description} />
              </div>
            </div>
          )}

        </main>

        {/* ══════ SIDEBAR ══════ */}
        <aside className="jd-sidebar">

          {/* Apply card — the sticky CTA */}
          <div className="jd-apply-card">
            {hasApplied ? (
              <div className="jd-applied">
                <div className="jd-applied__icon">✓</div>
                <h3 className="jd-applied__title">Applied</h3>
                {job.applicationStatus && (
                  <div
                    className="jd-applied__status"
                    style={{ color: appStatus.color, borderColor: appStatus.color, background: `${appStatus.color}12` }}
                  >
                    <span>{appStatus.glyph}</span>
                    <span>{appStatus.label}</span>
                  </div>
                )}
                <button
                  className="jd-btn jd-btn--ghost jd-btn--full"
                  onClick={() => navigate("/jobs/applications")}
                >
                  My Applications →
                </button>
              </div>
            ) : (
              <>
                {/* Score */}
                <div className="jd-apply-card__score">
                  <ScoreRing score={job.matchScore} size={88} />
                  <div className="jd-apply-card__score-text">
                    <span className="jd-apply-card__score-label">Skill Match</span>
                    <span className="jd-apply-card__score-verdict" style={{ color: verdict.color }}>
                      {verdict.label}
                    </span>
                  </div>
                </div>

                {/* Gate state */}
                {!job.canApply && (
                  <div className="jd-apply-gate">
                    <span className="jd-apply-gate__icon">◎</span>
                    <div>
                      <p className="jd-apply-gate__title">Badge required</p>
                      <p className="jd-apply-gate__desc">
                        Verify: <strong>{job.missingMajorSkills.join(", ")}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary CTA */}
                <button
                  className={`jd-btn jd-btn--full ${job.canApply ? "jd-btn--primary" : "jd-btn--locked"}`}
                  onClick={() => job.canApply && setShowApplyModal(true)}
                  disabled={!job.canApply}
                >
                  {job.canApply
                    ? <><span>Apply Now</span><span className="jd-btn__arrow">→</span></>
                    : <><span>◎</span><span>Badges Required</span></>
                  }
                </button>

                {!job.canApply && (
                  <button
                    className="jd-btn jd-btn--ghost jd-btn--full"
                    onClick={() => navigate("/skills")}
                  >
                    Verify skills →
                  </button>
                )}
              </>
            )}
          </div>

          {/* Company card */}
          <div className="jd-company-card">
            <div className="jd-company-card__logo">{job.companyName.charAt(0)}</div>
            <div>
              <p className="jd-company-card__name">{job.companyName}</p>
              {job.location && (
                <p className="jd-company-card__location">
                  <span>◍</span> {job.location}
                </p>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* ══ Apply Modal ══ */}
      {showApplyModal && (
        <ApplyModal
          job={job}
          majorSkills={majorSkills}
          minorSkills={minorSkills}
          jobId={jobId!}
          onClose={() => { setShowApplyModal(false); setApplyError(null); }}
          onApply={handleApply}
          isApplying={isApplying}
          applyError={applyError}
        />
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

  /* ── Back btn ─────────────────────────────────────────── */
  .jd-back-btn {
    display: inline-flex; align-items: center; gap: var(--space-1);
    font-size: var(--text-xs); font-weight: var(--weight-medium);
    color: var(--color-text-muted); background: none; border: none;
    cursor: pointer; padding: 0; margin-bottom: var(--space-6);
    letter-spacing: 0.04em; text-transform: uppercase;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .jd-back-btn:hover { color: var(--color-text-secondary); }

  /* ── Layout ───────────────────────────────────────────── */
  .jd-layout {
    display: grid;
    grid-template-columns: 1fr 296px;
    gap: var(--space-6);
    align-items: start;
  }

  .jd-main    { display: flex; flex-direction: column; gap: var(--space-5); }

  .jd-sidebar {
    position: sticky;
    top: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .jd-dim { color: var(--color-text-disabled); }

  /* ── Hero ─────────────────────────────────────────────── */
  .jd-hero {
    position: relative;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .jd-hero__score-bar {
    position: absolute;
    top: 0; left: 0;
    height: 3px;
    border-radius: 0;
    transition: width 1s cubic-bezier(0.4,0,0.2,1);
    opacity: 0.9;
  }

  .jd-hero__content {
    padding: var(--space-7) var(--space-7) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .jd-hero__company-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .jd-hero__logo {
    width: 52px; height: 52px;
    border-radius: var(--radius-xl);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-extrabold);
    font-size: var(--text-2xl);
    color: var(--color-primary-400);
    flex-shrink: 0;
  }

  .jd-hero__company-info { flex: 1; min-width: 0; padding-top: 3px; }

  .jd-hero__company-name {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
    letter-spacing: 0.02em;
  }

  .jd-hero__chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  .jd-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px;
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: 99px;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    font-weight: var(--weight-medium);
    white-space: nowrap;
  }
  .jd-chip__icon { font-size: 10px; opacity: 0.7; font-family: var(--font-mono); }
  .jd-chip--highlight {
    color: var(--color-green-400);
    background: var(--color-success-bg);
    border-color: var(--color-success-border);
  }
  .jd-chip--urgent {
    color: var(--color-danger);
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
  }

  .jd-hero__match {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    flex-shrink: 0;
  }
  .jd-hero__match-verdict {
    font-size: 10px;
    font-weight: var(--weight-bold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .jd-hero__title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: var(--weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin: 0;
  }

  /* Breakdown bar */
  .jd-hero__breakdown { display: flex; flex-direction: column; gap: 8px; }

  .jd-hero__breakdown-track {
    position: relative;
    height: 6px;
    background: var(--color-bg-overlay);
    border-radius: 99px;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
  }

  .jd-hero__breakdown-fill {
    position: absolute;
    top: 0; height: 100%;
    border-radius: 0;
    transition: width 1s cubic-bezier(0.4,0,0.2,1);
  }
  .jd-hero__breakdown-fill--major {
    left: 0;
    background: linear-gradient(90deg, var(--color-cyan-600), var(--color-cyan-400));
  }
  .jd-hero__breakdown-fill--minor {
    background: linear-gradient(90deg, var(--color-primary-600), #A78BFA);
  }
  .jd-hero__breakdown-divider {
    position: absolute; top: 0; width: 1px; height: 100%;
    background: var(--color-bg-base);
  }

  .jd-hero__breakdown-labels {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  /* ── Skills Section ───────────────────────────────────── */
  .jd-skills-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6) var(--space-7);
  }

  .jd-skills-section__header { display: flex; flex-direction: column; gap: var(--space-2); }

  .jd-skills-section__title-row {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: var(--space-3);
  }

  .jd-skills-section__title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .jd-skills-section__gate {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 14px;
    border-radius: 99px;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
    border: 1px solid;
    transition: all var(--duration-fast);
  }
  .jd-skills-section__gate.is-open {
    color: var(--color-green-400);
    background: var(--color-success-bg);
    border-color: var(--color-success-border);
  }
  .jd-skills-section__gate.is-locked {
    color: var(--color-cyan-400);
    background: var(--color-info-bg);
    border-color: var(--color-info-border);
  }
  .jd-skills-section__gate-glyph { font-size: 11px; }

  .jd-skills-section__sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: var(--leading-relaxed);
    margin: 0;
  }

  .jd-skills-group { display: flex; flex-direction: column; gap: var(--space-3); }

  .jd-skills-group__label {
    display: flex; align-items: center; gap: var(--space-3);
    flex-wrap: wrap;
  }

  .jd-skills-group__tag {
    font-size: 10px;
    font-family: var(--font-mono);
    font-weight: var(--weight-bold);
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid;
  }
  .jd-skills-group__tag--required {
    color: var(--color-danger);
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
  }
  .jd-skills-group__tag--optional {
    color: "#A78BFA";
    color: var(--color-purple-400, #A78BFA);
    background: var(--color-purple-glow, rgba(167,139,250,0.10));
    border-color: rgba(167,139,250,0.28);
  }

  .jd-skills-group__note {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Badge grid — 1 column */
  .jd-badge-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Badge tile */
  .jd-badge-tile {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    transition: border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out),
                transform var(--duration-fast) var(--ease-out);
  }
  .jd-badge-tile:hover { transform: translateX(2px); }

  .jd-badge-tile--verified { background: var(--color-bg-elevated); }
  .jd-badge-tile--missing  { border-color: rgba(248,113,113,0.18); }
  .jd-badge-tile--optional { opacity: 0.85; }

  .jd-badge-tile__left { display: flex; align-items: center; gap: var(--space-3); flex: 1; min-width: 0; }

  .jd-badge-tile__indicator {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .jd-badge-tile__indicator.is-verified { background: var(--color-green-400); box-shadow: 0 0 6px var(--color-green-400); }
  .jd-badge-tile__indicator.is-missing  { background: var(--color-danger); opacity: 0.7; }
  .jd-badge-tile__indicator.is-optional { background: var(--color-border-strong); }

  .jd-badge-tile__name {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .jd-badge-tile__right { flex-shrink: 0; }

  /* Badge pill */
  .jd-badge-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px;
    border-radius: 99px;
    border: 1px solid;
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: 0.02em;
  }
  .jd-badge-pill__tier {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    opacity: 0.7;
  }

  /* Verify CTA */
  .jd-verify-cta {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px;
    border-radius: 99px;
    border: 1px solid var(--color-border-default);
    background: transparent;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast);
    white-space: nowrap;
  }
  .jd-verify-cta:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }
  .jd-verify-cta--required {
    color: var(--color-danger);
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
  }
  .jd-verify-cta--required:hover {
    background: rgba(248,113,113,0.18);
  }

  /* ── Generic card ─────────────────────────────────────── */
  .jd-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    overflow: hidden;
  }
  .jd-card__header {
    padding: var(--space-5) var(--space-7);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .jd-card__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    letter-spacing: -0.015em;
    margin: 0;
  }
  .jd-card__body { padding: var(--space-6) var(--space-7); }

  /* ── Rich text ────────────────────────────────────────── */
  .jd-rich-text { display: flex; flex-direction: column; gap: var(--space-2); }
  .jd-rt-para   { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-relaxed); margin: 0; }
  .jd-rt-heading {
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: var(--space-3) 0 var(--space-1);
    letter-spacing: -0.01em;
  }
  .jd-rt-bullet {
    display: flex; align-items: flex-start; gap: var(--space-3);
    font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-relaxed);
  }
  .jd-rt-bullet__dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--color-primary-400);
    flex-shrink: 0; margin-top: 7px;
  }

  /* ── Apply card ───────────────────────────────────────── */
  .jd-apply-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    display: flex; flex-direction: column; gap: var(--space-4);
  }

  .jd-apply-card__score {
    display: flex; align-items: center; gap: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .jd-apply-card__score-label {
    display: block;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .jd-apply-card__score-verdict {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .jd-apply-gate {
    display: flex; align-items: flex-start; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: rgba(248,113,113,0.06);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-lg);
  }
  .jd-apply-gate__icon {
    font-size: 16px;
    color: var(--color-danger);
    flex-shrink: 0;
    font-family: var(--font-mono);
    line-height: 1.4;
  }
  .jd-apply-gate__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 3px;
  }
  .jd-apply-gate__desc {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  /* ── Applied state ────────────────────────────────────── */
  .jd-applied {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    text-align: center; padding: var(--space-2) 0;
  }
  .jd-applied__icon {
    width: 48px; height: 48px; border-radius: 50%;
    background: var(--color-success-bg);
    border: 1px solid var(--color-success-border);
    color: var(--color-green-400);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    box-shadow: var(--glow-green);
  }
  .jd-applied__title {
    font-family: var(--font-display);
    font-size: var(--text-xl); font-weight: var(--weight-bold);
    color: var(--color-text-primary); margin: 0;
  }
  .jd-applied__status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px;
    border-radius: 99px; border: 1px solid;
    font-size: var(--text-xs); font-weight: var(--weight-semibold);
    font-family: var(--font-mono); letter-spacing: 0.04em;
  }

  /* ── Company card ─────────────────────────────────────── */
  .jd-company-card {
    display: flex; align-items: center; gap: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-5);
  }
  .jd-company-card__logo {
    width: 40px; height: 40px; border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: var(--text-lg); color: var(--color-primary-400);
    flex-shrink: 0;
  }
  .jd-company-card__name { font-weight: var(--weight-semibold); color: var(--color-text-primary); font-size: var(--text-sm); margin: 0 0 3px; }
  .jd-company-card__location { font-size: var(--text-xs); color: var(--color-text-muted); margin: 0; display: flex; align-items: center; gap: 4px; }

  /* ── Buttons ──────────────────────────────────────────── */
  .jd-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    padding: 9px 20px;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); font-family: var(--font-body);
    font-weight: var(--weight-semibold);
    cursor: pointer; border: 1px solid;
    transition: all var(--duration-fast) var(--ease-out);
    white-space: nowrap; line-height: 1;
  }
  .jd-btn--primary {
    background: var(--color-primary-500); border-color: var(--color-primary-600);
    color: var(--color-text-on-brand);
  }
  .jd-btn--primary:hover:not(:disabled) {
    background: var(--color-primary-400);
    box-shadow: var(--glow-primary);
  }
  .jd-btn--ghost {
    background: transparent; border-color: var(--color-border-default);
    color: var(--color-text-secondary);
  }
  .jd-btn--ghost:hover { background: var(--color-bg-hover); border-color: var(--color-border-strong); color: var(--color-text-primary); }
  .jd-btn--locked {
    background: var(--color-bg-overlay); border-color: var(--color-border-default);
    color: var(--color-text-disabled); cursor: not-allowed;
  }
  .jd-btn--full { width: 100%; }
  .jd-btn__arrow { transition: transform var(--duration-fast); }
  .jd-btn:hover .jd-btn__arrow { transform: translateX(3px); }
  .jd-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .jd-link-btn {
    background: none; border: none; cursor: pointer;
    font-size: var(--text-xs); color: var(--color-primary-400);
    font-weight: var(--weight-semibold);
    transition: color var(--duration-fast);
  }
  .jd-link-btn:hover { color: var(--color-primary-300); }

  /* ── Modal ────────────────────────────────────────────── */
  .jd-modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: var(--space-6);
    animation: fadeUp var(--duration-base) var(--ease-out) both;
  }

  .jd-modal {
    width: 100%; max-width: 480px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-xl);
    display: flex; flex-direction: column;
    animation: fadeUp var(--duration-slow) var(--ease-spring) both;
    max-height: 90vh; overflow: hidden;
  }

  .jd-modal__header {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }
  .jd-modal__header-left { display: flex; align-items: center; gap: var(--space-3); }
  .jd-modal__logo {
    width: 38px; height: 38px; border-radius: var(--radius-lg);
    background: var(--color-bg-overlay); border: 1px solid var(--color-border-default);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: var(--text-base); color: var(--color-primary-400);
    flex-shrink: 0;
  }
  .jd-modal__job-title { font-weight: var(--weight-semibold); font-size: var(--text-sm); color: var(--color-text-primary); margin: 0 0 2px; }
  .jd-modal__company   { font-size: var(--text-xs); color: var(--color-text-muted); margin: 0; }
  .jd-modal__close {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid var(--color-border-default);
    border-radius: 99px; color: var(--color-text-muted);
    font-size: 11px; cursor: pointer;
    transition: all var(--duration-fast);
    flex-shrink: 0;
  }
  .jd-modal__close:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }

  .jd-modal__match {
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }
  .jd-modal__match-score {
    display: flex; align-items: center; gap: var(--space-4);
    margin-bottom: var(--space-3);
  }
  .jd-modal__match-verdict {
    font-family: var(--font-display);
    font-size: var(--text-lg); font-weight: var(--weight-bold); letter-spacing: -0.02em;
    display: block; margin-bottom: 4px;
  }
  .jd-modal__match-detail { font-size: var(--text-xs); color: var(--color-text-muted); margin: 0; }
  .jd-modal__progress-track {
    height: 5px; background: var(--color-bg-overlay);
    border-radius: 99px; overflow: hidden;
  }
  .jd-modal__progress-fill {
    height: 100%; border-radius: 99px;
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  .jd-modal__body {
    padding: var(--space-5) var(--space-6);
    overflow-y: auto;
    display: flex; flex-direction: column; gap: var(--space-4);
  }

  .jd-modal__disclaimer {
    font-size: var(--text-sm); color: var(--color-text-muted);
    line-height: var(--leading-relaxed); margin: 0;
  }

  /* Priority section */
  .jd-modal__priority {
    background: rgba(212,148,10,0.05);
    border: 1px solid rgba(212,148,10,0.20);
    border-radius: var(--radius-xl);
    padding: var(--space-4);
    display: flex; flex-direction: column; gap: var(--space-3);
  }
  .jd-modal__priority-header {
    display: flex; align-items: center; gap: var(--space-3);
  }
  .jd-modal__priority-icon { font-size: 1.2rem; flex-shrink: 0; }
  .jd-modal__priority-info { flex: 1; display: flex; align-items: center; gap: var(--space-2); }
  .jd-modal__priority-title { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
  .jd-modal__priority-optional {
    font-size: 10px; font-family: var(--font-mono); font-weight: 400;
    color: var(--color-text-muted); letter-spacing: 0.05em;
  }
  .jd-modal__priority-sub { font-size: var(--text-xs); color: var(--color-text-muted); line-height: var(--leading-relaxed); margin: 0; }

  .jd-slot-pill {
    padding: 3px 10px; border-radius: 99px; font-size: 10px; font-family: var(--font-mono); font-weight: 700;
    background: rgba(212,148,10,0.12); border: 1px solid rgba(212,148,10,0.30); color: #F5B731;
    white-space: nowrap; flex-shrink: 0;
  }
  .jd-slot-pill.is-full {
    background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger);
  }

  .jd-slot-meter { display: flex; align-items: center; gap: var(--space-2); }
  .jd-slot-meter__pip {
    flex: 1; height: 7px; border-radius: 99px;
    transition: background var(--duration-fast);
  }
  .jd-slot-meter__pip.is-taken { background: var(--color-danger); }
  .jd-slot-meter__pip.is-open  { background: var(--color-green-400); }
  .jd-slot-meter__label { font-size: 10px; font-family: var(--font-mono); color: var(--color-text-muted); white-space: nowrap; }

  .jd-slot-options { display: flex; flex-direction: column; gap: var(--space-2); }
  .jd-slot-opt {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-3) var(--space-3);
    background: var(--color-bg-elevated); border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg); cursor: pointer; text-align: left; width: 100%;
    transition: all var(--duration-fast);
  }
  .jd-slot-opt:hover { border-color: var(--color-border-strong); background: var(--color-bg-hover); }
  .jd-slot-opt.is-selected { border-color: rgba(212,148,10,0.40); background: rgba(212,148,10,0.07); }
  .jd-slot-opt__glyph { font-size: 15px; flex-shrink: 0; width: 20px; text-align: center; }
  .jd-slot-opt__label { flex: 1; font-size: var(--text-sm); color: var(--color-text-secondary); font-weight: var(--weight-medium); }
  .jd-slot-opt.is-priority .jd-slot-opt__label { color: #F5B731; }
  .jd-slot-opt__badge {
    font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted);
    background: var(--color-bg-overlay); padding: 2px 7px; border-radius: 99px;
  }

  .jd-slot-notice {
    display: flex; align-items: flex-start; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg); border: 1px solid;
    font-size: var(--text-xs); line-height: var(--leading-relaxed);
  }
  .jd-slot-notice p { margin: 0; }
  .jd-slot-notice--full { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-text-muted); }
  .jd-slot-notice--active { background: rgba(212,148,10,0.07); border-color: rgba(212,148,10,0.25); color: #F5B731; }

  .jd-slot-loading { font-size: var(--text-xs); color: var(--color-text-muted); font-family: var(--font-mono); }
  .jd-slot-empty {
    display: flex; align-items: center; justify-content: space-between;
    font-size: var(--text-xs); color: var(--color-text-muted);
  }

  .jd-modal__error {
    display: flex; align-items: flex-start; gap: var(--space-3);
    background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-lg); padding: var(--space-4);
    font-size: var(--text-sm); color: var(--color-text-secondary);
    line-height: var(--leading-relaxed);
  }
  .jd-modal__error p { margin: 0; }

  .jd-modal__footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
    display: flex; justify-content: flex-end; gap: var(--space-3);
    flex-shrink: 0;
  }

  /* ── Error state ──────────────────────────────────────── */
  .jd-error-state {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-4); padding: var(--space-16) var(--space-8); text-align: center;
  }
  .jd-error-state__glyph { font-size: 2.5rem; font-family: var(--font-mono); color: var(--color-text-disabled); }
  .jd-error-state h3 { font-family: var(--font-display); font-weight: var(--weight-bold); color: var(--color-text-primary); font-size: var(--text-xl); margin: 0; }
  .jd-error-state p  { font-size: var(--text-sm); color: var(--color-text-muted); margin: 0; }

  /* ── Spinner ──────────────────────────────────────────── */
  .jd-spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Responsive ───────────────────────────────────────── */
  @media (max-width: 900px) {
    .jd-layout { grid-template-columns: 1fr; }
    .jd-sidebar { position: static; }
    .jd-hero__title { font-size: var(--text-2xl); }
    .jd-skills-section { padding: var(--space-5); }
    .jd-hero__content { padding: var(--space-5); }
    .jd-card__body, .jd-card__header { padding-left: var(--space-5); padding-right: var(--space-5); }
  }

  @media (max-width: 600px) {
    .jd-hero__company-row { flex-wrap: wrap; }
    .jd-apply-card { padding: var(--space-5); }
    .jd-modal { border-radius: var(--radius-xl) var(--radius-xl) 0 0; align-self: flex-end; }
    .jd-modal-backdrop { align-items: flex-end; padding: 0; }
  }
`;

export default JobDetailsPage;