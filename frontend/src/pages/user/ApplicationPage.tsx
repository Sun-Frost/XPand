import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useApplications } from "../../hooks/user/useApplications";
import type { ApplicationResponse, ApplicationStatus } from "../../hooks/user/useApplications";

// ---------------------------------------------------------------------------
// Constants — aligned with backend ApplicationStatus.java exactly:
// PENDING | SHORTLISTED | REJECTED | WITHDRAWN
// SHORTLISTED is the company's "accept/advance" action — shown to user as "Shortlisted"
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; icon: string; cls: string; color: string; bg: string; border: string; description: string }
> = {
  PENDING: {
    label: "Under Review",
    icon: "🔄",
    cls: "pending",
    color: "var(--color-cyan-400)",
    bg: "var(--color-info-bg)",
    border: "var(--color-info-border)",
    description: "Your application has been submitted and is awaiting review.",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    icon: "⭐",
    cls: "shortlisted",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.30)",
    description: "Great news — you've been shortlisted! The company is actively considering your profile.",
  },
  REJECTED: {
    label: "Not Selected",
    icon: "✕",
    cls: "rejected",
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    border: "var(--color-danger-border)",
    description: "This application did not progress. Keep applying — the right role is ahead.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: "↩",
    cls: "withdrawn",
    color: "var(--color-text-muted)",
    bg: "var(--color-bg-overlay)",
    border: "var(--color-border-subtle)",
    description: "You withdrew this application.",
  },
};

const STATUS_TABS: Array<ApplicationStatus | "ALL"> = [
  "ALL", "PENDING", "SHORTLISTED", "REJECTED", "WITHDRAWN",
];

const STATUS_TAB_LABELS: Record<string, string> = {
  ALL:         "All",
  PENDING:     "In Review",
  SHORTLISTED: "Shortlisted",
  REJECTED:    "Not Selected",
  WITHDRAWN:   "Withdrawn",
};

const SORT_PRIORITY: Record<ApplicationStatus, number> = {
  SHORTLISTED: 1,
  PENDING:     2,
  REJECTED:    3,
  WITHDRAWN:   4,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ---------------------------------------------------------------------------
// Timeline — real flow: PENDING → SHORTLISTED or PENDING → REJECTED/WITHDRAWN
// ---------------------------------------------------------------------------

const StatusTimeline: React.FC<{ status: ApplicationStatus; prioritySlotRank?: number | null }> = ({ status, prioritySlotRank }) => {
  const isTerminal    = status === "REJECTED" || status === "WITHDRAWN";
  const isShortlisted = status === "SHORTLISTED";

  return (
    <div className="ap-timeline-wrap">
      {prioritySlotRank && (
        <div className="ap-priority-queue-badge">
          <span>⭐</span>
          <span>Priority applicant — Queue position #{prioritySlotRank}</span>
          <span className="ap-priority-queue-hint">Reviewed before regular applicants</span>
        </div>
      )}
      <div className="ap-timeline">

        {/* Step 1: Submitted (always past once we have an application) */}
        <div className="ap-timeline__step is-past">
          <div className="ap-timeline__dot"><span>✓</span></div>
          <span className="ap-timeline__label">Submitted</span>
        </div>

        <div className={`ap-timeline__connector ${!isTerminal ? "is-filled" : ""}`} />

        {/* Step 2: Under Review (active when PENDING, past when SHORTLISTED) */}
        <div className={`ap-timeline__step ${isShortlisted ? "is-past" : isTerminal ? "" : "is-active"}`}>
          <div className="ap-timeline__dot">
            <span>{isShortlisted ? "✓" : "🔄"}</span>
          </div>
          <span className="ap-timeline__label">Under Review</span>
        </div>

        <div className={`ap-timeline__connector ${isShortlisted ? "is-filled" : ""}`} />

        {/* Step 3: Outcome — SHORTLISTED / REJECTED / WITHDRAWN / Decision pending */}
        {isTerminal ? (
          <div className="ap-timeline__step is-failed is-active">
            <div className="ap-timeline__dot"><span>{STATUS_CONFIG[status].icon}</span></div>
            <span className="ap-timeline__label">{STATUS_CONFIG[status].label}</span>
          </div>
        ) : (
          <div className={`ap-timeline__step ${isShortlisted ? "is-active is-shortlisted" : ""}`}>
            <div className="ap-timeline__dot">
              <span>{isShortlisted ? "⭐" : "🏁"}</span>
            </div>
            <span className="ap-timeline__label">{isShortlisted ? "Shortlisted" : "Decision"}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ApplicationCard
// ---------------------------------------------------------------------------

const ApplicationCard: React.FC<{
  app: ApplicationResponse;
  onWithdraw: (id: number) => void;
  isWithdrawing: boolean;
}> = ({ app, onWithdraw, isWithdrawing }) => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const cfg = STATUS_CONFIG[app.status];
  // Can only withdraw while still pending — once shortlisted or rejected it's final
  const canWithdraw = app.status === "PENDING";

  return (
    <article className={`ap-card card ap-card--${cfg.cls} animate-fade-in`}>

      {/* Accent bar */}
      <div className="ap-card__accent" style={{ background: cfg.color }} />

      <div className="ap-card__inner">

        {/* ── Header row ── */}
        <div className="ap-card__header">
          <div className="ap-card__company-row">
            <div className="ap-card__logo" style={{ borderColor: cfg.border, color: cfg.color }}>
              {app.jobTitle.charAt(0).toUpperCase()}
            </div>
            <div className="ap-card__title-group">
              <button
                className="ap-card__job-title"
                onClick={() => navigate(`/jobs/${app.jobId}`)}
              >
                {app.jobTitle}
              </button>
              <div className="ap-card__meta">
                <span className="ap-card__meta-item">Applied {timeAgo(app.appliedAt)}</span>
                <span className="ap-card__meta-sep">·</span>
                <span className="ap-card__meta-item">{formatDate(app.appliedAt)}</span>
                {app.prioritySlotRank && (
                  <>
                    <span className="ap-card__meta-sep">·</span>
                    <span className="ap-priority-tag">
                      ⚡ Priority #{app.prioritySlotRank}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span
            className="ap-status-badge"
            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* ── Timeline ── */}
        <StatusTimeline status={app.status} prioritySlotRank={app.prioritySlotRank} />

        {/* ── Status message ── */}
        <div
          className="ap-card__status-msg"
          style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
        >
          <span style={{ opacity: 0.9 }}>{cfg.description}</span>
        </div>

        {/* ── Actions ── */}
        <div className="ap-card__actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/jobs/${app.jobId}`)}
          >
            View Job →
          </button>

          {canWithdraw && !showConfirm && (
            <button
              className="btn btn-ghost btn-sm ap-withdraw-btn"
              onClick={() => setShowConfirm(true)}
            >
              Withdraw
            </button>
          )}

          {canWithdraw && showConfirm && (
            <div className="ap-confirm-row">
              <span className="label" style={{ color: "var(--color-text-muted)" }}>
                Withdraw this application?
              </span>
              <button
                className="btn btn-sm"
                style={{
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  color: "var(--color-danger)",
                }}
                onClick={() => { onWithdraw(app.id); setShowConfirm(false); }}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Withdrawing…" : "Yes, withdraw"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const SkeletonCard: React.FC = () => (
  <div className="ap-card card" style={{ padding: "var(--space-6)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10 }} />
        <div>
          <div className="skeleton" style={{ width: 180, height: 18, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 110, height: 11 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 96, height: 26, borderRadius: 20 }} />
    </div>
    <div className="skeleton" style={{ width: "100%", height: 54, borderRadius: 12, marginBottom: 16 }} />
    <div style={{ display: "flex", gap: 12 }}>
      <div className="skeleton" style={{ width: 80, height: 30 }} />
      <div className="skeleton" style={{ width: 80, height: 30 }} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Stats bar — updated to reflect real statuses
// ---------------------------------------------------------------------------

const StatsBar: React.FC<{
  total: number;
  pending: number;
  shortlisted: number;
  rejected: number;
}> = ({ total, pending, shortlisted, rejected }) => {
  const shortlistRate = total > 0 ? Math.round((shortlisted / total) * 100) : null;

  return (
    <div className="ap-stats-row">
      <div className="ap-stat-card ap-stat-card--total">
        <span className="ap-stat-card__num">{total}</span>
        <span className="ap-stat-card__lbl">Total</span>
      </div>
      <div className="ap-stat-card ap-stat-card--pending">
        <span className="ap-stat-card__num">{pending}</span>
        <span className="ap-stat-card__lbl">In Review</span>
      </div>
      <div className="ap-stat-card ap-stat-card--shortlisted">
        <span className="ap-stat-card__num">{shortlisted}</span>
        <span className="ap-stat-card__lbl">Shortlisted ⭐</span>
      </div>
      <div className="ap-stat-card ap-stat-card--rejected">
        <span className="ap-stat-card__num">{rejected}</span>
        <span className="ap-stat-card__lbl">Not Selected</span>
      </div>
      <div className="ap-stat-card ap-stat-card--rate">
        <span className="ap-stat-card__num">
          {shortlistRate !== null ? `${shortlistRate}%` : "—"}
        </span>
        <span className="ap-stat-card__lbl">Shortlist Rate</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ApplicationsPage
// ---------------------------------------------------------------------------

const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { applications, isLoading, error, withdraw, isWithdrawing, refetch } =
    useApplications();

  const [activeTab, setActiveTab] = useState<ApplicationStatus | "ALL">("ALL");

  const stats = useMemo(() => ({
    total:       applications.length,
    pending:     applications.filter((a) => a.status === "PENDING").length,
    shortlisted: applications.filter((a) => a.status === "SHORTLISTED").length,
    rejected:    applications.filter((a) => a.status === "REJECTED").length,
    withdrawn:   applications.filter((a) => a.status === "WITHDRAWN").length,
  }), [applications]);

  const sorted = useMemo(() => {
    const filtered = activeTab === "ALL"
      ? applications
      : applications.filter((a) => a.status === activeTab);
    return [...filtered].sort(
      (a, b) => (SORT_PRIORITY[a.status] ?? 4) - (SORT_PRIORITY[b.status] ?? 4)
    );
  }, [applications, activeTab]);

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load applications</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <PageLayout pageTitle="My Applications">

      {/* ── Header ── */}
      <header className="ap-page-header">
        <div>
          <button className="btn btn-ghost btn-sm ap-back-btn" onClick={() => navigate("/jobs")}>
            ← Jobs
          </button>
          <h1 className="ap-page-title">My Applications</h1>
          <p className="ap-page-sub">Track every role you've applied to.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/jobs")}>
          Browse Jobs →
        </button>
      </header>

      {/* ── Stats ── */}
      {!isLoading && applications.length > 0 && (
        <StatsBar
          total={stats.total}
          pending={stats.pending}
          shortlisted={stats.shortlisted}
          rejected={stats.rejected}
        />
      )}

      {/* ── Tabs ── */}
      <div className="ap-tabs">
        {STATUS_TABS.map((tab) => {
          const count = tab === "ALL"
            ? stats.total
            : (stats[tab.toLowerCase() as keyof typeof stats] ?? 0);
          return (
            <button
              key={tab}
              className={`ap-tab ${activeTab === tab ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {STATUS_TAB_LABELS[tab]}
              {count > 0 && <span className="ap-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="ap-list">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state mt-8">
          <div className="empty-state-icon">
            {activeTab === "ALL" ? "📋" : STATUS_CONFIG[activeTab as ApplicationStatus]?.icon ?? "📋"}
          </div>
          <h3>
            {activeTab === "ALL"
              ? "No applications yet"
              : `No ${STATUS_TAB_LABELS[activeTab].toLowerCase()} applications`}
          </h3>
          <p>
            {activeTab === "ALL"
              ? "Start applying to skill-matched jobs."
              : "Switch tabs to see your other applications."}
          </p>
          {activeTab === "ALL" && (
            <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/jobs")}>
              Browse Jobs →
            </button>
          )}
        </div>
      ) : (
        <div className="ap-list stagger">
          {sorted.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onWithdraw={withdraw}
              isWithdrawing={isWithdrawing}
            />
          ))}
        </div>
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* ── Page header ─────────────────────────────────── */
  .ap-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
  }

  .ap-back-btn { margin-bottom: var(--space-3); }

  .ap-page-title {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-1);
  }

  .ap-page-sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  /* ── Stats row ────────────────────────────────────── */
  .ap-stats-row {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
  }

  .ap-stat-card {
    flex: 1;
    min-width: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-4) var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    text-align: center;
  }

  .ap-stat-card--total       { background: var(--color-bg-overlay); }
  .ap-stat-card--pending     { background: var(--color-info-bg); border-color: var(--color-info-border); }
  .ap-stat-card--shortlisted { background: rgba(167,139,250,0.08); border-color: rgba(167,139,250,0.28); }
  .ap-stat-card--shortlisted .ap-stat-card__num { color: #A78BFA; }
  .ap-stat-card--rejected    { background: var(--color-danger-bg); border-color: var(--color-danger-border); }
  .ap-stat-card--rate {
    background: linear-gradient(135deg, rgba(167,139,250,0.08), rgba(34,211,238,0.06));
    border-color: var(--color-border-strong);
  }

  .ap-stat-card__num {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1;
  }

  .ap-stat-card__lbl {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* ── Tabs ─────────────────────────────────────────── */
  .ap-tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: var(--space-5);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ap-tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: var(--text-sm);
    font-family: var(--font-body);
    color: var(--color-text-muted);
    white-space: nowrap;
    transition: color var(--duration-fast) var(--ease-out),
                border-color var(--duration-fast) var(--ease-out);
    margin-bottom: -1px;
  }

  .ap-tab:hover { color: var(--color-text-secondary); }

  .ap-tab.is-active {
    color: var(--color-primary-400);
    border-bottom-color: var(--color-primary-400);
    font-weight: var(--weight-semibold);
  }

  .ap-tab__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--radius-full);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-default);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  .ap-tab.is-active .ap-tab__count {
    background: var(--color-primary-glow);
    border-color: var(--color-border-focus);
    color: var(--color-primary-400);
  }

  /* ── List ─────────────────────────────────────────── */
  .ap-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* ── Card ─────────────────────────────────────────── */
  .ap-card {
    position: relative;
    overflow: hidden;
    padding: 0;
    border-left: 3px solid var(--color-border-default);
    transition: transform var(--duration-base) var(--ease-spring),
                box-shadow var(--duration-base) var(--ease-out);
  }

  .ap-card:hover { transform: translateX(2px); }

  .ap-card--shortlisted { border-left-color: #A78BFA; }
  .ap-card--pending     { border-left-color: var(--color-cyan-400); }
  .ap-card--rejected    { border-left-color: var(--color-danger); }
  .ap-card--withdrawn   { border-left-color: var(--color-border-strong); opacity: 0.72; }

  .ap-card__inner {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Header */
  .ap-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .ap-card__company-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }

  .ap-card__logo {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--text-lg);
    flex-shrink: 0;
  }

  .ap-card__title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .ap-card__job-title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    line-height: 1.2;
    transition: color var(--duration-fast) var(--ease-out);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 420px;
  }

  .ap-card__job-title:hover { color: var(--color-primary-400); }

  .ap-card__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .ap-card__meta-item {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .ap-card__meta-sep { color: var(--color-border-strong); font-size: var(--text-xs); }

  .ap-priority-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-gold-300, #FCD34D);
    background: rgba(245,158,11,0.10);
    border: 1px solid rgba(245,158,11,0.30);
    border-radius: var(--radius-full);
    padding: 1px 8px;
  }

  /* Status badge */
  .ap-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    border: 1px solid;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    white-space: nowrap;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  /* ── Timeline wrapper ─────────────────────────────── */
  .ap-timeline-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Priority queue badge — shown above timeline when user has a priority slot */
  .ap-priority-queue-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.25);
    border-radius: var(--radius-lg);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: #F59E0B;
  }

  .ap-priority-queue-hint {
    margin-left: auto;
    font-weight: 400;
    color: var(--color-text-muted);
    font-size: 11px;
  }

  /* Shortlisted state in timeline */
  .ap-timeline__step.is-shortlisted .ap-timeline__dot {
    border-color: #A78BFA;
    background: rgba(167,139,250,0.10);
    color: #A78BFA;
    box-shadow: 0 0 10px rgba(167,139,250,0.25);
  }
  .ap-timeline__step.is-shortlisted .ap-timeline__label { color: #A78BFA; }

  /* ── Timeline ─────────────────────────────────────── */
  .ap-timeline {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    gap: 0;
  }

  .ap-timeline__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .ap-timeline__dot {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-full);
    border: 2px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--color-text-disabled);
    transition: all var(--duration-base) var(--ease-out);
  }

  .ap-timeline__step.is-active .ap-timeline__dot {
    border-color: var(--color-cyan-400);
    background: var(--color-cyan-glow, rgba(34,211,238,0.08));
    color: var(--color-cyan-400);
    box-shadow: var(--glow-cyan, 0 0 10px rgba(34,211,238,0.2));
  }

  .ap-timeline__step.is-past .ap-timeline__dot {
    border-color: var(--color-verified, #34D399);
    background: var(--color-verified-bg);
    color: var(--color-verified, #34D399);
  }

  /* Shortlisted = positive outcome — purple glow */
  .ap-timeline__step.is-shortlisted .ap-timeline__dot {
    border-color: #A78BFA;
    background: rgba(167,139,250,0.12);
    color: #A78BFA;
    box-shadow: 0 0 14px rgba(167,139,250,0.30);
  }

  .ap-timeline__step.is-failed .ap-timeline__dot {
    border-color: var(--color-danger);
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .ap-timeline__step.is-active.is-failed .ap-timeline__dot {
    box-shadow: 0 0 10px rgba(248,113,113,0.3);
  }

  .ap-timeline__label {
    font-size: 10px;
    color: var(--color-text-disabled);
    white-space: nowrap;
    text-align: center;
    margin-top: 2px;
    letter-spacing: 0.02em;
  }

  .ap-timeline__step.is-active       .ap-timeline__label { color: var(--color-cyan-400); }
  .ap-timeline__step.is-past         .ap-timeline__label { color: var(--color-verified, #34D399); }
  .ap-timeline__step.is-shortlisted  .ap-timeline__label { color: #A78BFA; }
  .ap-timeline__step.is-failed       .ap-timeline__label { color: var(--color-danger); }

  .ap-timeline__connector {
    flex: 1;
    height: 2px;
    background: var(--color-border-default);
    margin-bottom: 18px;
    min-width: 24px;
    transition: background var(--duration-base) var(--ease-out);
  }

  .ap-timeline__connector.is-filled { background: var(--color-verified, #34D399); }
  .ap-timeline__connector.is-dashed {
    background: repeating-linear-gradient(
      90deg,
      var(--color-border-strong) 0,
      var(--color-border-strong) 4px,
      transparent 4px,
      transparent 8px
    );
  }

  /* ── Status message ───────────────────────────────── */
  .ap-card__status-msg {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    border: 1px solid;
    line-height: var(--leading-relaxed);
  }

  /* ── Actions ──────────────────────────────────────── */
  .ap-card__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
    flex-wrap: wrap;
  }

  .ap-withdraw-btn {
    color: var(--color-danger) !important;
    margin-left: auto;
  }

  .ap-withdraw-btn:hover {
    background: var(--color-danger-bg) !important;
    border-color: var(--color-danger-border) !important;
  }

  .ap-confirm-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-left: auto;
  }

  /* ── Responsive ───────────────────────────────────── */
  @media (max-width: 768px) {
    .ap-page-header { flex-direction: column; }
    .ap-stats-row   { gap: var(--space-2); }
    .ap-stat-card   { min-width: calc(50% - var(--space-2)); }
    .ap-card__inner { padding: var(--space-4); }
    .ap-card__job-title { max-width: 100%; }
  }
`;

export default ApplicationsPage;