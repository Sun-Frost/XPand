import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { useCompanyJobs } from "../../hooks/company/useCompany";
import type { JobPostingResponse, JobStatus } from "../../hooks/company/useCompany";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const isExpired = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

// FIXED: matches JobType.java exactly — FULL_TIME, PART_TIME, CONTRACT, REMOTE
const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT:  "Contract",
  REMOTE:    "Remote",
};

const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string; dot: string }> = {
  ACTIVE:  { label: "Active",  cls: "badge-verified", dot: "#34D399" },
  CLOSED:  { label: "Closed",  cls: "badge-muted",    dot: "#64748B" },
  EXPIRED: { label: "Expired", cls: "badge-danger",   dot: "#F87171" },
};

// ---------------------------------------------------------------------------
// Job card
// ---------------------------------------------------------------------------

const JobCard: React.FC<{
  job: JobPostingResponse;
  onEdit: () => void;
  onClose: () => void;
  onViewApplicants: () => void;
  isClosing: boolean;
}> = ({ job, onEdit, onClose, onViewApplicants, isClosing }) => {
  const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG["CLOSED"];
  const expired = isExpired(job.deadline) && job.status === "ACTIVE";
  const displayStatus = expired ? "EXPIRED" : job.status;
  const displaySt = STATUS_CONFIG[displayStatus] ?? st;

  // Applicant count from the application data isn't available here — show a link
  const majorSkills = job.requiredSkills.filter((s) => s.importance === "MAJOR");
  const minorSkills = job.requiredSkills.filter((s) => s.importance === "MINOR");

  return (
    <div className={`mj-card ${job.status === "CLOSED" ? "mj-card--closed" : ""} ${expired ? "mj-card--expired" : ""}`}>
      {/* Accent bar */}
      {job.status === "ACTIVE" && !expired && (
        <div className="mj-card__accent" />
      )}

      <div className="mj-card__top">
        <div className="mj-card__status-row">
          <span className={`badge ${displaySt.cls}`}>
            <span className="mj-status-dot" style={{ background: displaySt.dot }} />
            {displaySt.label}
          </span>
          {job.jobType && (
            <span className="badge badge-muted">{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</span>
          )}
        </div>
        <div className="mj-card__actions">
          {job.status === "ACTIVE" && !expired && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={isClosing}
                style={{ color: "var(--color-danger)" }}
              >
                {isClosing ? "Closing…" : "✕ Close"}
              </button>
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={onViewApplicants}>
            👥 Applicants
          </button>
        </div>
      </div>

      <h3 className="mj-card__title" onClick={onViewApplicants}>{job.title}</h3>

      {job.description && (
        <p className="mj-card__desc">
          {job.description.slice(0, 160)}{job.description.length > 160 ? "…" : ""}
        </p>
      )}

      <div className="mj-card__meta">
        {job.location && <span className="mj-meta-item">📍 {job.location}</span>}
        {job.salaryRange && <span className="mj-meta-item">💰 {job.salaryRange}</span>}
        <span className={`mj-meta-item ${expired ? "mj-meta--expired" : ""}`}>
          ⏱ Deadline: {fmtDate(job.deadline)}
        </span>
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="mj-card__skills">
          {majorSkills.map((s) => (
            <span key={s.skillId} className="badge badge-premium">★ {s.skillName}</span>
          ))}
          {minorSkills.map((s) => (
            <span key={s.skillId} className="badge badge-muted">◇ {s.skillName}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ManageJobsPage
// ---------------------------------------------------------------------------

type FilterStatus = "ALL" | JobStatus;

const ManageJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, isLoading, error, closeJob, refetch } = useCompanyJobs();
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return jobs;
    if (filter === "EXPIRED") {
      // Show jobs that are either status=EXPIRED or status=ACTIVE with past deadline
      return jobs.filter((j) =>
        j.status === "EXPIRED" || (j.status === "ACTIVE" && isExpired(j.deadline))
      );
    }
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const counts = useMemo(() => ({
    ALL:     jobs.length,
    ACTIVE:  jobs.filter((j) => j.status === "ACTIVE" && !isExpired(j.deadline)).length,
    CLOSED:  jobs.filter((j) => j.status === "CLOSED").length,
    EXPIRED: jobs.filter((j) => j.status === "EXPIRED" || (j.status === "ACTIVE" && isExpired(j.deadline))).length,
  }), [jobs]);

  const handleClose = async (jobId: number) => {
    setCloseError(null);
    setClosingId(jobId);
    try {
      await closeJob(jobId);
    } catch (err: unknown) {
      setCloseError((err as Error).message ?? "Failed to close job.");
    } finally {
      setClosingId(null);
    }
  };

  if (isLoading) {
    return (
      <CompanyPageLayout pageTitle="Manage Jobs">
        <div className="mj-skeleton">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      </CompanyPageLayout>
    );
  }

  return (
    <CompanyPageLayout pageTitle="Manage Jobs">

      {/* Header */}
      <div className="mj-header">
        <div>
          <h1 className="mj-page-title">Manage Jobs</h1>
          <p className="mj-page-sub">
            {jobs.length} posting{jobs.length !== 1 ? "s" : ""} total ·{" "}
            <span style={{ color: "var(--color-verified, #34D399)" }}>{counts.ACTIVE} active</span>
          </p>
        </div>
        <button className="btn btn-xp" onClick={() => navigate("/company/jobs/new")}>
          ＋ Post New Job
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mj-filters">
        {(["ALL", "ACTIVE", "CLOSED", "EXPIRED"] as const).map((f) => (
          <button
            key={f}
            className={`mj-filter-btn ${filter === f ? "mj-filter-btn--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="mj-filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Errors */}
      {(error || closeError) && (
        <div className="mj-error">{error || closeError}</div>
      )}

      {/* Empty states */}
      {jobs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No jobs posted yet</h3>
          <p>Post your first job to start receiving applications from verified candidates.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/company/jobs/new")}>
            Post your first job
          </button>
        </div>
      )}

      {jobs.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No {filter.toLowerCase()} jobs</h3>
          <p>No jobs with this status right now.</p>
        </div>
      )}

      {/* Job list */}
      <div className="mj-list">
        {filtered.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onEdit={() => navigate(`/company/jobs/${job.id}/edit`)}
            onClose={() => handleClose(job.id)}
            onViewApplicants={() => navigate(`/company/jobs/${job.id}/applicants`)}
            isClosing={closingId === job.id}
          />
        ))}
      </div>

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  .mj-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap; }
  .mj-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .mj-page-sub { color: var(--color-text-muted); font-size: var(--text-sm); margin-top: 3px; }

  /* Filter tabs */
  .mj-filters { display: flex; gap: 4px; margin-bottom: var(--space-6); background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: 4px; width: fit-content; }
  .mj-filter-btn { display: flex; align-items: center; gap: var(--space-2); padding: 6px 16px; border-radius: var(--radius-lg); border: none; background: transparent; font-family: var(--font-body); font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-muted); cursor: pointer; transition: all 140ms ease; }
  .mj-filter-btn:hover { color: var(--color-text-secondary); }
  .mj-filter-btn--active { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .mj-filter-count { font-family: var(--font-mono); font-size: 10px; background: var(--color-bg-overlay); border-radius: var(--radius-full); padding: 1px 7px; color: var(--color-text-muted); }
  .mj-filter-btn--active .mj-filter-count { background: var(--color-verified-bg); color: var(--color-verified); }

  /* Card */
  .mj-list { display: flex; flex-direction: column; gap: var(--space-4); }
  .mj-card { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-6); transition: all 160ms ease; position: relative; overflow: hidden; }
  .mj-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); }
  .mj-card--closed { opacity: .7; }
  .mj-card--expired { border-color: rgba(248,113,113,0.2); }
  .mj-card__accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--color-verified, #34D399), var(--color-cyan-400, #22D3EE)); }

  .mj-card__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; }
  .mj-card__status-row { display: flex; align-items: center; gap: var(--space-2); }
  .mj-status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 2px; }
  .mj-card__actions { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

  .mj-card__title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-2); cursor: pointer; transition: color 130ms; }
  .mj-card__title:hover { color: var(--color-primary-400, #A78BFA); }

  .mj-card__desc { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.65; margin-bottom: var(--space-4); }

  .mj-card__meta { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-4); }
  .mj-meta-item { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); }
  .mj-meta--expired { color: var(--color-danger) !important; }

  .mj-card__skills { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  /* Badge extras */
  .badge-premium { background: var(--color-premium-bg, rgba(139,92,246,.1)); border-color: var(--color-premium-border, rgba(139,92,246,.28)); color: var(--color-premium, #8B5CF6); }
  .badge-danger  { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger); }

  /* Error */
  .mj-error { padding: var(--space-3) var(--space-4); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-lg); color: var(--color-danger); font-size: var(--text-sm); margin-bottom: var(--space-4); }

  /* Skeleton */
  .mj-skeleton { display: flex; flex-direction: column; gap: var(--space-4); }

  @media (max-width: 640px) {
    .mj-header { flex-direction: column; }
    .mj-filters { flex-wrap: wrap; width: 100%; }
    .mj-card__top { flex-direction: column; align-items: flex-start; }
  }
`;

export default ManageJobsPage;