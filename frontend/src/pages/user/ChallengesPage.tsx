/**
 * ChallengesPage — /challenges
 *
 * Displays XP-earning challenges organised into contextual sections.
 *
 * Data sources:
 *   useChallenges() returns two arrays: active/in-progress challenges and completed
 *   ones. The page derives sections from these rather than receiving pre-grouped data.
 *
 * Section derivation logic:
 *   Ending Soon  — active challenges with endDate within the current session, sorted
 *                  by closest deadline. Uses formatCountdown() for the time display.
 *   Repeatable   — deduped across both arrays (completed repeatables are included
 *                  because they can be done again). Uses a Set to prevent duplicates.
 *   Suggested    — top 3 unstarted challenges by XP reward, excluding items already
 *                  in Ending Soon or Repeatable sections.
 *   History      — completed challenges, collapsible, shows total XP earned.
 *
 * StreakHeader:
 *   XP progress bar fills from xpForCurrentLevel to xpToNextLevel. The rank label
 *   and color come from RANK_CONFIG keyed on the backend-provided rank enum string.
 */

import React, { useState } from "react";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useChallenges } from "../../hooks/user/useChallenges";
import type { ChallengeWithProgress, PlayerStats } from "../../hooks/user/useChallenges";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";





const RANK_CONFIG: Record<
  PlayerStats["rank"],
  { label: string; color: string; nextRank: string }
> = {
  RECRUIT:    { label: "Recruit",    color: "var(--color-text-muted)",  nextRank: "Apprentice" },
  APPRENTICE: { label: "Apprentice", color: "var(--color-cyan-400)",    nextRank: "Journeyman" },
  JOURNEYMAN: { label: "Journeyman", color: "var(--color-green-400)",   nextRank: "Expert"     },
  EXPERT:     { label: "Expert",     color: "var(--color-primary-400)", nextRank: "Master"     },
  MASTER:     { label: "Master",     color: "var(--color-gold-light)",  nextRank: "Legend"     },
  LEGEND:     { label: "Legend",     color: "var(--color-warning)",     nextRank: "Legend"     },
};

const CATEGORY_LABEL: Record<string, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", STREAK: "Streak",
  MILESTONE: "Milestone", SKILL: "Skill", SOCIAL: "Social",
};

const CATEGORY_BADGE: Record<string, string> = {
  DAILY: "badge-warning", WEEKLY: "badge-cyan", STREAK: "badge-warning",
  MILESTONE: "badge-primary", SKILL: "badge-green", SOCIAL: "badge-muted",
};

const CATEGORY_ICON: Record<string, IconName> = {
  DAILY: "challenge-daily", WEEKLY: "challenge-weekly", STREAK: "challenge-streak",
  MILESTONE: "challenge-milestone", SKILL: "challenge-skill", SOCIAL: "challenge-social",
};





function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function isHot(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() - Date.now() < 3 * 3_600_000;
}

function completedToday(completedAt: string | null | undefined): boolean {
  if (!completedAt) return false;
  const d = new Date(completedAt), n = new Date();
  return d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
}





const Section: React.FC<{
  title: string;
  icon: IconName;
  iconColor?: string;
  count?: number;
  countBadge?: string;
  accent?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, iconColor, count, countBadge = "badge-primary", accent = "var(--color-primary-400)", trailing, children }) => (
  <div style={{
    background: "var(--color-bg-surface)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-2xl)",
    overflow: "hidden",
    marginBottom: "var(--space-4)",
  }}>
    <div style={{ height: 2, background: accent }} />
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: "var(--space-4) var(--space-5)",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <Icon name={icon} size={15} label="" style={{ color: iconColor ?? accent }} />
      <span style={{
        fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 700,
        letterSpacing: "0.06em", color: "var(--color-text-primary)", flex: 1,
      }}>
        {title}
      </span>
      {count !== undefined && (
        <span className={`badge ${countBadge}`} style={{ fontSize: 9 }}>{count}</span>
      )}
      {trailing}
    </div>
    <div style={{ padding: "var(--space-4) var(--space-5)" }}>
      {children}
    </div>
  </div>
);





const MiniBar: React.FC<{ pct: number; color?: string }> = ({ pct, color = "var(--color-primary-400)" }) => (
  <div style={{
    width: 64, height: 4,
    background: "var(--color-bg-overlay)",
    borderRadius: "var(--radius-full)", overflow: "hidden", flexShrink: 0,
  }}>
    <div style={{
      width: `${pct}%`, height: "100%", background: color,
      borderRadius: "var(--radius-full)", transition: "width 0.5s ease",
    }} />
  </div>
);





const ChallengeRow: React.FC<{
  c: ChallengeWithProgress;
  variant?: "active" | "completed" | "suggestion";
  showCountdown?: boolean;
}> = ({ c, variant = "active", showCountdown = false }) => {
  const progress = c.currentProgress;
  const target = c.conditionValue || 1;
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const catLabel = CATEGORY_LABEL[c.category] ?? c.category;
  const catBadge = CATEGORY_BADGE[c.category] ?? "badge-primary";
  const catIcon = CATEGORY_ICON[c.category] ?? "quest";
  const hot = isHot(c.endDate);
  const isComp = variant === "completed";
  const earnedToday = isComp && completedToday(c.completedAt);
  const barColor = isComp
    ? "var(--color-success)"
    : pct >= 80 ? "var(--color-success)" : "var(--color-primary-400)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)",
      background: isComp
        ? "rgba(34,197,94,0.04)"
        : variant === "suggestion"
        ? "var(--color-bg-elevated)"
        : "var(--color-bg-elevated)",
      border: `1px solid ${
        isComp
          ? "rgba(34,197,94,0.2)"
          : hot && showCountdown
          ? "var(--color-danger-border, rgba(239,68,68,0.4))"
          : "var(--color-border-subtle)"
      }`,
      borderRadius: "var(--radius-xl)",
      marginBottom: "var(--space-2)",
      transition: "border-color 0.15s",
    }}>

      {/* Icon circle */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isComp ? "rgba(34,197,94,0.10)" : "var(--color-bg-overlay)",
        border: `1px solid ${isComp ? "rgba(34,197,94,0.3)" : "var(--color-border-subtle)"}`,
      }}>
        <Icon
          name={isComp ? "success" : catIcon}
          size={15}
          label=""
          style={{ color: isComp ? "var(--color-success)" : "var(--color-text-muted)" }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{
            fontSize: "var(--text-sm)", fontWeight: 600,
            color: isComp ? "var(--color-text-secondary)" : "var(--color-text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {c.title}
          </span>
          {c.isRepeatable && (
            <span className="badge badge-cyan" style={{ fontSize: 8, flexShrink: 0, padding: "1px 6px" }}>
              <Icon name="activity" size={8} label="" style={{ marginRight: 2 }} /> Loop
            </span>
          )}
          {earnedToday && (
            <span className="badge badge-green" style={{ fontSize: 8, flexShrink: 0 }}>Today</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span className={`badge ${catBadge}`} style={{ fontSize: 8, padding: "1px 5px" }}>
            {catLabel}
          </span>
          {showCountdown && c.endDate && (
            <span className="mono" style={{
              fontSize: 9, fontWeight: 700,
              color: hot ? "var(--color-danger)" : "var(--color-warning)",
            }}>
              {formatCountdown(c.endDate)}
            </span>
          )}
          {!isComp && (
            <span className="caption" style={{ fontSize: 10 }}>
              {progress} / {target}
            </span>
          )}
        </div>
      </div>

      {/* Bar + XP */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
        {!isComp && <MiniBar pct={pct} color={barColor} />}
        <div style={{ textAlign: "right", minWidth: 36 }}>
          <div className="mono" style={{
            fontSize: "var(--text-xs)", fontWeight: 800,
            color: isComp
              ? "var(--color-success)"
              : "var(--color-xp-gold-light, var(--color-gold-light))",
          }}>
            +{c.xpReward}
          </div>
          <div className="caption" style={{ fontSize: 9, marginTop: 1 }}>XP</div>
        </div>
      </div>
    </div>
  );
};





const StreakHeader: React.FC<{ stats: PlayerStats }> = ({ stats }) => {
  const rank = RANK_CONFIG[stats.rank];
  const xpRange = stats.xpToNextLevel - stats.xpForCurrentLevel;
  const xpProg = stats.totalXp - stats.xpForCurrentLevel;
  const pct = Math.min(100, Math.round((xpProg / Math.max(1, xpRange)) * 100));
  const xpLeft = Math.max(0, stats.xpToNextLevel - stats.totalXp);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: "var(--space-5)",
      alignItems: "center",
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "var(--radius-2xl)",
      padding: "var(--space-5) var(--space-6)",
      marginBottom: "var(--space-4)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Rank glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 50% 120% at 0% 50%, ${rank.color}10 0%, transparent 60%)`,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${rank.color}AA, transparent 55%)`,
      }} />

      {/* Streak block */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "var(--space-1)", position: "relative", zIndex: 1,
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: "var(--radius-xl)",
          background: stats.currentStreak > 0 ? "rgba(251,146,60,0.12)" : "var(--color-bg-overlay)",
          border: `1px solid ${stats.currentStreak > 0 ? "rgba(251,146,60,0.4)" : "var(--color-border-subtle)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon
            name="challenge-streak"
            size={24}
            label=""
            style={{ color: stats.currentStreak > 0 ? "var(--color-warning)" : "var(--color-text-disabled)" }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{
            fontSize: "var(--text-xl)", fontWeight: 800, lineHeight: 1,
            color: stats.currentStreak > 0 ? "var(--color-warning)" : "var(--color-text-muted)",
          }}>
            {stats.currentStreak}
          </div>
          <div className="caption" style={{ fontSize: 9, letterSpacing: "0.08em" }}>
            {stats.currentStreak === 1 ? "DAY" : "DAYS"}
          </div>
        </div>
      </div>

      {/* Rank + XP bar */}
      <div style={{ flex: 1, position: "relative", zIndex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 800,
            color: rank.color, letterSpacing: "var(--tracking-tight)",
          }}>
            {rank.label}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            Lv.{stats.currentLevel}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
          <span className="caption mono" style={{ fontSize: 10 }}>
            {stats.totalXp.toLocaleString()} XP
          </span>
          {stats.rank !== "LEGEND" && (
            <span className="caption mono" style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
              {xpLeft.toLocaleString()} XP to {rank.nextRank}
            </span>
          )}
        </div>
        <div style={{
          height: 6, background: "var(--color-bg-overlay)",
          borderRadius: "var(--radius-full)", overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: `linear-gradient(90deg, ${rank.color}88, ${rank.color})`,
            borderRadius: "var(--radius-full)", transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* XP this week */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "var(--space-1)", position: "relative", zIndex: 1,
        borderLeft: "1px solid var(--color-border-subtle)",
        paddingLeft: "var(--space-5)",
      }}>
        <Icon name="xp" size={20} label="" style={{ color: "var(--color-xp-gold-light, var(--color-gold-light))" }} />
        <div className="mono" style={{
          fontSize: "var(--text-xl)", fontWeight: 800, lineHeight: 1,
          color: "var(--color-xp-gold-light, var(--color-gold-light))",
        }}>
          {stats.xpThisWeek.toLocaleString()}
        </div>
        <div className="caption" style={{ fontSize: 9, letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.4 }}>
          XP THIS<br />WEEK
        </div>
      </div>
    </div>
  );
};





const EndingSoonSection: React.FC<{ challenges: ChallengeWithProgress[] }> = ({ challenges }) => {
  if (challenges.length === 0) return null;
  return (
    <Section
      title="Ending Soon"
      icon="timer"
      iconColor="var(--color-danger)"
      count={challenges.length}
      countBadge="badge-danger"
      accent="var(--color-danger)"
    >
      {challenges.map(c => (
        <ChallengeRow key={c.challengeId} c={c} variant="active" showCountdown />
      ))}
    </Section>
  );
};





const RepeatableSection: React.FC<{ challenges: ChallengeWithProgress[] }> = ({ challenges }) => {
  if (challenges.length === 0) return null;
  return (
    <Section
      title="Repeatable"
      icon="activity"
      iconColor="var(--color-cyan-400)"
      count={challenges.length}
      countBadge="badge-cyan"
      accent="var(--color-cyan-400)"
    >
      <p className="caption" style={{ marginBottom: "var(--space-3)", lineHeight: 1.6 }}>
        Complete these multiple times — each completion awards XP again.
      </p>
      {challenges.map(c => (
        <ChallengeRow key={c.challengeId} c={c} variant="active" />
      ))}
    </Section>
  );
};






const SuggestedSection: React.FC<{ challenges: ChallengeWithProgress[] }> = ({ challenges }) => {
  const suggestions = [...challenges]
    .filter(c => c.status === "NOT_STARTED")
    .sort((a, b) => b.xpReward - a.xpReward)
    .slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <Section
      title="Suggested For You"
      icon="recommended"
      iconColor="var(--color-gold-light)"
      count={suggestions.length}
      countBadge="badge-gold"
      accent="var(--color-gold-light)"
    >
      <p className="caption" style={{ marginBottom: "var(--space-3)", lineHeight: 1.6 }}>
        High-value challenges you haven't started yet.
      </p>
      {suggestions.map(c => (
        <ChallengeRow key={c.challengeId} c={c} variant="suggestion" />
      ))}
    </Section>
  );
};





const HistorySection: React.FC<{ completed: ChallengeWithProgress[] }> = ({ completed }) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? completed : completed.slice(0, 4);
  const totalXp = completed.reduce((s, c) => s + c.xpReward, 0);

  if (completed.length === 0) return null;

  return (
    <Section
      title="History"
      icon="trophy"
      iconColor="var(--color-success)"
      count={completed.length}
      countBadge="badge-green"
      accent="var(--color-success)"
      trailing={
        <span className="xp-pill" style={{ fontSize: 10, padding: "3px 8px" }}>
          <Icon name="xp" size={10} label="" /> +{totalXp.toLocaleString()} earned
        </span>
      }
    >
      {shown.map(c => (
        <ChallengeRow key={c.challengeId} c={c} variant="completed" />
      ))}
      {completed.length > 4 && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: "100%", marginTop: "var(--space-2)" }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? "Show less" : `Show all ${completed.length} completed`}
        </button>
      )}
    </Section>
  );
};





const Skeleton: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
    <div className="skeleton" style={{ height: 100, borderRadius: "var(--radius-2xl)" }} />
    <div className="skeleton" style={{ height: 160, borderRadius: "var(--radius-2xl)" }} />
    <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-2xl)" }} />
    <div className="skeleton" style={{ height: 140, borderRadius: "var(--radius-2xl)" }} />
  </div>
);





const ChallengesPage: React.FC = () => {
  const { challenges, completedChallenges, playerStats, isLoading, error, refetch } = useChallenges();

  if (error) {
    return (
      <PageLayout pageTitle="Challenges">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load challenges</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }


  const endingSoon = challenges
    .filter(c => c.endDate && new Date(c.endDate).getTime() > Date.now() && c.status !== "COMPLETED")
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());


  const allChallenges = [...challenges, ...completedChallenges];
  const seen = new Set<number>();
  const repeatable = allChallenges.filter(c => {
    if (!c.isRepeatable || seen.has(c.challengeId)) return false;
    seen.add(c.challengeId);
    return true;
  });


  const endingSoonIds = new Set(endingSoon.map(c => c.challengeId));
  const repeatableIds = new Set(repeatable.map(c => c.challengeId));
  const active = challenges.filter(
    c => !endingSoonIds.has(c.challengeId) && !repeatableIds.has(c.challengeId)
  );

  return (
    <PageLayout pageTitle="Challenges">
      <PageHeader
        {...PAGE_CONFIGS.challenges}
        right={
          playerStats ? (
            <>
              <div className="xp-pill">
                <Icon name="xp" size={12} label="" />
                <span>{playerStats.totalXp.toLocaleString()} XP</span>
              </div>
              <span className="badge badge-primary">
                {playerStats.completedChallenges} complete
              </span>
            </>
          ) : null
        }
      />

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          {/* 1 — Streak + Rank + XP */}
          {playerStats && <StreakHeader stats={playerStats} />}

          {/* 2 — Ending Soon */}
          <EndingSoonSection challenges={endingSoon} />

          {/* 3 — Repeatable */}
          <RepeatableSection challenges={repeatable} />


          {/* 5 — Suggested */}
          <SuggestedSection challenges={challenges} />

          {/* 6 — History */}
          <HistorySection completed={completedChallenges} />

          {challenges.length === 0 && completedChallenges.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="map" size={32} label="" /></div>
              <h3>No challenges yet</h3>
              <p>Check back soon — new challenges are added regularly.</p>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
};

export default ChallengesPage;