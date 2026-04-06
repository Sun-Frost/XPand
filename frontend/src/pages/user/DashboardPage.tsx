/* ============================================================
   DashboardPage.tsx  — XPand  v3
   Route: /dashboard
   The soul of XPand: gamified skill platform meets career launchpad.
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageLayout from "../../components/user/PageLayout";
import { useDashboard, type DashboardData, type ActivityItem, type MarketSkillItem, type SkillBadgeSummary } from "../../hooks/user/useDashboard";

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function badgeIcon(badge: string): string {
  if (badge === "GOLD")   return "🥇";
  if (badge === "SILVER") return "🥈";
  return "🥉";
}

function badgeColor(badge: string): string {
  if (badge === "GOLD")   return "var(--color-gold-400, #F59E0B)";
  if (badge === "SILVER") return "var(--color-silver, #94A3B8)";
  return "var(--color-bronze, #CD7F32)";
}

function activityIcon(item: ActivityItem): string {
  if (item.type === "XP_GAIN")  return "⚡";
  if (item.type === "XP_SPEND") return "🛍️";
  if (item.type === "BADGE")    return "🏅";
  return "📋";
}

function getRankTitle(level: number): string {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 7)  return "Advanced";
  if (level >= 4)  return "Intermediate";
  return "Novice";
}

// ── XP Progress Ring ──────────────────────────────────────────────────────────

const XPRing: React.FC<{ level: number; xpFor: number; xpTo: number }> = ({ level, xpFor, xpTo }) => {
  const total   = xpFor + xpTo;
  const pct     = total > 0 ? xpFor / total : 0;
  const R = 46;
  const circ    = 2 * Math.PI * R;
  const offset  = circ * (1 - pct);
  const rank    = getRankTitle(level);

  return (
    <div className="xp-ring-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-bg-overlay)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="url(#xpGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <defs>
          <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* Center text */}
        <text x="60" y="54" textAnchor="middle" className="xp-ring-level">{level}</text>
        <text x="60" y="70" textAnchor="middle" className="xp-ring-rank">{rank}</text>
      </svg>
    </div>
  );
};

// ── Animated Number ───────────────────────────────────────────────────────────

const AnimNum: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = "" }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 40);
    const id = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(start);
    }, 18);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: string; value: number; label: string;
  accent: string; sub?: string; onClick?: () => void;
}> = ({ icon, value, label, accent, sub, onClick }) => (
  <motion.div
    className="dash3-stat"
    variants={fadeUp}
    whileHover={{ y: -3, transition: { duration: 0.15 } }}
    onClick={onClick}
    style={{ "--accent": accent, cursor: onClick ? "pointer" : "default" } as React.CSSProperties}
  >
    <div className="dash3-stat__icon">{icon}</div>
    <div className="dash3-stat__val"><AnimNum value={value} /></div>
    <div className="dash3-stat__lbl">{label}</div>
    {sub && <div className="dash3-stat__sub">{sub}</div>}
    <div className="dash3-stat__glow" />
  </motion.div>
);

// ── Skill Badge Row ───────────────────────────────────────────────────────────

const SkillRow: React.FC<{ skill: SkillBadgeSummary }> = ({ skill }) => (
  <motion.div className="dash3-skill-row" variants={fadeUp}>
    <span className="dash3-skill-icon">{badgeIcon(skill.badge)}</span>
    <div className="dash3-skill-info">
      <span className="dash3-skill-name">{skill.skillName}</span>
      <span className="dash3-skill-cat">{skill.category}</span>
    </div>
    <span
      className="dash3-skill-badge"
      style={{ color: badgeColor(skill.badge), borderColor: badgeColor(skill.badge) + "44" }}
    >
      {skill.badge}
    </span>
  </motion.div>
);

// ── Activity Item ─────────────────────────────────────────────────────────────

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => (
  <motion.div className="dash3-act-row" variants={fadeUp}>
    <div className="dash3-act-icon">{activityIcon(item)}</div>
    <div className="dash3-act-body">
      <span className="dash3-act-lbl">{item.label}</span>
      <span className="dash3-act-detail">{item.detail}</span>
    </div>
    <span className="dash3-act-time">{timeAgo(item.timestamp)}</span>
  </motion.div>
);

// ── Market Skill Bar ──────────────────────────────────────────────────────────

const MarketBar: React.FC<{ item: MarketSkillItem; max: number; navigate: (p: string) => void }> = ({ item, max, navigate }) => {
  const pct = max > 0 ? (item.jobCount / max) * 100 : 0;
  return (
    <motion.div
      className={`dash3-mkt-row ${item.userHasIt ? "dash3-mkt-row--have" : "dash3-mkt-row--gap"}`}
      variants={fadeUp}
      onClick={() => !item.userHasIt && navigate("/skills")}
      style={{ cursor: item.userHasIt ? "default" : "pointer" }}
      title={item.userHasIt ? "You have this skill ✓" : "Click to learn this skill"}
    >
      <div className="dash3-mkt-top">
        <span className="dash3-mkt-name">{item.skillName}</span>
        <div className="dash3-mkt-right">
          {item.userHasIt
            ? <span className="dash3-mkt-have">✓ Verified</span>
            : <span className="dash3-mkt-gap">Gap ↗</span>
          }
          <span className="dash3-mkt-jobs">{item.jobCount} jobs</span>
        </div>
      </div>
      <div className="dash3-mkt-track">
        <div
          className="dash3-mkt-fill"
          style={{ width: `${pct}%`, background: item.userHasIt ? "var(--color-green-400)" : "var(--color-primary-400)" }}
        />
      </div>
    </motion.div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Sk: React.FC<{ h?: number; w?: string; r?: number }> = ({ h = 20, w = "100%", r = 8 }) => (
  <div className="dash3-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard();

  if (error) {
    return (
      <PageLayout pageTitle="Dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Dashboard">
      <div className="dash3-root">
        {isLoading ? <SkeletonDash /> : <LiveDash data={data!} navigate={navigate} />}
      </div>
      <style>{styles}</style>
    </PageLayout>
  );
};

// ── Skeleton Dashboard ────────────────────────────────────────────────────────

const SkeletonDash: React.FC = () => (
  <div className="dash3-layout">
    <div className="dash3-hero card"><Sk h={180} /></div>
    <div className="dash3-stats-row">{[1,2,3,4,5].map(i => <Sk key={i} h={110} r={16} />)}</div>
    <div className="dash3-body">
      <div className="dash3-col-main">
        <div className="card dash3-panel"><Sk h={260} /></div>
        <div className="card dash3-panel"><Sk h={300} /></div>
      </div>
      <div className="dash3-col-side">
        <div className="card dash3-panel"><Sk h={200} /></div>
        <div className="card dash3-panel"><Sk h={240} /></div>
      </div>
    </div>
  </div>
);

// ── Live Dashboard ────────────────────────────────────────────────────────────

const LiveDash: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const firstName = data.firstName;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const maxJobs   = data.topMarketSkills[0]?.jobCount ?? 1;

  return (
    <motion.div className="dash3-layout" variants={stagger} initial="hidden" animate="show">

      {/* ── HERO CARD ──────────────────────────────────────────────────── */}
      <motion.div className="card dash3-hero" variants={fadeUp}>
        <div className="dash3-hero__bg" />
        <div className="dash3-hero__noise" />

        <div className="dash3-hero__left">
          <div className="dash3-hero__avatar">
            {data.profilePicture
              ? <img src={data.profilePicture} alt="avatar" />
              : <span>{firstName?.[0]?.toUpperCase() ?? "?"}</span>
            }
            <div className="dash3-hero__lvl-badge">Lv.{data.level}</div>
          </div>
          <div className="dash3-hero__info">
            <p className="dash3-hero__greet">{greeting},</p>
            <h1 className="dash3-hero__name">{firstName} <span>{data.lastName}</span></h1>
            {data.professionalTitle && <p className="dash3-hero__title">{data.professionalTitle}</p>}
            <div className="dash3-hero__tags">
              <span className="dash3-hero__tag dash3-hero__tag--xp">⚡ {data.xpBalance.toLocaleString()} XP</span>
              <span className="dash3-hero__tag dash3-hero__tag--rank">{getRankTitle(data.level)}</span>
              {data.country && <span className="dash3-hero__tag dash3-hero__tag--loc">📍 {data.country}</span>}
            </div>
          </div>
        </div>

        <div className="dash3-hero__right">
          <XPRing level={data.level} xpFor={data.xpForCurrentLevel} xpTo={data.xpToNextLevel} />
          <div className="dash3-hero__xp-detail">
            <span className="dash3-hero__xp-week">+{data.xpGainedThisWeek.toLocaleString()} XP this week</span>
            <span className="dash3-hero__xp-next">{data.xpToNextLevel} XP to Level {data.level + 1}</span>
          </div>
          <div className="dash3-hero__progress-track">
            <div
              className="dash3-hero__progress-fill"
              style={{ width: `${Math.round((data.xpForCurrentLevel / (data.xpForCurrentLevel + data.xpToNextLevel)) * 100)}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
      <motion.div className="dash3-stats-row" variants={stagger}>
        <StatCard icon="🥇" value={data.goldBadges}         label="Gold Badges"        accent="#F59E0B" onClick={() => navigate("/skills")} />
        <StatCard icon="🏅" value={data.totalBadges}        label="Total Badges"       accent="#A78BFA" sub={`${data.silverBadges} silver · ${data.bronzeBadges} bronze`} />
        <StatCard icon="🔬" value={data.verifiedSkills}     label="Verified Skills"    accent="#22D3EE" onClick={() => navigate("/skills")} />
        <StatCard icon="💼" value={data.totalApplications}  label="Applications"       accent="#34D399" sub={`${data.acceptedApplications} accepted`} onClick={() => navigate("/applications")} />
        <StatCard icon="⚔️" value={data.activeChallenges}   label="Active Quests"      accent="#8B5CF6" sub={`${data.completedChallenges} completed`} onClick={() => navigate("/challenges")} />
      </motion.div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="dash3-body">

        {/* LEFT COLUMN */}
        <div className="dash3-col-main">

          {/* Market Intelligence Panel */}
          <motion.div className="card dash3-panel" variants={fadeUp}>
            <div className="dash3-panel__head">
              <div className="dash3-panel__title-row">
                <div className="dash3-panel__accent dash3-panel__accent--purple" />
                <h2 className="dash3-panel__title">Market Intelligence</h2>
              </div>
              <span className="dash3-panel__sub">Skills in demand right now</span>
            </div>
            <motion.div className="dash3-panel__body" variants={stagger}>
              {data.topMarketSkills.length === 0
                ? <p className="dash3-empty">No active jobs found yet.</p>
                : data.topMarketSkills.map((item) => (
                    <MarketBar key={item.skillName} item={item} max={maxJobs} navigate={navigate} />
                  ))
              }
            </motion.div>
            {data.recommendedSkills.length > 0 && (
              <div className="dash3-rec-bar">
                <span className="dash3-rec-label">🎯 Recommended next:</span>
                {data.recommendedSkills.map(s => (
                  <button key={s} className="dash3-rec-chip" onClick={() => navigate("/skills")}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* My Skills Panel */}
          <motion.div className="card dash3-panel" variants={fadeUp}>
            <div className="dash3-panel__head">
              <div className="dash3-panel__title-row">
                <div className="dash3-panel__accent dash3-panel__accent--cyan" />
                <h2 className="dash3-panel__title">My Skill Badges</h2>
              </div>
              <button className="dash3-panel__link" onClick={() => navigate("/skills")}>
                View all →
              </button>
            </div>
            {data.topSkills.length === 0 ? (
              <div className="dash3-empty-cta">
                <p className="dash3-empty">No verified skills yet.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/skills")}>
                  Start verifying skills ↗
                </button>
              </div>
            ) : (
              <motion.div className="dash3-panel__body dash3-skill-list" variants={stagger}>
                {data.topSkills.map(s => <SkillRow key={s.skillId} skill={s} />)}
              </motion.div>
            )}
          </motion.div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="dash3-col-side">

          {/* Quick Actions */}
          <motion.div className="card dash3-panel" variants={fadeUp}>
            <div className="dash3-panel__head">
              <div className="dash3-panel__title-row">
                <div className="dash3-panel__accent dash3-panel__accent--gold" />
                <h2 className="dash3-panel__title">Quick Actions</h2>
              </div>
            </div>
            <div className="dash3-qa-grid">
              {[
                { icon: "🔬", label: "Verify Skill",    path: "/skills",       accent: "#22D3EE" },
                { icon: "💼", label: "Browse Jobs",      path: "/jobs",         accent: "#34D399" },
                { icon: "⚔️", label: "View Quests",      path: "/challenges",   accent: "#8B5CF6" },
                { icon: "🛍️", label: "XP Store",         path: "/store",        accent: "#F59E0B" },
              ].map(a => (
                <button
                  key={a.path}
                  className="dash3-qa-btn"
                  style={{ "--qa-accent": a.accent } as React.CSSProperties}
                  onClick={() => navigate(a.path)}
                >
                  <span className="dash3-qa-icon">{a.icon}</span>
                  <span className="dash3-qa-label">{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div className="card dash3-panel dash3-panel--activity" variants={fadeUp}>
            <div className="dash3-panel__head">
              <div className="dash3-panel__title-row">
                <div className="dash3-panel__accent dash3-panel__accent--green" />
                <h2 className="dash3-panel__title">Recent Activity</h2>
              </div>
              <span className="dash3-panel__sub">{data.recentActivity.length} events</span>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="dash3-empty">No activity yet. Start earning XP!</p>
            ) : (
              <motion.div className="dash3-panel__body" variants={stagger}>
                {data.recentActivity.map((item, i) => (
                  <ActivityRow key={i} item={item} />
                ))}
              </motion.div>
            )}
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = `
/* ── Root ──────────────────────────────────────── */
.dash3-root { padding-bottom: var(--space-8, 32px); }
.dash3-layout { display: flex; flex-direction: column; gap: var(--space-5, 20px); }

/* ── Skeleton ───────────────────────────────────── */
.dash3-sk {
  background: linear-gradient(90deg, var(--color-bg-elevated) 25%, var(--color-bg-overlay) 50%, var(--color-bg-elevated) 75%);
  background-size: 400% 100%;
  animation: dash3Shimmer 1.5s ease-in-out infinite;
}
@keyframes dash3Shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }

/* ── Hero ───────────────────────────────────────── */
.dash3-hero {
  position: relative; overflow: hidden;
  padding: 28px 32px !important;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
}
.dash3-hero__bg {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.12) 0%, transparent 60%),
              radial-gradient(ellipse at 100% 100%, rgba(34,211,238,0.08) 0%, transparent 60%);
}
.dash3-hero__noise {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.dash3-hero__left  { display: flex; align-items: center; gap: 20px; flex: 1; min-width: 0; position: relative; z-index: 1; }
.dash3-hero__right { display: flex; flex-direction: column; align-items: center; gap: 10px; position: relative; z-index: 1; }

.dash3-hero__avatar {
  position: relative; flex-shrink: 0;
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--color-bg-overlay);
  border: 2px solid var(--color-primary-400);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 700; color: var(--color-primary-400);
}
.dash3-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
.dash3-hero__lvl-badge {
  position: absolute; bottom: -4px; right: -4px;
  background: var(--gradient-xp, linear-gradient(135deg,#92400E,#F59E0B));
  color: #fff; font-family: var(--font-mono); font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 8px; border: 1.5px solid var(--color-bg-surface);
}

.dash3-hero__greet  { font-size: var(--text-xs, 11px); color: var(--color-text-muted); margin: 0 0 2px; }
.dash3-hero__name   { font-family: var(--font-display, 'Syne', sans-serif); font-size: var(--text-2xl, 1.75rem); font-weight: 800; margin: 0; color: var(--color-text-primary); line-height: 1.1; }
.dash3-hero__name span { color: var(--color-primary-400); }
.dash3-hero__title  { font-size: var(--text-sm, 13px); color: var(--color-text-secondary); margin: 4px 0 8px; }
.dash3-hero__tags   { display: flex; gap: 6px; flex-wrap: wrap; }
.dash3-hero__tag    { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500; font-family: var(--font-mono); }
.dash3-hero__tag--xp   { background: rgba(245,158,11,0.12); color: var(--color-gold-400, #F59E0B); border: 1px solid rgba(245,158,11,0.25); }
.dash3-hero__tag--rank { background: rgba(167,139,250,0.1); color: var(--color-primary-400, #A78BFA); border: 1px solid rgba(167,139,250,0.2); }
.dash3-hero__tag--loc  { background: rgba(34,211,238,0.08); color: var(--color-cyan-400, #22D3EE); border: 1px solid rgba(34,211,238,0.15); }

/* XP Ring text */
.xp-ring-wrap svg text { fill: var(--color-text-primary); font-family: var(--font-mono, monospace); }
.xp-ring-level { font-size: 26px; font-weight: 700; }
.xp-ring-rank  { font-size: 10px; fill: var(--color-text-muted) !important; letter-spacing: 0.05em; }

.dash3-hero__xp-week { font-family: var(--font-mono); font-size: 11px; color: var(--color-gold-400, #F59E0B); }
.dash3-hero__xp-next { font-size: 11px; color: var(--color-text-muted); }
.dash3-hero__progress-track {
  width: 120px; height: 5px; border-radius: 3px;
  background: var(--color-bg-overlay);
}
.dash3-hero__progress-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #F59E0B, #A78BFA);
  transition: width 1s ease;
}

/* ── Stats row ──────────────────────────────────── */
.dash3-stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.dash3-stat {
  position: relative; overflow: hidden;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: 16px; padding: 16px 14px 14px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dash3-stat:hover { border-color: var(--accent, #A78BFA); box-shadow: 0 0 20px rgba(167,139,250,0.1); }
.dash3-stat__icon { font-size: 20px; margin-bottom: 4px; }
.dash3-stat__val  { font-family: var(--font-mono); font-size: var(--text-2xl, 1.75rem); font-weight: 700; color: var(--color-text-primary); line-height: 1; }
.dash3-stat__lbl  { font-size: var(--text-xs, 11px); color: var(--color-text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
.dash3-stat__sub  { font-size: 10px; color: var(--color-text-disabled); font-family: var(--font-mono); }
.dash3-stat__glow {
  position: absolute; bottom: -20px; right: -20px;
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--accent, #A78BFA); opacity: 0.07; pointer-events: none;
}

/* ── Body layout ────────────────────────────────── */
.dash3-body { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }
.dash3-col-main { display: flex; flex-direction: column; gap: 16px; }
.dash3-col-side  { display: flex; flex-direction: column; gap: 16px; }

/* ── Panel ──────────────────────────────────────── */
.dash3-panel { overflow: hidden; }
.dash3-panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 12px; border-bottom: 1px solid var(--color-border-subtle);
}
.dash3-panel__title-row { display: flex; align-items: center; gap: 10px; }
.dash3-panel__accent { width: 3px; height: 20px; border-radius: 2px; flex-shrink: 0; }
.dash3-panel__accent--purple { background: var(--color-primary-400, #A78BFA); }
.dash3-panel__accent--cyan   { background: var(--color-cyan-400, #22D3EE); }
.dash3-panel__accent--gold   { background: var(--color-gold-400, #F59E0B); }
.dash3-panel__accent--green  { background: var(--color-green-400, #34D399); }
.dash3-panel__title { font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary); margin: 0; }
.dash3-panel__sub   { font-size: var(--text-xs, 11px); color: var(--color-text-muted); }
.dash3-panel__link  { font-size: var(--text-xs, 11px); color: var(--color-primary-400); background: none; border: none; cursor: pointer; padding: 0; }
.dash3-panel__link:hover { text-decoration: underline; }
.dash3-panel__body { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 0; }

/* ── Market bars ────────────────────────────────── */
.dash3-mkt-row { padding: 10px 8px; border-radius: 10px; transition: background 0.15s; }
.dash3-mkt-row:hover { background: var(--color-bg-hover); }
.dash3-mkt-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.dash3-mkt-name { font-size: var(--text-sm, 13px); font-weight: 500; color: var(--color-text-primary); }
.dash3-mkt-right { display: flex; align-items: center; gap: 10px; }
.dash3-mkt-have { font-size: 11px; color: var(--color-green-400, #34D399); font-family: var(--font-mono); }
.dash3-mkt-gap  { font-size: 11px; color: var(--color-primary-400, #A78BFA); font-family: var(--font-mono); font-weight: 600; }
.dash3-mkt-jobs { font-size: 10px; color: var(--color-text-muted); font-family: var(--font-mono); }
.dash3-mkt-track { height: 4px; background: var(--color-bg-overlay); border-radius: 2px; overflow: hidden; }
.dash3-mkt-fill  { height: 100%; border-radius: 2px; transition: width 1s ease; }

/* ── Recommended chips ──────────────────────────── */
.dash3-rec-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 20px 14px;
  border-top: 1px solid var(--color-border-subtle);
  background: rgba(167,139,250,0.04);
}
.dash3-rec-label { font-size: 11px; color: var(--color-text-muted); flex-shrink: 0; }
.dash3-rec-chip {
  font-size: 11px; font-family: var(--font-mono);
  background: rgba(167,139,250,0.1); color: var(--color-primary-400);
  border: 1px solid rgba(167,139,250,0.2); border-radius: 20px;
  padding: 3px 10px; cursor: pointer; transition: background 0.15s;
}
.dash3-rec-chip:hover { background: rgba(167,139,250,0.2); }

/* ── Skill rows ─────────────────────────────────── */
.dash3-skill-list { gap: 0 !important; padding: 4px 12px 12px !important; }
.dash3-skill-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px; border-bottom: 1px solid var(--color-border-subtle);
  transition: background 0.15s;
}
.dash3-skill-row:last-child { border-bottom: none; }
.dash3-skill-row:hover { background: var(--color-bg-hover); border-radius: 8px; }
.dash3-skill-icon { font-size: 18px; flex-shrink: 0; }
.dash3-skill-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dash3-skill-name { font-size: var(--text-sm, 13px); font-weight: 500; color: var(--color-text-primary); }
.dash3-skill-cat  { font-size: 10px; color: var(--color-text-muted); }
.dash3-skill-badge {
  font-size: 10px; font-family: var(--font-mono); font-weight: 700;
  padding: 2px 8px; border-radius: 8px; border: 1px solid; letter-spacing: 0.06em;
  flex-shrink: 0;
}

/* ── Quick actions ──────────────────────────────── */
.dash3-qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 16px 16px; }
.dash3-qa-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; border-radius: 12px;
  background: var(--color-bg-elevated); border: 1px solid var(--color-border-default);
  cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.12s;
}
.dash3-qa-btn:hover {
  border-color: var(--qa-accent, #A78BFA);
  background: var(--color-bg-overlay);
  transform: translateY(-2px);
}
.dash3-qa-icon  { font-size: 20px; }
.dash3-qa-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); }

/* ── Activity ───────────────────────────────────── */
.dash3-act-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 8px; border-bottom: 1px solid var(--color-border-subtle);
}
.dash3-act-row:last-child { border-bottom: none; }
.dash3-act-icon {
  font-size: 14px; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-overlay); border-radius: 8px; flex-shrink: 0;
}
.dash3-act-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dash3-act-lbl  { font-size: var(--text-sm, 13px); color: var(--color-text-secondary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash3-act-detail { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-muted); }
.dash3-act-time   { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-disabled); white-space: nowrap; flex-shrink: 0; }

/* ── Empty / CTA ────────────────────────────────── */
.dash3-empty { font-size: var(--text-sm); color: var(--color-text-muted); padding: 12px 8px; margin: 0; }
.dash3-empty-cta { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 12px 20px 20px; }

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 1100px) {
  .dash3-body { grid-template-columns: 1fr; }
  .dash3-col-side { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .dash3-stats-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .dash3-hero { flex-direction: column; align-items: flex-start; }
  .dash3-stats-row { grid-template-columns: repeat(2, 1fr); }
  .dash3-col-side { grid-template-columns: 1fr; }
  .dash3-hero__left { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 480px) {
  .dash3-stats-row { grid-template-columns: 1fr 1fr; }
}
`;

export default DashboardPage;