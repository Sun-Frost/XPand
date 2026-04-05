import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useSkills } from "../../hooks/user/useSkills";
import type { SkillWithVerification, BadgeLevel } from "../../hooks/user/useSkills";

// ─────────────────────────────────────────────────────────────────────────────
// Demand tier system
// ─────────────────────────────────────────────────────────────────────────────

type DemandTier = "hot" | "high" | "growing" | "specialized";

interface TierConfig {
  id: DemandTier;
  label: string;
  emoji: string;
  tagline: string;
  accentColor: string;
  glowColor: string;
  borderActive: string;
  scoreMin: number;
}

const TIERS: TierConfig[] = [
  {
    id: "hot", label: "Hot Skills", emoji: "🔥",
    tagline: "Employers are hiring urgently for these right now",
    accentColor: "#F97316", glowColor: "rgba(249,115,22,0.28)",
    borderActive: "rgba(249,115,22,0.60)", scoreMin: 75,
  },
  {
    id: "high", label: "High Demand", emoji: "⚡",
    tagline: "Consistently sought by top companies",
    accentColor: "#A78BFA", glowColor: "rgba(167,139,250,0.22)",
    borderActive: "rgba(167,139,250,0.55)", scoreMin: 50,
  },
  {
    id: "growing", label: "Growing Skills", emoji: "📈",
    tagline: "Rising fast — good time to get ahead",
    accentColor: "#34D399", glowColor: "rgba(52,211,153,0.18)",
    borderActive: "rgba(52,211,153,0.45)", scoreMin: 28,
  },
  {
    id: "specialized", label: "Specialized Skills", emoji: "🧩",
    tagline: "Niche but valuable in specific roles",
    accentColor: "#94A3B8", glowColor: "rgba(148,163,184,0.14)",
    borderActive: "rgba(148,163,184,0.38)", scoreMin: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Badge configuration
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_CFG: Record<BadgeLevel, {
  label: string; emoji: string; color: string;
  bg: string; border: string; glow: string;
}> = {
  GOLD: { label: "Gold", emoji: "🥇", color: "var(--color-badge-gold,#F59E0B)", bg: "var(--color-badge-gold-bg)", border: "var(--color-badge-gold-border)", glow: "var(--glow-gold)" },
  SILVER: { label: "Silver", emoji: "🥈", color: "var(--color-silver-light,#CBD5E1)", bg: "var(--color-silver-bg)", border: "var(--color-silver-border)", glow: "var(--glow-silver)" },
  BRONZE: { label: "Bronze", emoji: "🥉", color: "var(--color-bronze-light,#E8A85A)", bg: "var(--color-bronze-bg)", border: "var(--color-bronze-border)", glow: "var(--glow-bronze)" },
};

const CATEGORY_ICONS: Record<string, string> = {
  Frontend: "🖥️", Backend: "⚙️", Data: "📊", Cloud: "☁️", Mobile: "📱",
};

// ─────────────────────────────────────────────────────────────────────────────
// Enriched skill type
// ─────────────────────────────────────────────────────────────────────────────

interface EnrichedSkill {
  raw: SkillWithVerification;
  demandScore: number;
  tier: DemandTier;
  rank: number;
  badge: (typeof BADGE_CFG)[BadgeLevel] | null;
  tierConfig: TierConfig;
}

function getTierForScore(score: number): DemandTier {
  for (const t of TIERS) {
    if (score >= t.scoreMin) return t.id;
  }
  return "specialized";
}

function getLockedUntil(lockExpiry?: string | null): string {
  if (!lockExpiry) return "";
  const ms = new Date(lockExpiry).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function enrichSkills(skills: SkillWithVerification[]): EnrichedSkill[] {
  const sorted = [...skills].sort((a, b) => {
    const sa = (a as any).demandScore ?? 50;
    const sb = (b as any).demandScore ?? 50;
    return sb - sa;
  });

  return sorted.map((s, i) => {
    const score = Math.round(((sorted.length - i) / sorted.length) * 100);
    const tierId = getTierForScore(score);
    const tierConfig = TIERS.find((t) => t.id === tierId)!;
    const badgeLevel = s.verification?.currentBadge;

    return {
      raw: s, demandScore: score, tier: tierId, rank: i + 1,
      badge: badgeLevel ? BADGE_CFG[badgeLevel] : null,
      tierConfig,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const InsightsBar: React.FC<{
  total: number; verified: number; gold: number; silver: number; bronze: number; topTier: number;
}> = ({ total, verified, gold, silver, bronze, topTier }) => {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  return (
    <div className="mdb-insights">
      <div className="mdb-insights__progress-wrap">
        <div className="mdb-insights__progress-head">
          <span className="mdb-insights__progress-label label">Market Coverage</span>
          <span className="mdb-insights__progress-pct" style={{ color: "var(--color-primary-400,#A78BFA)" }}>{pct}%</span>
        </div>
        <div className="progress-track progress-track-lg">
          <div className="progress-fill progress-primary animated" style={{ width: `${pct}%` }}
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
        </div>
      </div>
      <div className="mdb-insights__stats">
        {[
          { value: `${verified}`, sub: `of ${total}`, label: "Verified", color: "var(--color-primary-400,#A78BFA)", bg: "var(--color-primary-glow)", border: "var(--color-primary-500,#7B5EA7)" },
          { value: String(gold), sub: "badges", label: "Gold", color: "var(--color-badge-gold,#F59E0B)", bg: "var(--color-badge-gold-bg)", border: "var(--color-badge-gold-border)" },
          { value: String(silver), sub: "badges", label: "Silver", color: "var(--color-silver-light,#CBD5E1)", bg: "var(--color-silver-bg)", border: "var(--color-silver-border)" },
          { value: String(bronze), sub: "badges", label: "Bronze", color: "var(--color-bronze-light,#E8A85A)", bg: "var(--color-bronze-bg)", border: "var(--color-bronze-border)" },
          { value: String(topTier), sub: "skills", label: "In Top Tiers", color: "#F97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.30)" },
        ].map((s) => (
          <div key={s.label} className="mdb-stat-pill" style={{ background: s.bg, borderColor: s.border }}>
            <span className="mdb-stat-pill__value" style={{ color: s.color }}>
              {s.value}<span className="mdb-stat-pill__sub"> {s.sub}</span>
            </span>
            <span className="mdb-stat-pill__label label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TierHeader: React.FC<{ config: TierConfig; count: number; verifiedCount: number }> = ({ config, count, verifiedCount }) => (
  <div className="mdb-tier-header">
    <div className="mdb-tier-header__accent" style={{ background: config.accentColor }} />
    <div className="mdb-tier-header__main">
      <div className="mdb-tier-header__title-row">
        <span className="mdb-tier-header__emoji">{config.emoji}</span>
        <h2 className="mdb-tier-header__title">{config.label}</h2>
        <span className="mdb-tier-header__count label" style={{ background: `${config.accentColor}18`, borderColor: `${config.accentColor}44`, color: config.accentColor }}>
          {count} skills
        </span>
        {verifiedCount > 0 && (
          <span className="mdb-tier-header__verified label">✓ {verifiedCount} verified</span>
        )}
      </div>
      <p className="mdb-tier-header__tagline">{config.tagline}</p>
    </div>
  </div>
);

const SkillCard: React.FC<{ skill: EnrichedSkill; hot: boolean; onClick: () => void }> = ({ skill, hot, onClick }) => {
  const { raw, demandScore, rank, badge, tierConfig } = skill;
  const v = raw.verification;
  const isLocked = raw.attemptsExhausted || (v?.isLocked ?? false);
  const lockedUntil = getLockedUntil(v?.lockExpiry);
  const icon = CATEGORY_ICONS[raw.category] ?? "🎯";

  let ctaLabel = "Start Verification";
  if (isLocked) {
    ctaLabel = lockedUntil
      ? `Locked · ${lockedUntil}`
      : raw.attemptsExhausted
        ? "No attempts left this month"
        : "Cooldown active";
  } else if (badge) {
    ctaLabel = badge.label === "Gold" ? "Re-attempt Gold" : `Improve to ${badge.label === "Silver" ? "Gold" : "Silver"}`;
  }

  const remainingLabel = !isLocked && raw.remainingAttempts < 3
    ? `${raw.remainingAttempts} attempt${raw.remainingAttempts !== 1 ? "s" : ""} left`
    : null;

  return (
    <div
      className={[
        "mdb-skill-card",
        hot ? "mdb-skill-card--hot" : "",
        badge ? `mdb-skill-card--${badge.label.toLowerCase()}` : "",
        isLocked ? "mdb-skill-card--locked" : "",
        !raw.isActive ? "mdb-skill-card--inactive" : "",
      ].filter(Boolean).join(" ")}
      style={{
        "--card-accent": tierConfig.accentColor,
        "--card-border": badge ? badge.border : tierConfig.borderActive,
        background: badge ? badge.bg : undefined,
      } as React.CSSProperties}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="mdb-skill-card__accent-line" style={{ background: tierConfig.accentColor }} />
      <div className="mdb-skill-card__rank label" style={{ color: tierConfig.accentColor }}>#{rank}</div>

      <div className="mdb-skill-card__top">
        <div className="mdb-skill-card__icon" style={{ background: `${tierConfig.accentColor}18`, borderColor: `${tierConfig.accentColor}44` }}>
          {icon}
        </div>
        {badge && (
          <div className="mdb-skill-card__badge-pill" style={{ background: badge.bg, borderColor: badge.border, color: badge.color }}>
            {badge.emoji} {badge.label}
          </div>
        )}
      </div>

      <h3 className="mdb-skill-card__name">{raw.name}</h3>
      <div className="mdb-skill-card__category label">{raw.category}</div>

      <div className="mdb-skill-card__demand">
        <div className="mdb-skill-card__demand-track">
          <div className="mdb-skill-card__demand-fill"
            style={{ width: `${demandScore}%`, background: tierConfig.accentColor, boxShadow: `0 0 8px ${tierConfig.glowColor}` }} />
        </div>
        <span className="mdb-skill-card__demand-pct label" style={{ color: tierConfig.accentColor }}>{demandScore}%</span>
      </div>

      {v?.attemptCount !== undefined && v.attemptCount > 0 && (
        <div className="mdb-skill-card__attempts label">
          {v.attemptCount} attempt{v.attemptCount !== 1 ? "s" : ""}
          {remainingLabel && <span style={{ color: "var(--color-warning)" }}> · {remainingLabel}</span>}
        </div>
      )}

      <button
        className={`btn btn-sm w-full mdb-skill-card__cta ${badge ? "btn-ghost" : "btn-primary"}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        disabled={isLocked || !raw.isActive}
        style={
          !badge && raw.isActive && !isLocked
            ? { background: `linear-gradient(135deg, ${tierConfig.accentColor}99, ${tierConfig.accentColor})`, borderColor: `${tierConfig.accentColor}66`, color: "#fff" }
            : badge && !isLocked
              ? { borderColor: badge.border, color: badge.color }
              : undefined
        }
      >
        {!raw.isActive ? "Coming soon" : ctaLabel}
      </button>
    </div>
  );
};

const SkeletonSection: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="mdb-tier-section">
    <div className="mdb-tier-header">
      <div className="mdb-tier-header__accent" style={{ background: "var(--color-border-default)" }} />
      <div className="mdb-tier-header__main">
        <div className="skeleton" style={{ height: 22, width: 200, borderRadius: "var(--radius-md)" }} />
        <div className="skeleton" style={{ height: 14, width: 280, borderRadius: "var(--radius-sm)", marginTop: 8 }} />
      </div>
    </div>
    <div className="mdb-tier-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mdb-skill-card" style={{ pointerEvents: "none" }}>
          <div className="skeleton" style={{ height: 44, width: 44, borderRadius: "var(--radius-lg)", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 18, width: "70%", borderRadius: "var(--radius-sm)", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: "var(--radius-sm)", marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 6, width: "100%", borderRadius: "var(--radius-full)", marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 34, width: "100%", borderRadius: "var(--radius-md)" }} />
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const SkillsLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSkills();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "verified" | "unverified">("all");

  const enriched = useMemo<EnrichedSkill[]>(() => {
    if (!data?.skills.length) return [];
    return enrichSkills(data.skills);
  }, [data]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.raw.name.toLowerCase().includes(q) || s.raw.category.toLowerCase().includes(q));
    }
    if (activeFilter === "verified") list = list.filter((s) => s.badge !== null);
    if (activeFilter === "unverified") list = list.filter((s) => s.badge === null);
    return list;
  }, [enriched, searchQuery, activeFilter]);

  const byTier = useMemo(() => {
    const map = new Map<DemandTier, EnrichedSkill[]>();
    TIERS.forEach((t) => map.set(t.id, []));
    filtered.forEach((s) => map.get(s.tier)!.push(s));
    return map;
  }, [filtered]);

  const recommended = useMemo(
    () => enriched.filter((s) => !s.badge && s.raw.isActive && !s.raw.attemptsExhausted).slice(0, 4),
    [enriched]
  );

  const stats = useMemo(() => {
    const v = enriched.filter((s) => s.badge !== null);
    return {
      total: enriched.filter((s) => s.raw.isActive).length,
      verified: v.length,
      gold: v.filter((s) => s.raw.verification?.currentBadge === "GOLD").length,
      silver: v.filter((s) => s.raw.verification?.currentBadge === "SILVER").length,
      bronze: v.filter((s) => s.raw.verification?.currentBadge === "BRONZE").length,
      topTier: enriched.filter((s) => s.tier === "hot" || s.tier === "high").length,
    };
  }, [enriched]);

  const goToTest = (skill: EnrichedSkill) => {
    if (skill.raw.attemptsExhausted || skill.raw.verification?.isLocked) return;
    navigate(`/skills/test/${skill.raw.id}`, {
      state: { skillName: skill.raw.name, skillCategory: skill.raw.category },
    });
  };

  if (error) {
    return (
      <PageLayout pageTitle="Skills">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Failed to load skills</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Skills">
      <div className="mdb-page animate-fade-in">

        <header className="mdb-header">
          <div className="mdb-header__text">
            <h1 className="mdb-header__title">Market Demand Board</h1>
            <p className="mdb-header__sub">
              Skills ranked by employer demand. Verify them to earn badges and improve your match score.
            </p>
          </div>
          <div className="mdb-header__controls">
            <div className="mdb-search">
              <svg className="mdb-search__icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input className="input mdb-search__input" placeholder="Search skills…"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button className="mdb-search__clear" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>
            <div className="mdb-filter-chips">
              {(["all", "verified", "unverified"] as const).map((f) => (
                <button key={f} className={`mdb-filter-chip ${activeFilter === f ? "mdb-filter-chip--active" : ""}`}
                  onClick={() => setActiveFilter(f)}>
                  {f === "all" ? "All" : f === "verified" ? "Verified" : "Unverified"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!isLoading && <InsightsBar {...stats} />}

        {isLoading && (
          <>
            <SkeletonSection count={4} />
            <SkeletonSection count={5} />
            <SkeletonSection count={3} />
          </>
        )}

        {!isLoading && (
          <>
            {/* Recommended section */}
            {recommended.length > 0 && activeFilter !== "verified" && !searchQuery && (
              <section className="mdb-section mdb-recommended">
                <div className="mdb-recommended__header">
                  <div className="mdb-recommended__icon">✦</div>
                  <div>
                    <h2 className="mdb-recommended__title">Recommended for you</h2>
                    <p className="mdb-recommended__sub">Top unverified skills by market demand — verify these first</p>
                  </div>
                </div>
                <div className="mdb-rec-list">
                  {recommended.map((s, i) => (
                    <button key={s.raw.id} className="mdb-rec-card"
                      style={{ "--tier-color": s.tierConfig.accentColor } as React.CSSProperties}
                      onClick={() => goToTest(s)}>
                      <div className="mdb-rec-card__rank label">#{i + 1}</div>
                      <div className="mdb-rec-card__icon-wrap" style={{ background: `${s.tierConfig.accentColor}18`, borderColor: `${s.tierConfig.accentColor}44` }}>
                        <span>{CATEGORY_ICONS[s.raw.category] ?? "🎯"}</span>
                      </div>
                      <div className="mdb-rec-card__info">
                        <div className="mdb-rec-card__name">{s.raw.name}</div>
                        <div className="mdb-rec-card__meta label">{s.raw.category} · {s.tierConfig.emoji} {s.tierConfig.label}</div>
                      </div>
                      <div className="mdb-rec-card__bar-wrap">
                        <div className="mdb-rec-card__bar-track">
                          <div className="mdb-rec-card__bar-fill" style={{ width: `${s.demandScore}%`, background: s.tierConfig.accentColor }} />
                        </div>
                        <span className="mdb-rec-card__pct label" style={{ color: s.tierConfig.accentColor }}>{s.demandScore}%</span>
                      </div>
                      <div className="mdb-rec-card__arrow" style={{ color: s.tierConfig.accentColor }}>→</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Tier sections */}
            {TIERS.map((tier) => {
              const tierSkills = byTier.get(tier.id) ?? [];
              if (tierSkills.length === 0) return null;
              const verifiedInTier = tierSkills.filter((s) => s.badge !== null).length;
              return (
                <section key={tier.id} className="mdb-tier-section">
                  <TierHeader config={tier} count={tierSkills.length} verifiedCount={verifiedInTier} />
                  <div className={`mdb-tier-row ${tier.id === "hot" ? "mdb-tier-row--hot" : ""}`}>
                    {tierSkills.map((skill) => (
                      <SkillCard key={skill.raw.id} skill={skill} hot={tier.id === "hot"} onClick={() => goToTest(skill)} />
                    ))}
                  </div>
                </section>
              );
            })}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <h3>No skills found</h3>
                <p>Try a different search term or filter.</p>
                <button className="btn btn-ghost btn-sm mt-4" onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}>
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{styles}</style>
    </PageLayout>
  );
};

// Styles are identical to the existing page — kept in full
const styles = `
  .mdb-page { padding-bottom: var(--space-16); }
  .mdb-header { display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-6);margin-bottom:var(--space-6);flex-wrap:wrap; }
  .mdb-header__title { font-family:var(--font-display);font-size:var(--text-3xl);font-weight:var(--weight-bold);color:var(--color-text-primary);letter-spacing:var(--tracking-wide);margin:0 0 var(--space-2);background:var(--gradient-brand,linear-gradient(135deg,#4A2880,#7B5EA7,#22D3EE));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .mdb-header__sub { font-size:var(--text-sm);color:var(--color-text-muted);margin:0;max-width:480px;line-height:var(--leading-relaxed); }
  .mdb-header__controls { display:flex;flex-direction:column;gap:var(--space-3);align-items:flex-end; }
  .mdb-search { position:relative;width:260px; }
  .mdb-search__icon { position:absolute;left:var(--space-3);top:50%;transform:translateY(-50%);color:var(--color-text-muted);pointer-events:none; }
  .mdb-search__input { padding-left:2.2rem;padding-right:2rem; }
  .mdb-search__clear { position:absolute;right:var(--space-3);top:50%;transform:translateY(-50%);background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:var(--text-sm);padding:0;line-height:1; }
  .mdb-filter-chips { display:flex;gap:var(--space-2); }
  .mdb-filter-chip { font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--weight-medium);letter-spacing:var(--tracking-wider);padding:var(--space-1) var(--space-4);border-radius:var(--radius-full);border:1px solid var(--color-border-default);background:var(--color-bg-elevated);color:var(--color-text-muted);cursor:pointer;transition:all 120ms ease; }
  .mdb-filter-chip--active { background:var(--color-primary-glow);border-color:var(--color-primary-500,#7B5EA7);color:var(--color-primary-400,#A78BFA); }
  .mdb-insights { display:flex;align-items:center;gap:var(--space-6);background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-xl);padding:var(--space-5) var(--space-6);margin-bottom:var(--space-8);flex-wrap:wrap; }
  .mdb-insights__progress-wrap { min-width:200px;flex:1; }
  .mdb-insights__progress-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2); }
  .mdb-insights__progress-pct { font-family:var(--font-display);font-size:var(--text-lg);font-weight:var(--weight-bold);line-height:1; }
  .mdb-insights__stats { display:flex;gap:var(--space-3);flex-wrap:wrap; }
  .mdb-stat-pill { display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--space-3) var(--space-4);border-radius:var(--radius-lg);border:1px solid;min-width:68px;text-align:center; }
  .mdb-stat-pill__value { font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);line-height:1; }
  .mdb-stat-pill__sub { font-size:var(--text-xs);font-family:var(--font-body);font-weight:var(--weight-regular);color:var(--color-text-muted);opacity:0.75; }
  .mdb-stat-pill__label { font-size:9px;color:var(--color-text-muted); }
  .mdb-section { margin-bottom:var(--space-10); }
  .mdb-tier-section { margin-bottom:var(--space-10); }
  .mdb-recommended { background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-xl);padding:var(--space-6); }
  .mdb-recommended__header { display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5); }
  .mdb-recommended__icon { width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:var(--color-primary-glow);border:1px solid var(--color-primary-500,#7B5EA7);border-radius:var(--radius-lg);font-size:var(--text-lg);color:var(--color-primary-400,#A78BFA);flex-shrink:0; }
  .mdb-recommended__title { font-family:var(--font-display);font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text-primary);margin:0 0 var(--space-1);letter-spacing:var(--tracking-wide); }
  .mdb-recommended__sub { font-size:var(--text-sm);color:var(--color-text-muted);margin:0; }
  .mdb-rec-list { display:flex;flex-direction:column;gap:var(--space-3); }
  .mdb-rec-card { display:flex;align-items:center;gap:var(--space-4);width:100%;padding:var(--space-3) var(--space-4);background:var(--color-bg-overlay);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);cursor:pointer;text-align:left;font-family:var(--font-body);transition:border-color 120ms ease,background 120ms ease,box-shadow 180ms ease; }
  .mdb-rec-card:hover { border-color:var(--tier-color,var(--color-border-strong));background:var(--color-bg-active); }
  .mdb-rec-card__rank { font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);min-width:24px; }
  .mdb-rec-card__icon-wrap { width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md);border:1px solid;flex-shrink:0;font-size:1.1rem; }
  .mdb-rec-card__info { flex:1;min-width:0; }
  .mdb-rec-card__name { font-family:var(--font-display);font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--color-text-primary);letter-spacing:var(--tracking-wide);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .mdb-rec-card__meta { font-size:10px;color:var(--color-text-muted);margin-top:2px; }
  .mdb-rec-card__bar-wrap { display:flex;align-items:center;gap:var(--space-2);flex-shrink:0;width:120px; }
  .mdb-rec-card__bar-track { flex:1;height:4px;background:var(--color-bg-active);border-radius:var(--radius-full);overflow:hidden; }
  .mdb-rec-card__bar-fill { height:100%;border-radius:var(--radius-full);transition:width 0.6s ease; }
  .mdb-rec-card__pct { font-size:10px;min-width:28px;text-align:right; }
  .mdb-rec-card__arrow { font-size:var(--text-lg);flex-shrink:0;transition:transform 120ms ease; }
  .mdb-rec-card:hover .mdb-rec-card__arrow { transform:translateX(4px); }
  .mdb-tier-header { display:flex;align-items:flex-start;gap:var(--space-4);margin-bottom:var(--space-5); }
  .mdb-tier-header__accent { width:3px;min-height:52px;border-radius:var(--radius-full);flex-shrink:0;margin-top:2px; }
  .mdb-tier-header__main { flex:1; }
  .mdb-tier-header__title-row { display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-1); }
  .mdb-tier-header__emoji { font-size:var(--text-xl);line-height:1; }
  .mdb-tier-header__title { font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-text-primary);margin:0;letter-spacing:var(--tracking-wide); }
  .mdb-tier-header__count { font-size:10px;padding:2px 8px;border-radius:var(--radius-full);border:1px solid; }
  .mdb-tier-header__verified { font-size:10px;color:var(--color-success);padding:2px 8px;background:var(--color-success-bg);border:1px solid var(--color-success-border);border-radius:var(--radius-full); }
  .mdb-tier-header__tagline { font-size:var(--text-xs);color:var(--color-text-muted);margin:0;line-height:var(--leading-relaxed); }
  .mdb-tier-row { display:flex;gap:var(--space-4);overflow-x:auto;padding-bottom:var(--space-3);scrollbar-width:thin;scrollbar-color:var(--color-border-default) transparent; }
  .mdb-tier-row::-webkit-scrollbar { height:4px; }
  .mdb-tier-row::-webkit-scrollbar-thumb { background:var(--color-border-default);border-radius:var(--radius-full); }
  .mdb-tier-row--hot { scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch; }
  .mdb-tier-row--hot .mdb-skill-card { scroll-snap-align:start; }
  .mdb-skill-card { flex-shrink:0;width:200px;background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-xl);padding:var(--space-4);cursor:pointer;display:flex;flex-direction:column;gap:var(--space-2);position:relative;overflow:hidden;transition:border-color 180ms ease,box-shadow 180ms ease,transform 120ms ease; }
  .mdb-skill-card:hover { border-color:var(--card-border,var(--color-border-strong));transform:translateY(-3px); }
  .mdb-skill-card--hot { width:230px; }
  .mdb-skill-card--gold { border-color:var(--color-badge-gold-border) !important; }
  .mdb-skill-card--silver { border-color:var(--color-silver-border) !important; }
  .mdb-skill-card--bronze { border-color:var(--color-bronze-border) !important; }
  .mdb-skill-card--locked { opacity:0.7; }
  .mdb-skill-card--inactive { opacity:0.45;pointer-events:none; }
  .mdb-skill-card__accent-line { position:absolute;top:0;left:0;right:0;height:2px; }
  .mdb-skill-card__rank { position:absolute;top:var(--space-3);right:var(--space-3);font-size:9px; }
  .mdb-skill-card__top { display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-1); }
  .mdb-skill-card__icon { width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;border-radius:var(--radius-lg);border:1px solid;flex-shrink:0; }
  .mdb-skill-card__badge-pill { font-family:var(--font-mono);font-size:9px;font-weight:var(--weight-medium);letter-spacing:var(--tracking-wider);text-transform:uppercase;padding:2px 7px;border-radius:var(--radius-full);border:1px solid;display:flex;align-items:center;gap:3px;white-space:nowrap;margin-top:2px; }
  .mdb-skill-card__name { font-family:var(--font-display);font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--color-text-primary);letter-spacing:var(--tracking-wide);line-height:var(--leading-snug);margin:0; }
  .mdb-skill-card__category { font-size:9px;color:var(--color-text-muted); }
  .mdb-skill-card__demand { display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1); }
  .mdb-skill-card__demand-track { flex:1;height:4px;background:var(--color-bg-overlay);border-radius:var(--radius-full);overflow:hidden; }
  .mdb-skill-card__demand-fill { height:100%;border-radius:var(--radius-full);transition:width 0.6s ease; }
  .mdb-skill-card__demand-pct { font-size:9px;min-width:26px;text-align:right; }
  .mdb-skill-card__attempts { font-size:9px;color:var(--color-text-muted); }
  .mdb-skill-card__cta { margin-top:auto;font-family:var(--font-display);font-size:var(--text-xs);letter-spacing:var(--tracking-wide); }
  @media (max-width:768px) {
    .mdb-header { flex-direction:column; }
    .mdb-header__controls { align-items:flex-start;width:100%; }
    .mdb-search { width:100%; }
    .mdb-insights { flex-direction:column;gap:var(--space-4); }
  }
  @media (max-width:480px) {
    .mdb-skill-card { width:175px; }
    .mdb-skill-card--hot { width:200px; }
  }
`;

export default SkillsLibraryPage;