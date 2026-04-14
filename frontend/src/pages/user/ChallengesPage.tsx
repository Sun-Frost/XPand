/* ============================================================
   ChallengesPage.tsx — XPand
   "Every quest earns XP. XP earns power. Power earns jobs."
   ============================================================ */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useChallenges } from "../../hooks/user/useChallenges";
import type { ChallengeWithProgress, PlayerStats } from "../../hooks/user/useChallenges";

// ── Constants ─────────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<PlayerStats["rank"], { label: string; color: string; roman: string }> = {
  RECRUIT:    { label: "Recruit",    color: "var(--color-text-muted)",  roman: "I"   },
  APPRENTICE: { label: "Apprentice", color: "var(--color-cyan-400)",    roman: "II"  },
  JOURNEYMAN: { label: "Journeyman", color: "var(--color-green-400)",   roman: "III" },
  EXPERT:     { label: "Expert",     color: "var(--color-primary-400)", roman: "IV"  },
  MASTER:     { label: "Master",     color: "var(--color-gold-light)",  roman: "V"   },
  LEGEND:     { label: "Legend",     color: "var(--color-warning)",     roman: "VI"  },
};

// Each category has a badge class + an accent variable for its visual identity
const CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string; accentVar: string; icon: string }> = {
  DAILY:     { label: "Daily",     badgeClass: "badge-warning", accentVar: "--color-warning",   icon: "🌅" },
  WEEKLY:    { label: "Weekly",    badgeClass: "badge-cyan",    accentVar: "--color-cyan-400",   icon: "📅" },
  STREAK:    { label: "Streak",    badgeClass: "badge-warning", accentVar: "--color-warning",   icon: "🔥" },
  MILESTONE: { label: "Milestone", badgeClass: "badge-primary", accentVar: "--color-primary-400", icon: "🏔️" },
  SKILL:     { label: "Skill",     badgeClass: "badge-green",   accentVar: "--color-green-400",  icon: "🔬" },
  SOCIAL:    { label: "Social",    badgeClass: "badge-muted",   accentVar: "--color-text-muted", icon: "🤝" },
};

const CATEGORY_ORDER = ["DAILY", "WEEKLY", "STREAK", "SKILL", "MILESTONE", "SOCIAL"];

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

// ── Player HUD ────────────────────────────────────────────────────────────────
// The status bar at the top — your rank, XP, and standing in one glance.

const PlayerHUD: React.FC<{ stats: PlayerStats }> = ({ stats }) => {
  const rank    = RANK_CONFIG[stats.rank];
  const xpRange = stats.xpToNextLevel - stats.xpForCurrentLevel;
  const xpProg  = stats.totalXp - stats.xpForCurrentLevel;
  const pct     = Math.min(100, Math.round((xpProg / Math.max(1, xpRange)) * 100));

  return (
    <div
      className="card"
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-6)",
        padding: "var(--space-5) var(--space-6)", flexWrap: "wrap",
        marginBottom: "var(--space-6)", position: "relative", overflow: "hidden",
      }}
    >
      {/* Ambient glow behind rank color */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 50% 80% at 0% 50%, ${rank.color}10 0%, transparent 70%)`,
      }} />
      {/* Top rail colored by rank */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${rank.color}, transparent)`,
      }} />

      {/* Rank identity */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        flexShrink: 0, position: "relative", zIndex: 1,
      }}>
        {/* Avatar placeholder */}
        <div style={{
          position: "relative", width: 52, height: 52,
          borderRadius: "var(--radius-full)",
          background: "var(--color-bg-overlay)",
          border: `2px solid ${rank.color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-xl)",
            fontWeight: 700, color: "var(--color-text-primary)",
          }}>A</span>
          <div className="badge badge-gold" style={{
            position: "absolute", bottom: -4, right: -4,
            minWidth: 20, height: 20, padding: "0 4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
            border: "2px solid var(--color-bg-surface)",
          }}>
            {stats.currentLevel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="mono" style={{
            fontSize: "var(--text-sm)", fontWeight: 700,
            letterSpacing: "0.08em", color: rank.color,
          }}>
            {rank.label}
          </span>
          <span className="caption mono" style={{ fontSize: 10 }}>Rank {rank.roman}</span>
        </div>
      </div>

      {/* XP bar + level info */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 160, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <span className="mono" style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-gold-light)" }}>
            {stats.totalXp.toLocaleString()} XP
          </span>
          <span className="label">LEVEL {stats.currentLevel}</span>
          <span className="caption mono">{stats.xpToNextLevel.toLocaleString()} XP next</span>
        </div>
        <div className="progress-track" style={{ height: 7 }}>
          <div className="progress-bar progress-bar-gold" style={{ width: `${pct}%` }} />
        </div>
        <span className="caption">
          {(xpRange - xpProg).toLocaleString()} XP to Level {stats.currentLevel + 1}
        </span>
      </div>

      {/* Mini stat cards */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div className="stat-card stat-card-green" style={{ minWidth: 64, padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>
          <div className="stat-value" style={{ fontSize: "var(--text-xl)" }}>{stats.completedChallenges}</div>
          <div className="stat-label">DONE</div>
        </div>
        <div className="stat-card stat-card-primary" style={{ minWidth: 64, padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>
          <div className="stat-value" style={{ fontSize: "var(--text-xl)" }}>{stats.activeChallenges}</div>
          <div className="stat-label">ACTIVE</div>
        </div>
      </div>
    </div>
  );
};

// ── Quest Card ────────────────────────────────────────────────────────────────
// The primary unit of the challenges grid.

const QuestCard: React.FC<{ challenge: ChallengeWithProgress }> = ({ challenge }) => {
  const cat        = CATEGORY_CONFIG[challenge.category] ?? CATEGORY_CONFIG["MILESTONE"];
  const progress   = challenge.currentProgress;
  const target     = challenge.conditionValue || 1;
  const pct        = Math.min(100, Math.round((progress / target) * 100));
  const isComplete = challenge.status === "COMPLETED";
  const notStarted = challenge.status === "NOT_STARTED";
  const expiresIn  = challenge.endDate ? formatCountdown(challenge.endDate) : null;
  const isExpiring = challenge.endDate
    ? new Date(challenge.endDate).getTime() - Date.now() < 1000 * 60 * 60 * 3
    : false;

  // Determine progress bar color
  const barClass = pct >= 80 ? "progress-bar-green"
    : pct >= 40 ? ""  // default primary
    : "progress-bar-cyan";

  return (
    <div
      className="card card-interactive card-glow-primary"
      style={{
        padding: "var(--space-5)", display: "flex", flexDirection: "column",
        gap: "var(--space-4)", position: "relative", overflow: "hidden",
      }}
    >
      {/* Category color rail on the left */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: `var(${cat.accentVar})`, opacity: 0.7,
      }} />

      {/* Icon + header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div
          className="badge badge-muted"
          style={{
            width: 42, height: 42, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.35rem", flexShrink: 0,
            borderRadius: "var(--radius-lg)",
          }}
        >
          {challenge.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-1)", flexWrap: "wrap" }}>
            <span className={`badge ${cat.badgeClass}`}>{cat.icon} {cat.label}</span>
            {/* Difficulty as filled/hollow diamonds */}
            <span className="caption mono" style={{ letterSpacing: "0.04em" }}>
              {"◆".repeat(challenge.difficulty)}{"◇".repeat(5 - challenge.difficulty)}
            </span>
          </div>
          <h3 style={{
            fontSize: "var(--text-base)", fontWeight: 600,
            color: "var(--color-text-primary)", margin: 0, lineHeight: 1.3,
          }}>
            {challenge.title}
          </h3>
        </div>

        <div className="xp-pill" style={{ flexShrink: 0 }}>⚡ {challenge.xpReward}</div>
      </div>

      {/* Description — feels like a quest briefing */}
      <p className="caption" style={{ fontStyle: "italic", margin: 0, lineHeight: 1.55 }}>
        "{challenge.description}"
      </p>

      {/* Progress */}
      {!notStarted ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div className="progress-track" style={{ height: 5 }}>
            <div className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="caption mono">{progress} / {target}</span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? "var(--color-green-400)" : "var(--color-text-muted)" }}>
              {pct}%
            </span>
          </div>
        </div>
      ) : (
        <span className="caption mono" style={{ color: "var(--color-text-muted)" }}>
          Not started — begin to track progress
        </span>
      )}

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {expiresIn && (
            <span className={`badge ${isExpiring ? "badge-danger" : "badge-muted"}`}>
              {isExpiring ? "⚠" : "⏱"} {expiresIn}
            </span>
          )}
          {!challenge.isRepeatable && (
            <span className="badge badge-muted">ONE-TIME</span>
          )}
        </div>
        <span className="caption" style={{ fontStyle: "italic" }}>
          {isComplete ? "✓ Quest complete"
           : notStarted ? "Start this quest"
           : `${target - progress} remaining`}
        </span>
      </div>
    </div>
  );
};

// ── Completed Card ────────────────────────────────────────────────────────────
// Compact row for the completed log — earned, not in progress.

const CompletedCard: React.FC<{ challenge: ChallengeWithProgress }> = ({ challenge }) => {
  const cat = CATEGORY_CONFIG[challenge.category] ?? CATEGORY_CONFIG["MILESTONE"];
  return (
    <div
      className="card"
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-4)",
        padding: "var(--space-4) var(--space-5)",
        borderLeft: "3px solid var(--color-green-400)",
      }}
    >
      <div
        className="badge badge-green"
        style={{
          width: 26, height: 26, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: "var(--radius-full)", flexShrink: 0,
          fontSize: 12,
        }}
      >
        ✓
      </div>
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{challenge.icon}</span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {challenge.title}
        </span>
        <span className={`badge ${cat.badgeClass}`} style={{ alignSelf: "flex-start", fontSize: 9 }}>
          {cat.icon} {cat.label}
        </span>
      </div>
      <div className="xp-pill" style={{ flexShrink: 0 }}>+{challenge.xpReward} XP</div>
    </div>
  );
};

// ── Category Section Header ───────────────────────────────────────────────────

const CategoryHeader: React.FC<{ category: string; count: number }> = ({ category, count }) => {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG["MILESTONE"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <div style={{
        width: 3, height: 18, borderRadius: 2,
        background: `var(${cfg.accentVar})`,
      }} />
      <span className="mono" style={{
        fontSize: "var(--text-xs)", fontWeight: 700,
        letterSpacing: "0.10em", color: "var(--color-text-secondary)",
      }}>
        {cfg.icon} {cfg.label.toUpperCase()} QUESTS
      </span>
      <span className="badge badge-muted" style={{ fontSize: 9 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border-subtle)" }} />
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="card" style={{ padding: "var(--space-5)" }}>
    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
      <div className="skeleton" style={{ width: 42, height: 42, borderRadius: "var(--radius-lg)" }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 8, borderRadius: "var(--radius-sm)" }} />
        <div className="skeleton" style={{ width: "60%", height: 18, borderRadius: "var(--radius-sm)" }} />
      </div>
      <div className="skeleton" style={{ width: 56, height: 30, borderRadius: "var(--radius-full)" }} />
    </div>
    <div className="skeleton" style={{ width: "82%", height: 13, marginBottom: 14, borderRadius: "var(--radius-sm)" }} />
    <div className="skeleton" style={{ width: "100%", height: 5, borderRadius: "var(--radius-full)" }} />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const { challenges, completedChallenges, playerStats, isLoading, error, refetch } = useChallenges();
  const [activeTab, setActiveTab]           = useState<"active" | "completed">("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredChallenges = categoryFilter === "ALL"
    ? challenges
    : challenges.filter(c => c.category === categoryFilter);

  const grouped = filteredChallenges.reduce<Record<string, ChallengeWithProgress[]>>(
    (acc, c) => { acc[c.category] = acc[c.category] ?? []; acc[c.category].push(c); return acc; },
    {}
  );

  const allCategories = ["ALL", ...Object.keys(CATEGORY_CONFIG)];

  if (error) {
    return (
      <PageLayout pageTitle="Challenges">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load quests</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Challenges">

      {/* ══════════════════════════════════════════════════════
          PAGE HEADER
          ══════════════════════════════════════════════════════ */}
      <header className="page-header">
        <div>
          <p className="page-title-eyebrow">QUEST BOARD</p>
          <h1 className="page-title">Challenges</h1>
          <p className="page-subtitle">
            Complete quests to earn XP. Spend XP in the Store to unlock career advantages.
          </p>
        </div>
        {playerStats && (
          <div className="xp-pill" style={{ flexShrink: 0, fontSize: "var(--text-sm)", padding: "7px 14px" }}>
            ⚡ {playerStats.totalXp.toLocaleString()} XP
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════
          PLAYER HUD — rank, level, XP progress
          ══════════════════════════════════════════════════════ */}
      {isLoading
        ? <div className="skeleton" style={{ height: 108, borderRadius: "var(--radius-2xl)", marginBottom: "var(--space-6)" }} />
        : playerStats && <PlayerHUD stats={playerStats} />
      }

      {/* ══════════════════════════════════════════════════════
          TABS — Active / Completed
          ══════════════════════════════════════════════════════ */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.icon} {tab.label}
            {tab.id === "active" && !isLoading && challenges.length > 0 && (
              <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: 9 }}>
                {challenges.length}
              </span>
            )}
            {tab.id === "completed" && !isLoading && completedChallenges.length > 0 && (
              <span className="badge badge-green" style={{ marginLeft: 6, fontSize: 9 }}>
                {completedChallenges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          ACTIVE QUESTS
          ══════════════════════════════════════════════════════ */}
      {activeTab === "active" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
            {allCategories.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  className={`btn btn-sm ${categoryFilter === cat ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "ALL" ? "All Categories" : `${cfg.icon} ${cfg.label}`}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="grid-auto">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗺️</div>
              <h3>No active quests here</h3>
              <p>All quests in this category are completed. Check back tomorrow.</p>
            </div>
          ) : categoryFilter !== "ALL" ? (
            <div className="grid-auto">
              {filteredChallenges.map(c => <QuestCard key={c.challengeId} challenge={c} />)}
            </div>
          ) : (
            // Grouped by category with section headers
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
              {CATEGORY_ORDER
                .filter(cat => grouped[cat]?.length)
                .map(cat => (
                  <section key={cat} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <CategoryHeader category={cat} count={grouped[cat].length} />
                    <div className="grid-auto">
                      {grouped[cat].map(c => <QuestCard key={c.challengeId} challenge={c} />)}
                    </div>
                  </section>
                ))
              }
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          COMPLETED QUESTS
          ══════════════════════════════════════════════════════ */}
      {activeTab === "completed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 68, borderRadius: "var(--radius-xl)" }} />
            ))
          ) : completedChallenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <h3>No completed quests yet</h3>
              <p>Finish your active challenges to build your quest history.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "var(--space-2)" }}>
                <span className="badge badge-green" style={{ fontSize: "var(--text-xs)" }}>
                  {completedChallenges.length} quests completed
                </span>
                <span className="xp-pill">
                  ⚡ {completedChallenges.reduce((s, c) => s + c.xpReward, 0).toLocaleString()} XP earned
                </span>
              </div>
              {completedChallenges.map(c => <CompletedCard key={c.challengeId} challenge={c} />)}
            </>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default ChallengesPage;