/* ============================================================
   ChallengesPage.tsx — XPand  (Mission Control Redesign)
   "Every quest earns XP. XP earns power. Power earns jobs."

   UX PARADIGM: Mission Control
   Instead of a browsable grid/list of challenge cards, the page
   is a command center with a strict visual hierarchy:

   Zone 1 — Mission Command   top strip: rank identity + XP bar
                               + urgency rail (expiring soon)
   Zone 2 — Featured Mission  dominant hero: highest-value
                               in-progress challenge, full-width
   Zone 3 — Mission Tracks    3-col progression strips, one per
                               category group; clicking a track
                               filters Zone 4
   Zone 4 — Dispatch Queue    compact single-col list of all
                               active challenges; locked +
                               completed states visible inline
   Zone 5 — Completed Feed    collapsed log at the bottom;
                               no tabs needed

   ALL original backend data, hook calls, and logic are
   preserved. No fake features added.
   ============================================================ */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useChallenges } from "../../hooks/user/useChallenges";
import type { ChallengeWithProgress, PlayerStats } from "../../hooks/user/useChallenges";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
// ── Constants (unchanged) ─────────────────────────────────────────────────────

const RANK_CONFIG: Record<PlayerStats["rank"], { label: string; color: string; roman: string }> = {
  RECRUIT:    { label: "Recruit",    color: "var(--color-text-muted)",  roman: "I"   },
  APPRENTICE: { label: "Apprentice", color: "var(--color-cyan-400)",    roman: "II"  },
  JOURNEYMAN: { label: "Journeyman", color: "var(--color-green-400)",   roman: "III" },
  EXPERT:     { label: "Expert",     color: "var(--color-primary-400)", roman: "IV"  },
  MASTER:     { label: "Master",     color: "var(--color-gold-light)",  roman: "V"   },
  LEGEND:     { label: "Legend",     color: "var(--color-warning)",     roman: "VI"  },
};

const RANK_NEXT: Record<PlayerStats["rank"], string> = {
  RECRUIT:    "Apprentice",
  APPRENTICE: "Journeyman",
  JOURNEYMAN: "Expert",
  EXPERT:     "Master",
  MASTER:     "Legend",
  LEGEND:     "Legend",
};

const CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string; accentVar: string; icon: IconName }> = {
  DAILY:     { label: "Daily",     badgeClass: "badge-warning", accentVar: "--color-primary-400", icon: "challenge-daily"     },
  WEEKLY:    { label: "Weekly",    badgeClass: "badge-cyan",    accentVar: "--color-primary-400", icon: "challenge-weekly"    },
  STREAK:    { label: "Streak",    badgeClass: "badge-warning", accentVar: "--color-primary-400", icon: "challenge-streak"    },
  MILESTONE: { label: "Milestone", badgeClass: "badge-primary", accentVar: "--color-primary-400", icon: "challenge-milestone" },
  SKILL:     { label: "Skill",     badgeClass: "badge-green",   accentVar: "--color-primary-400", icon: "challenge-skill"     },
  SOCIAL:    { label: "Social",    badgeClass: "badge-muted",   accentVar: "--color-primary-400", icon: "challenge-social"    },
};

const CATEGORY_ORDER = ["DAILY", "WEEKLY", "STREAK", "SKILL", "MILESTONE", "SOCIAL"];

// Track groupings for Zone 3 — maps a display track to the categories it covers
const TRACK_GROUPS: Array<{
  id: string;
  label: string;
  categories: string[];
  accentVar: string;
  resetLabel: string;
}> = [
  { id: "DAILY_OPS",   label: "Daily Ops",   categories: ["DAILY", "STREAK"],    accentVar: "--color-primary-400", resetLabel: "resets daily"  },
  { id: "SKILL_PATH",  label: "Skill Path",  categories: ["SKILL", "MILESTONE"], accentVar: "--color-primary-400", resetLabel: "ongoing"       },
  { id: "WEEKLY_PUSH", label: "Weekly Push", categories: ["WEEKLY", "SOCIAL"],   accentVar: "--color-primary-400", resetLabel: "resets weekly" },
];

// ── Helpers (unchanged) ───────────────────────────────────────────────────────

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs  = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
  if (hrs > 0)  return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function isExpiringSoon(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() - Date.now() < 1000 * 60 * 60 * 3;
}

// ── Zone 1: Mission Command ───────────────────────────────────────────────────
// Full-width 2-col strip: rank + XP on the left, urgency rail on the right.
// Replaces PlayerHUD.

const MissionCommand: React.FC<{
  stats: PlayerStats;
  expiring: ChallengeWithProgress[];
}> = ({ stats, expiring }) => {
  const rank    = RANK_CONFIG[stats.rank];
  const xpRange = stats.xpToNextLevel - stats.xpForCurrentLevel;
  const xpProg  = stats.totalXp - stats.xpForCurrentLevel;
  const pct     = Math.min(100, Math.round((xpProg / Math.max(1, xpRange)) * 100));

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      gap: "var(--space-6)", alignItems: "stretch",
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "var(--radius-2xl)",
      padding: "var(--space-5) var(--space-6)",
      marginBottom: "var(--space-5)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient rank glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 100% at 0% 50%, ${rank.color}0D 0%, transparent 65%)`,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${rank.color}CC, transparent 60%)`,
      }} />

      {/* LEFT — rank + XP */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            position: "relative", width: 48, height: 48,
            borderRadius: "var(--radius-full)",
            background: "var(--color-bg-overlay)",
            border: `2px solid ${rank.color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {rank.roman}
            </span>
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
          <div>
            <div className="mono" style={{ fontSize: "var(--text-sm)", fontWeight: 700, letterSpacing: "0.08em", color: rank.color }}>
              {rank.label}
            </div>
            <div className="caption mono" style={{ fontSize: 10, marginTop: 1 }}>
              {stats.totalXp.toLocaleString()} XP total
            </div>
          </div>
          {/* Stat pills */}
          <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "var(--space-2)" }}>
            <div className="stat-card stat-card-green" style={{ minWidth: 56, padding: "var(--space-2) var(--space-3)", textAlign: "center" }}>
              <div className="stat-value" style={{ fontSize: "var(--text-lg)" }}>{stats.completedChallenges}</div>
              <div className="stat-label">DONE</div>
            </div>
            <div className="stat-card stat-card-primary" style={{ minWidth: 56, padding: "var(--space-2) var(--space-3)", textAlign: "center" }}>
              <div className="stat-value" style={{ fontSize: "var(--text-lg)" }}>{stats.activeChallenges}</div>
              <div className="stat-label">ACTIVE</div>
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
            <span className="caption">Progress to {RANK_NEXT[stats.rank]}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--color-gold-light)" }}>
              {stats.totalXp.toLocaleString()} / {stats.xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="progress-track" style={{ height: 6 }}>
            <div className="progress-bar progress-bar-gold" style={{ width: `${pct}%` }} />
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            {(xpRange - xpProg).toLocaleString()} XP to Level {stats.currentLevel + 1}
          </div>
        </div>
      </div>

      {/* RIGHT — urgency rail */}
      {expiring.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: "var(--space-2)",
          minWidth: 220, position: "relative", zIndex: 1,
          borderLeft: "1px solid var(--color-border-subtle)",
          paddingLeft: "var(--space-5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Icon name="challenge-streak" size={12} label="" style={{ color: "var(--color-danger)" }} />
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--color-danger)", textTransform: "uppercase" }}>
              Expiring soon
            </span>
          </div>
          {expiring.map(c => {
            const timeLeft = c.endDate ? formatCountdown(c.endDate) : null;
            const hot = isExpiringSoon(c.endDate);
            return (
              <div key={c.challengeId} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px",
                background: "var(--color-bg-elevated)",
                border: `1px solid ${hot ? "var(--color-danger-border)" : "var(--color-border-subtle)"}`,
                borderRadius: "var(--radius-lg)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: hot ? "var(--color-danger)" : "var(--color-warning)",
                }} />
                <span style={{
                  flex: 1, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.title}
                </span>
                {timeLeft && (
                  <span className="mono" style={{ fontSize: 9, color: hot ? "var(--color-danger)" : "var(--color-warning)", flexShrink: 0, fontWeight: 700 }}>
                    {timeLeft}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Zone 2: Featured Mission ──────────────────────────────────────────────────
// The single highest-value in-progress challenge gets a dominant hero card.

const FeaturedMission: React.FC<{ challenge: ChallengeWithProgress }> = ({ challenge }) => {
  const cat       = CATEGORY_CONFIG[challenge.category] ?? CATEGORY_CONFIG["MILESTONE"];
  const progress  = challenge.currentProgress;
  const target    = challenge.conditionValue || 1;
  const pct       = Math.min(100, Math.round((progress / target) * 100));
  const expiresIn = challenge.endDate ? formatCountdown(challenge.endDate) : null;
  const expiring  = isExpiringSoon(challenge.endDate);

  return (
    <div style={{
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "var(--radius-2xl)",
      overflow: "hidden",
      marginBottom: "var(--space-5)",
      position: "relative",
    }}>
      {/* Top accent band */}
      <div style={{ height: 3, background: `var(${cat.accentVar})`, opacity: 0.85 }} />

      <div style={{
        padding: "var(--space-5) var(--space-6)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "var(--space-6)",
        alignItems: "start",
      }}>
        {/* Left — title + description + progress */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <span className={`badge ${cat.badgeClass}`} style={{ fontSize: 9 }}>
              <Icon name={cat.icon} size={10} label="" /> {cat.label.toUpperCase()}
            </span>
            <span className="mono" style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.08em" }}>
              FEATURED MISSION
            </span>
            {expiring && expiresIn && (
              <span className="badge badge-danger" style={{ fontSize: 9 }}>⚡ {expiresIn}</span>
            )}
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 800,
            color: "var(--color-text-primary)", letterSpacing: "var(--tracking-tight)",
            lineHeight: 1.15, margin: "0 0 var(--space-2)",
          }}>
            {challenge.title}
          </h2>
          <p className="caption" style={{ lineHeight: 1.6, marginBottom: "var(--space-4)", maxWidth: 520 }}>
            {challenge.description}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div className="progress-track" style={{ flex: 1, height: 8, maxWidth: 320 }}>
              <div
                className={`progress-bar ${pct >= 80 ? "progress-bar-green" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="mono" style={{
              fontSize: "var(--text-sm)", fontWeight: 700,
              color: pct >= 80 ? "var(--color-success)" : `var(${cat.accentVar})`,
            }}>
              {progress} / {target}
            </span>
            <span className="caption mono" style={{ fontSize: 10 }}>{pct}%</span>
            {expiresIn && !expiring && (
              <span className="caption mono" style={{ fontSize: 10 }}>⏱ {expiresIn}</span>
            )}
          </div>
        </div>

        {/* Right — XP reward badge */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "var(--color-xp-gold-bg)",
          border: "1px solid var(--color-xp-gold-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-4) var(--space-5)",
          minWidth: 100, textAlign: "center",
        }}>
          <Icon name="xp" size={20} label="" style={{ color: "var(--color-xp-gold-light)", marginBottom: 4 }} />
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 800,
            color: "var(--color-xp-gold-light)", lineHeight: 1,
          }}>
            +{challenge.xpReward.toLocaleString()}
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--color-gold)", marginTop: 3, letterSpacing: "0.08em" }}>
            XP REWARD
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Zone 3: Mission Tracks ────────────────────────────────────────────────────
// 3-column progression strips. Each track shows step dots (done/active/locked).
// Clicking a track sets the active filter for the Dispatch Queue.

const MissionTracks: React.FC<{
  allChallenges: ChallengeWithProgress[];
  completedChallenges: ChallengeWithProgress[];
  activeTrack: string;
  onSelectTrack: (id: string) => void;
}> = ({ allChallenges, completedChallenges, activeTrack, onSelectTrack }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--space-3)", marginBottom: "var(--space-5)",
  }}>
    {TRACK_GROUPS.map(track => {
      const trackActive    = allChallenges.filter(c => track.categories.includes(c.category));
      const trackCompleted = completedChallenges.filter(c => track.categories.includes(c.category));
      const total   = trackActive.length + trackCompleted.length;
      const done    = trackCompleted.length + trackActive.filter(c => c.status === "COMPLETED").length;
      const active  = trackActive.filter(c => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED").length;
      const isSelected = activeTrack === track.id;
      const accentColor = `var(${track.accentVar})`;

      // Build up to 6 step dots
      const dots = Array.from({ length: Math.min(Math.max(total, 1), 6) }, (_, i) => {
        if (i < done)            return "done";
        if (i < done + active)   return "active";
        return "locked";
      });

      return (
        <button
          key={track.id}
          onClick={() => onSelectTrack(isSelected ? "ALL" : track.id)}
          style={{
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: isSelected ? "var(--color-bg-elevated)" : "var(--color-bg-surface)",
            border: `1px solid ${isSelected ? accentColor : "var(--color-border-subtle)"}`,
            borderRadius: "var(--radius-xl)",
            cursor: "pointer", textAlign: "left",
            position: "relative", overflow: "hidden",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          {/* Top accent stripe */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: accentColor, opacity: isSelected ? 1 : 0.45,
          }} />

          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 700,
              color: "var(--color-text-primary)", letterSpacing: "var(--tracking-wide)", marginBottom: 2,
            }}>
              {track.label}
            </div>
            <div className="caption" style={{ fontSize: 10 }}>
              {active} active · {track.resetLabel}
            </div>
          </div>

          {/* Step node rail */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {dots.map((state, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{ flex: 1, height: 1, background: "var(--color-border-subtle)", minWidth: 4 }} />
                )}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700,
                  background:
                    state === "done"   ? "var(--color-success-bg)"    :
                    state === "active" ? "var(--color-primary-glow)"  :
                    "var(--color-bg-overlay)",
                  border: `1px solid ${
                    state === "done"   ? "var(--color-success-border)" :
                    state === "active" ? accentColor                  :
                    "var(--color-border-subtle)"
                  }`,
                  color:
                    state === "done"   ? "var(--color-success)"       :
                    state === "active" ? accentColor                  :
                    "var(--color-text-disabled)",
                }}>
                  {state === "done" ? "✓" : state === "active" ? String(i + 1) : "·"}
                </div>
              </React.Fragment>
            ))}
          </div>
        </button>
      );
    })}
  </div>
);

// ── Zone 4: Dispatch Queue ────────────────────────────────────────────────────
// Compact single-col list. States: active (→), completed (✓).
// Inline mini progress bar + type chip + XP.

const DispatchQueue: React.FC<{
  challenges: ChallengeWithProgress[];
  completedChallenges: ChallengeWithProgress[];
}> = ({ challenges, completedChallenges }) => {
  const active    = challenges.filter(c => c.status !== "COMPLETED").sort((a, b) => b.xpReward - a.xpReward);
  const inlineDone = challenges.filter(c => c.status === "COMPLETED");
  // Include global completedChallenges not already in challenges (different source)
  const extraDone  = completedChallenges.filter(c => !inlineDone.find(x => x.challengeId === c.challengeId));
  const allDone    = [...inlineDone, ...extraDone].slice(0, 5);

  const rows: Array<{ c: ChallengeWithProgress; isComplete: boolean }> = [
    ...active.map(c  => ({ c, isComplete: false })),
    ...allDone.map(c => ({ c, isComplete: true  })),
  ];

  if (rows.length === 0) {
    return (
      <div className="empty-state" style={{ marginBottom: "var(--space-5)" }}>
        <div className="empty-state-icon"><Icon name="map" size={32} label="" /></div>
        <h3>No missions in this track</h3>
        <p>Select a different track above or check back tomorrow.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
      {rows.map(({ c, isComplete }) => {
        const cat      = CATEGORY_CONFIG[c.category] ?? CATEGORY_CONFIG["MILESTONE"];
        const progress = c.currentProgress;
        const target   = c.conditionValue || 1;
        const pct      = Math.min(100, Math.round((progress / target) * 100));
        const expiring = isExpiringSoon(c.endDate);
        const expiresIn = c.endDate ? formatCountdown(c.endDate) : null;
        const barColor  = isComplete
          ? "var(--color-success)"
          : pct >= 80 ? "var(--color-success)" : `var(${cat.accentVar})`;

        return (
          <div
            key={c.challengeId}
            className={isComplete ? "" : "card-interactive"}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)",
              padding: "10px var(--space-4)",
              background: "var(--color-bg-surface)",
              border: `1px solid ${expiring && !isComplete ? "var(--color-danger-border)" : "var(--color-border-subtle)"}`,
              borderRadius: "var(--radius-xl)",
              opacity: isComplete ? 0.55 : 1,
              transition: "border-color 0.15s",
            }}
          >
            {/* Status icon */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background:  isComplete ? "var(--color-success-bg)"   : "var(--color-primary-glow)",
              border: `1px solid ${isComplete ? "var(--color-success-border)" : `var(${cat.accentVar})`}`,
              color:       isComplete ? "var(--color-success)"       : `var(${cat.accentVar})`,
            }}>
              {isComplete ? "✓" : "→"}
            </div>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: "var(--text-sm)", fontWeight: 500,
                color: isComplete ? "var(--color-text-muted)" : "var(--color-text-primary)",
                display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textDecoration: isComplete ? "line-through" : "none",
              }}>
                {c.title}
              </span>
            </div>

            {/* Meta */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
              <span className={`badge ${cat.badgeClass}`} style={{ fontSize: 9 }}>
                {cat.label}
              </span>
              {expiring && expiresIn && !isComplete && (
                <span className="badge badge-danger" style={{ fontSize: 9 }}>⚡ {expiresIn}</span>
              )}
              {/* Mini progress bar */}
              <div style={{ width: 52 }}>
                <div className="progress-track" style={{ height: 3 }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: barColor,
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
              {/* XP */}
              <span className="mono" style={{
                fontSize: 11, fontWeight: 700,
                color: isComplete ? "var(--color-text-muted)" : "var(--color-xp-gold-light)",
                minWidth: 40, textAlign: "right",
              }}>
                {isComplete ? "+" : ""}{c.xpReward}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Zone 5: Completed Feed ────────────────────────────────────────────────────
// Collapsible log. Shows total XP earned + per-item entries.

const CompletedFeed: React.FC<{
  completed: ChallengeWithProgress[];
}> = ({ completed }) => {
  const [expanded, setExpanded] = useState(false);
  const totalXp = completed.reduce((s, c) => s + c.xpReward, 0);
  const shown   = expanded ? completed : completed.slice(0, 4);

  if (completed.length === 0) return null;

  return (
    <div style={{
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "var(--space-4) var(--space-5)",
          background: "none", border: "none", cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--color-border-subtle)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Icon name="trophy" size={15} label="" style={{ color: "var(--color-success)" }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
            Completed
          </span>
          <span className="badge badge-green" style={{ fontSize: 9 }}>{completed.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className="xp-pill" style={{ fontSize: 10, padding: "3px 8px" }}>
            <Icon name="xp" size={11} label="" /> +{totalXp.toLocaleString()} XP earned
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Entries */}
      {expanded && (
        <div style={{ padding: "var(--space-2) var(--space-4) var(--space-3)" }}>
          {shown.map(c => {
            const cat = CATEGORY_CONFIG[c.category] ?? CATEGORY_CONFIG["MILESTONE"];
            return (
              <div key={c.challengeId} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "8px 0",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "var(--radius-md)",
                  background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--color-success)", flexShrink: 0,
                }}>
                  <Icon name="success" size={12} label="" />
                </div>
                <span style={{
                  flex: 1, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.title}
                </span>
                <span className={`badge ${cat.badgeClass}`} style={{ fontSize: 9, flexShrink: 0 }}>
                  {cat.label}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--color-success)", fontWeight: 700, flexShrink: 0 }}>
                  +{c.xpReward}
                </span>
              </div>
            );
          })}
          {completed.length > 4 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: "var(--space-3)", width: "100%" }}
              onClick={() => setExpanded(true)}
            >
              Show all {completed.length} completed
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonMissionControl: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-2xl)" }} />
    <div className="skeleton" style={{ height: 148, borderRadius: "var(--radius-2xl)" }} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-3)" }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-xl)" }} />)}
    </div>
    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: "var(--radius-xl)" }} />)}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const { challenges, completedChallenges, playerStats, isLoading, error, refetch } = useChallenges();

  // Track filter — "ALL" or one of the TRACK_GROUPS ids
  const [activeTrack, setActiveTrack] = useState<string>("ALL");

  // Derive featured mission: highest xpReward in-progress / not-started challenge
  const featuredChallenge = [...challenges]
    .filter(c => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED")
    .sort((a, b) => b.xpReward - a.xpReward)[0] ?? challenges[0] ?? null;

  // Derive expiring-soon challenges for urgency rail (top 3 by soonest endDate)
  const expiringChallenges = challenges
    .filter(c => c.endDate && new Date(c.endDate).getTime() > Date.now())
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
    .slice(0, 3);

  // Filter dispatch queue by active track
  const trackGroup = TRACK_GROUPS.find(t => t.id === activeTrack);
  const dispatchChallenges = trackGroup
    ? challenges.filter(c => trackGroup.categories.includes(c.category))
    : challenges;
  const dispatchCompleted = trackGroup
    ? completedChallenges.filter(c => trackGroup.categories.includes(c.category))
    : completedChallenges;

  if (error) {
    return (
      <PageLayout pageTitle="Challenges">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load missions</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

 
   return (
  <PageLayout pageTitle="Challenges">

    <PageHeader
      {...PAGE_CONFIGS.challenges}
      right={
        playerStats ? (
          <>
            <div className="xp-pill">
              <span>⚡</span>
              <span>{playerStats.totalXp.toLocaleString()} XP</span>
            </div>
            <span className="badge badge-primary">
              {playerStats.completedChallenges} / {challenges.length} Complete
            </span>
          </>
        ) : null
      }
    />

    {isLoading ? (
        <SkeletonMissionControl />
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════
              ZONE 1 — Mission Command: rank + XP + urgency rail
              ══════════════════════════════════════════════════════ */}
          {playerStats && (
            <MissionCommand stats={playerStats} expiring={expiringChallenges} />
          )}

          {/* ══════════════════════════════════════════════════════
              ZONE 2 — Featured Mission: dominant single challenge
              Shown only when there is an active / not-started quest
              ══════════════════════════════════════════════════════ */}
          {featuredChallenge && (
            <FeaturedMission challenge={featuredChallenge} />
          )}

          {challenges.length === 0 && completedChallenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="map" size={32} label="" /></div>
              <h3>No missions available</h3>
              <p>Check back soon — new missions are generated daily.</p>
            </div>
          ) : (
            <>
              {/* ════════════════════════════════════════════════
                  ZONE 3 — Mission Tracks: progression strips
                  Click a track to filter the dispatch queue below
                  ════════════════════════════════════════════════ */}
              <MissionTracks
                allChallenges={challenges}
                completedChallenges={completedChallenges}
                activeTrack={activeTrack}
                onSelectTrack={id => setActiveTrack(id === activeTrack ? "ALL" : id)}
              />

              {/* ════════════════════════════════════════════════
                  ZONE 4 — Dispatch Queue: compact mission list
                  Active → completed, inline states
                  ════════════════════════════════════════════════ */}
              <DispatchQueue
                challenges={dispatchChallenges}
                completedChallenges={dispatchCompleted}
              />

              {/* ════════════════════════════════════════════════
                  ZONE 5 — Completed Feed: collapsible log
                  No separate tab — lives at the bottom of the page
                  ════════════════════════════════════════════════ */}
              <CompletedFeed completed={completedChallenges} />
            </>
          )}
        </>
      )}
    </PageLayout>
  );
};

export default ChallengesPage;