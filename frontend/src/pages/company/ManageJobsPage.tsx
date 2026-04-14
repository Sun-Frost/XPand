import React, { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CompanyPageLayout from "../../components/company/companyPageLayout";
import { useCompanyJobs } from "../../hooks/company/useCompany";
import type { JobPostingResponse, JobStatus, JobType } from "../../hooks/company/useCompany";

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

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  ACTIVE:   { label: "Active",   cls: "badge-verified", dot: "#34D399" },
  CLOSED:   { label: "Closed",   cls: "badge-muted",    dot: "#64748B" },
  EXPIRED:  { label: "Expired",  cls: "badge-danger",   dot: "#F87171" },
  ARCHIVED: { label: "Archived", cls: "badge-archived", dot: "#94A3B8" },
};

type SortKey = "newest" | "oldest" | "deadline_asc" | "deadline_desc" | "title_az" | "title_za";
type FilterStatus = "ALL" | JobStatus | "EXPIRED" | "ARCHIVED";
type ViewMode = "card" | "compact";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",       label: "Newest first"    },
  { value: "oldest",       label: "Oldest first"    },
  { value: "deadline_asc", label: "Deadline ↑"      },
  { value: "deadline_desc",label: "Deadline ↓"      },
  { value: "title_az",     label: "Title A–Z"       },
  { value: "title_za",     label: "Title Z–A"       },
];

// Local archive state (stored in-memory; swap for localStorage or backend as needed)
const useArchiveState = () => {
  const [archived, setArchived] = useState<Set<number>>(new Set());
  const archive   = useCallback((id: number) => setArchived((s) => new Set([...s, id])), []);
  const unarchive = useCallback((id: number) => setArchived((s) => { const n = new Set(s); n.delete(id); return n; }), []);
  return { archived, archive, unarchive };
};

const highlight = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="mj-highlight">{p}</mark>
      : p
  );
};

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------
const StatsBar: React.FC<{ jobs: JobPostingResponse[]; archived: Set<number> }> = ({ jobs, archived }) => {
  const active   = jobs.filter((j) => j.status === "ACTIVE" && !isExpired(j.deadline) && !archived.has(j.id)).length;
  const expired  = jobs.filter((j) => (j.status === "EXPIRED" || (j.status === "ACTIVE" && isExpired(j.deadline))) && !archived.has(j.id)).length;
  const closed   = jobs.filter((j) => j.status === "CLOSED" && !archived.has(j.id)).length;
  const totalSkills = new Set(
    jobs.flatMap((j) => j.requiredSkills.map((s) => s.skillId))
  ).size;
  return (
    <div className="mj-stats">
      <div className="mj-stat">
        <span className="mj-stat__value mj-stat__value--active">{active}</span>
        <span className="mj-stat__label">Active</span>
      </div>
      <div className="mj-stat-divider" />
      <div className="mj-stat">
        <span className="mj-stat__value">{expired}</span>
        <span className="mj-stat__label">Expired</span>
      </div>
      <div className="mj-stat-divider" />
      <div className="mj-stat">
        <span className="mj-stat__value">{closed}</span>
        <span className="mj-stat__label">Closed</span>
      </div>
      <div className="mj-stat-divider" />
      <div className="mj-stat">
        <span className="mj-stat__value">{totalSkills}</span>
        <span className="mj-stat__label">Unique skills</span>
      </div>
      <div className="mj-stat-divider" />
      <div className="mj-stat">
        <span className="mj-stat__value">{archived.size}</span>
        <span className="mj-stat__label">Archived</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Job card (full)
// ---------------------------------------------------------------------------
const JobCard: React.FC<{
  job: JobPostingResponse;
  isArchived: boolean;
  searchQuery: string;
  onEdit: () => void;
  onClose: () => void;
  onViewApplicants: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  isClosing: boolean;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
}> = ({ job, isArchived, searchQuery, onEdit, onClose, onViewApplicants, onArchive, onUnarchive, isClosing, isSelected, onSelect }) => {
  const expired = isExpired(job.deadline) && job.status === "ACTIVE";
  const displayStatus = isArchived ? "ARCHIVED" : expired ? "EXPIRED" : job.status;
  const st = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG["CLOSED"];
  const majorSkills = job.requiredSkills.filter((s) => s.importance === "MAJOR");
  const minorSkills = job.requiredSkills.filter((s) => s.importance === "MINOR");

  return (
    <div className={`mj-card ${isSelected ? "mj-card--selected" : ""} ${job.status === "CLOSED" ? "mj-card--closed" : ""} ${expired ? "mj-card--expired" : ""} ${isArchived ? "mj-card--archived" : ""}`}>
      {job.status === "ACTIVE" && !expired && !isArchived && (
        <div className="mj-card__accent" />
      )}

      <div className="mj-card__top">
        <div className="mj-card__top-left">
          <input
            type="checkbox"
            className="mj-checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Select ${job.title}`}
          />
          <span className={`badge ${st.cls}`}>
            <span className="mj-status-dot" style={{ background: st.dot }} />
            {st.label}
          </span>
          {job.jobType && (
            <span className="badge badge-muted">{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</span>
          )}
        </div>
        <div className="mj-card__actions">
          {job.status === "ACTIVE" && !expired && !isArchived && (
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
          {!isArchived
            ? <button className="btn btn-ghost btn-sm mj-archive-btn" onClick={onArchive} title="Archive this job">⬇ Archive</button>
            : <button className="btn btn-ghost btn-sm" onClick={onUnarchive} title="Restore from archive">↩ Restore</button>
          }
          <button className="btn btn-primary btn-sm" onClick={onViewApplicants}>
            👥 Applicants
          </button>
        </div>
      </div>

      <h3 className="mj-card__title" onClick={onViewApplicants}>
        {highlight(job.title, searchQuery)}
      </h3>

      {job.description && (
        <p className="mj-card__desc">
          {job.description.slice(0, 160)}{job.description.length > 160 ? "…" : ""}
        </p>
      )}

      <div className="mj-card__meta">
        {job.location && <span className="mj-meta-item">📍 {highlight(job.location, searchQuery)}</span>}
        {job.salaryRange && <span className="mj-meta-item">💰 {job.salaryRange}</span>}
        <span className={`mj-meta-item ${expired ? "mj-meta--expired" : ""}`}>
          ⏱ Deadline: {fmtDate(job.deadline)}
        </span>
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="mj-card__skills">
          {majorSkills.map((s) => (
            <span key={s.skillId} className="badge badge-premium">★ {highlight(s.skillName, searchQuery)}</span>
          ))}
          {minorSkills.map((s) => (
            <span key={s.skillId} className="badge badge-muted">◇ {highlight(s.skillName, searchQuery)}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Compact row
// ---------------------------------------------------------------------------
const CompactRow: React.FC<{
  job: JobPostingResponse;
  isArchived: boolean;
  isSelected: boolean;
  isClosing: boolean;
  searchQuery: string;
  onEdit: () => void;
  onClose: () => void;
  onViewApplicants: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onSelect: (checked: boolean) => void;
}> = ({ job, isArchived, isSelected, isClosing, searchQuery, onEdit, onClose, onViewApplicants, onArchive, onUnarchive, onSelect }) => {
  const expired = isExpired(job.deadline) && job.status === "ACTIVE";
  const displayStatus = isArchived ? "ARCHIVED" : expired ? "EXPIRED" : job.status;
  const st = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG["CLOSED"];
  return (
    <div className={`mj-row ${isSelected ? "mj-row--selected" : ""} ${isArchived ? "mj-row--archived" : ""}`}>
      <input type="checkbox" className="mj-checkbox" checked={isSelected} onChange={(e) => onSelect(e.target.checked)} />
      <span className={`badge ${st.cls} mj-row__badge`}>
        <span className="mj-status-dot" style={{ background: st.dot }} />{st.label}
      </span>
      <span className="mj-row__title" onClick={onViewApplicants}>
        {highlight(job.title, searchQuery)}
      </span>
      {job.jobType && <span className="badge badge-muted mj-row__type">{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</span>}
      {job.location && <span className="mj-row__loc">📍 {job.location}</span>}
      <span className={`mj-row__deadline ${expired ? "mj-meta--expired" : ""}`}>⏱ {fmtDate(job.deadline)}</span>
      <div className="mj-row__actions">
        {job.status === "ACTIVE" && !expired && !isArchived && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isClosing} style={{ color: "var(--color-danger)" }}>✕</button>
          </>
        )}
        {!isArchived
          ? <button className="btn btn-ghost btn-sm" onClick={onArchive} title="Archive">⬇</button>
          : <button className="btn btn-ghost btn-sm" onClick={onUnarchive} title="Restore">↩</button>
        }
        <button className="btn btn-primary btn-sm" onClick={onViewApplicants}>👥</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bulk actions bar
// ---------------------------------------------------------------------------
const BulkBar: React.FC<{
  count: number;
  onClearSelection: () => void;
  onBulkArchive: () => void;
  onBulkClose: () => void;
  hasCloseable: boolean;
}> = ({ count, onClearSelection, onBulkArchive, onBulkClose, hasCloseable }) => (
  <div className="mj-bulk-bar">
    <span className="mj-bulk-bar__count">{count} selected</span>
    <div className="mj-bulk-bar__actions">
      {hasCloseable && (
        <button className="btn btn-ghost btn-sm" onClick={onBulkClose} style={{ color: "var(--color-danger)" }}>
          ✕ Close selected
        </button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onBulkArchive}>
        ⬇ Archive selected
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onClearSelection}>
        ✕ Clear
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// ManageJobsPage
// ---------------------------------------------------------------------------

const ManageJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, isLoading, error, closeJob, refetch } = useCompanyJobs();
  const { archived, archive, unarchive } = useArchiveState();

  const [filter, setFilter]         = useState<FilterStatus>("ALL");
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState<SortKey>("newest");
  const [viewMode, setViewMode]     = useState<ViewMode>("card");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("ALL");
  const [closingId, setClosingId]   = useState<number | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Collect distinct job types from loaded jobs
  const availableTypes = useMemo(() => {
    const types = new Set(jobs.map((j) => j.jobType).filter(Boolean) as string[]);
    return Array.from(types);
  }, [jobs]);

  const getDisplayStatus = (job: JobPostingResponse): string => {
    if (archived.has(job.id)) return "ARCHIVED";
    if (isExpired(job.deadline) && job.status === "ACTIVE") return "EXPIRED";
    return job.status;
  };

  const counts = useMemo(() => ({
    ALL:      jobs.length,
    ACTIVE:   jobs.filter((j) => j.status === "ACTIVE" && !isExpired(j.deadline) && !archived.has(j.id)).length,
    CLOSED:   jobs.filter((j) => j.status === "CLOSED" && !archived.has(j.id)).length,
    EXPIRED:  jobs.filter((j) => (j.status === "EXPIRED" || (j.status === "ACTIVE" && isExpired(j.deadline))) && !archived.has(j.id)).length,
    ARCHIVED: archived.size,
  }), [jobs, archived]);

  const filtered = useMemo(() => {
    let list = jobs;

    // Status/archive filter
    if (filter === "ARCHIVED") {
      list = list.filter((j) => archived.has(j.id));
    } else if (filter !== "ALL") {
      list = list.filter((j) => !archived.has(j.id) && getDisplayStatus(j) === filter);
    }

    // Job type filter
    if (jobTypeFilter !== "ALL") {
      list = list.filter((j) => j.jobType === jobTypeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        (j.description ?? "").toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.skillName.toLowerCase().includes(q))
      );
    }

    // Sort
    const sortFn: (a: JobPostingResponse, b: JobPostingResponse) => number = {
      newest:       (a: { id: number; }, b: { id: number; }) => b.id - a.id,
      oldest:       (a: { id: number; }, b: { id: number; }) => a.id - b.id,
      deadline_asc: (a: { deadline: any; }, b: { deadline: any; }) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
      deadline_desc:(a: { deadline: any; }, b: { deadline: any; }) => (b.deadline ?? "").localeCompare(a.deadline ?? ""),
      title_az:     (a: { title: string; }, b: { title: any; }) => a.title.localeCompare(b.title),
      title_za:     (a: { title: any; }, b: { title: string; }) => b.title.localeCompare(a.title),
    }[sort];
    return [...list].sort(sortFn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, filter, jobTypeFilter, search, sort, archived]);

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

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      checked ? n.add(id) : n.delete(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((j) => j.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkArchive = () => {
    selected.forEach((id) => archive(id));
    clearSelection();
  };

  const bulkClose = async () => {
    for (const id of selected) {
      const job = jobs.find((j) => j.id === id);
      if (job?.status === "ACTIVE" && !isExpired(job.deadline) && !archived.has(id)) {
        try { await closeJob(id); } catch { /* continue */ }
      }
    }
    clearSelection();
  };

  const hasCloseableSelected = useMemo(
    () => [...selected].some((id) => {
      const j = jobs.find((x) => x.id === id);
      return j?.status === "ACTIVE" && !isExpired(j.deadline) && !archived.has(id);
    }),
    [selected, jobs, archived]
  );

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
        <div className="mj-header__controls">
          <button
            className={`mj-view-btn ${viewMode === "card" ? "mj-view-btn--active" : ""}`}
            onClick={() => setViewMode("card")}
            title="Card view"
          >▦</button>
          <button
            className={`mj-view-btn ${viewMode === "compact" ? "mj-view-btn--active" : ""}`}
            onClick={() => setViewMode("compact")}
            title="Compact view"
          >☰</button>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar jobs={jobs} archived={archived} />

      {/* Search + Sort + Type filter row */}
      <div className="mj-toolbar">
        <div className="mj-search-wrap">
          <span className="mj-search-icon">🔍</span>
          <input
            ref={searchRef}
            className="mj-search"
            type="text"
            placeholder="Search by title, location, skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search jobs"
          />
          {search && (
            <button className="mj-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}>✕</button>
          )}
        </div>

        <select
          className="mj-select"
          value={jobTypeFilter}
          onChange={(e) => setJobTypeFilter(e.target.value)}
          aria-label="Filter by job type"
        >
          <option value="ALL">All types</option>
          {availableTypes.map((t) => (
            <option key={t} value={t}>{JOB_TYPE_LABEL[t] ?? t}</option>
          ))}
        </select>

        <select
          className="mj-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort jobs"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Filter tabs */}
      <div className="mj-filters">
        {(["ALL", "ACTIVE", "CLOSED", "EXPIRED", "ARCHIVED"] as const).map((f) => (
          <button
            key={f}
            className={`mj-filter-btn ${filter === f ? "mj-filter-btn--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="mj-filter-count">{counts[f as keyof typeof counts] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClearSelection={clearSelection}
          onBulkArchive={bulkArchive}
          onBulkClose={bulkClose}
          hasCloseable={hasCloseableSelected}
        />
      )}

      {/* Select all / deselect */}
      {filtered.length > 0 && (
        <div className="mj-select-all-row">
          {selected.size < filtered.length
            ? <button className="mj-text-btn" onClick={selectAll}>Select all {filtered.length} results</button>
            : <button className="mj-text-btn" onClick={clearSelection}>Deselect all</button>
          }
          {search && (
            <span className="mj-results-count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
            </span>
          )}
        </div>
      )}

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
          <h3>{search ? `No results for "${search}"` : `No ${filter.toLowerCase()} jobs`}</h3>
          <p>{search ? "Try a different search term or clear the filters." : "No jobs with this status right now."}</p>
          {search && (
            <button className="btn btn-ghost btn-sm mt-4" onClick={() => setSearch("")}>Clear search</button>
          )}
        </div>
      )}

      {/* Job list */}
      {viewMode === "card" ? (
        <div className="mj-list">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isArchived={archived.has(job.id)}
              searchQuery={search}
              onEdit={() => navigate(`/company/jobs/${job.id}/edit`)}
              onClose={() => handleClose(job.id)}
              onViewApplicants={() => navigate(`/company/jobs/${job.id}/applicants`)}
              onArchive={() => archive(job.id)}
              onUnarchive={() => unarchive(job.id)}
              isClosing={closingId === job.id}
              isSelected={selected.has(job.id)}
              onSelect={(checked) => toggleSelect(job.id, checked)}
            />
          ))}
        </div>
      ) : (
        <div className="mj-compact-list">
          <div className="mj-compact-header">
            <span />
            <span>Status</span>
            <span>Title</span>
            <span>Type</span>
            <span>Location</span>
            <span>Deadline</span>
            <span>Actions</span>
          </div>
          {filtered.map((job) => (
            <CompactRow
              key={job.id}
              job={job}
              isArchived={archived.has(job.id)}
              isSelected={selected.has(job.id)}
              isClosing={closingId === job.id}
              searchQuery={search}
              onEdit={() => navigate(`/company/jobs/${job.id}/edit`)}
              onClose={() => handleClose(job.id)}
              onViewApplicants={() => navigate(`/company/jobs/${job.id}/applicants`)}
              onArchive={() => archive(job.id)}
              onUnarchive={() => unarchive(job.id)}
              onSelect={(checked) => toggleSelect(job.id, checked)}
            />
          ))}
        </div>
      )}

      <style>{styles}</style>
    </CompanyPageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* Header */
  .mj-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; }
  .mj-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0; }
  .mj-page-sub { color: var(--color-text-muted); font-size: var(--text-sm); margin-top: 3px; }
  .mj-header__controls { display: flex; gap: 4px; align-items: center; }
  .mj-view-btn { padding: 6px 10px; background: transparent; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); cursor: pointer; font-size: 16px; color: var(--color-text-muted); transition: all 140ms; }
  .mj-view-btn--active { background: var(--color-bg-hover); color: var(--color-text-primary); border-color: var(--color-border-strong); }
  .mj-view-btn:hover:not(.mj-view-btn--active) { border-color: var(--color-border-strong); color: var(--color-text-secondary); }

  /* Stats bar */
  .mj-stats { display: flex; align-items: center; gap: 0; background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-3) var(--space-5); margin-bottom: var(--space-5); width: fit-content; flex-wrap: wrap; }
  .mj-stat { display: flex; flex-direction: column; align-items: center; padding: 0 var(--space-4); }
  .mj-stat__value { font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--color-text-primary); line-height: 1.2; }
  .mj-stat__value--active { color: var(--color-verified, #34D399); }
  .mj-stat__label { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }
  .mj-stat-divider { width: 1px; height: 32px; background: var(--color-border-subtle); }

  /* Toolbar */
  .mj-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
  .mj-search-wrap { position: relative; flex: 1; min-width: 200px; }
  .mj-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; pointer-events: none; }
  .mj-search { width: 100%; padding: 8px 32px 8px 32px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-bg-surface); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-sm); transition: border-color 140ms; box-sizing: border-box; }
  .mj-search:focus { outline: none; border-color: var(--color-primary-400, #A78BFA); }
  .mj-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 12px; padding: 2px 4px; }
  .mj-select { padding: 8px 12px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-bg-surface); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-sm); cursor: pointer; }
  .mj-select:focus { outline: none; border-color: var(--color-primary-400, #A78BFA); }

  /* Filter tabs */
  .mj-filters { display: flex; gap: 4px; margin-bottom: var(--space-4); background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: 4px; width: fit-content; flex-wrap: wrap; }
  .mj-filter-btn { display: flex; align-items: center; gap: var(--space-2); padding: 6px 16px; border-radius: var(--radius-lg); border: none; background: transparent; font-family: var(--font-body); font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-muted); cursor: pointer; transition: all 140ms ease; }
  .mj-filter-btn:hover { color: var(--color-text-secondary); }
  .mj-filter-btn--active { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .mj-filter-count { font-family: var(--font-mono); font-size: 10px; background: var(--color-bg-overlay); border-radius: var(--radius-full); padding: 1px 7px; color: var(--color-text-muted); }
  .mj-filter-btn--active .mj-filter-count { background: var(--color-verified-bg); color: var(--color-verified); }

  /* Select all row */
  .mj-select-all-row { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-3); }
  .mj-text-btn { background: none; border: none; color: var(--color-primary-400, #A78BFA); font-size: var(--text-sm); cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 2px; }
  .mj-results-count { font-size: var(--text-sm); color: var(--color-text-muted); margin-left: auto; }

  /* Bulk bar */
  .mj-bulk-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--color-primary-bg, rgba(167,139,250,.08)); border: 1px solid var(--color-primary-border, rgba(167,139,250,.28)); border-radius: var(--radius-lg); margin-bottom: var(--space-3); flex-wrap: wrap; }
  .mj-bulk-bar__count { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
  .mj-bulk-bar__actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }

  /* Highlight */
  .mj-highlight { background: rgba(251,191,36,.35); border-radius: 2px; padding: 0 1px; }

  /* Checkbox */
  .mj-checkbox { width: 15px; height: 15px; cursor: pointer; accent-color: var(--color-primary-400, #A78BFA); }

  /* Card view */
  .mj-list { display: flex; flex-direction: column; gap: var(--space-4); }
  .mj-card { background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); padding: var(--space-6); transition: all 160ms ease; position: relative; overflow: hidden; }
  .mj-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); }
  .mj-card--selected { border-color: var(--color-primary-400, #A78BFA) !important; background: rgba(167,139,250,.04); }
  .mj-card--closed { opacity: .7; }
  .mj-card--expired { border-color: rgba(248,113,113,0.2); }
  .mj-card--archived { opacity: .55; background: var(--color-bg-overlay); }
  .mj-card__accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--color-verified, #34D399), var(--color-cyan-400, #22D3EE)); }

  .mj-card__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; }
  .mj-card__top-left { display: flex; align-items: center; gap: var(--space-2); }
  .mj-card__actions { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .mj-archive-btn { color: var(--color-text-muted); font-size: var(--text-xs); }

  .mj-card__title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-2); cursor: pointer; transition: color 130ms; }
  .mj-card__title:hover { color: var(--color-primary-400, #A78BFA); }
  .mj-card__desc { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.65; margin-bottom: var(--space-4); }
  .mj-card__meta { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-4); }
  .mj-meta-item { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); }
  .mj-meta--expired { color: var(--color-danger) !important; }
  .mj-card__skills { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  /* Status dot */
  .mj-status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 2px; }

  /* Compact / table view */
  .mj-compact-list { display: flex; flex-direction: column; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); overflow: hidden; }
  .mj-compact-header { display: grid; grid-template-columns: 20px 90px 1fr 90px 130px 110px 130px; gap: 12px; padding: 8px 16px; background: var(--color-bg-overlay); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-muted); border-bottom: 1px solid var(--color-border-subtle); align-items: center; }
  .mj-row { display: grid; grid-template-columns: 20px 90px 1fr 90px 130px 110px 130px; gap: 12px; padding: 10px 16px; align-items: center; border-bottom: 1px solid var(--color-border-subtle); transition: background 120ms; }
  .mj-row:last-child { border-bottom: none; }
  .mj-row:hover { background: var(--color-bg-hover); }
  .mj-row--selected { background: rgba(167,139,250,.05); }
  .mj-row--archived { opacity: .55; }
  .mj-row__badge { font-size: 11px; }
  .mj-row__title { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mj-row__title:hover { color: var(--color-primary-400, #A78BFA); }
  .mj-row__type { font-size: 11px; }
  .mj-row__loc { font-size: var(--text-xs); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mj-row__deadline { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); white-space: nowrap; }
  .mj-row__actions { display: flex; gap: 4px; align-items: center; justify-content: flex-end; }

  /* Badge extras */
  .badge-premium  { background: var(--color-premium-bg, rgba(139,92,246,.1)); border-color: var(--color-premium-border, rgba(139,92,246,.28)); color: var(--color-premium, #8B5CF6); }
  .badge-danger   { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger); }
  .badge-archived { background: rgba(100,116,139,.1); border-color: rgba(100,116,139,.25); color: #64748B; }

  /* Error */
  .mj-error { padding: var(--space-3) var(--space-4); background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-lg); color: var(--color-danger); font-size: var(--text-sm); margin-bottom: var(--space-4); }

  /* Skeleton */
  .mj-skeleton { display: flex; flex-direction: column; gap: var(--space-4); }

  @media (max-width: 768px) {
    .mj-compact-header { display: none; }
    .mj-row { grid-template-columns: 20px 1fr auto; grid-template-rows: auto auto; }
    .mj-row__badge, .mj-row__type, .mj-row__loc, .mj-row__deadline { display: none; }
    .mj-stats { width: 100%; justify-content: center; }
    .mj-toolbar { flex-direction: column; }
    .mj-search-wrap { width: 100%; }
  }

  @media (max-width: 640px) {
    .mj-header { flex-direction: column; }
    .mj-filters { flex-wrap: wrap; width: 100%; }
    .mj-card__top { flex-direction: column; align-items: flex-start; }
  }
`;

export default ManageJobsPage;