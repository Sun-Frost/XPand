import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useChallenges } from "../../hooks/user/useChallenges";
import type { ChallengeWithProgress, PlayerStats } from "../../hooks/user/useChallenges";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<PlayerStats["rank"], { label: string; color: string; glow: string; roman: string }> = {
  RECRUIT:    { label: "Recruit",    color: "#9CA3AF", glow: "none",                                            roman: "I"   },
  APPRENTICE: { label: "Apprentice", color: "#60A5FA", glow: "0 0 12px #60A5FA55",                              roman: "II"  },
  JOURNEYMAN: { label: "Journeyman", color: "#34D399", glow: "0 0 14px #34D39955",                              roman: "III" },
  EXPERT:     { label: "Expert",     color: "#A78BFA", glow: "0 0 16px #A78BFA66",                              roman: "IV"  },
  MASTER:     { label: "Master",     color: "#F59E0B", glow: "0 0 20px #F59E0B66",                              roman: "V"   },
  LEGEND:     { label: "Legend",     color: "#F97316", glow: "0 0 24px #F9731688, 0 0 48px #F9731633",          roman: "VI"  },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  DAILY:     { label: "Daily",     color: "#FCD34D", border: "#FCD34D55", bg: "#FCD34D0D" },
  WEEKLY:    { label: "Weekly",    color: "#60A5FA", border: "#60A5FA55", bg: "#60A5FA0D" },
  STREAK:    { label: "Streak",    color: "#F97316", border: "#F9731655", bg: "#F973160D" },
  MILESTONE: { label: "Milestone", color: "#A78BFA", border: "#A78BFA55", bg: "#A78BFA0D" },
  SKILL:     { label: "Skill",     color: "#34D399", border: "#34D39955", bg: "#34D3990D" },
  SOCIAL:    { label: "Social",    color: "#F472B6", border: "#F472B655", bg: "#F472B60D" },
};

const DIFF_COLORS = ["", "#9CA3AF", "#34D399", "#60A5FA", "#F59E0B", "#F97316"];

const TABS = [
  { id: "active",    label: "Active Quests", icon: "⚔️" },
  { id: "completed", label: "Completed",     icon: "✅" },
];

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs  = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
  if (hrs > 0)  return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player HUD
// ─────────────────────────────────────────────────────────────────────────────

const PlayerHUD: React.FC<{ stats: PlayerStats }> = ({ stats }) => {
  const rank     = RANK_CONFIG[stats.rank];
  const xpRange  = stats.xpToNextLevel - stats.xpForCurrentLevel;
  const xpProgress = stats.totalXp - stats.xpForCurrentLevel;
  const pct      = Math.min(100, Math.round((xpProgress / (xpRange || 1)) * 100));

  return (
    <div className="player-hud">
      <div className="hud-scanlines" aria-hidden="true" />

      {/* Left: avatar + rank */}
      <div className="hud-identity">
        <div className="hud-avatar" style={{ boxShadow: rank.glow }}>
          <span className="hud-avatar__initial">A</span>
          <div className="hud-avatar__level-badge">{stats.currentLevel}</div>
        </div>
        <div className="hud-rank-info">
          <span className="hud-rank-label" style={{ color: rank.color, textShadow: rank.glow }}>
            {rank.label}
          </span>
          <span className="hud-rank-roman">{rank.roman}</span>
        </div>
      </div>

      {/* Center: XP bar */}
      <div className="hud-xp-section">
        <div className="hud-xp-meta">
          <span className="hud-xp-current" style={{ color: "#FCD34D" }}>
            {stats.totalXp.toLocaleString()} XP
          </span>
          <span className="hud-xp-label">LEVEL {stats.currentLevel}</span>
          <span className="hud-xp-next">{stats.xpToNextLevel.toLocaleString()} XP</span>
        </div>
        <div className="hud-xp-track">
          <div className="hud-xp-fill" style={{ width: `${pct}%` }} />
          <div className="hud-xp-glow" style={{ left: `${pct}%` }} />
          <span className="hud-xp-pct">{pct}%</span>
        </div>
        <div className="hud-xp-sublabel">
          {(xpRange - xpProgress).toLocaleString()} XP to Level {stats.currentLevel + 1}
        </div>
      </div>

      {/* Right: stat chips */}
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-stat__icon">✅</span>
          <span className="hud-stat__value">{stats.completedChallenges}</span>
          <span className="hud-stat__label">DONE</span>
        </div>
        <div className="hud-stat">
          <span className="hud-stat__icon">⚔️</span>
          <span className="hud-stat__value">{stats.activeChallenges}</span>
          <span className="hud-stat__label">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Quest Card
// ─────────────────────────────────────────────────────────────────────────────

interface QuestCardProps {
  challenge: ChallengeWithProgress;
}

const QuestCard: React.FC<QuestCardProps> = ({ challenge }) => {
  const cat      = CATEGORY_CONFIG[challenge.category] ?? CATEGORY_CONFIG["MILESTONE"];
  const progress = challenge.currentProgress;
  const target   = challenge.conditionValue || 1;
  const pct      = Math.min(100, Math.round((progress / target) * 100));
  const isComplete = challenge.status === "COMPLETED";
  const notStarted = challenge.status === "NOT_STARTED";

  const expiresIn      = challenge.endDate ? formatCountdown(challenge.endDate) : null;
  const isExpiringSoon = challenge.endDate
    ? new Date(challenge.endDate).getTime() - Date.now() < 1000 * 60 * 60 * 3
    : false;

  return (
    <div
      className="quest-card"
      style={{
        "--cat-color":  cat.color,
        "--cat-border": cat.border,
        "--cat-bg":     cat.bg,
      } as React.CSSProperties}
    >
      <div className="quest-card__inner">
        {/* Icon + title row */}
        <div className="quest-header">
          <div className="quest-icon">{challenge.icon}</div>
          <div className="quest-title-block">
            <div className="quest-badges-row">
              <span className="quest-cat-badge" style={{ color: cat.color, borderColor: cat.border, background: cat.bg }}>
                {cat.label}
              </span>
              <span className="quest-diff-badge" style={{ color: DIFF_COLORS[challenge.difficulty] }}>
                {"◆".repeat(challenge.difficulty)}{"◇".repeat(5 - challenge.difficulty)}
              </span>
            </div>
            <h3 className="quest-title">{challenge.title}</h3>
          </div>
          <div className="quest-xp-reward">
            <span className="quest-xp-value">{challenge.xpReward}</span>
            <span className="quest-xp-unit">XP</span>
          </div>
        </div>

        {/* Description */}
        <p className="quest-flavor">"{challenge.description}"</p>

        {/* Progress bar */}
        {!notStarted && (
          <div className="quest-progress-section">
            <div className="quest-progress-track">
              <div
                className={`quest-progress-fill ${pct === 100 ? "quest-progress-fill--complete" : ""}`}
                style={{ width: `${pct}%`, "--cat-color": cat.color } as React.CSSProperties}
              />
              {pct === 100 && <div className="quest-progress-shimmer" />}
            </div>
            <div className="quest-progress-meta">
              <span className="quest-progress-count">{progress} / {target}</span>
              <span className="quest-progress-pct" style={{ color: pct === 100 ? cat.color : undefined }}>
                {pct}%
              </span>
            </div>
          </div>
        )}

        {notStarted && (
          <div className="quest-not-started-label">Not started yet</div>
        )}

        {/* Footer */}
        <div className="quest-footer">
          <div className="quest-footer-left">
            {expiresIn && (
              <span className={`quest-timer ${isExpiringSoon ? "quest-timer--urgent" : ""}`}>
                {isExpiringSoon ? "⚠" : "⏱"} {expiresIn}
              </span>
            )}
            {!challenge.isRepeatable && (
              <span className="quest-one-time">ONE-TIME</span>
            )}
          </div>
          <div className="quest-progress-label">
            {isComplete
              ? "✓ Completed"
              : notStarted
              ? "Start this quest"
              : `${target - progress} more to go`}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Completed Quest Card (compact)
// ─────────────────────────────────────────────────────────────────────────────

const CompletedCard: React.FC<{ challenge: ChallengeWithProgress }> = ({ challenge }) => {
  const cat = CATEGORY_CONFIG[challenge.category] ?? CATEGORY_CONFIG["MILESTONE"];
  return (
    <div className="completed-card">
      <div className="completed-card__check">✓</div>
      <span className="completed-card__icon">{challenge.icon}</span>
      <div className="completed-card__info">
        <span className="completed-card__title">{challenge.title}</span>
        <span className="completed-card__cat label" style={{ color: cat.color }}>{cat.label}</span>
      </div>
      <div className="completed-card__xp">+{challenge.xpReward} XP</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonHUD: React.FC = () => (
  <div className="skeleton-hud">
    <div className="skeleton skeleton--hud" />
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="quest-card" style={{ padding: "var(--space-5)" }}>
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: "60%", height: 20, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: 56, height: 40, borderRadius: 8 }} />
    </div>
    <div className="skeleton" style={{ width: "85%", height: 14, marginBottom: 16, borderRadius: 4 }} />
    <div className="skeleton" style={{ width: "100%", height: 8, borderRadius: 4, marginBottom: 10 }} />
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8 }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ChallengesPage
// ─────────────────────────────────────────────────────────────────────────────

const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    challenges,
    completedChallenges,
    playerStats,
    isLoading,
    error,
    refetch,
  } = useChallenges();

  const [activeTab, setActiveTab]           = useState<"active" | "completed">("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Filter active challenges by category
  const filteredChallenges = categoryFilter === "ALL"
    ? challenges
    : challenges.filter((c) => c.category === categoryFilter);

  // Group by category for display
  const grouped = filteredChallenges.reduce<Record<string, ChallengeWithProgress[]>>(
    (acc, c) => {
      acc[c.category] = acc[c.category] ?? [];
      acc[c.category].push(c);
      return acc;
    },
    {}
  );

  const categoryOrder = ["DAILY", "WEEKLY", "STREAK", "SKILL", "MILESTONE", "SOCIAL"];
  const categories    = ["ALL", ...Object.keys(CATEGORY_CONFIG)];

  if (error) {
    return (
      <div className="page-content challenges-page">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load quests</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={refetch} style={{ marginTop: 12 }}>
            Retry
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <PageLayout pageTitle="Challenges">

      {/* ── Page title ─────────────────────────────── */}
      <div className="challenges-page__title-row">
        <div>
          <div className="challenges-page__eyebrow">
            <span className="challenges-eyebrow__pip" aria-hidden="true" />
            <span className="challenges-eyebrow__text">QUEST BOARD</span>
            <span className="challenges-eyebrow__pip" aria-hidden="true" />
          </div>
          <h1 className="challenges-page__h1">Challenges</h1>
          <p className="challenges-page__sub">
            Complete quests to earn XP. Spend XP in the Store.
          </p>
        </div>
      </div>

      {/* ── Player HUD ─────────────────────────────── */}
      {isLoading ? (
        <SkeletonHUD />
      ) : playerStats ? (
        <PlayerHUD stats={playerStats} />
      ) : null}

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="challenges-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`challenges-tab ${activeTab === tab.id ? "challenges-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            <span className="challenges-tab__icon">{tab.icon}</span>
            {tab.label}
            {tab.id === "active" && !isLoading && challenges.length > 0 && (
              <span className="challenges-tab__count">{challenges.length}</span>
            )}
            {tab.id === "completed" && !isLoading && completedChallenges.length > 0 && (
              <span className="challenges-tab__count challenges-tab__count--done">
                {completedChallenges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Active Quests ─────────────────────────── */}
      {activeTab === "active" && (
        <>
          {/* Category filter pills */}
          <div className="challenges-filter-row">
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  className={`challenges-filter-pill ${categoryFilter === cat ? "challenges-filter-pill--active" : ""}`}
                  style={categoryFilter === cat && cfg
                    ? { color: cfg.color, borderColor: cfg.border, background: cfg.bg }
                    : undefined
                  }
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "ALL" ? "All" : cfg?.label ?? cat}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="quest-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗺️</div>
              <h3>No active quests</h3>
              <p>All challenges in this category are completed.</p>
            </div>
          ) : categoryFilter !== "ALL" ? (
            <div className="quest-grid">
              {filteredChallenges.map((c) => (
                <QuestCard key={c.challengeId} challenge={c} />
              ))}
            </div>
          ) : (
            // Grouped by category
            <div className="quest-sections">
              {categoryOrder
                .filter((cat) => grouped[cat]?.length)
                .map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  return (
                    <section key={cat} className="quest-section">
                      <div className="quest-section__header">
                        <div
                          className="quest-section__line"
                          style={{ background: cfg.color }}
                          aria-hidden="true"
                        />
                        <h2 className="quest-section__title" style={{ color: cfg.color }}>
                          {cfg.label} Quests
                        </h2>
                        <span className="quest-section__count">{grouped[cat].length}</span>
                        <div className="quest-section__divider" aria-hidden="true" />
                      </div>
                      <div className="quest-grid">
                        {grouped[cat].map((c) => (
                          <QuestCard key={c.challengeId} challenge={c} />
                        ))}
                      </div>
                    </section>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* ── Completed ─────────────────────────────── */}
      {activeTab === "completed" && (
        <div className="completed-section">
          {isLoading ? (
            <div className="completed-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="completed-card">
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: "50%", height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: 60, height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 72, height: 20 }} />
                </div>
              ))}
            </div>
          ) : completedChallenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <h3>No completed quests yet</h3>
              <p>Finish your active challenges to see them here.</p>
            </div>
          ) : (
            <>
              <div className="completed-summary">
                <span className="completed-summary__text label">
                  {completedChallenges.length} quests completed ·{" "}
                  {completedChallenges
                    .reduce((sum, c) => sum + c.xpReward, 0)
                    .toLocaleString()}{" "}
                  XP earned
                </span>
              </div>
              <div className="completed-list">
                {completedChallenges.map((c) => (
                  <CompletedCard key={c.challengeId} challenge={c} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  /* ── Global page ─────────────────────────────────── */
  .challenges-page {
    max-width: 1100px;
    position: relative;
  }

  /* ── Title row ────────────────────────────────────── */
  .challenges-page__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
  }

  .challenges-page__eyebrow {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .challenges-eyebrow__pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #FCD34D;
    box-shadow: 0 0 8px #FCD34D;
    animation: pip-pulse 2s ease-in-out infinite;
  }
  .challenges-eyebrow__text {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-bold);
    letter-spacing: 0.2em;
    color: #FCD34D;
    text-shadow: 0 0 12px #FCD34D88;
  }
  @keyframes pip-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.7); }
  }

  .challenges-page__h1 {
    font-family: var(--font-display);
    font-size: clamp(var(--text-3xl), 4vw, var(--text-4xl));
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-1);
    letter-spacing: -0.02em;
  }
  .challenges-page__sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  /* ════════════════════════════════════════════════════
     PLAYER HUD
  ════════════════════════════════════════════════════ */
  .player-hud {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-5) var(--space-7);
    background: linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-overlay) 100%);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-2xl);
    margin-bottom: var(--space-6);
    overflow: hidden;
  }
  .hud-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(255,255,255,0.012) 3px,
      rgba(255,255,255,0.012) 4px
    );
    pointer-events: none;
    border-radius: inherit;
  }

  .hud-identity {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-shrink: 0;
  }
  .hud-avatar {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e1e2e, #2d2d44);
    border: 2px solid var(--color-border-default);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hud-avatar__initial {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
  }
  .hud-avatar__level-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FCD34D;
    color: #000;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-bg-default);
  }
  .hud-rank-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .hud-rank-label {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    letter-spacing: 0.1em;
  }
  .hud-rank-roman {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-muted);
    letter-spacing: 0.15em;
  }

  .hud-xp-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }
  .hud-xp-meta {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }
  .hud-xp-current {
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
  }
  .hud-xp-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--color-text-muted);
    margin-left: auto;
  }
  .hud-xp-next {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
  .hud-xp-track {
    position: relative;
    height: 8px;
    background: var(--color-bg-overlay);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
  }
  .hud-xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #FCD34D, #F97316);
    border-radius: inherit;
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }
  .hud-xp-glow {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #FCD34D;
    filter: blur(6px);
    opacity: 0.7;
    pointer-events: none;
  }
  .hud-xp-pct {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: var(--weight-bold);
    color: rgba(255,255,255,0.7);
  }
  .hud-xp-sublabel {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .hud-stats {
    display: flex;
    gap: var(--space-3);
    flex-shrink: 0;
  }
  .hud-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    min-width: 64px;
  }
  .hud-stat__icon { font-size: 1rem; }
  .hud-stat__value {
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1;
  }
  .hud-stat__label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  /* ── Skeleton HUD ── */
  .skeleton-hud { margin-bottom: var(--space-6); }
  .skeleton--hud { width: 100%; height: 110px; border-radius: var(--radius-2xl); }
  .skeleton {
    background: linear-gradient(90deg,
      var(--color-bg-elevated) 25%,
      var(--color-bg-overlay) 50%,
      var(--color-bg-elevated) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ════════════════════════════════════════════════════
     TABS
  ════════════════════════════════════════════════════ */
  .challenges-tabs {
    display: flex;
    gap: var(--space-1);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-1);
    width: fit-content;
    margin-bottom: var(--space-6);
  }
  .challenges-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-lg);
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    white-space: nowrap;
  }
  .challenges-tab:hover { color: var(--color-text-primary); background: var(--color-bg-overlay); }
  .challenges-tab--active {
    background: var(--color-bg-overlay);
    color: var(--color-text-primary);
    font-weight: var(--weight-semibold);
    box-shadow: inset 0 0 0 1px var(--color-border-default);
  }
  .challenges-tab__icon { font-size: 0.9rem; }
  .challenges-tab__count {
    padding: 2px 7px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: var(--weight-bold);
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-border);
  }
  .challenges-tab__count--done {
    background: var(--color-verified-bg);
    color: var(--color-verified);
    border-color: var(--color-verified-border);
  }

  /* ════════════════════════════════════════════════════
     FILTER PILLS
  ════════════════════════════════════════════════════ */
  .challenges-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }
  .challenges-filter-pill {
    padding: var(--space-1) var(--space-4);
    border-radius: 999px;
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    white-space: nowrap;
  }
  .challenges-filter-pill:hover { color: var(--color-text-primary); border-color: var(--color-border-strong); }
  .challenges-filter-pill--active { font-weight: var(--weight-semibold); }

  /* ════════════════════════════════════════════════════
     QUEST GRID & SECTIONS
  ════════════════════════════════════════════════════ */
  .quest-sections { display: flex; flex-direction: column; gap: var(--space-8); }
  .quest-section { display: flex; flex-direction: column; gap: var(--space-4); }

  .quest-section__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .quest-section__line {
    width: 3px;
    height: 18px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .quest-section__title {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    letter-spacing: 0.1em;
    margin: 0;
  }
  .quest-section__count {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-muted);
    padding: 2px 8px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
  }
  .quest-section__divider {
    flex: 1;
    height: 1px;
    background: var(--color-border-subtle);
  }

  .quest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }

  /* ════════════════════════════════════════════════════
     QUEST CARD
  ════════════════════════════════════════════════════ */
  .quest-card {
    position: relative;
    background: var(--color-bg-elevated);
    border: 1px solid var(--cat-border, var(--color-border-default));
    border-radius: var(--radius-xl);
    background-color: var(--cat-bg, var(--color-bg-elevated));
    overflow: hidden;
    transition: transform var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }
  .quest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  }
  .quest-card__inner {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .quest-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .quest-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    flex-shrink: 0;
  }
  .quest-title-block { flex: 1; min-width: 0; }
  .quest-badges-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-bottom: var(--space-1);
  }
  .quest-cat-badge {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: var(--weight-bold);
    letter-spacing: 0.15em;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid;
  }
  .quest-diff-badge {
    font-size: 10px;
    letter-spacing: 0.05em;
  }
  .quest-title {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.3;
  }
  .quest-xp-reward {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .quest-xp-value {
    font-family: var(--font-mono);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: #FCD34D;
    text-shadow: 0 0 12px #FCD34D44;
    line-height: 1;
  }
  .quest-xp-unit {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    color: #FCD34D88;
  }

  .quest-flavor {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
    line-height: 1.5;
  }

  .quest-not-started-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.08em;
    padding: var(--space-2) 0;
  }

  /* Progress */
  .quest-progress-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .quest-progress-track {
    position: relative;
    height: 6px;
    background: var(--color-bg-overlay);
    border-radius: 999px;
    overflow: hidden;
  }
  .quest-progress-fill {
    height: 100%;
    background: var(--cat-color, #60A5FA);
    border-radius: inherit;
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
    opacity: 0.85;
  }
  .quest-progress-fill--complete {
    opacity: 1;
    box-shadow: 0 0 8px var(--cat-color, #60A5FA);
  }
  .quest-progress-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
    border-radius: inherit;
  }
  .quest-progress-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .quest-progress-count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
  .quest-progress-pct {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
    transition: color var(--duration-fast) var(--ease-out);
  }

  /* Footer */
  .quest-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .quest-footer-left { display: flex; align-items: center; gap: var(--space-2); }
  .quest-timer {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding: 2px 8px;
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
  }
  .quest-timer--urgent {
    color: #F97316;
    border-color: #F9731644;
    background: #F973160D;
    animation: urgent-pulse 1.2s ease-in-out infinite;
  }
  @keyframes urgent-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .quest-one-time {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    padding: 2px 6px;
    border: 1px solid var(--color-border-subtle);
    border-radius: 4px;
  }
  .quest-progress-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16) var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
    gap: var(--space-3);
  }
  .empty-state-icon { font-size: 3rem; }
  .empty-state h3 {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }
  .empty-state p { font-size: var(--text-sm); margin: 0; }

  /* ════════════════════════════════════════════════════
     COMPLETED LIST
  ════════════════════════════════════════════════════ */
  .completed-section { display: flex; flex-direction: column; gap: var(--space-4); }
  .completed-summary {
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    display: inline-block;
  }
  .completed-summary__text { color: var(--color-text-muted); }
  .completed-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .completed-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    border-left: 3px solid var(--color-verified);
    transition: transform var(--duration-fast) var(--ease-out);
  }
  .completed-card:hover { transform: translateX(3px); }
  .completed-card__check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-verified-bg);
    border: 1px solid var(--color-verified-border);
    color: var(--color-verified);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    flex-shrink: 0;
  }
  .completed-card__icon { font-size: 1.2rem; flex-shrink: 0; }
  .completed-card__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .completed-card__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
  }
  .completed-card__xp {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    color: #FCD34D;
    white-space: nowrap;
    text-shadow: 0 0 12px #FCD34D44;
  }

  /* ── Responsive ─────────────────────────────────── */
  @media (max-width: 900px) {
    .player-hud { flex-wrap: wrap; padding: var(--space-5); gap: var(--space-4); }
    .hud-stats { width: 100%; justify-content: space-around; }
    .hud-xp-section { order: 3; width: 100%; flex: none; }
  }
  @media (max-width: 768px) {
    .quest-grid { grid-template-columns: 1fr; }
    .challenges-page__title-row { flex-direction: column; }
  }
  @media (max-width: 540px) {
    .challenges-tabs { width: 100%; }
    .challenges-tab { flex: 1; justify-content: center; padding: var(--space-2); }
    .hud-stats { gap: var(--space-2); }
    .hud-stat { min-width: 52px; padding: var(--space-2); }
  }
`;

export default ChallengesPage;