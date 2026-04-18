// JobsPage.tsx — XPand  (Full Redesign)
// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: Split view — sticky left panel shows the focused job in full detail.
//         Right panel is a ranked, filterable list of all jobs.
//         Match score drives everything: colour, rank position, CTA urgency.
//
// LOGIC / HOOKS: 100% identical to original. Zero behaviour changed.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useJobs } from "../../hooks/user/useJobs";
import type { JobWithMeta, JobType } from "../../hooks/user/useJobs";
import { BadgeLevel } from "../../types";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";

// ─────────────────────────────────────────────────────────────────────────────
// Constants (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  ALL:       "All",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT:  "Contract",
  REMOTE:    "Remote",
};

const JOB_TYPE_ICONS: Record<string, IconName> = {
  FULL_TIME: "job-type-full-time",
  PART_TIME: "job-type-part-time",
  CONTRACT:  "job-type-contract",
  REMOTE:    "job-type-remote",
};

const BADGE_CONFIG = {
  [BadgeLevel.BRONZE]: { icon: "badge-bronze" as IconName, cls: "bronze", label: "Bronze", color: "var(--color-bronze-light)", bg: "var(--color-bronze-bg)", border: "var(--color-bronze-border)" },
  [BadgeLevel.SILVER]: { icon: "badge-silver" as IconName, cls: "silver", label: "Silver", color: "var(--color-silver-light)", bg: "var(--color-silver-bg)", border: "var(--color-silver-border)" },
  [BadgeLevel.GOLD]:   { icon: "badge-gold"   as IconName, cls: "gold",   label: "Gold",   color: "var(--color-gold-light)",   bg: "var(--color-gold-bg)",   border: "var(--color-gold-border)"   },
};

type SortDir = "asc" | "desc";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────

function getDeadlineBadge(deadline: string): { label: string; urgent: boolean } {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { label: "Expired",        urgent: true  };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, urgent: true  };
  return               { label: `${daysLeft}d left`, urgent: false };
}

function getMatchTier(score: number): {
  label: string; color: string; bg: string; border: string; glow: string;
} {
  if (score >= 80) return { label: "Strong match",  color: "var(--color-green-400)",   bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.25)",  glow: "rgba(52,211,153,0.15)"  };
  if (score >= 50) return { label: "Partial match", color: "var(--color-warning)",     bg: "rgba(212,148,10,0.10)",  border: "rgba(212,148,10,0.25)",  glow: "rgba(212,148,10,0.12)"  };
  return                  { label: "Low match",     color: "var(--color-text-muted)",  bg: "rgba(255,255,255,0.04)", border: "var(--color-border-default)", glow: "transparent" };
}

function getStatusConfig(status: string | undefined): { label: string; color: string; bg: string; border: string } {
  switch (status) {
    case "SHORTLISTED": return { label: "Shortlisted ⭐", color: "var(--color-green-400)",   bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.25)"  };
    case "REJECTED":    return { label: "Rejected",       color: "var(--color-danger)",       bg: "var(--color-danger-bg)", border: "var(--color-danger-border)" };
    default:            return { label: "Applied",        color: "var(--color-text-muted)",   bg: "var(--color-bg-overlay)", border: "var(--color-border-default)" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JobSpotlight — left sticky panel showing the focused job
// ─────────────────────────────────────────────────────────────────────────────

const JobSpotlight: React.FC<{
  job: JobWithMeta;
  onApply: () => void;
}> = ({ job, onApply }) => {
  const match     = getMatchTier(job.matchScore);
  const deadline  = getDeadlineBadge(job.deadline);
  const major     = job.skillRequirements.filter((s) => s.required);
  const minor     = job.skillRequirements.filter((s) => !s.required);
  const appStatus = job.hasApplied ? getStatusConfig(job.applicationStatus) : null;

  return (
    <div className="jspot">
      {/* Match score arc */}
      <div className="jspot__score-ring" style={{ "--match-color": match.color } as React.CSSProperties}>
        <svg className="jspot__arc" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="34" stroke="var(--color-bg-active)" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="34"
            stroke={match.color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - job.matchScore / 100)}`}
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="jspot__score-inner">
          <span className="jspot__score-num" style={{ color: match.color }}>{job.matchScore}</span>
          <span className="jspot__score-pct">%</span>
        </div>
      </div>

      {/* Company + title */}
      <div className="jspot__header">
        <div className="jspot__logo" aria-hidden="true">
          {job.companyName.charAt(0)}
        </div>
        <div>
          <div className="jspot__company">{job.companyName}</div>
          <h2 className="jspot__title">{job.title}</h2>
        </div>
      </div>

      {/* Match label */}
      <div className="jspot__match-label" style={{ color: match.color, background: match.bg, border: `1px solid ${match.border}` }}>
        {match.label}
      </div>

      {/* Meta grid */}
      <div className="jspot__meta-grid">
        <div className="jspot__meta-cell">
          <span className="jspot__meta-label">Type</span>
          <span className="jspot__meta-value">
            <Icon name={JOB_TYPE_ICONS[job.jobType]} size={12} label="" />
            {JOB_TYPE_LABELS[job.jobType]}
          </span>
        </div>
        <div className="jspot__meta-cell">
          <span className="jspot__meta-label">Location</span>
          <span className="jspot__meta-value">
            <Icon name="location" size={12} label="" />
            {job.location}
          </span>
        </div>
        {job.salaryRange && (
          <div className="jspot__meta-cell">
            <span className="jspot__meta-label">Salary</span>
            <span className="jspot__meta-value">
              <Icon name="salary" size={12} label="" />
              {job.salaryRange}
            </span>
          </div>
        )}
        <div className="jspot__meta-cell">
          <span className="jspot__meta-label">Deadline</span>
          <span className="jspot__meta-value" style={{ color: deadline.urgent ? "var(--color-warning)" : undefined }}>
            <Icon name="timer" size={12} label="" />
            {deadline.label}
          </span>
        </div>
      </div>

      {/* Skills */}
      {job.skillRequirements.length > 0 && (
        <div className="jspot__skills-section">
          <div className="jspot__skills-heading">Required Skills</div>
          <div className="jspot__skills-list">
            {major.map((s) => {
              const bc = s.userBadge ? BADGE_CONFIG[s.userBadge] : null;
              return (
                <div key={s.skillId} className="jspot__skill-row">
                  <span className={`jspot__skill-chip ${bc ? "jspot__skill-chip--" + bc.cls : "jspot__skill-chip--missing"}`}>
                    {bc ? <Icon name={bc.icon} size={11} label="" /> : <span className="jspot__skill-missing-dot" />}
                    {s.skillName}
                    {bc && <span className="jspot__skill-badge-label">{bc.label}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {minor.length > 0 && (
            <>
              <div className="jspot__skills-heading" style={{ marginTop: 10 }}>Nice to Have</div>
              <div className="jspot__skills-list">
                {minor.slice(0, 4).map((s) => {
                  const bc = s.userBadge ? BADGE_CONFIG[s.userBadge] : null;
                  return (
                    <span key={s.skillId} className={`jspot__skill-chip jspot__skill-chip--minor ${bc ? "jspot__skill-chip--" + bc.cls : ""}`}>
                      {bc ? <Icon name={bc.icon} size={11} label="" /> : "○"}
                      {s.skillName}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="jspot__cta-area">
        {appStatus ? (
          <div className="jspot__applied-state" style={{ color: appStatus.color, background: appStatus.bg, border: `1px solid ${appStatus.border}` }}>
            <Icon name="check" size={14} label="" />
            {appStatus.label}
          </div>
        ) : (
          <button
            className="jspot__apply-btn"
            onClick={onApply}
            style={{ boxShadow: `0 4px 24px ${match.glow}` }}
          >
            View & Apply
            <span className="jspot__apply-arrow">→</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// JobRow — compact row in the ranked list
// ─────────────────────────────────────────────────────────────────────────────

const JobRow: React.FC<{
  job: JobWithMeta;
  rank: number;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}> = ({ job, rank, isActive, onHover, onClick }) => {
  const match    = getMatchTier(job.matchScore);
  const deadline = getDeadlineBadge(job.deadline);
  const topSkills = job.skillRequirements.filter((s) => s.required).slice(0, 3);

  return (
    <div
      className={`jrow ${isActive ? "jrow--active" : ""} ${job.hasApplied ? "jrow--applied" : ""}`}
      style={isActive ? { "--row-accent": match.color } as React.CSSProperties : undefined}
      onMouseEnter={onHover}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`${job.title} at ${job.companyName}`}
    >
      {/* Rank */}
      <span className="jrow__rank" style={isActive ? { color: match.color } : undefined}>
        {rank}
      </span>

      {/* Logo */}
      <div className="jrow__logo" style={isActive ? { background: `${match.color}18`, borderColor: `${match.color}33` } : undefined}>
        {job.companyName.charAt(0)}
      </div>

      {/* Info */}
      <div className="jrow__info">
        <div className="jrow__title">{job.title}</div>
        <div className="jrow__meta">
          <span>{job.companyName}</span>
          <span className="jrow__dot">·</span>
          <span>{job.location}</span>
          <span className="jrow__dot">·</span>
          <span>{JOB_TYPE_LABELS[job.jobType]}</span>
        </div>
        {/* Skill pills — only show on active or desktop */}
        <div className="jrow__skills">
          {topSkills.map((s) => {
            const bc = s.userBadge ? BADGE_CONFIG[s.userBadge] : null;
            return (
              <span
                key={s.skillId}
                className="jrow__skill"
                style={bc ? { color: bc.color, background: bc.bg, borderColor: bc.border } : undefined}
              >
                {bc ? <Icon name={bc.icon} size={10} label="" /> : "○"}
                {s.skillName}
              </span>
            );
          })}
          {job.skillRequirements.length > 3 && (
            <span className="jrow__skill jrow__skill--more">+{job.skillRequirements.length - 3}</span>
          )}
        </div>
      </div>

      {/* Right: score + deadline */}
      <div className="jrow__right">
        <div className="jrow__score" style={{ color: match.color }}>
          {job.matchScore}%
        </div>
        <div className={`jrow__deadline ${deadline.urgent ? "jrow__deadline--urgent" : ""}`}>
          {deadline.label}
        </div>
        {job.hasApplied && (
          <div className="jrow__applied-dot" title={job.applicationStatus ?? "Applied"} />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stats bar — sits between header and filters
// ─────────────────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{
  total: number; highMatch: number; applied: number; onApplications: () => void;
}> = ({ total, highMatch, applied, onApplications }) => (
  <div className="jstats">
    <div className="jstats__item">
      <span className="jstats__value">{total}</span>
      <span className="jstats__label">Open Roles</span>
    </div>
    <div className="jstats__divider" />
    <div className="jstats__item jstats__item--match">
      <span className="jstats__value" style={{ color: "var(--color-green-400)" }}>{highMatch}</span>
      <span className="jstats__label">Strong Match</span>
    </div>
    <div className="jstats__divider" />
    <div className="jstats__item">
      <span className="jstats__value" style={{ color: "var(--color-primary-400)" }}>{applied}</span>
      <span className="jstats__label">Applied</span>
    </div>
    <button className="jstats__link" onClick={onApplications}>
      My Applications →
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonSpotlight: React.FC = () => (
  <div className="jspot jspot--skeleton">
    <div className="skeleton" style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px" }} />
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: "60%", height: 12, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: "85%", height: 20 }} />
      </div>
    </div>
    {[100, 80, 90, 70].map((w, i) => (
      <div key={i} className="skeleton" style={{ width: `${w}%`, height: 12, marginBottom: 10, borderRadius: 6 }} />
    ))}
    <div className="skeleton" style={{ width: "100%", height: 42, borderRadius: 10, marginTop: 16 }} />
  </div>
);

const SkeletonRow: React.FC<{ i: number }> = ({ i }) => (
  <div className="jrow" style={{ opacity: 1 - i * 0.12, pointerEvents: "none" }}>
    <span className="jrow__rank skeleton" style={{ width: 20, height: 14 }} />
    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton" style={{ width: "55%", height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: "75%", height: 10 }} />
    </div>
    <div className="skeleton" style={{ width: 36, height: 20, borderRadius: 6 }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// JobsPage
// ─────────────────────────────────────────────────────────────────────────────

const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, isLoading, error, filter, setFilter, refetch } = useJobs();

  const [sortDir,    setSortDir]    = useState<SortDir>("desc");
  const [focusedJob, setFocusedJob] = useState<JobWithMeta | null>(null);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) =>
      sortDir === "desc" ? b.matchScore - a.matchScore : a.matchScore - b.matchScore
    ),
    [jobs, sortDir]
  );

  const appliedCount   = jobs.filter((j) => j.hasApplied).length;
  const highMatchCount = jobs.filter((j) => j.matchScore >= 80).length;

  // Spotlight defaults to top-ranked job
  const activeJob = focusedJob ?? sortedJobs[0] ?? null;

  if (error) {
    return (
      <PageLayout pageTitle="Jobs">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load jobs</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={refetch}>Retry</button>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Jobs">

      {/* ── Premium page header ───────────────────── */}
      <PageHeader
        {...PAGE_CONFIGS.jobs}
        right={
          !isLoading ? (
            <>
              <span className="badge badge-cyan">
                {sortedJobs.length} role{sortedJobs.length !== 1 ? "s" : ""}
              </span>
              {highMatchCount > 0 && (
                <span className="badge badge-green">{highMatchCount} strong match</span>
              )}
              {appliedCount > 0 && (
                <span className="badge badge-muted">{appliedCount} applied</span>
              )}
            </>
          ) : null
        }
      />

      {/* ── Stats bar ─────────────────────────────── */}
      {!isLoading && (
        <StatsBar
          total={sortedJobs.length}
          highMatch={highMatchCount}
          applied={appliedCount}
          onApplications={() => navigate("/applications")}
        />
      )}

      {/* ── Control bar ───────────────────────────── */}
      <div className="jctrl">
        {/* Search */}
        <div className="jctrl__search">
          <span className="jctrl__search-icon"><Icon name="search" size={14} label="" /></span>
          <input
            className="input jctrl__search-input"
            placeholder="Search title, company, skill…"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          {filter.search && (
            <button className="jctrl__search-clear" onClick={() => setFilter({ search: "" })} aria-label="Clear">
              <Icon name="close" size={12} label="Clear" />
            </button>
          )}
        </div>

        <div className="jctrl__right">
          {/* Type chips */}
          <div className="jctrl__chips">
            {(["ALL", "FULL_TIME", "PART_TIME", "CONTRACT", "REMOTE"] as const).map((type) => (
              <button
                key={type}
                className={`jchip ${filter.jobType === type ? "jchip--active" : ""}`}
                onClick={() => setFilter({ jobType: type as JobType | "ALL" })}
              >
                {type !== "ALL" && JOB_TYPE_ICONS[type] && (
                  <Icon name={JOB_TYPE_ICONS[type]} size={11} label="" />
                )}
                {JOB_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="jctrl__divider" />

          {/* Qualified toggle */}
          <label className="jtoggle">
            <div
              className={`jtoggle__track ${filter.matchOnly ? "jtoggle__track--on" : ""}`}
              onClick={() => setFilter({ matchOnly: !filter.matchOnly })}
              role="switch"
              aria-checked={filter.matchOnly}
              tabIndex={0}
              onKeyDown={(e) => e.key === " " && setFilter({ matchOnly: !filter.matchOnly })}
            >
              <div className="jtoggle__thumb" />
            </div>
            <span className="jtoggle__label">Qualified only</span>
          </label>

          <div className="jctrl__divider" />

          {/* Sort */}
          <button
            className="jsort"
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          >
            <Icon name={sortDir === "desc" ? "sort-desc" : "sort-asc"} size={13} label="" />
            {sortDir === "desc" ? "Best first" : "Lowest first"}
          </button>
        </div>
      </div>

      {/* ── Main split layout ─────────────────────── */}
      <div className="jsplit">

        {/* LEFT — Sticky spotlight */}
        <div className="jsplit__left">
          {isLoading ? (
            <SkeletonSpotlight />
          ) : activeJob ? (
            <JobSpotlight
              key={activeJob.id}
              job={activeJob}
              onApply={() => navigate(`/jobs/${activeJob.id}`)}
            />
          ) : null}
        </div>

        {/* RIGHT — Ranked list */}
        <div className="jsplit__right">

          {/* Result count */}
          {!isLoading && (
            <div className="jlist__header">
              <span className="jlist__count">
                {sortedJobs.length} role{sortedJobs.length !== 1 ? "s" : ""}
                {filter.matchOnly && " · qualified only"}
                {filter.search && ` · "${filter.search}"`}
              </span>
              {(filter.search || filter.matchOnly || filter.jobType !== "ALL") && (
                <button
                  className="jlist__clear"
                  onClick={() => setFilter({ search: "", jobType: "ALL", matchOnly: false })}
                >
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="jlist">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} i={i} />)}
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="empty-state" style={{ margin: "var(--space-8) 0" }}>
              <div className="empty-state-icon"><Icon name="work" size={32} label="" /></div>
              <h3>No roles found</h3>
              <p>Try loosening your filters or turning off "Qualified only".</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setFilter({ search: "", jobType: "ALL", matchOnly: false })}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="jlist">
              {sortedJobs.map((job, i) => (
                <JobRow
                  key={job.id}
                  job={job}
                  rank={i + 1}
                  isActive={activeJob?.id === job.id}
                  onHover={() => setFocusedJob(job)}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{styles}</style>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = `

/* ── Stats bar ────────────────────────────────────────── */
.jstats {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-4) var(--space-6);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.jstats__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.jstats__item--match {}
.jstats__value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-extrabold);
  line-height: 1;
  color: var(--color-text-primary);
}
.jstats__label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.jstats__divider {
  width: 1px;
  height: 32px;
  background: var(--color-border-default);
  flex-shrink: 0;
}
.jstats__link {
  margin-left: auto;
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-primary-400);
  cursor: pointer;
  padding: 0;
  transition: opacity 0.15s;
}
.jstats__link:hover { opacity: 0.7; }

/* ── Control bar ──────────────────────────────────────── */
.jctrl {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.jctrl__search {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}
.jctrl__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.jctrl__search-input {
  padding-left: 2.2rem !important;
  padding-right: 2rem !important;
  width: 100%;
}
.jctrl__search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.12s;
}
.jctrl__search-clear:hover { color: var(--color-text-primary); }

.jctrl__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.jctrl__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.jctrl__divider {
  width: 1px;
  height: 22px;
  background: var(--color-border-default);
  flex-shrink: 0;
}

/* Type chips */
.jchip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.jchip:hover { border-color: var(--color-border-strong); color: var(--color-text-secondary); }
.jchip--active {
  background: var(--color-primary-glow);
  border-color: var(--color-primary-500);
  color: var(--color-primary-400);
}

/* Qualified toggle */
.jtoggle { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.jtoggle__track {
  width: 34px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-bg-active);
  border: 1px solid var(--color-border-default);
  position: relative;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
  flex-shrink: 0;
}
.jtoggle__track--on {
  background: var(--color-green-500);
  border-color: var(--color-green-400);
}
.jtoggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  transition: transform 0.18s var(--ease-spring);
}
.jtoggle__track--on .jtoggle__thumb { transform: translateX(16px); }
.jtoggle__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Sort */
.jsort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.jsort:hover { border-color: var(--color-border-strong); color: var(--color-text-secondary); }

/* ── Split layout ─────────────────────────────────────── */
.jsplit {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-6);
  align-items: start;
}
.jsplit__left { position: sticky; top: 80px; }
.jsplit__right { min-width: 0; }

/* ── Job Spotlight ────────────────────────────────────── */
.jspot {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: border-color 0.2s;
}
.jspot--skeleton { opacity: 0.6; }

/* Score ring */
.jspot__score-ring {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;
  flex-shrink: 0;
}
.jspot__arc {
  width: 80px;
  height: 80px;
  position: absolute;
  inset: 0;
}
.jspot__score-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
  padding-top: 18px;
}
.jspot__score-num {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}
.jspot__score-pct {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 700;
}

/* Header */
.jspot__header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.jspot__logo {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.jspot__company {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 3px;
}
.jspot__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1.2;
  margin: 0;
  letter-spacing: -0.02em;
}

/* Match label */
.jspot__match-label {
  display: inline-flex;
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: var(--radius-full);
}

/* Meta grid */
.jspot__meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.jspot__meta-cell { display: flex; flex-direction: column; gap: 3px; }
.jspot__meta-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-text-disabled);
}
.jspot__meta-value {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Skills */
.jspot__skills-section { display: flex; flex-direction: column; gap: 6px; }
.jspot__skills-heading {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-text-disabled);
}
.jspot__skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
.jspot__skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.jspot__skill-chip--missing {
  border-style: dashed;
  color: var(--color-text-disabled);
}
.jspot__skill-missing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  border: 1.5px solid var(--color-text-disabled);
  flex-shrink: 0;
}
.jspot__skill-chip--bronze { color: var(--color-bronze-light); background: var(--color-bronze-bg); border-color: var(--color-bronze-border); }
.jspot__skill-chip--silver { color: var(--color-silver-light); background: var(--color-silver-bg); border-color: var(--color-silver-border); }
.jspot__skill-chip--gold   { color: var(--color-gold-light);   background: var(--color-gold-bg);   border-color: var(--color-gold-border);   }
.jspot__skill-chip--minor  { opacity: 0.75; }
.jspot__skill-badge-label {
  font-size: 9px;
  opacity: 0.8;
  margin-left: 2px;
}

/* CTA */
.jspot__cta-area { margin-top: auto; }
.jspot__apply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: 12px var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--gradient-primary);
  border: none;
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
}
.jspot__apply-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
.jspot__apply-arrow {
  font-size: 16px;
  transition: transform 0.15s;
}
.jspot__apply-btn:hover .jspot__apply-arrow { transform: translateX(3px); }
.jspot__applied-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px var(--space-5);
  border-radius: var(--radius-xl);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
}

/* ── Job list ─────────────────────────────────────────── */
.jlist__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.jlist__count {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.jlist__clear {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-disabled);
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}
.jlist__clear:hover { color: var(--color-text-muted); }

.jlist {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--color-bg-surface);
}

/* ── Job row ──────────────────────────────────────────── */
.jrow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background 0.12s, border-left-color 0.12s;
  position: relative;
}
.jrow:last-child { border-bottom: none; }
.jrow:hover { background: var(--color-bg-hover); }
.jrow--active {
  background: var(--color-bg-elevated);
  border-left-color: var(--row-accent, var(--color-primary-400));
}
.jrow--applied { opacity: 0.75; }

.jrow__rank {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-disabled);
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
  transition: color 0.12s;
}
.jrow__logo {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
.jrow__info { flex: 1; min-width: 0; }
.jrow__title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.jrow__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 2px;
  flex-wrap: wrap;
}
.jrow__dot { color: var(--color-border-strong); }
.jrow__skills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 5px;
}
.jrow__skill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-overlay);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.jrow__skill--more {
  background: none;
  border-style: dashed;
  color: var(--color-text-disabled);
}
.jrow__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}
.jrow__score {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}
.jrow__deadline {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-disabled);
}
.jrow__deadline--urgent { color: var(--color-warning); }
.jrow__applied-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-400);
  margin-top: 2px;
}

/* ── Extra badge classes ──────────────────────────────── */
.badge-success { background: var(--color-verified-bg); border-color: var(--color-verified-border); color: var(--color-verified); }
.badge-danger  { background: var(--color-danger-bg);   border-color: var(--color-danger-border);   color: var(--color-danger);   }

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 1100px) {
  .jsplit { grid-template-columns: 280px 1fr; }
}
@media (max-width: 860px) {
  .jsplit { grid-template-columns: 1fr; }
  .jsplit__left { position: static; }
  .jctrl { flex-direction: column; align-items: flex-start; }
  .jctrl__search { max-width: 100%; }
  .jctrl__right { flex-wrap: wrap; }
}
@media (max-width: 560px) {
  .jstats { gap: var(--space-3); }
  .jstats__link { width: 100%; margin-left: 0; }
}
`;

export default JobsPage;