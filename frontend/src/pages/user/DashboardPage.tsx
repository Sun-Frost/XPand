/* ============================================================
   DashboardPage.tsx  — XPand
   "Your career OS. Every number earned, not given."
   ============================================================ */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageLayout from "../../components/user/PageLayout";
import {
  useDashboard,
  type DashboardData,
  type ActivityItem,
  type MarketSkillItem,
  type SkillBadgeSummary,
} from "../../hooks/user/useDashboard";

// ── Variants ──────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getRankTitle(level: number): string {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 7)  return "Advanced";
  if (level >= 4)  return "Intermediate";
  return "Novice";
}

function badgeTier(badge: string) {
  if (badge === "GOLD")   return "gold";
  if (badge === "SILVER") return "silver";
  return "bronze";
}

function badgeEmoji(badge: string) {
  if (badge === "GOLD")   return "🥇";
  if (badge === "SILVER") return "🥈";
  return "🥉";
}

function activityIcon(item: ActivityItem): string {
  if (item.type === "XP_GAIN")  return "⚡";
  if (item.type === "XP_SPEND") return "🛍️";
  if (item.type === "BADGE")    return "🏅";
  return "📋";
}

// ── Animated Counter ──────────────────────────────────────────────────────────

const AnimCount: React.FC<{ value: number }> = ({ value }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = Math.ceil(value / 36);
    const id = setInterval(() => {
      cur += step;
      if (cur >= value) { setN(value); clearInterval(id); }
      else setN(cur);
    }, 18);
    return () => clearInterval(id);
  }, [value]);
  return <>{n.toLocaleString()}</>;
};

// ── XP Level Ring ─────────────────────────────────────────────────────────────

const LevelRing: React.FC<{ level: number; xpFor: number; xpTo: number }> = ({ level, xpFor, xpTo }) => {
  const pct    = (xpFor + xpTo) > 0 ? xpFor / (xpFor + xpTo) : 0;
  const R      = 44;
  const circ   = 2 * Math.PI * R;
  const offset = circ * (1 - pct);

  return (
    <svg width="108" height="108" viewBox="0 0 108 108" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="var(--color-gold)" />
          <stop offset="100%" stopColor="var(--color-gold-light)" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx="54" cy="54" r={R} fill="none" stroke="var(--color-bg-active)" strokeWidth="7" />
      {/* Fill */}
      <circle
        cx="54" cy="54" r={R}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 54 54)"
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x="54" y="50" textAnchor="middle"
        style={{ fill: "var(--color-text-primary)", fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800 }}>
        {level}
      </text>
      <text x="54" y="66" textAnchor="middle"
        style={{ fill: "var(--color-text-muted)", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em" }}>
        {getRankTitle(level).toUpperCase()}
      </text>
    </svg>
  );
};

// ── Stat Tile ─────────────────────────────────────────────────────────────────
// A tighter, more expressive stat than a plain stat-card.

const StatTile: React.FC<{
  icon: string; value: number; label: string;
  accentVar: string; sub?: string; onClick?: () => void;
}> = ({ icon, value, label, accentVar, sub, onClick }) => (
  <motion.div
    variants={fadeUp}
    onClick={onClick}
    whileHover={onClick ? { y: -3, transition: { duration: 0.15 } } : undefined}
    style={{
      position: "relative", overflow: "hidden",
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-5) var(--space-4) var(--space-4)",
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}
    className={onClick ? "card card-interactive" : "card"}
  >
    {/* corner glow blob */}
    <div style={{
      position: "absolute", bottom: -18, right: -18,
      width: 60, height: 60, borderRadius: "50%",
      background: `var(${accentVar})`, opacity: 0.10, pointerEvents: "none",
    }} />
    {/* top micro-bar */}
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: "40%", height: 2, borderRadius: "var(--radius-xl) 0 0 0",
      background: `var(${accentVar}-400, var(${accentVar}))`,
    }} />
    <span style={{ fontSize: 18, lineHeight: 1, marginBottom: 4 }}>{icon}</span>
    <span style={{
      fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)",
      fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1,
      letterSpacing: "var(--tracking-tight)",
    }}>
      <AnimCount value={value} />
    </span>
    <span className="label">{label}</span>
    {sub && <span className="caption mono" style={{ fontSize: 10, marginTop: 1 }}>{sub}</span>}
  </motion.div>
);

// ── Panel ─────────────────────────────────────────────────────────────────────

const Panel: React.FC<{
  title: string; icon?: string;
  accent?: "primary" | "gold" | "cyan" | "green";
  sub?: string; link?: string; onLink?: () => void;
  children: React.ReactNode;
}> = ({ title, icon, accent = "primary", sub, link, onLink, children }) => (
  <div className="card" style={{ display: "flex", flexDirection: "column" }}>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "var(--space-4) var(--space-5) var(--space-3)",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 3, height: 18, borderRadius: 2, flexShrink: 0,
          background: `var(--color-${accent === "gold" ? "gold-light" : `${accent}-400`})`,
        }} />
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</span>
          {sub && <span className="caption" style={{ fontSize: 10 }}>{sub}</span>}
        </div>
      </div>
      {link && onLink && (
        <button className="panel-link" onClick={onLink}>{link} →</button>
      )}
    </div>
    <div style={{ padding: "var(--space-3) var(--space-4)" }}>
      {children}
    </div>
  </div>
);

// ── Market Bar ────────────────────────────────────────────────────────────────

const MarketBar: React.FC<{ item: MarketSkillItem; max: number; navigate: (p: string) => void }> = ({ item, max, navigate }) => {
  const pct = max > 0 ? (item.jobCount / max) * 100 : 0;
  return (
    <motion.div
      variants={fadeUp}
      onClick={() => !item.userHasIt && navigate("/skills")}
      style={{
        padding: "9px 6px", borderRadius: "var(--radius-md)",
        cursor: item.userHasIt ? "default" : "pointer",
        transition: "background 0.15s",
      }}
      whileHover={!item.userHasIt ? { backgroundColor: "var(--color-bg-hover)" } : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-primary)" }}>
          {item.skillName}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {item.userHasIt
            ? <span className="mono" style={{ fontSize: 10, color: "var(--color-green-400)" }}>✓ You have it</span>
            : <span className="mono" style={{ fontSize: 10, color: "var(--color-primary-400)", fontWeight: 600 }}>Skill gap ↗</span>
          }
          <span className="caption mono">{item.jobCount} jobs</span>
        </div>
      </div>
      <div className="progress-track" style={{ height: 5 }}>
        <div
          className={`progress-bar ${item.userHasIt ? "progress-bar-green" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.div>
  );
};

// ── Skill Row ─────────────────────────────────────────────────────────────────

const SkillRow: React.FC<{ skill: SkillBadgeSummary }> = ({ skill }) => (
  <motion.div
    variants={fadeUp}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 6px", borderBottom: "1px solid var(--color-border-subtle)",
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-primary)", display: "block" }}>
        {skill.skillName}
      </span>
      <span className="caption">{skill.category}</span>
    </div>
    <span className={`skill-badge ${badgeTier(skill.badge)}`} style={{ fontSize: 10 }}>
      <span className="skill-badge-icon" style={{ fontSize: 14 }}>{badgeEmoji(skill.badge)}</span>
      {skill.badge}
    </span>
  </motion.div>
);

// ── Activity Row ──────────────────────────────────────────────────────────────

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => (
  <motion.div
    variants={fadeUp}
    style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 6px", borderBottom: "1px solid var(--color-border-subtle)",
    }}
  >
    <div className="badge badge-muted" style={{
      width: 28, height: 28, borderRadius: "var(--radius-md)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, flexShrink: 0,
    }}>
      {activityIcon(item)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.label}
      </span>
      <span className="caption mono" style={{ fontSize: 10 }}>{item.detail}</span>
    </div>
    <span className="caption mono" style={{ color: "var(--color-text-disabled)", flexShrink: 0, fontSize: 10 }}>
      {timeAgo(item.timestamp)}
    </span>
  </motion.div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonDash: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
    <div className="skeleton" style={{ height: 168, borderRadius: "var(--radius-2xl)" }} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 108, borderRadius: "var(--radius-xl)" }} />)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: "var(--radius-xl)" }} />
        <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-xl)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-xl)" }} />
        <div className="skeleton" style={{ height: 220, borderRadius: "var(--radius-xl)" }} />
      </div>
    </div>
  </div>
);

// ── Live Dashboard ────────────────────────────────────────────────────────────

const LiveDash: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const maxJobs  = data.topMarketSkills[0]?.jobCount ?? 1;
  const xpPct    = Math.round((data.xpForCurrentLevel / Math.max(1, data.xpForCurrentLevel + data.xpToNextLevel)) * 100);

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      variants={stagger} initial="hidden" animate="show"
    >

      {/* ══════════════════════════════════════════════════════
          HERO — Identity card. This is who you are on XPand.
          ══════════════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        className="card"
        style={{
          padding: "28px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24, flexWrap: "wrap", position: "relative", overflow: "hidden",
          borderColor: "var(--color-border-default)",
        }}
      >
        {/* Ambient light — primary top-left, cyan bottom-right */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 45% at -5% -5%, var(--color-primary-glow) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 105% 105%, var(--color-cyan-glow) 0%, transparent 65%)",
        }} />
        {/* Subtle top-edge accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2, pointerEvents: "none",
          background: "var(--gradient-brand)",
        }} />

        {/* Avatar + identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 68, height: 68, borderRadius: "var(--radius-full)",
              background: "var(--gradient-primary)",
              border: "2px solid rgba(155,124,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 800, color: "#fff",
              fontFamily: "var(--font-display)",
              overflow: "hidden",
            }}>
              {data.profilePicture
                ? <img src={data.profilePicture} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{data.firstName?.[0]?.toUpperCase() ?? "?"}</span>
              }
            </div>
            {/* Level badge */}
            <div style={{
              position: "absolute", bottom: -3, right: -6,
              background: "var(--gradient-xp, var(--gradient-gold))",
              color: "#0D0F17", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
              padding: "2px 7px", borderRadius: "var(--radius-full)",
              border: "1.5px solid var(--color-bg-surface)",
              letterSpacing: "0.04em",
            }}>
              LV.{data.level}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <p className="caption" style={{ marginBottom: 2, letterSpacing: "0.04em" }}>
              {greeting}, welcome back
            </p>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 800,
              color: "var(--color-text-primary)", letterSpacing: "var(--tracking-tight)",
              lineHeight: 1.1, margin: 0, marginBottom: 6,
            }}>
              {data.firstName}{" "}
              <span style={{ color: "var(--color-primary-400)" }}>{data.lastName}</span>
            </h1>
            {data.professionalTitle && (
              <p className="caption" style={{ marginBottom: 8 }}>{data.professionalTitle}</p>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="badge badge-gold">⚡ {data.xpBalance.toLocaleString()} XP</span>
              <span className="badge badge-primary">{getRankTitle(data.level)}</span>
              {data.country && <span className="badge badge-cyan">📍 {data.country}</span>}
            </div>
          </div>
        </div>

        {/* XP Ring + progress */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)",
          position: "relative", zIndex: 1, flexShrink: 0,
        }}>
          <LevelRing level={data.level} xpFor={data.xpForCurrentLevel} xpTo={data.xpToNextLevel} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--color-gold-light)", letterSpacing: "0.04em" }}>
              +{data.xpGainedThisWeek.toLocaleString()} XP this week
            </span>
            <div className="progress-track" style={{ width: 108, height: 4 }}>
              <div className="progress-bar progress-bar-gold" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="caption" style={{ fontSize: 10 }}>
              {data.xpToNextLevel.toLocaleString()} XP to Level {data.level + 1}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          STAT TILES — 5 numbers that define your standing
          ══════════════════════════════════════════════════════ */}
      <motion.div
        variants={stagger}
        style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}
      >
        <StatTile icon="🥇" value={data.goldBadges}        label="Gold Badges"     accentVar="--color-gold"          onClick={() => navigate("/skills")} />
        <StatTile icon="🏅" value={data.totalBadges}       label="Total Badges"    accentVar="--color-primary"       sub={`${data.silverBadges}s · ${data.bronzeBadges}b`} />
        <StatTile icon="🔬" value={data.verifiedSkills}    label="Verified Skills" accentVar="--color-cyan"          onClick={() => navigate("/skills")} />
        <StatTile icon="💼" value={data.totalApplications} label="Applications"    accentVar="--color-green"         sub={`${data.acceptedApplications} accepted`} onClick={() => navigate("/applications")} />
        <StatTile icon="⚔️" value={data.activeChallenges}  label="Active Quests"   accentVar="--color-primary"       sub={`${data.completedChallenges} done`} onClick={() => navigate("/challenges")} />
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          BODY — Two-column content grid
          ══════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>

        {/* ── LEFT COLUMN ──────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Market Intelligence */}
          <motion.div variants={fadeUp}>
            <Panel
              title="Market Intelligence" icon="📡" accent="primary"
              sub="Skills employers are hiring for right now"
            >
              {data.topMarketSkills.length === 0 ? (
                <p className="caption" style={{ padding: "8px 6px" }}>No active job signals yet.</p>
              ) : (
                <motion.div variants={stagger}>
                  {data.topMarketSkills.map(item => (
                    <MarketBar key={item.skillName} item={item} max={maxJobs} navigate={navigate} />
                  ))}
                </motion.div>
              )}
              {data.recommendedSkills.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                  padding: "12px 6px 4px", borderTop: "1px solid var(--color-border-subtle)", marginTop: 4,
                }}>
                  <span className="caption" style={{ flexShrink: 0 }}>🎯 Earn next:</span>
                  {data.recommendedSkills.map(s => (
                    <button
                      key={s}
                      className="badge badge-primary"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/skills")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>

          {/* My Skill Badges */}
          <motion.div variants={fadeUp}>
            <Panel
              title="My Skill Badges" icon="🏅" accent="cyan"
              link="All badges" onLink={() => navigate("/skills")}
            >
              {data.topSkills.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 6px" }}>
                  <p className="caption">No verified skills yet — your first badge changes everything.</p>
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/skills")}>
                    Start verifying ↗
                  </button>
                </div>
              ) : (
                <motion.div variants={stagger}>
                  {data.topSkills.map(s => <SkillRow key={s.skillId} skill={s} />)}
                </motion.div>
              )}
            </Panel>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick Actions */}
          <motion.div variants={fadeUp}>
            <Panel title="Quick Actions" icon="⚡" accent="gold">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { icon: "🔬", label: "Verify Skill",   sub: "Take a test",   path: "/skills",     accent: "var(--color-primary-glow)" },
                  { icon: "💼", label: "Browse Jobs",    sub: "See matches",   path: "/jobs",       accent: "var(--color-green-glow)" },
                  { icon: "⚔️", label: "View Quests",   sub: "Earn XP",       path: "/challenges", accent: "var(--color-cyan-glow)" },
                  { icon: "🛍️", label: "XP Store",      sub: "Spend wisely",  path: "/store",      accent: "var(--color-gold-glow)" },
                ].map(a => (
                  <button
                    key={a.path}
                    className="card card-interactive"
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      gap: 4, padding: "14px 12px", cursor: "pointer",
                      border: "1px solid var(--color-border-subtle)",
                      background: "none", textAlign: "left",
                    }}
                    onClick={() => navigate(a.path)}
                  >
                    <span style={{ fontSize: 18 }}>{a.icon}</span>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-secondary)" }}>{a.label}</span>
                    <span className="caption" style={{ fontSize: 10 }}>{a.sub}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp}>
            <Panel
              title="Recent Activity" icon="🕐" accent="green"
              sub={data.recentActivity.length > 0 ? `${data.recentActivity.length} events` : undefined}
            >
              {data.recentActivity.length === 0 ? (
                <p className="caption" style={{ padding: "8px 6px" }}>
                  No activity yet — earn your first XP to start the log.
                </p>
              ) : (
                <motion.div variants={stagger}>
                  {data.recentActivity.map((item, i) => (
                    <ActivityRow key={i} item={item} />
                  ))}
                </motion.div>
              )}
            </Panel>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard();

  if (error) {
    return (
      <PageLayout pageTitle="Dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Couldn't load your dashboard</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Dashboard">
      {isLoading ? <SkeletonDash /> : <LiveDash data={data!} navigate={navigate} />}
    </PageLayout>
  );
};

export default DashboardPage;