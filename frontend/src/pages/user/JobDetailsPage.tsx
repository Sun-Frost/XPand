import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useJobDetail } from "../../hooks/user/useJobs";
import { BadgeLevel } from "../../types";
import { get, post, del } from "../../api/axios";
import type { UserPurchaseResponse } from "../../hooks/user/useStore";

// ---------------------------------------------------------------------------
// Constants (unchanged)
// ---------------------------------------------------------------------------

const JOB_TYPE_META: Record<string, { label: string; icon: IconName }> = {
  FULL_TIME: { label: "Full-time", icon: "job-type-full-time" },
  PART_TIME: { label: "Part-time", icon: "job-type-part-time" },
  CONTRACT: { label: "Contract", icon: "job-type-contract" },
  REMOTE: { label: "Remote", icon: "job-type-remote" },
};

const BADGE_CONFIG: Record<BadgeLevel, {
  label: string; tier: string; color: string; bg: string; border: string; glow: string; rank: number;
}> = {
  [BadgeLevel.BRONZE]: {
    label: "Bronze", tier: "I",
    color: "var(--color-bronze-light)",
    bg: "var(--color-bronze-bg)",
    border: "var(--color-bronze-border)",
    glow: "var(--glow-bronze)",
    rank: 1,
  },
  [BadgeLevel.SILVER]: {
    label: "Silver", tier: "II",
    color: "var(--color-silver-light)",
    bg: "var(--color-silver-bg)",
    border: "var(--color-silver-border)",
    glow: "var(--glow-silver)",
    rank: 2,
  },
  [BadgeLevel.GOLD]: {
    label: "Gold", tier: "III",
    color: "var(--color-gold-light)",
    bg: "var(--color-gold-bg)",
    border: "var(--color-gold-border)",
    glow: "var(--glow-gold)",
    rank: 3,
  },
};

function getDeadlineInfo(deadline: string | null) {
  if (!deadline) return { label: "No deadline", urgent: false, expired: false };
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return { label: "Expired", urgent: true, expired: true };
  if (daysLeft === 1) return { label: "Last day", urgent: true, expired: false };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, urgent: true, expired: false };
  return { label: `${daysLeft}d left`, urgent: false, expired: false };
}

function getMatchVerdict(score: number): {
  label: string; color: string; trackColor: string; glowColor: string;
} {
  if (score >= 80) return {
    label: "Strong Match",
    color: "var(--color-green-400)",
    trackColor: "var(--gradient-green)",
    glowColor: "rgba(45,212,160,0.60)",
  };
  if (score >= 50) return {
    label: "Good Potential",
    color: "var(--color-gold-light)",
    trackColor: "var(--gradient-gold)",
    glowColor: "rgba(245,183,49,0.60)",
  };
  return {
    label: "Partial Match",
    color: "var(--color-danger)",
    trackColor: "linear-gradient(135deg,#7F1D1D,#F87171)",
    glowColor: "rgba(248,113,113,0.60)",
  };
}

const APPLICATION_STATUS_DISPLAY: Record<string, { label: string; color: string; glyph: string }> = {
  SHORTLISTED: { label: "Shortlisted", color: "var(--color-purple-400)", glyph: "◈" },
  REJECTED: { label: "Not Selected", color: "var(--color-danger)", glyph: "×" },
  WITHDRAWN: { label: "Withdrawn", color: "var(--color-text-muted)", glyph: "↩" },
  PENDING: { label: "Under Review", color: "var(--color-cyan-400)", glyph: "◎" },
};

// ---------------------------------------------------------------------------
// useSavedJob (unchanged)
// ---------------------------------------------------------------------------

function useSavedJob(jobId: string | undefined) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setIsLoading(true);
    get<{ saved: boolean }>(`/jobs/${jobId}/saved`)
      .then((res) => setIsSaved(res.saved))
      .catch(() => setIsSaved(false))
      .finally(() => setIsLoading(false));
  }, [jobId]);

  const toggle = async () => {
    if (!jobId || isToggling) return;
    setIsToggling(true);
    const prev = isSaved;
    setIsSaved(!prev);
    try {
      if (prev) {
        await del(`/jobs/${jobId}/saved`);
      } else {
        await post(`/jobs/${jobId}/saved`, {});
      }
    } catch {
      setIsSaved(prev);
    } finally {
      setIsToggling(false);
    }
  };

  return { isSaved, isLoading, isToggling, toggle };
}

// ---------------------------------------------------------------------------
// SaveButton (unchanged)
// ---------------------------------------------------------------------------

const SaveButton: React.FC<{
  isSaved: boolean;
  isLoading: boolean;
  isToggling: boolean;
  onToggle: () => void;
  variant?: "icon" | "full";
}> = ({ isSaved, isLoading, isToggling, onToggle, variant = "icon" }) => {
  if (isLoading) {
    return (
      <button className={`jd-save-btn jd-save-btn--${variant} jd-save-btn--skeleton`} disabled>
        <span className="jd-save-btn__icon jd-save-btn__icon--pulse">◇</span>
        {variant === "full" && <span className="jd-save-btn__label">Save</span>}
      </button>
    );
  }

  return (
    <button
      className={[
        `jd-save-btn jd-save-btn--${variant}`,
        isSaved ? "jd-save-btn--saved" : "",
        isToggling ? "jd-save-btn--toggling" : "",
      ].join(" ")}
      onClick={onToggle}
      disabled={isToggling}
      title={isSaved ? "Remove from saved jobs" : "Save this job"}
      aria-label={isSaved ? "Unsave job" : "Save job"}
      aria-pressed={isSaved}
    >
      <span className="jd-save-btn__icon">
        {isToggling ? (
          <span className="jd-save-spinner" />
        ) : isSaved ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M2 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v10.5a.5.5 0 0 1-.777.416L7 10.2l-4.223 2.716A.5.5 0 0 1 2 12.5V2z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v10.5a.5.5 0 0 1-.777.416L7 10.2l-4.223 2.716A.5.5 0 0 1 2 12.5V2z" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {variant === "full" && (
        <span className="jd-save-btn__label">
          {isSaved ? "Saved" : "Save Job"}
        </span>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// RichText (unchanged)
// ---------------------------------------------------------------------------

const RichText: React.FC<{ text: string }> = ({ text }) => (
  <div className="jd-richtext">
    {text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: "var(--space-2)" }} />;
      if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
        return <h4 key={i} className="jd-richtext__heading">{line.slice(2, -2)}</h4>;
      if (line.startsWith("- "))
        return (
          <div key={i} className="jd-richtext__bullet">
            <span className="jd-richtext__dot" />
            <span>{line.slice(2)}</span>
          </div>
        );
      return <p key={i} className="jd-richtext__para">{line}</p>;
    })}
  </div>
);

// ---------------------------------------------------------------------------
// ScoreRing (unchanged)
// ---------------------------------------------------------------------------

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const sw = size < 60 ? 5 : 6;
  const r = (size - sw * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - score / 100);
  const { color, glowColor } = getMatchVerdict(score);

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{
          transition: "stroke-dashoffset 1.1s var(--ease-out)",
          filter: `drop-shadow(0 0 ${sw + 3}px ${glowColor})`,
        }}
      />
      <text x={cx} y={cx - size * 0.065}
        textAnchor="middle" dominantBaseline="middle"
        fill={color}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: `${size * 0.20}px`,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {score}%
      </text>
      <text x={cx} y={cx + size * 0.165}
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--color-text-muted)"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: `${size * 0.093}px`,
          fontWeight: 500,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        MATCH
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// BadgeTile (unchanged)
// ---------------------------------------------------------------------------

const BadgeTile: React.FC<{
  skillName: string; skillId: number;
  userBadge: BadgeLevel | null; required: boolean;
  navigate: (path: string) => void;
}> = ({ skillName, skillId, userBadge, required, navigate }) => {
  const cfg = userBadge ? BADGE_CONFIG[userBadge] : null;
  const verified = !!cfg;

  return (
    <div
      className={[
        "jd-skill-row",
        verified ? "jd-skill-row--verified" : "",
        !verified && required ? "jd-skill-row--missing" : "",
      ].join(" ")}
      style={verified ? { borderColor: cfg!.border } : undefined}
    >
      {verified && (
        <div className="jd-skill-row__edge" style={{ background: cfg!.color }} />
      )}

      <div className="jd-skill-row__body">
        <div className="jd-skill-row__left">
          <div className={`jd-skill-orb ${verified ? "jd-skill-orb--ok" : required ? "jd-skill-orb--warn" : "jd-skill-orb--dim"}`}>
            {verified
              ? <svg width="9" height="9" viewBox="0 0 9 9"><polyline points="1,4.5 3.5,7 8,1.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              : required
                ? <span style={{ fontSize: 9, fontWeight: 800, fontFamily: "var(--font-mono)", lineHeight: 1 }}>!</span>
                : <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", lineHeight: 1 }}>·</span>
            }
          </div>
          <span className="jd-skill-row__name">{skillName}</span>
        </div>

        <div className="jd-skill-row__right">
          {verified ? (
            <span
              className={`jd-tier-pill skill-badge ${cfg!.label.toLowerCase()}`}
              style={{ color: cfg!.color, background: cfg!.bg, borderColor: cfg!.border }}
            >
              <span className="jd-tier-pill__tier">T{cfg!.tier}</span>
              <span className="jd-tier-pill__sep">·</span>
              <span>{cfg!.label}</span>
            </span>
          ) : (
            <button
              className={`jd-verify-btn ${required ? "jd-verify-btn--required" : ""}`}
              onClick={() => navigate(`/skills/test/${skillId}`)}
            >
              {required ? "Verify now" : "Earn badge"} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SkillsSection (two-column grid layout)
// ---------------------------------------------------------------------------

const SkillsSection: React.FC<{
  majorSkills: any[]; minorSkills: any[];
  navigate: (path: string) => void;
}> = ({ majorSkills, minorSkills, navigate }) => {
  const verifiedMajor = majorSkills.filter((s) => s.userBadge).length;
  const canApply = verifiedMajor === majorSkills.length && majorSkills.length > 0;
  const pct = majorSkills.length > 0 ? (verifiedMajor / majorSkills.length) * 100 : 0;

  return (
    <section className="jd-skills">
      <div className="jd-skills__head">
        <div className="jd-skills__title-row">
          <div className="jd-skills__title-left">
            <span className="jd-skills__star-icon">★</span>
            <h2 className="jd-skills__title">Skill Requirements</h2>
          </div>
          <span className={`jd-gate-chip ${canApply ? "jd-gate-chip--open" : "jd-gate-chip--locked"}`}>
            <span>{canApply ? "✦" : "◎"}</span>
            {canApply ? "All badges earned" : `${verifiedMajor} / ${majorSkills.length} verified`}
          </span>
        </div>
        <p className="jd-skills__desc">
          Earn a badge in every required skill to unlock your application. Badge level is proof of competency — shared directly with the company.
        </p>
        <div className="jd-skills__progress">
          <div className="jd-skills__progress-track">
            <div className="jd-skills__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="jd-skills__progress-label">{verifiedMajor}/{majorSkills.length} required</span>
        </div>
      </div>

      {majorSkills.length > 0 && (
        <div className="jd-skills__group">
          <div className="jd-skills__group-label">
            <span className="jd-label-chip jd-label-chip--required">REQUIRED</span>
            <span className="jd-skills__group-note">All badges must be earned · 80% of match score</span>
          </div>
          {/* ✨ TWO-COLUMN GRID */}
          <div className="jd-skill-grid">
            {majorSkills.map((s) => (
              <BadgeTile key={s.skillId} skillName={s.skillName} skillId={s.skillId}
                userBadge={s.userBadge} required={true} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {minorSkills.length > 0 && (
        <div className="jd-skills__group">
          <div className="jd-skills__group-label">
            <span className="jd-label-chip jd-label-chip--optional">NICE TO HAVE</span>
            <span className="jd-skills__group-note">Optional · counts 20% of match score</span>
          </div>
          {/* ✨ TWO-COLUMN GRID */}
          <div className="jd-skill-grid">
            {minorSkills.map((s) => (
              <BadgeTile key={s.skillId} skillName={s.skillName} skillId={s.skillId}
                userBadge={s.userBadge} required={false} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Apply Modal (unchanged)
// ---------------------------------------------------------------------------

const ApplyModal: React.FC<{
  job: any; majorSkills: any[]; minorSkills: any[]; jobId: string;
  onClose: () => void; onApply: (slotId?: number) => Promise<void>;
  isApplying: boolean; applyError: string | null;
}> = ({ job, majorSkills, minorSkills, jobId, onClose, onApply, isApplying, applyError }) => {
  const navigate = useNavigate();
  const [prioritySlots, setPrioritySlots] = useState<UserPurchaseResponse[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<{ taken: number; available: number } | null>(null);

  const verifiedMajor = majorSkills.filter((s) => s.userBadge).length;
  const verifiedMinor = minorSkills.filter((s) => s.userBadge).length;
  const verdict = getMatchVerdict(job.matchScore);

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
      <div className="jd-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>

        <div className="jd-modal__header">
          <div className="jd-modal__header-left">
            <div className="jd-modal__logo">{job.companyName.charAt(0)}</div>
            <div>
              <p className="jd-modal__job-title">{job.title}</p>
              <p className="jd-modal__company">{job.companyName}{job.location ? ` · ${job.location}` : ""}</p>
            </div>
          </div>
          <button className="btn-icon btn-icon-sm" onClick={onClose}>
            <Icon name="close" size={14} label="Close" />
          </button>
        </div>

        <div className="jd-modal__match">
          <div className="jd-modal__match-row">
            <ScoreRing score={job.matchScore} size={52} />
            <div>
              <span className="jd-modal__verdict" style={{ color: verdict.color }}>{verdict.label}</span>
              <p className="jd-modal__match-detail">
                {verifiedMajor}/{majorSkills.length} required · {verifiedMinor}/{minorSkills.length} nice-to-have
              </p>
            </div>
          </div>
          <div className="jd-modal__track">
            <div className="jd-modal__track-fill" style={{ width: `${job.matchScore}%`, background: verdict.trackColor }} />
          </div>
        </div>

        <div className="jd-modal__body">
          <p className="jd-modal__disclaimer">
            Your verified skill badges will be shared with <strong>{job.companyName}</strong> as proof of competency.
          </p>

          <div className="jd-modal__priority surface-glow-gold">
            <div className="jd-modal__priority-head">
              <span style={{ fontSize: "1.1rem" }}><Icon name="star" size={14} label="" /></span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className="jd-modal__priority-title">Priority Slot</span>
                <span className="jd-modal__priority-optional">optional</span>
              </div>
              {slotAvailability !== null && (
                <span className={`jd-slot-pill ${slotAvailability.available === 0 ? "jd-slot-pill--full" : ""}`}>
                  {slotAvailability.available === 0 ? "Full" : `${slotAvailability.available}/3 open`}
                </span>
              )}
            </div>
            <p className="jd-modal__priority-desc">Jump to the top — reviewed before all regular applicants.</p>

            {slotAvailability !== null && (
              <div className="jd-slot-meter">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`jd-slot-pip ${i <= slotAvailability.taken ? "jd-slot-pip--taken" : "jd-slot-pip--open"}`} />
                ))}
                <span className="jd-slot-meter__label">{slotAvailability.taken}/3 taken</span>
              </div>
            )}

            {slotAvailability?.available === 0 ? (
              <div className="jd-slot-notice jd-slot-notice--full">
                <Icon name="locked" size={14} label="" />
                <p>All 3 priority slots are filled. You'll apply as a regular applicant.</p>
              </div>
            ) : slotsLoading ? (
              <p className="jd-slot-loading">Loading priority slots…</p>
            ) : prioritySlots.length === 0 ? (
              <div className="jd-slot-empty">
                <span>No priority slots in inventory.</span>
                <button className="jd-text-link" onClick={() => navigate("/store")}>Visit store →</button>
              </div>
            ) : (
              <>
                {slotAvailability !== null && slotAvailability.available > 0 && (
                  <div className="jd-slot-notice jd-slot-notice--active">
                    <span>✦</span>
                    <p>You have {prioritySlots.length} priority slot{prioritySlots.length > 1 ? "s" : ""} available.</p>
                  </div>
                )}
                <div className="jd-slot-options">
                  <button
                    className={`jd-slot-opt ${selectedSlotId === null ? "jd-slot-opt--selected" : ""}`}
                    onClick={() => setSelectedSlotId(null)}
                  >
                    <span className="jd-slot-opt__glyph">◎</span>
                    <span className="jd-slot-opt__label">Apply without priority</span>
                  </button>
                  {prioritySlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={`jd-slot-opt jd-slot-opt--priority ${selectedSlotId === slot.id ? "jd-slot-opt--selected" : ""}`}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <span className="jd-slot-opt__glyph"><Icon name="star" size={14} label="" /></span>
                      <span className="jd-slot-opt__label">Use Priority Slot #{slot.id}</span>
                      <span className="jd-slot-opt__badge">1×</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {applyError && (
            <div className="jd-modal__error">
              <Icon name="warning" size={14} label="" />
              <p>{applyError}</p>
            </div>
          )}
        </div>

        <div className="jd-modal__footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onApply(selectedSlotId ?? undefined)}
            disabled={isApplying}
          >
            {isApplying
              ? <><span className="jd-spinner animate-spin" />Submitting…</>
              : selectedSlotId !== null
                ? <>Apply with Priority →</>
                : <>Confirm Application →</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// JobDetailsPage — ✨ NEW LAYOUT
// ---------------------------------------------------------------------------

const JobDetailsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, isLoading, error, apply, isApplying, applySuccess } = useJobDetail(Number(jobId));

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const {
    isSaved, isLoading: saveLoading, isToggling, toggle: toggleSave,
  } = useSavedJob(jobId);

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

  if (isLoading) {
    return (
      <PageLayout pageTitle="Job Details">
        <div className="jd-skeleton animate-fade-in">
          <div className="skeleton" style={{ height: 24, width: 100, borderRadius: "var(--radius-sm)", marginBottom: "var(--space-6)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 920, margin: "0 auto" }}>
            <div className="skeleton" style={{ height: 280, borderRadius: "var(--radius-2xl)" }} />
            <div className="skeleton" style={{ height: 160, borderRadius: "var(--radius-2xl)" }} />
            <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-2xl)" }} />
          </div>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  if (error || !job) {
    return (
      <PageLayout pageTitle="Job Details">
        <div className="jd-error-state animate-fade-in">
          <span className="jd-error-state__glyph">◻</span>
          <h3>Job not found</h3>
          <p>{error ?? "This role may have been removed."}</p>
          <button className="btn btn-primary" onClick={() => navigate("/jobs")}>← Back to Jobs</button>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  const deadline = getDeadlineInfo(job.deadline);
  const verdict = getMatchVerdict(job.matchScore);
  const majorSkills = job.skillRequirements.filter((s: any) => s.required);
  const minorSkills = job.skillRequirements.filter((s: any) => !s.required);
  const hasApplied = applySuccess || job.hasApplied;
  const appStatus = job.applicationStatus
    ? APPLICATION_STATUS_DISPLAY[job.applicationStatus]
    : APPLICATION_STATUS_DISPLAY["PENDING"];
  const typeInfo = job.jobType ? JOB_TYPE_META[job.jobType] : null;

  return (
    <PageLayout pageTitle="Job Details">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="jd-topbar">
        <button className="jd-back" onClick={() => navigate("/jobs")}>
          <span>←</span> Back to Jobs
        </button>

        <SaveButton
          isSaved={isSaved}
          isLoading={saveLoading}
          isToggling={isToggling}
          onToggle={toggleSave}
          variant="icon"
        />
      </div>

      {/* ✨ SINGLE COLUMN LAYOUT */}
      <div className="jd-container animate-fade-in">

        {/* ══ HERO SECTION ══ */}
        <section className="jd-hero card-interactive">
          <div className="jd-hero__stripe"
            style={{ background: verdict.trackColor, width: `${job.matchScore}%` }} />

          <div className="jd-hero__grid">
            {/* Left: Company logo */}
            <div className="jd-hero__logo-wrap">
              <div className="jd-hero__logo">{job.companyName.charAt(0)}</div>
            </div>

            {/* Center: Title + Meta */}
            <div className="jd-hero__content">
              <span className="jd-hero__company">{job.companyName}</span>
              <h1 className="jd-hero__title">{job.title}</h1>
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
                  <span className="jd-chip jd-chip--money">
                    <span className="jd-chip__icon">$</span>
                    {job.salaryRange}
                  </span>
                )}
                <span className={`jd-chip ${deadline.urgent ? "jd-chip--urgent" : ""}`}>
                  <span className="jd-chip__icon">◷</span>
                  {deadline.label}
                </span>
              </div>
            </div>

            {/* Right: Match Ring */}
            <div className="jd-hero__ring-wrap">
              <ScoreRing score={job.matchScore} size={88} />
            </div>
          </div>

          {/* Progress breakdown */}
          <div className="jd-breakdown">
            <div className="jd-breakdown__track">
              <div className="jd-breakdown__fill jd-breakdown__fill--cyan"
                style={{ width: `${majorSkills.length > 0 ? (majorSkills.filter((s: any) => s.userBadge).length / majorSkills.length) * 80 : 0}%` }} />
              <div className="jd-breakdown__fill jd-breakdown__fill--violet"
                style={{ left: "80%", width: `${minorSkills.length > 0 ? (minorSkills.filter((s: any) => s.userBadge).length / minorSkills.length) * 20 : 0}%` }} />
              <div className="jd-breakdown__divider" style={{ left: "80%" }} />
            </div>
            <div className="jd-breakdown__labels">
              <span>
                <span className="jd-dot jd-dot--cyan" />
                Required {majorSkills.filter((s: any) => s.userBadge).length}/{majorSkills.length}
                <span className="jd-dim"> · 80% weight</span>
              </span>
              <span>
                <span className="jd-dot jd-dot--violet" />
                Nice-to-have {minorSkills.filter((s: any) => s.userBadge).length}/{minorSkills.length}
                <span className="jd-dim"> · 20% weight</span>
              </span>
            </div>
          </div>
        </section>

        {/* ══ APPLY SECTION ══ */}
        <section className="jd-apply-section">
          {hasApplied ? (
            <div className="jd-applied-banner">
              <div className="jd-applied-banner__left">
                <div className="jd-applied-banner__check">
                  <Icon name="check" size={18} label="" />
                </div>
                <div>
                  <h3 className="jd-applied-banner__title">Application Submitted</h3>
                  {job.applicationStatus && (
                    <span className="jd-applied-banner__status" style={{
                      color: appStatus.color,
                      borderColor: appStatus.color,
                      background: `${appStatus.color}18`,
                    }}>
                      <span>{appStatus.glyph}</span>
                      {appStatus.label}
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate("/applications")}>
                My Applications →
              </button>
            </div>
          ) : (
            <div className="jd-apply-cta">
              <div className="jd-apply-cta__left">
                <ScoreRing score={job.matchScore} size={64} />
                <div className="jd-apply-cta__text">
                  <span className="jd-apply-cta__verdict" style={{ color: verdict.color }}>
                    {verdict.label}
                  </span>
                  <p className="jd-apply-cta__desc">
                    {job.canApply
                      ? "You meet all skill requirements"
                      : `Missing: ${job.missingMajorSkills.join(", ")}`}
                  </p>
                </div>
              </div>

              <div className="jd-apply-cta__buttons">
                {!job.canApply && (
                  <button className="btn btn-ghost" onClick={() => navigate("/skills")}>
                    Verify Skills →
                  </button>
                )}
                <button
                  className={`btn ${job.canApply ? "btn-primary" : "jd-btn-locked"}`}
                  onClick={() => job.canApply && setShowApplyModal(true)}
                  disabled={!job.canApply}
                >
                  {job.canApply
                    ? <><span>Apply Now</span><span>→</span></>
                    : <><span>◎</span><span>Badges Required</span></>
                  }
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ══ SKILLS SECTION ══ */}
        <SkillsSection majorSkills={majorSkills} minorSkills={minorSkills} navigate={navigate} />

        {/* ══ ABOUT SECTION ══ */}
        {job.description && (
          <section className="jd-about">
            <div className="jd-about__header">
              <span className="jd-about__icon">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="0.5" y="1.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="0.5" y="5" width="9" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="0.5" y="8.5" width="11" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              </span>
              <h2 className="jd-about__title">About this role</h2>
            </div>
            <div className="jd-about__body">
              <RichText text={job.description} />
            </div>
          </section>
        )}

        {/* ══ COMPANY SECTION ══ */}
        <section className="jd-company-section">
          <div className="jd-company-section__logo">{job.companyName.charAt(0)}</div>
          <div className="jd-company-section__info">
            <p className="jd-company-section__name">{job.companyName}</p>
            {job.location && (
              <p className="jd-company-section__loc"><span>◍</span> {job.location}</p>
            )}
          </div>
        </section>

      </div>

      {showApplyModal && (
        <ApplyModal
          job={job} majorSkills={majorSkills} minorSkills={minorSkills} jobId={jobId!}
          onClose={() => { setShowApplyModal(false); setApplyError(null); }}
          onApply={handleApply} isApplying={isApplying} applyError={applyError}
        />
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// ✨ NEW STYLES — Single Column Layout
// ---------------------------------------------------------------------------

const styles = `
@keyframes jd-bar-in { from { width: 0 } }
@keyframes jd-spin { to { transform: rotate(360deg) } }
@keyframes jd-save-pop {
  0% { transform: scale(1) }
  40% { transform: scale(1.28) }
  70% { transform: scale(0.92) }
  100% { transform: scale(1) }
}
@keyframes jd-save-pulse {
  0%,100% { opacity: 1 }
  50% { opacity: 0.35 }
}

/* ── Top bar ─────────────────────────────────────────────────────────── */
.jd-topbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-6);
}

.jd-back {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: var(--font-display); font-size: var(--text-xs);
  font-weight: var(--weight-semibold); letter-spacing: var(--tracking-wider);
  text-transform: uppercase; color: var(--color-text-muted);
  background: none; border: none; cursor: pointer; padding: 0;
  transition: color var(--duration-base) var(--ease-smooth),
    gap var(--duration-base) var(--ease-smooth);
}
.jd-back:hover { color: var(--color-text-secondary); gap: var(--space-3); }

/* ── Save Button ─────────────────────────────────────────────────────── */
.jd-save-btn {
  display: inline-flex; align-items: center; gap: var(--space-2);
  border-radius: var(--radius-lg); cursor: pointer;
  font-family: var(--font-display); font-weight: var(--weight-semibold);
  font-size: var(--text-xs); letter-spacing: var(--tracking-wide);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-overlay);
  color: var(--color-text-muted);
  transition: all var(--duration-base) var(--ease-smooth);
}
.jd-save-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-border-strong);
  color: var(--color-text-secondary);
}

.jd-save-btn--icon {
  width: 34px; height: 34px; padding: 0;
  justify-content: center;
}

.jd-save-btn--full {
  padding: var(--space-2) var(--space-4);
  min-width: 104px; justify-content: center;
  white-space: nowrap;
}

.jd-save-btn--saved {
  color: var(--color-gold-light);
  background: var(--color-xp-gold-bg);
  border-color: var(--color-xp-gold-border);
  box-shadow: 0 0 10px var(--color-xp-gold-border);
}
.jd-save-btn--saved:hover:not(:disabled) {
  background: var(--color-xp-gold-bg);
  border-color: var(--color-gold-light);
  filter: brightness(1.1);
}

.jd-save-btn--toggling { opacity: 0.75; cursor: wait; }
.jd-save-btn--skeleton { opacity: 0.4; cursor: default; }

.jd-save-btn--saved .jd-save-btn__icon {
  animation: jd-save-pop 0.38s var(--ease-spring) both;
}

.jd-save-btn__icon--pulse { animation: jd-save-pulse 1.2s ease-in-out infinite; }

.jd-save-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-top-color: currentColor; border-radius: 50%;
  animation: jd-spin 0.65s linear infinite;
}

/* ✨ Container — single column, centered, max-width */
.jd-container {
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.jd-dim { color: var(--color-text-disabled); }

/* ══ HERO SECTION ══════════════════════════════════════════════════════ */
.jd-hero {
  position: relative;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.jd-hero__stripe {
  position: absolute; top: 0; left: 0; height: 3px;
  animation: jd-bar-in 1s var(--ease-out) both;
  transition: width 1.2s var(--ease-out);
}

/* Grid: logo | content | ring */
.jd-hero__grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-5);
  align-items: start;
}

.jd-hero__logo-wrap { flex-shrink: 0; }
.jd-hero__logo {
  width: 56px; height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-weight: var(--weight-extrabold);
  font-size: var(--text-2xl);
  color: var(--color-primary-400);
}

.jd-hero__content { min-width: 0; }

.jd-hero__company {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-2);
}

.jd-hero__title {
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 3.2vw, 2.2rem);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3);
}

.jd-hero__chips {
  display: flex; flex-wrap: wrap; gap: var(--space-2);
}

.jd-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 11px;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: border-color var(--duration-base) var(--ease-smooth);
}
.jd-chip:hover { border-color: var(--color-border-default); }
.jd-chip__icon { font-size: 10px; opacity: 0.6; }
.jd-chip--money {
  color: var(--color-green-400);
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
}
.jd-chip--urgent {
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
}

.jd-hero__ring-wrap { flex-shrink: 0; }

/* Breakdown bar */
.jd-breakdown {
  display: flex; flex-direction: column; gap: var(--space-2);
}

.jd-breakdown__track {
  position: relative; height: 6px;
  background: var(--color-bg-overlay);
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.jd-breakdown__fill {
  position: absolute; top: 0; height: 100%;
  border-radius: var(--radius-full);
  transition: width 1s var(--ease-out);
}
.jd-breakdown__fill--cyan {
  left: 0;
  background: var(--color-cyan-400);
}
.jd-breakdown__fill--violet {
  background: var(--color-purple-400);
}

.jd-breakdown__divider {
  position: absolute; top: 0; bottom: 0; width: 1px;
  background: var(--color-border-strong);
}

.jd-breakdown__labels {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.jd-dot {
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; margin-right: var(--space-1);
  vertical-align: middle;
}
.jd-dot--cyan {
  background: var(--color-cyan-400);
  box-shadow: 0 0 5px var(--color-cyan-glow);
}
.jd-dot--violet {
  background: var(--color-purple-400);
  box-shadow: 0 0 5px var(--color-purple-glow);
}

/* ══ APPLY SECTION ═════════════════════════════════════════════════════ */
.jd-apply-section {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  padding: var(--space-5) var(--space-6);
}

/* Applied state */
.jd-applied-banner {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.jd-applied-banner__left {
  display: flex; align-items: center; gap: var(--space-4);
  flex: 1;
}

.jd-applied-banner__check {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--color-success-bg);
  border: 2px solid var(--color-success-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-green-400);
  box-shadow: var(--glow-green);
  flex-shrink: 0;
}

.jd-applied-banner__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.jd-applied-banner__status {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  border: 1px solid;
}

/* CTA state */
.jd-apply-cta {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.jd-apply-cta__left {
  display: flex; align-items: center; gap: var(--space-4);
  flex: 1;
}

.jd-apply-cta__text { min-width: 0; }

.jd-apply-cta__verdict {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
  margin-bottom: 2px;
}

.jd-apply-cta__desc {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.jd-apply-cta__buttons {
  display: flex; align-items: center; gap: var(--space-3);
  flex-shrink: 0;
}

.jd-btn-locked {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  background: var(--color-bg-overlay);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-subtle);
  cursor: not-allowed;
}

/* ══ SKILLS SECTION ════════════════════════════════════════════════════ */
.jd-skills {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.jd-skills__head {
  padding: var(--space-5) var(--space-6) var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  background: linear-gradient(180deg, var(--color-bg-hover) 0%, transparent 100%);
}

.jd-skills__title-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.jd-skills__title-left {
  display: flex; align-items: center; gap: var(--space-2);
}

.jd-skills__star-icon {
  width: 26px; height: 26px;
  border-radius: var(--radius-md);
  background: var(--color-xp-gold-bg);
  border: 1px solid var(--color-xp-gold-border);
  color: var(--color-gold-light);
  font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.jd-skills__title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tight);
  margin: 0;
}

.jd-skills__desc {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.jd-gate-chip {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  white-space: nowrap;
}

.jd-gate-chip--open {
  color: var(--color-green-400);
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
}

.jd-gate-chip--locked {
  color: var(--color-text-muted);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-subtle);
}

.jd-skills__progress {
  display: flex; align-items: center; gap: var(--space-3);
}

.jd-skills__progress-track {
  flex: 1; height: 4px;
  background: var(--color-bg-overlay);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.jd-skills__progress-fill {
  position: absolute; top: 0; left: 0; height: 100%;
  background: linear-gradient(90deg, var(--color-cyan-500), var(--color-cyan-400));
  border-radius: var(--radius-full);
  box-shadow: 0 0 8px var(--color-cyan-glow);
  transition: width 1s var(--ease-out);
}

.jd-skills__progress-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.jd-skills__group {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}
.jd-skills__group:last-child { border-bottom: none; }

.jd-skills__group-label {
  display: flex; align-items: center; gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.jd-skills__group-note {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-disabled);
}

.jd-label-chip {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--tracking-wider);
}

.jd-label-chip--required {
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
}

.jd-label-chip--optional {
  color: var(--color-purple-400);
  background: var(--color-premium-bg);
  border: 1px solid var(--color-premium-border);
}

/* ✨ TWO-COLUMN GRID for skills */
.jd-skill-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

/* Skill row */
.jd-skill-row {
  position: relative;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--duration-base) var(--ease-smooth),
    transform var(--duration-base) var(--ease-spring);
}
.jd-skill-row:hover { transform: translateX(3px); }
.jd-skill-row--missing { border-color: var(--color-danger-border); }

.jd-skill-row__edge {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
}

.jd-skill-row__body {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 3px);
  gap: var(--space-3);
}

.jd-skill-row__left {
  display: flex; align-items: center; gap: var(--space-3);
  flex: 1; min-width: 0;
}

.jd-skill-row__right { flex-shrink: 0; }

.jd-skill-row__name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jd-skill-orb {
  width: 20px; height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

.jd-skill-orb--ok {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-green-400);
}

.jd-skill-orb--warn {
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger);
}

.jd-skill-orb--dim {
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-disabled);
}

.jd-tier-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  border: 1px solid;
  font-weight: 500;
  cursor: default;
}

.jd-tier-pill__tier { font-weight: 700; }
.jd-tier-pill__sep { opacity: 0.4; }

.jd-verify-btn {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: 4px 12px;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-muted);
  transition: all var(--duration-base) var(--ease-smooth);
}

.jd-verify-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.jd-verify-btn--required {
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
}

.jd-verify-btn--required:hover {
  background: var(--color-danger-bg);
  filter: brightness(1.15);
}

/* ══ ABOUT SECTION ═════════════════════════════════════════════════════ */
.jd-about {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.jd-about__header {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-5) var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.jd-about__icon {
  width: 26px; height: 26px;
  border-radius: var(--radius-md);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-muted);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.jd-about__title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tight);
  margin: 0;
}

.jd-about__body { padding: var(--space-6); }

.jd-richtext { display: flex; flex-direction: column; }

.jd-richtext__heading {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-text-secondary);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  margin: var(--space-4) 0 var(--space-2);
}

.jd-richtext__para {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.jd-richtext__bullet {
  display: flex; align-items: flex-start; gap: var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  padding: 2px 0;
}

.jd-richtext__dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--color-primary-400);
  margin-top: 8px;
  flex-shrink: 0;
  box-shadow: 0 0 5px var(--color-primary-glow);
}

/* ══ COMPANY SECTION ═══════════════════════════════════════════════════ */
.jd-company-section {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex; align-items: center; gap: var(--space-4);
  transition: border-color var(--duration-base) var(--ease-smooth);
}

.jd-company-section:hover { border-color: var(--color-border-strong); }

.jd-company-section__logo {
  width: 48px; height: 48px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-weight: var(--weight-extrabold);
  font-size: var(--text-lg);
  color: var(--color-primary-400);
}

.jd-company-section__info { min-width: 0; }

.jd-company-section__name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.jd-company-section__loc {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  display: flex; align-items: center; gap: 4px;
}

/* ══ MODAL (unchanged) ════════════════════════════════════════════════ */
.jd-modal-backdrop {
  position: fixed; inset: 0; z-index: var(--z-modal);
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-4);
}

.jd-modal {
  width: 100%; max-width: 440px; max-height: 90vh;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: var(--shadow-xl), inset 0 1px 0 var(--color-border-subtle);
}

.jd-modal__header {
  padding: var(--space-4) var(--space-5);
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.jd-modal__header-left {
  display: flex; align-items: center; gap: var(--space-3);
}

.jd-modal__logo {
  width: 36px; height: 36px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-weight: var(--weight-extrabold);
  font-size: var(--text-base);
  color: var(--color-primary-400);
}

.jd-modal__job-title {
  font-family: var(--font-display);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  margin: 0 0 2px;
}

.jd-modal__company {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.jd-modal__match {
  padding: var(--space-4) var(--space-5);
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex; flex-direction: column; gap: var(--space-3);
}

.jd-modal__match-row {
  display: flex; align-items: center; gap: var(--space-4);
}

.jd-modal__verdict {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
  display: block;
  margin-bottom: 2px;
}

.jd-modal__match-detail {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
}

.jd-modal__track {
  height: 4px;
  background: var(--color-bg-overlay);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.jd-modal__track-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.8s var(--ease-out);
}

.jd-modal__body {
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--space-4);
}

.jd-modal__disclaimer {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.jd-modal__priority {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: var(--space-4);
}

.jd-modal__priority-head {
  display: flex; align-items: center; gap: var(--space-3);
}

.jd-modal__priority-title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.jd-modal__priority-optional {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  letter-spacing: var(--tracking-wider);
}

.jd-modal__priority-desc {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  line-height: var(--leading-relaxed);
}

.jd-slot-pill {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  background: var(--color-xp-gold-bg);
  border: 1px solid var(--color-xp-gold-border);
  color: var(--color-gold-light);
  white-space: nowrap;
  flex-shrink: 0;
}

.jd-slot-pill--full {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.jd-slot-meter {
  display: flex; align-items: center; gap: var(--space-2);
}

.jd-slot-pip {
  flex: 1; height: 6px;
  border-radius: var(--radius-full);
  transition: background var(--duration-base);
}

.jd-slot-pip--taken { background: var(--color-danger); }
.jd-slot-pip--open { background: var(--color-green-400); }

.jd-slot-meter__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.jd-slot-notice {
  display: flex; align-items: flex-start; gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
}

.jd-slot-notice p { margin: 0; }

.jd-slot-notice--full {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-text-muted);
}

.jd-slot-notice--active {
  background: var(--color-xp-gold-bg);
  border-color: var(--color-xp-gold-border);
  color: var(--color-gold-light);
}

.jd-slot-loading {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.jd-slot-empty {
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.jd-text-link {
  background: none;
  border: none;
  color: var(--color-primary-400);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
}

.jd-text-link:hover { text-decoration: underline; }

.jd-slot-options {
  display: flex; flex-direction: column; gap: var(--space-2);
}

.jd-slot-opt {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all var(--duration-base) var(--ease-smooth);
}

.jd-slot-opt:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-strong);
}

.jd-slot-opt--selected {
  border-color: var(--color-primary-400);
  background: var(--color-primary-glow);
}

.jd-slot-opt__glyph {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.jd-slot-opt__label {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
}

.jd-slot-opt--priority .jd-slot-opt__label {
  color: var(--color-gold-light);
}

.jd-slot-opt__badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-bg-overlay);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.jd-modal__error {
  display: flex; align-items: flex-start; gap: var(--space-3);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.jd-modal__error p { margin: 0; }

.jd-modal__footer {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border-subtle);
  display: flex; justify-content: flex-end; gap: var(--space-3);
  flex-shrink: 0;
}

/* ══ ERROR STATE ══════════════════════════════════════════════════════ */
.jd-error-state {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) var(--space-8);
  text-align: center;
}

.jd-error-state__glyph {
  font-size: 2.5rem;
  font-family: var(--font-mono);
  color: var(--color-text-disabled);
}

.jd-error-state h3 {
  font-family: var(--font-display);
  font-weight: var(--weight-extrabold);
  font-size: var(--text-xl);
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tight);
  margin: 0;
}

.jd-error-state p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0;
}

/* ══ SPINNER ══════════════════════════════════════════════════════════ */
.jd-spinner {
  display: inline-block; width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: jd-spin 0.7s linear infinite;
}

/* ══ RESPONSIVE ════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .jd-container { max-width: 100%; padding: 0 var(--space-4); }
  .jd-hero__grid { grid-template-columns: 1fr; gap: var(--space-4); }
  .jd-hero__ring-wrap { justify-self: center; }
  .jd-apply-cta { flex-direction: column; align-items: stretch; }
  .jd-apply-cta__buttons { flex-direction: column; }
  .jd-skill-grid { grid-template-columns: 1fr; }
  .jd-applied-banner { flex-direction: column; align-items: stretch; }
}

@media (max-width: 600px) {
  .jd-modal {
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
    align-self: flex-end;
  }
  .jd-modal-backdrop { align-items: flex-end; padding: 0; }
}
`;

export default JobDetailsPage;