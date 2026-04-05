import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageLayout from "../../components/user/PageLayout";
import { useDashboard, getSkillName } from "../../hooks/user/useDashboard";
import type { ActiveChallenge, RecentActivity } from "../../hooks/user/useDashboard";
import { BadgeLevel } from "../../types";
import "../../assets/css/DashboardPage.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BADGE_META: Record<BadgeLevel, { label: string; emoji: string; cls: string }> = {
  [BadgeLevel.BRONZE]: { label: "Bronze", emoji: "🥉", cls: "bronze" },
  [BadgeLevel.SILVER]: { label: "Silver", emoji: "🥈", cls: "silver" },
  [BadgeLevel.GOLD]: { label: "Gold", emoji: "🥇", cls: "gold" },
};

const SHORTCUT_ITEMS = [
  { label: "My Profile", path: "/profile", emoji: "👤", desc: "Edit your info & links", color: "primary" },
  { label: "My Skills", path: "/skills", emoji: "🎯", desc: "Verify & level up skills", color: "accent" },
  { label: "Browse Jobs", path: "/jobs", emoji: "💼", desc: "Find skill-matched roles", color: "indigo" },
  { label: "XP Store", path: "/store", emoji: "🛒", desc: "Spend XP on premium features", color: "xp" },
];

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/* Framer Motion variants */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
};

const StatCard: React.FC<{
  value: number; label: string; sub?: string;
  icon: string; variant: "primary" | "accent" | "gold" | "indigo";
}> = ({ value, label, sub, icon, variant }) => (
  <motion.div
    className={`dash-stat-card dash-stat-card--${variant} card`}
    variants={itemVariants}
    whileHover={{ y: -3, transition: { type: "spring", stiffness: 400 } }}
  >
    <div className="dash-stat-card__icon-wrap">{icon}</div>
    <div className="dash-stat-card__body">
      <div className="dash-stat-card__value"><AnimatedNumber value={value} /></div>
      <div className="dash-stat-card__label">{label}</div>
      {sub && <div className="dash-stat-card__sub">{sub}</div>}
    </div>
    <div className="dash-stat-card__glow" aria-hidden="true" />
  </motion.div>
);

const ChallengeRow: React.FC<{ challenge: ActiveChallenge }> = ({ challenge }) => {
  const pct = Math.round((challenge.currentProgress / challenge.targetValue) * 100);
  const urgent = challenge.daysLeft <= 2;
  return (
    <motion.div className="dash-challenge-row" variants={itemVariants}>
      <div className="dash-challenge-row__header">
        <span className="dash-challenge-row__title">{challenge.title}</span>
        <span className={`badge ${urgent ? "badge-danger" : "badge-muted"}`}>{challenge.daysLeft}d left</span>
      </div>
      <div className="dash-challenge-row__meta">
        <span className="dash-challenge-row__progress-text">
          {challenge.currentProgress} / {challenge.targetValue}
        </span>
        <span className="xp-pill dash-challenge-row__xp">⚡ {challenge.xpReward} XP</span>
      </div>
      <div className="progress-track mt-2">
        <div
          className={`progress-fill progress-primary${pct >= 100 ? " animated" : ""}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        />
      </div>
    </motion.div>
  );
};

const ActivityItem: React.FC<{ item: RecentActivity }> = ({ item }) => (
  <motion.div className="dash-activity-item" variants={itemVariants}>
    <div className="dash-activity-item__icon">{item.icon}</div>
    <div className="dash-activity-item__content">
      <p className="dash-activity-item__message">{item.message}</p>
      {item.detail && <span className="dash-activity-item__detail">{item.detail}</span>}
    </div>
    <span className="dash-activity-item__time">{item.timestamp}</span>
  </motion.div>
);

const SkeletonCard: React.FC<{ height?: number }> = ({ height = 100 }) => (
  <div className="skeleton" style={{ height, borderRadius: "var(--radius-xl)" }} />
);

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard();

  /* ── Error state ─────────────────────────────────────────────── */
  if (error) {
    return (
      <PageLayout pageTitle="Dashboard">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>
            Try again
          </button>
        </div>
      </PageLayout>
    );
  }

  /* ── Loading skeleton ────────────────────────────────────────── */
  if (isLoading || !data) {
    return (
      <PageLayout pageTitle="Dashboard">
        <div className="dash-skeleton">
          <div className="skeleton dash-skeleton__header" />
          <div className="dash-stats-grid mt-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={110} />)}
          </div>
          <div className="dash-content-grid mt-6">
            <div className="flex-col gap-4"><SkeletonCard height={260} /><SkeletonCard height={200} /></div>
            <div className="flex-col gap-4"><SkeletonCard height={220} /><SkeletonCard height={240} /></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const { user, stats, recentActivity, activeChallenges, topSkills } = data;

  return (
    <PageLayout pageTitle="Dashboard">

      {/* ── Welcome header ─────────────────────────────────────── */}
      <motion.header
        className="dash-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="dash-header__text">
          <p className="dash-header__greeting label">{getGreeting()}</p>
          <h1 className="dash-header__name">
            {user.firstName} {user.lastName}
            <span className="dash-header__wave" aria-hidden="true">👋</span>
          </h1>
          {user.professionalTitle && (
            <p className="dash-header__title">{user.professionalTitle}</p>
          )}
        </div>
        <div className="dash-header__right">
          <div className="dash-header__week-xp">
            <span className="dash-header__week-xp-label label">This week</span>
            <div className="xp-display">
              <span className="xp-icon">⚡</span>
              <span className="xp-amount">+{stats.xpGainedThisWeek.toLocaleString()}</span>
              <span className="dash-header__xp-unit">XP</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/profile")}>
            View Profile
          </button>
        </div>
      </motion.header>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <motion.section
        className="dash-stats-grid mt-6"
        aria-label="Key statistics"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <StatCard
          value={stats.xpBalance} label="Total XP"
          sub={`+${stats.xpGainedThisWeek} this week`}
          icon="⚡" variant="primary"
        />
        <StatCard
          value={stats.totalBadges} label="Badges Earned"
          sub={`🥇${stats.goldBadges}  🥈${stats.silverBadges}  🥉${stats.bronzeBadges}`}
          icon="🏅" variant="accent"
        />
        <StatCard
          value={stats.activeChallenges} label="Active Challenges"
          sub={`${stats.completedChallenges} completed`}
          icon="🏆" variant="gold"
        />
        <StatCard
          value={stats.verifiedSkills} label="Verified Skills"
          sub={`${stats.totalApplications} job applications`}
          icon="🎯" variant="indigo"
        />
      </motion.section>

      {/* ── Quick shortcuts ─────────────────────────────────────── */}
      <section className="mt-8" aria-label="Quick actions">
        <h2 className="dash-section-title">Quick Access</h2>
        <motion.div
          className="dash-shortcuts-grid mt-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {SHORTCUT_ITEMS.map((item) => (
            <motion.button
              key={item.path}
              className={`dash-shortcut dash-shortcut--${item.color} card card-interactive`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              variants={itemVariants}
              whileHover={{ y: -2, transition: { type: "spring", stiffness: 400 } }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="dash-shortcut__emoji">{item.emoji}</span>
              <div className="dash-shortcut__text">
                <span className="dash-shortcut__label">{item.label}</span>
                <span className="dash-shortcut__desc">{item.desc}</span>
              </div>
              <span className="dash-shortcut__arrow" aria-hidden="true">→</span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* ── Lower grid ─────────────────────────────────────────── */}
      <div className="dash-content-grid mt-8">
        <div className="flex-col gap-6">

          {/* Active Challenges */}
          <section className="card card-accent-top">
            <div className="card-header dash-card-header">
              <h2 className="dash-section-title" style={{ margin: 0 }}>Active Challenges</h2>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate("/challenges")}>
                View all →
              </button>
            </div>
            <motion.div
              className="card-body flex-col gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {activeChallenges.length === 0 ? (
                <div className="empty-state" style={{ padding: "var(--space-8) 0" }}>
                  <div className="empty-state-icon">🏆</div>
                  <p>No active challenges. Start one now!</p>
                </div>
              ) : activeChallenges.map((c) => (
                <ChallengeRow key={c.challengeId} challenge={c} />
              ))}
            </motion.div>
          </section>

          {/* Top Skills */}
          <section className="card">
            <div className="card-header dash-card-header">
              <h2 className="dash-section-title" style={{ margin: 0 }}>Top Skills</h2>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate("/skills")}>
                All skills →
              </button>
            </div>
            <motion.div
              className="card-body flex-col gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {topSkills.map((skill) => {
                const badge = skill.currentBadge ? BADGE_META[skill.currentBadge] : null;
                return (
                  <motion.div
                    key={skill.verificationId}
                    className="dash-skill-row"
                    variants={itemVariants}
                  >
                    <div className="dash-skill-row__name">{getSkillName(skill.skillId)}</div>
                    {badge ? (
                      <span className={`badge badge-${badge.cls}`}>{badge.emoji} {badge.label}</span>
                    ) : (
                      <span className="badge badge-muted">Unverified</span>
                    )}
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate("/skills")}>
                      Level up
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        </div>

        <div className="flex-col gap-6">

          {/* XP Milestone */}
          <section className="card">
            <div className="card-body">
              <div className="dash-card-header mb-4">
                <h2 className="dash-section-title" style={{ margin: 0 }}>XP Milestone</h2>
                <span className="badge badge-primary">Level 5</span>
              </div>
              <div className="dash-xp-milestone__amounts">
                <span className="xp-display">
                  <span className="xp-icon">⚡</span>
                  <span className="xp-amount-sm">{stats.xpBalance.toLocaleString()}</span>
                </span>
                <span className="dash-xp-milestone__target label">/ 5,000 XP</span>
              </div>
              <div className="progress-track progress-track-lg mt-3">
                <motion.div
                  className="progress-fill progress-xp"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min((stats.xpBalance / 5000) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
                  role="progressbar"
                  aria-valuenow={stats.xpBalance}
                  aria-valuemin={0}
                  aria-valuemax={5000}
                />
              </div>
              <p className="dash-xp-milestone__hint mt-3">
                {Math.max(0, 5000 - stats.xpBalance).toLocaleString()} XP to reach{" "}
                <strong>Level 6</strong>
              </p>
              <button
                className="btn btn-xp btn-sm w-full mt-4"
                onClick={() => navigate("/challenges")}
              >
                ⚡ Earn more XP
              </button>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="card">
            <div className="card-header dash-card-header">
              <h2 className="dash-section-title" style={{ margin: 0 }}>Recent Activity</h2>
              <span className="badge badge-muted">{recentActivity.length} events</span>
            </div>
            <motion.div
              className="card-body flex-col"
              style={{ gap: 0 }}
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {recentActivity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </motion.div>
          </section>

        </div>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;