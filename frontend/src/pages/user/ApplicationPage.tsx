import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon } from "../../components/ui/Icon";
import { useApplications } from "../../hooks/user/useApplications";
import type { ApplicationResponse, ApplicationStatus } from "../../hooks/user/useApplications";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; icon: React.ReactNode; cls: string; color: string; bg: string; border: string; description: string; glyph: string }
> = {
  PENDING: {
    label: "Under Review",
    icon: null,
    glyph: "◎",
    cls: "pending",
    color: "var(--color-cyan-400)",
    bg: "var(--color-info-bg)",
    border: "var(--color-info-border)",
    description: "Your application has been submitted and is currently being reviewed by the team.",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    icon: null,
    glyph: "◈",
    cls: "shortlisted",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.30)",
    description: "You've been shortlisted — the company is actively considering your profile.",
  },
  REJECTED: {
    label: "Not Selected",
    icon: null,
    glyph: "×",
    cls: "rejected",
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    border: "var(--color-danger-border)",
    description: "This application didn't progress. Keep applying — the right role is ahead.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: null,
    glyph: "↩",
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
// Timeline
// ---------------------------------------------------------------------------

const StatusTimeline: React.FC<{ status: ApplicationStatus; prioritySlotRank?: number | null }> = ({
  status,
  prioritySlotRank,
}) => {
  const isTerminal    = status === "REJECTED" || status === "WITHDRAWN";
  const isShortlisted = status === "SHORTLISTED";

  const steps = [
    { key: "submitted",  label: "Submitted",    done: true,         active: false,       failed: false,      special: false },
    { key: "review",     label: "Under Review", done: isShortlisted, active: !isTerminal && !isShortlisted, failed: false, special: false },
    { key: "outcome",    label: isTerminal ? STATUS_CONFIG[status].label : isShortlisted ? "Shortlisted" : "Decision",
                         done: false, active: !isTerminal, failed: isTerminal, special: isShortlisted },
  ];

  return (
    <div className="ap-timeline-wrap">
      {prioritySlotRank && (
        <div className="ap-priority-badge">
          <span className="ap-priority-badge__star">⭐</span>
          <span className="ap-priority-badge__text">Priority Queue — Position <strong>#{prioritySlotRank}</strong></span>
          <span className="ap-priority-badge__hint">Reviewed before standard applicants</span>
        </div>
      )}
      <div className="ap-timeline">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div className={[
              "ap-tl-step",
              step.done    ? "is-done"    : "",
              step.active  ? "is-active"  : "",
              step.failed  ? "is-failed"  : "",
              step.special ? "is-special" : "",
            ].filter(Boolean).join(" ")}>
              <div className="ap-tl-dot">
                {step.done    && <span><Icon name="check" size={14} label="" /></span>}
                {step.active  && !step.special && <span className="ap-tl-pulse" />}
                {step.special && <span>◈</span>}
                {step.failed  && <span>{STATUS_CONFIG[status].glyph}</span>}
                {!step.done && !step.active && !step.failed && !step.special && <span className="ap-tl-idle" />}
              </div>
              <span className="ap-tl-label">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ap-tl-line ${step.done ? "is-filled" : ""}`} />
            )}
          </React.Fragment>
        ))}
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
  index: number;
}> = ({ app, onWithdraw, isWithdrawing, index }) => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const cfg = STATUS_CONFIG[app.status];
  const canWithdraw = app.status === "PENDING";
  const initial = app.jobTitle.charAt(0).toUpperCase();

  return (
    <article
      className={`ap-card ap-card--${cfg.cls} animate-fade-in`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Left status stripe */}
      <div className="ap-card__stripe" style={{ background: cfg.color }} />

      <div className="ap-card__body">

        {/* ── Top row: logo + title + badge ── */}
        <div className="ap-card__top">
          <div className="ap-card__logo-wrap">
            <div className="ap-card__logo" style={{ color: cfg.color, borderColor: cfg.border }}>
              {initial}
            </div>
            {app.prioritySlotRank && (
              <span className="ap-card__logo-star" title={`Priority #${app.prioritySlotRank}`}><Icon name="xp" size={12} label="" /></span>
            )}
          </div>

          <div className="ap-card__title-block">
            <button
              className="ap-card__job-title"
              onClick={() => navigate(`/jobs/${app.jobId}`)}
            >
              {app.jobTitle}
            </button>
            <div className="ap-card__meta">
              <span>{timeAgo(app.appliedAt)}</span>
              <span className="ap-card__dot">·</span>
              <span>{formatDate(app.appliedAt)}</span>
              {app.prioritySlotRank && (
                <>
                  <span className="ap-card__dot">·</span>
                  <span className="ap-priority-inline"><Icon name="xp" size={12} label="" /> Priority #{app.prioritySlotRank}</span>
                </>
              )}
            </div>
          </div>

          <div
            className={`ap-status-chip ap-status-chip--${cfg.cls}`}
            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
          >
            <span className="ap-status-chip__glyph">{cfg.glyph}</span>
            <span>{cfg.label}</span>
          </div>
        </div>

        {/* ── Timeline ── */}
        <StatusTimeline status={app.status} prioritySlotRank={app.prioritySlotRank} />

        {/* ── Status description ── */}
        <div
          className="ap-card__msg"
          style={{ borderColor: cfg.border, color: cfg.color }}
        >
          <span className="ap-card__msg-glyph">{cfg.glyph}</span>
          <span className="ap-card__msg-text">{cfg.description}</span>
        </div>

        {/* ── Actions ── */}
        <div className="ap-card__footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={() => navigate(`/jobs/${app.jobId}`)}
          >
            View Posting
            <span className="ap-btn__arrow">→</span>
          </button>

          <div className="ap-card__footer-right">
            {canWithdraw && !showConfirm && (
              <button
                className="ap-btn ap-btn--ghost ap-btn--danger"
                onClick={() => setShowConfirm(true)}
              >
                Withdraw
              </button>
            )}
            {canWithdraw && showConfirm && (
              <div className="ap-confirm">
                <span className="ap-confirm__label">Withdraw this application?</span>
                <button
                  className="ap-btn ap-btn--danger-solid"
                  onClick={() => { onWithdraw(app.id); setShowConfirm(false); }}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? "Withdrawing…" : "Yes, withdraw"}
                </button>
                <button className="ap-btn ap-btn--ghost" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const SkeletonCard: React.FC = () => (
  <div className="ap-card ap-skeleton-card animate-fade-in">
    <div className="ap-card__stripe skeleton-stripe" />
    <div className="ap-card__body">
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: "55%", height: 18, marginBottom: 8, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: "35%", height: 12, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 100, height: 28, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ width: "100%", height: 52, borderRadius: 10, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: 8, marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="skeleton" style={{ width: 110, height: 34, borderRadius: 8 }} />
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

const StatsBar: React.FC<{
  total: number;
  pending: number;
  shortlisted: number;
  rejected: number;
}> = ({ total, pending, shortlisted, rejected }) => {
  const shortlistRate = total > 0 ? Math.round((shortlisted / total) * 100) : null;

  const stats = [
    { value: total,       label: "Total",          color: "var(--color-text-primary)",  accent: "var(--color-border-default)" },
    { value: pending,     label: "In Review",       color: "var(--color-cyan-400)",       accent: "var(--color-info-border)" },
    { value: shortlisted, label: "Shortlisted",     color: "#A78BFA",                    accent: "rgba(167,139,250,0.28)" },
    { value: rejected,    label: "Not Selected",    color: "var(--color-danger)",          accent: "var(--color-danger-border)" },
    { value: shortlistRate !== null ? `${shortlistRate}%` : "—", label: "Shortlist Rate", color: "var(--color-gold-light, #F5B731)", accent: "var(--color-gold-border)" },
  ];

  return (
    <div className="ap-stats">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="ap-stat">
            <span className="ap-stat__value" style={{ color: s.color }}>{s.value}</span>
            <span className="ap-stat__label">{s.label}</span>
          </div>
          {i < stats.length - 1 && <div className="ap-stats__divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ApplicationsPage
// ---------------------------------------------------------------------------

const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { applications, isLoading, error, withdraw, isWithdrawing, refetch } = useApplications();

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
      <PageLayout pageTitle="My Applications">
        <div className="ap-error">
          <div className="ap-error__glyph"><Icon name="warning" size={20} label="" /></div>
          <h3 className="ap-error__title">Failed to load applications</h3>
          <p className="ap-error__msg">{error}</p>
          <button className="ap-btn ap-btn--primary" onClick={refetch}>Try again</button>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="My Applications">

      {/* ── Page Header ── */}
      <header className="ap-header">
        <div className="ap-header__left">
          <button className="ap-back-btn" onClick={() => navigate("/jobs")}>
            ← Jobs
          </button>
          <h1 className="ap-title">My Applications</h1>
          <p className="ap-subtitle">Track every role you've applied to</p>
        </div>
        <button className="ap-btn ap-btn--primary ap-cta" onClick={() => navigate("/jobs")}>
          Browse Jobs
          <span className="ap-btn__arrow">→</span>
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
      <div className="ap-tabs" role="tablist">
        {STATUS_TABS.map((tab) => {
          const count = tab === "ALL"
            ? stats.total
            : (stats[tab.toLowerCase() as keyof typeof stats] ?? 0);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              className={`ap-tab ${isActive ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {STATUS_TAB_LABELS[tab]}
              {count > 0 && (
                <span className={`ap-tab__count ${isActive ? "is-active" : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="ap-list">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="ap-empty">
          <div className="ap-empty__icon">
            {activeTab === "ALL" ? <Icon name="clipboard" size={14} label="" /> : STATUS_CONFIG[activeTab as ApplicationStatus]?.glyph ?? "◎"}
          </div>
          <h3 className="ap-empty__title">
            {activeTab === "ALL" ? "No applications yet" : `No ${STATUS_TAB_LABELS[activeTab].toLowerCase()} applications`}
          </h3>
          <p className="ap-empty__sub">
            {activeTab === "ALL"
              ? "Start applying to skill-matched jobs and your progress will appear here."
              : "Switch tabs to see applications in other stages."}
          </p>
          {activeTab === "ALL" && (
            <button className="ap-btn ap-btn--primary ap-cta" onClick={() => navigate("/jobs")}>
              Browse Jobs →
            </button>
          )}
        </div>
      ) : (
        <div className="ap-list">
          {sorted.map((app, i) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onWithdraw={withdraw}
              isWithdrawing={isWithdrawing}
              index={i}
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
  /* ── Header ──────────────────────────────────────────── */
  .ap-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
  }

  .ap-header__left {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .ap-back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: var(--space-3);
    transition: color var(--duration-fast) var(--ease-out);
  }
  .ap-back-btn:hover { color: var(--color-text-secondary); }

  .ap-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.25rem);
    font-weight: var(--weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: -0.03em;
    margin: 0 0 var(--space-1);
    line-height: 1.1;
  }

  .ap-subtitle {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  /* ── Stats ────────────────────────────────────────────── */
  .ap-stats {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: var(--space-5);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-6);
    flex-wrap: wrap;
    overflow: hidden;
  }

  .ap-stats__divider {
    width: 1px;
    height: 32px;
    background: var(--color-border-default);
    flex-shrink: 0;
    margin: 0 var(--space-5);
  }

  .ap-stat {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ap-stat__value {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: var(--weight-extrabold);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .ap-stat__label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-text-muted);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 700px) {
    .ap-stats { gap: var(--space-4); padding: var(--space-4); }
    .ap-stats__divider { display: none; }
    .ap-stat { min-width: calc(50% - var(--space-4)); }
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  .ap-tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-5);
    overflow-x: auto;
    padding: 3px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .ap-tabs::-webkit-scrollbar { display: none; }

  .ap-tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: color var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out);
  }
  .ap-tab:hover { color: var(--color-text-secondary); background: var(--color-bg-hover); }

  .ap-tab.is-active {
    color: var(--color-primary-400);
    background: var(--color-primary-glow);
    font-weight: 700;
  }

  .ap-tab__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: 99px;
    background: var(--color-bg-overlay);
    font-size: 10px;
    font-family: var(--font-mono);
    font-weight: var(--weight-bold);
    color: var(--color-text-disabled);
    line-height: 1;
  }
  .ap-tab__count.is-active {
    background: rgba(155,124,255,0.22);
    color: var(--color-primary-400);
  }

  /* ── Card List ────────────────────────────────────────── */
  .ap-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* ── Card ─────────────────────────────────────────────── */
  .ap-card {
    display: flex;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition: transform var(--duration-base) var(--ease-spring),
                border-color var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-base) var(--ease-out);
    will-change: transform;
  }

  .ap-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-md);
  }

  .ap-card--shortlisted:hover { box-shadow: 0 8px 28px rgba(167,139,250,0.12); }
  .ap-card--pending:hover     { box-shadow: 0 8px 28px rgba(34,211,238,0.10); }
  .ap-card--rejected          { opacity: 0.85; }
  .ap-card--withdrawn         { opacity: 0.65; }

  .ap-card__stripe {
    width: 3px;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .ap-skeleton-card .skeleton-stripe {
    background: var(--color-bg-overlay);
  }

  .ap-card__body {
    flex: 1;
    padding: var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  /* ── Card top row ─────────────────────────────────────── */
  .ap-card__top {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .ap-card__logo-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .ap-card__logo {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: var(--weight-extrabold);
    font-size: var(--text-xl);
    line-height: 1;
  }

  .ap-card__logo-star {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(245,158,11,0.15);
    border: 1px solid rgba(245,158,11,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }

  .ap-card__title-block {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-top: 2px;
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
    line-height: 1.25;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 440px;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .ap-card__job-title:hover { color: var(--color-primary-400); }

  .ap-card__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
  }

  .ap-card__dot { color: var(--color-border-strong); }

  .ap-priority-inline {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-weight: var(--weight-semibold);
    color: var(--color-gold-light, #F5B731);
  }

  /* ── Status chip ──────────────────────────────────────── */
  .ap-status-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 13px;
    border-radius: 99px;
    border: 1px solid;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .ap-status-chip__glyph { font-size: 10px; opacity: 0.9; }

  /* ── Priority badge ───────────────────────────────────── */
  .ap-priority-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(245,158,11,0.07);
    border: 1px solid rgba(245,158,11,0.22);
    border-radius: var(--radius-lg);
    font-size: var(--text-xs);
    color: #F59E0B;
    margin-bottom: var(--space-2);
  }

  .ap-priority-badge__text { font-weight: var(--weight-medium); }
  .ap-priority-badge__hint {
    margin-left: auto;
    color: var(--color-text-muted);
    font-weight: 400;
    font-size: 11px;
  }

  /* ── Timeline Wrap ────────────────────────────────────── */
  .ap-timeline-wrap {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Timeline ─────────────────────────────────────────── */
  .ap-timeline {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-5);
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ap-timeline::-webkit-scrollbar { display: none; }

  .ap-tl-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .ap-tl-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--color-text-disabled);
    transition: all var(--duration-base) var(--ease-out);
  }

  .ap-tl-step.is-done .ap-tl-dot {
    border-color: var(--color-green-400);
    background: rgba(45,212,160,0.10);
    color: var(--color-green-400);
  }

  .ap-tl-step.is-active .ap-tl-dot {
    border-color: var(--color-cyan-400);
    background: rgba(34,211,238,0.08);
    color: var(--color-cyan-400);
    box-shadow: var(--glow-cyan);
  }

  .ap-tl-step.is-special .ap-tl-dot {
    border-color: #A78BFA;
    background: rgba(167,139,250,0.12);
    color: #A78BFA;
    box-shadow: 0 0 14px rgba(167,139,250,0.30);
  }

  .ap-tl-step.is-failed .ap-tl-dot {
    border-color: var(--color-danger);
    background: var(--color-danger-bg);
    color: var(--color-danger);
    box-shadow: 0 0 10px rgba(248,113,113,0.25);
  }

  .ap-tl-pulse {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--color-cyan-400);
    animation: tlPulse 1.8s ease-in-out infinite;
  }

  @keyframes tlPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.6; }
  }

  .ap-tl-idle {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--color-border-default);
  }

  .ap-tl-label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-text-disabled);
    white-space: nowrap;
    letter-spacing: 0.06em;
    font-weight: 700;
    text-transform: uppercase;
  }

  .ap-tl-step.is-done    .ap-tl-label { color: var(--color-green-400); }
  .ap-tl-step.is-active  .ap-tl-label { color: var(--color-cyan-400); }
  .ap-tl-step.is-special .ap-tl-label { color: #A78BFA; }
  .ap-tl-step.is-failed  .ap-tl-label { color: var(--color-danger); }

  .ap-tl-line {
    flex: 1;
    height: 2px;
    background: var(--color-border-subtle);
    min-width: 48px;
    margin-bottom: 22px;
    transition: background var(--duration-base) var(--ease-out);
  }
  .ap-tl-line.is-filled { background: var(--color-green-400); }

  /* ── Status message ───────────────────────────────────── */
  .ap-card__msg {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-base);
    border: 1px solid;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    opacity: 0.92;
  }

  .ap-card__msg-glyph {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
    font-family: var(--font-mono);
  }

  .ap-card__msg-text { color: var(--color-text-secondary); }

  /* ── Card Footer ──────────────────────────────────────── */
  .ap-card__footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
    flex-wrap: wrap;
  }

  .ap-card__footer-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* ── Buttons ──────────────────────────────────────────── */
  .ap-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 7px 16px;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    font-family: var(--font-body);
    font-weight: var(--weight-medium);
    cursor: pointer;
    border: 1px solid;
    transition: all var(--duration-fast) var(--ease-out);
    white-space: nowrap;
    line-height: 1;
  }

  .ap-btn--primary {
    background: var(--color-primary-500);
    border-color: var(--color-primary-600);
    color: var(--color-text-on-brand);
  }
  .ap-btn--primary:hover {
    background: var(--color-primary-400);
    box-shadow: var(--glow-primary);
  }

  .ap-btn--ghost {
    background: transparent;
    border-color: var(--color-border-default);
    color: var(--color-text-secondary);
  }
  .ap-btn--ghost:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .ap-btn--danger {
    color: var(--color-danger);
    background: transparent;
    border-color: var(--color-border-default);
  }
  .ap-btn--danger:hover {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
  }

  .ap-btn--danger-solid {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger);
  }
  .ap-btn--danger-solid:hover {
    background: rgba(248,113,113,0.18);
  }
  .ap-btn--danger-solid:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ap-btn__arrow { font-size: 13px; transition: transform var(--duration-fast) var(--ease-out); }
  .ap-btn:hover .ap-btn__arrow { transform: translateX(3px); }

  .ap-cta { font-weight: var(--weight-semibold); }

  /* ── Confirm row ──────────────────────────────────────── */
  .ap-confirm {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .ap-confirm__label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  /* ── Error state ──────────────────────────────────────── */
  .ap-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-16) var(--space-8);
    text-align: center;
  }
  .ap-error__glyph { font-size: 2rem; }
  .ap-error__title { font-family: var(--font-display); font-weight: var(--weight-bold); color: var(--color-text-primary); }
  .ap-error__msg   { font-size: var(--text-sm); color: var(--color-text-muted); }

  /* ── Empty state ──────────────────────────────────────── */
  .ap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-16) var(--space-8);
    text-align: center;
    background: var(--color-bg-elevated);
    border: 1px dashed var(--color-border-default);
    border-radius: var(--radius-2xl);
  }
  .ap-empty__icon  { font-size: 2.5rem; }
  .ap-empty__title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }
  .ap-empty__sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    max-width: 360px;
    line-height: var(--leading-relaxed);
    margin: 0;
  }

  /* ── Responsive ───────────────────────────────────────── */
  @media (max-width: 768px) {
    .ap-header          { align-items: flex-start; }
    .ap-card__body      { padding: var(--space-4); }
    .ap-card__job-title { max-width: 100%; }
    .ap-card__top       { flex-wrap: wrap; }
    .ap-status-chip     { order: -1; }
    .ap-priority-badge  { flex-wrap: wrap; }
    .ap-priority-badge__hint { margin-left: 0; }
  }
`;

export default ApplicationsPage;