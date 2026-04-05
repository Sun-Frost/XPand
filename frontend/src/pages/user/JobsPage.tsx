import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useJobs } from "../../hooks/user/useJobs";
import type { JobWithMeta, JobType } from "../../hooks/user/useJobs";
import { BadgeLevel } from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JOB_TYPE_LABELS: Record<string, string> = {
  ALL: "All Types",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
};

const JOB_TYPE_ICONS: Record<string, string> = {
  FULL_TIME: "🏢",
  PART_TIME: "⏰",
  CONTRACT: "📋",
  REMOTE: "🌍",
};

const BADGE_CONFIG = {
  [BadgeLevel.BRONZE]: { emoji: "🥉", cls: "bronze", label: "Bronze" },
  [BadgeLevel.SILVER]: { emoji: "🥈", cls: "silver", label: "Silver" },
  [BadgeLevel.GOLD]: { emoji: "🥇", cls: "gold", label: "Gold" },
};

function getDeadlineBadge(deadline: string): { label: string; urgent: boolean } {
  const daysLeft = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft <= 0) return { label: "Expired", urgent: true };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, urgent: true };
  return { label: `${daysLeft}d left`, urgent: false };
}

function getMatchColor(score: number): string {
  if (score >= 80) return "var(--color-verified)";
  if (score >= 50) return "var(--color-warning)";
  return "var(--color-text-muted)";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MatchMeter: React.FC<{ score: number }> = ({ score }) => (
  <div className="match-meter">
    <div className="progress-track" style={{ height: 4 }}>
      <div
        className="progress-fill"
        style={{
          width: `${score}%`,
          background:
            score >= 80
              ? "var(--gradient-verified)"
              : score >= 50
                ? "linear-gradient(90deg, var(--color-warning), #FCD34D)"
                : "var(--color-border-strong)",
        }}
      />
    </div>
    <span className="match-meter__label label" style={{ color: getMatchColor(score) }}>
      {score}% match
    </span>
  </div>
);

const JobCard: React.FC<{
  job: JobWithMeta;
  onClick: () => void;
}> = ({ job, onClick }) => {
  const deadline = getDeadlineBadge(job.deadline);
  const majorSkills = job.skillRequirements.filter((s) => s.required);
  const minorSkills = job.skillRequirements.filter((s) => !s.required);

  return (
    <div
      className={`jobs-card card card-interactive ${job.hasApplied ? "jobs-card--applied" : ""
        } ${job.matchScore >= 80 ? "jobs-card--high-match" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`${job.title} at ${job.companyName}`}
    >
      {/* Top: company + match */}
      <div className="jobs-card__top">
        <div className="jobs-card__company-row">
          <div className="jobs-card__company-logo" aria-hidden="true">
            {job.companyName.charAt(0)}
          </div>
          <div className="jobs-card__company-info">
            <span className="jobs-card__company-name">{job.companyName}</span>
          </div>
        </div>
        <MatchMeter score={job.matchScore} />
      </div>

      {/* Title + meta */}
      <div className="jobs-card__body">
        <h3 className="jobs-card__title">{job.title}</h3>
        <div className="jobs-card__meta">
          <span className="jobs-card__meta-item">
            {JOB_TYPE_ICONS[job.jobType]} {JOB_TYPE_LABELS[job.jobType]}
          </span>
          <span className="jobs-card__meta-dot" aria-hidden="true">·</span>
          <span className="jobs-card__meta-item">📍 {job.location}</span>
          {job.salaryRange && (
            <>
              <span className="jobs-card__meta-dot" aria-hidden="true">·</span>
              <span className="jobs-card__meta-item">💰 {job.salaryRange}</span>
            </>
          )}
        </div>
      </div>

      {/* Skill chips */}
      <div className="jobs-card__skills">
        {majorSkills.slice(0, 3).map((s) => (
          <span
            key={s.skillId}
            className={`jobs-skill-chip jobs-skill-chip--required ${s.userBadge ? `jobs-skill-chip--has-${BADGE_CONFIG[s.userBadge].cls}` : ""
              }`}
          >
            {s.userBadge ? BADGE_CONFIG[s.userBadge].emoji : "○"}
            {s.skillName}
          </span>
        ))}
        {minorSkills.slice(0, 2).map((s) => (
          <span
            key={s.skillId}
            className={`jobs-skill-chip ${s.userBadge ? `jobs-skill-chip--has-${BADGE_CONFIG[s.userBadge].cls}` : ""
              }`}
          >
            {s.userBadge ? BADGE_CONFIG[s.userBadge].emoji : "○"}
            {s.skillName}
          </span>
        ))}
        {job.skillRequirements.length > 5 && (
          <span className="jobs-skill-chip jobs-skill-chip--more">
            +{job.skillRequirements.length - 5} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="jobs-card__footer">
        <div className="jobs-card__footer-left">
          <span
            className={`badge ${deadline.urgent ? "badge-warning" : "badge-muted"}`}
          >
            ⏱ {deadline.label}
          </span>
        </div>
        <div className="jobs-card__footer-right">
          {job.hasApplied ? (
            <span
              className={`badge ${job.applicationStatus === "SHORTLISTED"
                ? "badge-success"
                : job.applicationStatus === "REJECTED"
                  ? "badge-danger"
                  : "badge-muted"
                }`}
            >
              {job.applicationStatus === "SHORTLISTED"
                ? "✓ Shortlisted"
                : job.applicationStatus === "REJECTED"
                  ? "✕ Rejected"
                  : "Applied"}
            </span>
          ) : (
            <span className="jobs-card__view-cta">View details →</span>
          )}
        </div>
      </div>
    </div>
  );
};

const SkeletonJobCard: React.FC = () => (
  <div className="jobs-card card">
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
        <div>
          <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 70, height: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
    </div>
    <div className="skeleton" style={{ width: "70%", height: 22, marginBottom: 10 }} />
    <div className="skeleton" style={{ width: "90%", height: 14, marginBottom: 16 }} />
    <div style={{ display: "flex", gap: 8 }}>
      {[80, 70, 60].map((w) => (
        <div key={w} className="skeleton" style={{ width: w, height: 24, borderRadius: 20 }} />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// JobsPage
// ---------------------------------------------------------------------------

const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, isLoading, error, filter, setFilter, refetch } = useJobs();
  const [showFilters, setShowFilters] = useState(false);

  // Summary counts
  const appliedCount = jobs.filter((j) => j.hasApplied).length;
  const highMatchCount = jobs.filter((j) => j.matchScore >= 80).length;

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load jobs</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <PageLayout pageTitle="Jobs">

      {/* ── Page header ──────────────────────────────── */}
      <header className="page-header jobs-page__header">
        <div>
          <h1>Job Board</h1>
          <p>Skill-matched opportunities. No resume needed — your badges speak for you.</p>
        </div>
        <div className="jobs-page__header-stats">
          <div className="jobs-header-stat">
            <span className="jobs-header-stat__value">{isLoading ? "—" : jobs.length}</span>
            <span className="label jobs-header-stat__label">Open Roles</span>
          </div>
          <div className="jobs-header-stat jobs-header-stat--match">
            <span className="jobs-header-stat__value">{isLoading ? "—" : highMatchCount}</span>
            <span className="label jobs-header-stat__label">High Match</span>
          </div>
          <div className="jobs-header-stat">
            <span className="jobs-header-stat__value">{isLoading ? "—" : appliedCount}</span>
            <span className="label jobs-header-stat__label">Applied</span>
          </div>
        </div>
      </header>

      {/* ── Filter bar ───────────────────────────────── */}
      <div className="jobs-filters">
        {/* Search */}
        <div className="jobs-search">
          <span className="jobs-search__icon">🔍</span>
          <input
            className="input jobs-search__input"
            placeholder="Search by title, company, skill..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          {filter.search && (
            <button
              className="jobs-search__clear"
              onClick={() => setFilter({ search: "" })}
              aria-label="Clear search"
            >✕</button>
          )}
        </div>

        <div className="jobs-filters__row">
          {/* Job type */}
          <div className="jobs-filter-group">
            {(["ALL", "FULL_TIME", "PART_TIME", "CONTRACT", "REMOTE"] as const).map((type) => (
              <button
                key={type}
                className={`jobs-filter-chip ${filter.jobType === type ? "active" : ""}`}
                onClick={() => setFilter({ jobType: type as JobType | "ALL" })}
              >
                {type !== "ALL" && JOB_TYPE_ICONS[type] ? `${JOB_TYPE_ICONS[type]} ` : ""}
                {JOB_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Match toggle */}
          <label className="jobs-match-toggle">
            <div
              className={`jobs-match-toggle__track ${filter.matchOnly ? "active" : ""}`}
              onClick={() => setFilter({ matchOnly: !filter.matchOnly })}
              role="switch"
              aria-checked={filter.matchOnly}
              tabIndex={0}
              onKeyDown={(e) => e.key === " " && setFilter({ matchOnly: !filter.matchOnly })}
            >
              <div className="jobs-match-toggle__thumb" />
            </div>
            <span className="jobs-match-toggle__label">
              🎯 Qualified only
            </span>
          </label>
        </div>
      </div>

      {/* ── Results header ────────────────────────────── */}
      {!isLoading && (
        <div className="jobs-results-header">
          <p className="label">
            {jobs.length} role{jobs.length !== 1 ? "s" : ""} found
            {filter.matchOnly && " · showing qualified matches"}
          </p>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => navigate("/applications")}
          >
            My Applications →
          </button>
        </div>
      )}

      {/* ── Job grid ──────────────────────────────────── */}
      <div className="jobs-grid stagger">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonJobCard key={i} />)
          : jobs.length === 0
            ? (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <div className="empty-state-icon">💼</div>
                <h3>No jobs found</h3>
                <p>Try adjusting your filters or turning off "Qualified only".</p>
                <button
                  className="btn btn-ghost btn-sm mt-4"
                  onClick={() => setFilter({ search: "", jobType: "ALL", matchOnly: false })}
                >
                  Clear filters
                </button>
              </div>
            )
            : jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
      </div>

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles (unchanged from original)
// ---------------------------------------------------------------------------

const styles = `
  /* ── Page header ─────────────────────────────────── */
  .jobs-page__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
  .jobs-page__header-stats {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .jobs-header-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 56px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
  }
  .jobs-header-stat--match {
    background: var(--color-verified-bg);
    border-color: var(--color-verified-border);
  }
  .jobs-header-stat__value {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1;
  }
  .jobs-header-stat__label { color: var(--color-text-muted); }

  /* ── Filters ──────────────────────────────────────── */
  .jobs-filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .jobs-search {
    position: relative;
    max-width: 440px;
  }
  .jobs-search__icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .jobs-search__input { padding-left: 2.5rem; padding-right: 2.5rem; }
  .jobs-search__clear {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--text-sm);
    padding: 0;
    line-height: 1;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .jobs-search__clear:hover { color: var(--color-text-primary); }

  .jobs-filters__row {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .jobs-filter-group {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .jobs-filter-chip {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    letter-spacing: var(--tracking-wide);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    white-space: nowrap;
  }
  .jobs-filter-chip:hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-secondary);
  }
  .jobs-filter-chip.active {
    background: var(--color-premium-bg);
    border-color: var(--color-premium-border);
    color: var(--color-premium);
  }

  .jobs-match-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    user-select: none;
  }
  .jobs-match-toggle__track {
    width: 36px;
    height: 20px;
    border-radius: var(--radius-full);
    background: var(--color-border-strong);
    border: 1px solid var(--color-border-default);
    position: relative;
    cursor: pointer;
    transition: background var(--duration-base) var(--ease-out);
  }
  .jobs-match-toggle__track.active {
    background: var(--color-verified);
    border-color: var(--color-verified);
  }
  .jobs-match-toggle__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: var(--radius-full);
    background: white;
    transition: transform var(--duration-base) var(--ease-spring);
  }
  .jobs-match-toggle__track.active .jobs-match-toggle__thumb {
    transform: translateX(16px);
  }
  .jobs-match-toggle__label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--color-text-muted);
    letter-spacing: var(--tracking-wide);
    white-space: nowrap;
  }

  .jobs-results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }
  .jobs-results-header .label { color: var(--color-text-muted); }

  /* ── Grid ────────────────────────────────────────── */
  .jobs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: var(--space-5);
  }

  /* ── Job card ─────────────────────────────────────── */
  .jobs-card {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    transition: transform var(--duration-base) var(--ease-spring),
                border-color var(--duration-base) var(--ease-out),
                box-shadow var(--duration-base) var(--ease-out);
    cursor: pointer;
  }
  .jobs-card:hover { transform: translateY(-3px); }
  .jobs-card:focus-visible {
    outline: 2px solid var(--color-premium);
    outline-offset: 2px;
  }
  .jobs-card--applied {
    border-color: var(--color-border-default);
  }
  .jobs-card--high-match:hover {
    border-color: var(--color-verified-border);
    box-shadow: var(--glow-verified);
  }

  .jobs-card__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .jobs-card__company-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .jobs-card__company-logo {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--text-lg);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .jobs-card__company-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .jobs-card__company-name {
    font-weight: var(--weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .match-meter {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 80px;
    flex-shrink: 0;
  }
  .match-meter .progress-track { width: 80px; }
  .match-meter__label { white-space: nowrap; }

  .jobs-card__body { display: flex; flex-direction: column; gap: var(--space-2); }
  .jobs-card__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    line-height: 1.25;
    margin: 0;
  }
  .jobs-card__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .jobs-card__meta-item {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
  .jobs-card__meta-dot { color: var(--color-border-strong); }

  /* ── Skill chips ─────────────────────────────────── */
  .jobs-card__skills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .jobs-skill-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-medium);
    padding: 3px 8px;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-overlay);
    color: var(--color-text-muted);
    white-space: nowrap;
    letter-spacing: var(--tracking-wide);
  }
  .jobs-skill-chip--required {
    border-color: var(--color-border-strong);
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
  }
  .jobs-skill-chip--has-bronze {
    background: var(--color-bronze-bg);
    border-color: var(--color-bronze-border);
    color: var(--color-bronze-light);
  }
  .jobs-skill-chip--has-silver {
    background: var(--color-silver-bg);
    border-color: var(--color-silver-border);
    color: var(--color-silver-light);
  }
  .jobs-skill-chip--has-gold {
    background: var(--color-gold-bg);
    border-color: var(--color-gold-border);
    color: var(--color-gold-light);
  }
  .jobs-skill-chip--more {
    background: none;
    border-style: dashed;
    color: var(--color-text-disabled);
  }

  /* ── Card footer ─────────────────────────────────── */
  .jobs-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
  }
  .jobs-card__footer-left,
  .jobs-card__footer-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .jobs-card__view-cta {
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--color-premium);
    font-family: var(--font-mono);
    letter-spacing: var(--tracking-wide);
    transition: color var(--duration-fast) var(--ease-out);
  }
  .jobs-card:hover .jobs-card__view-cta { color: var(--color-text-primary); }

  /* ── Extra badge classes ──────────────────────────── */
  .badge-success {
    background: var(--color-verified-bg);
    border-color: var(--color-verified-border);
    color: var(--color-verified);
  }
  .badge-danger {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger);
  }

  /* ── Responsive ───────────────────────────────────── */
  @media (max-width: 1024px) {
    .jobs-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .jobs-page__header { flex-direction: column; }
    .jobs-filters__row { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
    .jobs-grid { grid-template-columns: 1fr; }
    .jobs-search { max-width: 100%; }
  }
`;

export default JobsPage;