import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
import { useCompanyProfile, useCompanyJobs } from "../../hooks/company/useCompany";
import type { JobPostingResponse, ApplicationStatus } from "../../hooks/company/useCompany";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "badge-verified" },
  CLOSED: { label: "Closed", cls: "badge-muted" },
  EXPIRED: { label: "Expired", cls: "badge-danger" },
};

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time",
  CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance",
};

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

const Stat: React.FC<{ icon: IconName; value: string | number; label: string; sub?: string; color?: string }> = ({
  icon, value, label, sub, color = "var(--color-verified)"
}) => (
  <div className="cd-stat" style={{ "--sc": color } as React.CSSProperties}>
    <div className="cd-stat__icon"><Icon name={icon} size={24} label="" /></div>
    <div className="cd-stat__body">
      <div className="cd-stat__value">{value}</div>
      <div className="cd-stat__label">{label}</div>
      {sub && <div className="cd-stat__sub">{sub}</div>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// CompanyDashboardPage
// ---------------------------------------------------------------------------

const CompanyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useCompanyProfile();
  const { jobs, isLoading: jobsLoading, error: jobsError } = useCompanyJobs();

  const stats = useMemo(() => {
    const active = jobs.filter((j) => j.status === "ACTIVE");
    const closed = jobs.filter((j) => j.status === "CLOSED" || j.status === "EXPIRED");
    const totalSkills = new Set(jobs.flatMap((j) => j.requiredSkills.map((s) => s.skillId))).size;
    return { active: active.length, closed: closed.length, total: jobs.length, totalSkills };
  }, [jobs]);

  const recentJobs = useMemo(() =>
    [...jobs].sort((a, b) => {
      // Sort active first, then by deadline proximity
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return 0;
    }).slice(0, 5),
    [jobs]
  );

  const isLoading = profileLoading || jobsLoading;

  if (isLoading) {
    return (
      <CompanyPageLayout pageTitle="Dashboard">
        <div className="cd-skeleton-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="skeleton mt-6" style={{ height: 300 }} />
        <style>{styles}</style>
      </CompanyPageLayout>
    );
  }

  return (
    <CompanyPageLayout pageTitle="Company Dashboard">

      <PageHeader
        {...PAGE_CONFIGS["company-dashboard"]}
        right={
          profile && !profile.isApproved ? (
            <div className="cd-pending-banner">
              <Icon name="pending" size={16} label="" />
              <span>Pending approval — jobs won't be visible until approved.</span>
            </div>
          ) : undefined
        }
      />

      {/* ── Stats ── */}
      <div className="cd-stats">
        <Stat icon="work" value={stats.active} label="Active Jobs" color="var(--color-verified)" />
        <Stat icon="clipboard" value={stats.total} label="Total Postings" color="var(--color-primary-400, #A78BFA)" />
        <Stat icon="locked" value={stats.closed} label="Closed / Expired" color="var(--color-text-muted)" />
        <Stat icon="cat-default" value={stats.totalSkills} label="Skills Required" color="var(--color-xp, #F59E0B)" />
      </div>

      {/* ── Quick actions ── */}
      <div className="cd-quick">
        <button className="cd-quick-btn" onClick={() => navigate("/company/jobs")}>
          <span className="cd-quick-btn__icon"><Icon name="clipboard" size={24} label="" /></span>
          <div>
            <div className="cd-quick-btn__title">Manage Jobs</div>
            <div className="cd-quick-btn__sub">Edit, close, view applicants</div>
          </div>
        </button>
        <button className="cd-quick-btn" onClick={() => navigate("/company/insights")}>
          <span className="cd-quick-btn__icon"><Icon name="cat-data" size={24} label="" /></span>
          <div>
            <div className="cd-quick-btn__title">Market Insights</div>
            <div className="cd-quick-btn__sub">Skill demand, trends</div>
          </div>
        </button>
        <button className="cd-quick-btn" onClick={() => navigate("/company/profile")}>
          <span className="cd-quick-btn__icon"><Icon name="job-type-full-time" size={24} label="" /></span>
          <div>
            <div className="cd-quick-btn__title">Company Profile</div>
            <div className="cd-quick-btn__sub">Edit your public listing</div>
          </div>
        </button>
      </div>

      {/* ── Recent Jobs ── */}
      <div className="cd-section">
        <div className="cd-section__header">
          <h2 className="cd-section__title">Recent Job Postings</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/company/jobs")}>View All →</button>
        </div>

        {jobsError && (
          <div className="cd-error">{jobsError}</div>
        )}

        {!jobsError && jobs.length === 0 && (
          <div className="cd-empty">
            <div className="cd-empty__icon"><Icon name="search" size={40} label="" /></div>
            <p>No jobs posted yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/company/jobs/new")}>Post your first job</button>
          </div>
        )}

        {recentJobs.length > 0 && (
          <div className="cd-job-list">
            {recentJobs.map((job) => {
              const st = STATUS_LABEL[job.status] ?? { label: job.status, cls: "badge-muted" };
              return (
                <div key={job.id} className="cd-job-row" onClick={() => navigate(`/company/jobs/${job.id}/applicants`)}>
                  <div className="cd-job-row__left">
                    <div className="cd-job-row__title">{job.title}</div>
                    <div className="cd-job-row__meta">
                      {job.jobType && <span className="badge badge-muted">{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</span>}
                      {job.location && <span className="cd-job-row__loc"><Icon name="location" size={12} label="" /> {job.location}</span>}
                      <span className="cd-job-row__deadline">Deadline: {fmtDate(job.deadline)}</span>
                    </div>
                    <div className="cd-job-row__skills">
                      {job.requiredSkills.slice(0, 4).map((s) => (
                        <span key={s.skillId} className={`badge ${s.importance === "MAJOR" ? "badge-premium" : "badge-muted"}`}>
                          {s.skillName}
                        </span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="badge badge-muted">+{job.requiredSkills.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div className="cd-job-row__right">
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/company/jobs/${job.id}/applicants`); }}>
                      View Applicants →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* Pending banner */
  .cd-pending-banner {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning-border);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); color: var(--color-warning);
    margin-bottom: var(--space-4);
  }
  /* Stats */
  .cd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-8); }
  .cd-stat { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-5); display: flex; align-items: center; gap: var(--space-4); transition: all 160ms ease; }
  .cd-stat:hover { border-color: color-mix(in srgb, var(--sc) 30%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--sc) 20%, transparent); }
  .cd-stat__icon { font-size: 1.75rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--sc) 10%, transparent); border: 1px solid color-mix(in srgb, var(--sc) 25%, transparent); border-radius: var(--radius-lg); flex-shrink: 0; }
  .cd-stat__body {}
  .cd-stat__value { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); line-height: 1; }
  .cd-stat__label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted); margin-top: 3px; }
  .cd-stat__sub { font-size: var(--text-xs); color: var(--sc); margin-top: 2px; }
  /* Quick actions */
  .cd-quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-8); }
  .cd-quick-btn { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-5); background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); cursor: pointer; text-align: left; transition: all 160ms ease; }
  .cd-quick-btn:hover { border-color: var(--color-border-strong); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .cd-quick-btn__icon { font-size: 1.75rem; flex-shrink: 0; }
  .cd-quick-btn__title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
  .cd-quick-btn__sub { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }
  /* Section */
  .cd-section { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); overflow: hidden; }
  .cd-section__header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border-subtle); }
  .cd-section__title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  /* Jobs list */
  .cd-job-list { display: flex; flex-direction: column; }
  .cd-job-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border-subtle); cursor: pointer; transition: background 120ms ease; }
  .cd-job-row:last-child { border-bottom: none; }
  .cd-job-row:hover { background: var(--color-bg-hover); }
  .cd-job-row__left { flex: 1; }
  .cd-job-row__title { font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-primary); margin-bottom: var(--space-2); }
  .cd-job-row__meta { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-2); }
  .cd-job-row__loc { font-size: var(--text-xs); color: var(--color-text-muted); }
  .cd-job-row__deadline { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); }
  .cd-job-row__skills { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .cd-job-row__right { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
  /* Badge extras */
  .badge-premium { background: var(--color-premium-bg,rgba(139,92,246,.1)); border-color: var(--color-premium-border,rgba(139,92,246,.28)); color: var(--color-premium,#8B5CF6); }
  .badge-danger { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger); }
  /* Empty / error */
  .cd-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-16) var(--space-8); text-align: center; }
  .cd-empty__icon { font-size: 3rem; opacity: .3; }
  .cd-empty p { color: var(--color-text-muted); }
  .cd-error { padding: var(--space-4) var(--space-6); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-lg); color: var(--color-danger); font-size: var(--text-sm); margin: var(--space-4); }
  /* Skeleton */
  .cd-skeleton-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
  /* Responsive */
  @media(max-width:1024px){ .cd-stats,.cd-quick { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:640px){ .cd-stats,.cd-quick { grid-template-columns: 1fr; } .cd-job-row { flex-direction: column; align-items: flex-start; } }
`;

export default CompanyDashboardPage;