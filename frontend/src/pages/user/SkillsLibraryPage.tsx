// SkillsLibraryPage.tsx — XPand  (Full Redesign)
// ─────────────────────────────────────────────────────────────────────────────
// DESIGN PRINCIPLES:
//   · ONE accent color for the page: primary violet (--color-primary-400).
//     Tier differentiation via intensity/opacity, not hue changes.
//   · Badge colors (gold/silver/bronze) are the ONLY multi-color
//     elements — they earn it because they signal earned achievement.
//   · Demand score drives a single emerald progress bar, not 4 colors.
//   · Tier labels use text weight + opacity hierarchy, not color overload.
//   · Layout mirrors JobsPage: sticky spotlight left, ranked list right.
//
// ONBOARDING NUDGE LOGIC:
//   · Onboarding skill IDs come from the backend (GET /user/skills/onboarding)
//     via useSkills, merged with any localStorage fallback.
//   · Popup shows on every fresh login session whenever there are still unverified
//     onboarding skills. "Remind me later" hides it for the rest of that login
//     session only — no persistent trigger button is shown afterward.
//   · Dismissal is keyed to the current access token so a new login always
//     re-shows the popup (assuming skills are still pending).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useSkills } from "../../hooks/user/useSkills";
import type { SkillWithVerification, BadgeLevel } from "../../hooks/user/useSkills";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — unified primary violet accent, tier differentiation via opacity only
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = {
  color:  "var(--color-primary-400)",
  glow:   "var(--color-primary-glow)",
  border: "rgba(155,124,255,0.25)",
  bg:     "var(--color-primary-glow)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tier config — same logic, restrained visual identity
// ─────────────────────────────────────────────────────────────────────────────

type DemandTier = "hot" | "high" | "growing" | "specialized";

interface TierConfig {
  id: DemandTier;
  label: string;
  icon: IconName;
  tagline: string;
  scoreMin: number;
  // Visual intensity — drives opacity/weight, NOT hue
  intensity: number; // 1.0 → 0.4
}

const TIERS: TierConfig[] = [
  { id: "hot",         label: "Hot",         icon: "filter-hot"          as IconName, tagline: "Employers are hiring urgently for these right now",  scoreMin: 75, intensity: 1.00 },
  { id: "high",        label: "High Demand", icon: "filter-high-demand"  as IconName, tagline: "Consistently sought by top companies",               scoreMin: 50, intensity: 0.75 },
  { id: "growing",     label: "Growing",     icon: "filter-growing"      as IconName, tagline: "Rising fast — good time to get ahead",               scoreMin: 28, intensity: 0.55 },
  { id: "specialized", label: "Specialized", icon: "filter-specialized"  as IconName, tagline: "Niche but valuable in specific roles",               scoreMin: 0,  intensity: 0.38 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Badge config — these DO keep their earned colors
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_CFG: Record<BadgeLevel, {
  label: string; icon: IconName; color: string; bg: string; border: string;
}> = {
  GOLD:   { label: "Gold",   icon: "badge-gold"   as IconName, color: "var(--color-gold-light)",   bg: "var(--color-gold-bg)",   border: "var(--color-gold-border)"   },
  SILVER: { label: "Silver", icon: "badge-silver" as IconName, color: "var(--color-silver-light)", bg: "var(--color-silver-bg)", border: "var(--color-silver-border)" },
  BRONZE: { label: "Bronze", icon: "badge-bronze" as IconName, color: "var(--color-bronze-light)", bg: "var(--color-bronze-bg)", border: "var(--color-bronze-border)" },
};

const CATEGORY_ICONS: Record<string, IconName> = {
  Frontend: "cat-frontend", Backend: "cat-backend", Data: "cat-data",
  Cloud: "cat-cloud", Mobile: "cat-mobile",
};

// ─────────────────────────────────────────────────────────────────────────────
// Enriched skill — unchanged logic
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
  for (const t of TIERS) { if (score >= t.scoreMin) return t.id; }
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
    const score      = Math.round(((sorted.length - i) / sorted.length) * 100);
    const tierId     = getTierForScore(score);
    const tierConfig = TIERS.find((t) => t.id === tierId)!;
    const badgeLevel = s.verification?.currentBadge;
    return { raw: s, demandScore: score, tier: tierId, rank: i + 1,
             badge: badgeLevel ? BADGE_CFG[badgeLevel] : null, tierConfig };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingNudgePopup — shown when the user has unverified onboarding skills
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingNudgePopupProps {
  skills: EnrichedSkill[];
  onVerify: (skill: EnrichedSkill) => void;
  onDismiss: () => void;
}

const OnboardingNudgePopup: React.FC<OnboardingNudgePopupProps> = ({ skills, onVerify, onDismiss }) => {
  const unverified = skills.filter((s) => !s.badge && !s.raw.isGoldVerified);
  const verified   = skills.filter((s) =>  s.badge ||  s.raw.isGoldVerified);

  if (skills.length === 0) return null;

  return (
    /* Backdrop */
    <div className="onb-backdrop" role="dialog" aria-modal="true" aria-label="Verify your skills" onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="onb-modal">

        {/* Header */}
        <div className="onb-header">
          <div className="onb-header__icon">🎯</div>
          <div className="onb-header__text">
            <h2 className="onb-title">You have skills to verify!</h2>
            <p className="onb-subtitle">
              During registration you told us you know these skills.
              Verify them to make them appear on your CV — unverified skills are hidden from employers.
            </p>
          </div>
          <button className="onb-close" onClick={onDismiss} aria-label="Dismiss">✕</button>
        </div>

        {/* Progress mini bar */}
        {verified.length > 0 && (
          <div className="onb-progress">
            <div className="onb-progress__track">
              <div
                className="onb-progress__fill"
                style={{ width: `${Math.round((verified.length / skills.length) * 100)}%` }}
              />
            </div>
            <span className="onb-progress__label">
              {verified.length} / {skills.length} verified
            </span>
          </div>
        )}

        {/* Already verified section */}
        {verified.length > 0 && (
          <div className="onb-section">
            <div className="onb-section__label">✅ Already verified</div>
            <div className="onb-chips">
              {verified.map((s) => (
                <div key={s.raw.id} className="onb-chip onb-chip--done"
                  style={{ borderColor: s.badge?.border, color: s.badge?.color, background: s.badge?.bg }}>
                  {s.badge && <Icon name={s.badge.icon} size={11} label="" />}
                  {s.raw.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending verification section */}
        {unverified.length > 0 && (
          <div className="onb-section">
            <div className="onb-section__label">⚠️ Not yet verified — won't show on your CV</div>
            <div className="onb-skill-list">
              {unverified.map((s) => {
                const icon = CATEGORY_ICONS[s.raw.category] ?? "cat-default";
                const isLocked = s.raw.attemptsExhausted || (s.raw.verification?.isLocked ?? false);
                return (
                  <div key={s.raw.id} className="onb-skill-row">
                    <div className="onb-skill-row__icon">
                      <Icon name={icon} size={14} label="" />
                    </div>
                    <div className="onb-skill-row__info">
                      <span className="onb-skill-row__name">{s.raw.name}</span>
                      <span className="onb-skill-row__cat">{s.raw.category} · {s.tierConfig.label}</span>
                    </div>
                    <button
                      className={`onb-skill-row__btn ${isLocked ? "onb-skill-row__btn--locked" : ""}`}
                      disabled={isLocked || !s.raw.isActive}
                      onClick={() => onVerify(s)}
                    >
                      {isLocked ? "Locked" : !s.raw.isActive ? "Soon" : "Verify →"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="onb-footer">
          <button className="btn btn-ghost btn-sm" onClick={onDismiss}>
            Remind me later
          </button>
          {unverified.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onVerify(unverified[0])}
            >
              Start with {unverified[0].raw.name} →
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CoverageBar — replaces InsightsBar, cleaner and monochrome
// ─────────────────────────────────────────────────────────────────────────────

const CoverageBar: React.FC<{
  total: number; verified: number; gold: number; silver: number; bronze: number; topTier: number;
}> = ({ total, verified, gold, silver, bronze, topTier }) => {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  return (
    <div className="scov">
      {/* Left: progress */}
      <div className="scov__left">
        <div className="scov__progress-head">
          <span className="scov__label">Market Coverage</span>
          <span className="scov__pct">{pct}%</span>
        </div>
        <div className="scov__track">
          <div className="scov__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="scov__sub">{verified} of {total} skills verified</div>
      </div>

      <div className="scov__divider" />

      {/* Right: stat pills — badge colors are earned, everything else monochrome */}
      <div className="scov__stats">
        <div className="scov__stat">
          <span className="scov__stat-val" style={{ color: ACCENT.color }}>{verified}</span>
          <span className="scov__stat-lbl">Verified</span>
        </div>
        <div className="scov__stat">
          <span className="scov__stat-val" style={{ color: "var(--color-gold-light)" }}>{gold}</span>
          <span className="scov__stat-lbl">Gold</span>
        </div>
        <div className="scov__stat">
          <span className="scov__stat-val" style={{ color: "var(--color-silver-light)" }}>{silver}</span>
          <span className="scov__stat-lbl">Silver</span>
        </div>
        <div className="scov__stat">
          <span className="scov__stat-val" style={{ color: "var(--color-bronze-light)" }}>{bronze}</span>
          <span className="scov__stat-lbl">Bronze</span>
        </div>
        <div className="scov__stat">
          <span className="scov__stat-val">{topTier}</span>
          <span className="scov__stat-lbl">Top Tier</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SkillSpotlight — left sticky panel
// ─────────────────────────────────────────────────────────────────────────────

const SkillSpotlight: React.FC<{
  skill: EnrichedSkill;
  onAction: () => void;
}> = ({ skill, onAction }) => {
  const { raw, demandScore, rank, badge, tierConfig } = skill;
  const v          = raw.verification;
  const isLocked   = raw.attemptsExhausted || (v?.isLocked ?? false);
  const lockedUntil = getLockedUntil(v?.lockExpiry);
  const icon       = CATEGORY_ICONS[raw.category] ?? "cat-default";

  let ctaLabel = "Start Verification";
  if (raw.isGoldVerified) {
    ctaLabel = "🥇 Gold Achieved — Nothing left to prove";
  } else if (isLocked) {
    ctaLabel = lockedUntil ? `Locked · ${lockedUntil}`
             : raw.attemptsExhausted ? "No attempts left this month"
             : "Cooldown active";
  } else if (badge) {
    ctaLabel = `Improve to ${badge.label === "Silver" ? "Gold" : "Silver"}`;
  }

  const remainingLabel = !isLocked && raw.remainingAttempts < 3
    ? `${raw.remainingAttempts} attempt${raw.remainingAttempts !== 1 ? "s" : ""} left`
    : null;

  const ctaStyle = badge
    ? { background: badge.bg, borderColor: badge.border, color: badge.color }
    : isLocked
    ? {}
    : { background: "var(--gradient-primary)", border: "none", color: "#fff" };

  return (
    <div className="sspt">
      {/* Thin accent bar at top — single color, intensity-driven opacity */}
      <div className="sspt__top-bar" style={{ opacity: tierConfig.intensity }} />

      {/* Rank + tier */}
      <div className="sspt__meta-row">
        <span className="sspt__rank">#{rank}</span>
        <span className="sspt__tier-label" style={{ opacity: 0.4 + tierConfig.intensity * 0.6 }}>
          <Icon name={tierConfig.icon} size={10} label="" />
          {tierConfig.label}
        </span>
        {badge && (
          <span className="sspt__badge-pill" style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}>
            <Icon name={badge.icon} size={11} label="" />
            {badge.label}
          </span>
        )}
      </div>

      {/* Icon */}
      <div className="sspt__icon-wrap">
        <Icon name={icon} size={28} label="" />
      </div>

      {/* Name + category */}
      <h2 className="sspt__name">{raw.name}</h2>
      <div className="sspt__category">{raw.category}</div>

      {/* Demand score — single color bar */}
      <div className="sspt__demand">
        <div className="sspt__demand-head">
          <span className="sspt__demand-label">Market Demand</span>
          <span className="sspt__demand-pct" style={{ color: ACCENT.color }}>{demandScore}%</span>
        </div>
        <div className="sspt__demand-track">
          <div
            className="sspt__demand-fill"
            style={{
              width: `${demandScore}%`,
              opacity: 0.4 + tierConfig.intensity * 0.6,
            }}
          />
        </div>
      </div>

      {/* Attempt info */}
      {v?.attemptCount !== undefined && v.attemptCount > 0 && (
        <div className="sspt__attempts">
          {v.attemptCount} attempt{v.attemptCount !== 1 ? "s" : ""}
          {remainingLabel && <span className="sspt__attempts-warn"> · {remainingLabel}</span>}
        </div>
      )}

      {/* Separator */}
      <div className="sspt__sep" />

      {/* CTA */}
      <button
        className={`sspt__cta ${isLocked || raw.isGoldVerified ? "sspt__cta--locked" : ""}`}
        style={raw.isGoldVerified
          ? { background: "var(--color-gold-bg)", borderColor: "var(--color-gold-border)", color: "var(--color-gold-light)", opacity: 1 }
          : ctaStyle}
        onClick={onAction}
        disabled={raw.isGoldVerified || isLocked || !raw.isActive}
      >
        {!raw.isActive ? "Coming soon" : ctaLabel}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SkillRow — ranked list entry
// ─────────────────────────────────────────────────────────────────────────────

const SkillRow: React.FC<{
  skill: EnrichedSkill;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}> = ({ skill, isActive, onHover, onClick }) => {
  const { raw, demandScore, rank, badge, tierConfig } = skill;
  const icon     = CATEGORY_ICONS[raw.category] ?? "cat-default";
  const isLocked = raw.attemptsExhausted || (raw.verification?.isLocked ?? false);

  const ctaLabel = isLocked ? "Locked"
    : badge ? (badge.label === "Gold" ? "Re-attempt" : "Improve")
    : "Verify";

  const ctaClass = badge ? "srow__cta--badge"
    : isLocked ? "srow__cta--locked"
    : "srow__cta--verify";

  const ctaStyle = badge
    ? { color: badge.color, borderColor: badge.border, background: badge.bg }
    : {};

  return (
    <div
      className={`srow ${isActive ? "srow--active" : ""}`}
      onMouseEnter={onHover}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={raw.name}
    >
      {/* Active indicator bar */}
      {isActive && <div className="srow__active-bar" />}

      {/* Rank */}
      <span className="srow__rank" style={isActive ? { color: ACCENT.color } : undefined}>
        {rank}
      </span>

      {/* Icon */}
      <div className="srow__icon" style={isActive ? { background: ACCENT.bg, borderColor: ACCENT.border } : undefined}>
        <Icon name={icon} size={15} label="" />
      </div>

      {/* Info */}
      <div className="srow__info">
        <div className="srow__name">{raw.name}</div>
        <div className="srow__meta">
          {raw.category}
          {badge && (
            <span className="srow__badge-inline" style={{ color: badge.color }}>
              <Icon name={badge.icon} size={9} label="" />
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Demand bar */}
      <div className="srow__bar-wrap">
        <div className="srow__bar-track">
          <div
            className="srow__bar-fill"
            style={{
              width: `${demandScore}%`,
              opacity: 0.4 + tierConfig.intensity * 0.6,
            }}
          />
        </div>
        <span className="srow__pct" style={isActive ? { color: ACCENT.color } : undefined}>
          {demandScore}%
        </span>
      </div>

      {/* CTA */}
      <button
        className={`srow__cta ${ctaClass}`}
        style={ctaStyle}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        disabled={isLocked || !raw.isActive}
      >
        {!raw.isActive ? "Soon" : ctaLabel}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Recommended strip
// ─────────────────────────────────────────────────────────────────────────────

const RecommendedStrip: React.FC<{
  items: EnrichedSkill[];
  onSelect: (s: EnrichedSkill) => void;
  onAction: (s: EnrichedSkill) => void;
}> = ({ items, onSelect, onAction }) => (
  <div className="srec">
    <div className="srec__head">
      <div className="srec__icon"><Icon name="recommended" size={12} label="" /></div>
      <div>
        <div className="srec__title">Recommended for you</div>
        <div className="srec__sub">Top unverified skills by market demand — verify these first</div>
      </div>
    </div>
    <div className="srec__list">
      {items.map((s) => (
        <button
          key={s.raw.id}
          className="srec__chip"
          onMouseEnter={() => onSelect(s)}
          onClick={() => onAction(s)}
        >
          <div className="srec__chip-icon">
            <Icon name={CATEGORY_ICONS[s.raw.category] ?? "cat-default"} size={13} label="" />
          </div>
          <div className="srec__chip-text">
            <span className="srec__chip-name">{s.raw.name}</span>
            <span className="srec__chip-meta">{s.tierConfig.label} · {s.demandScore}%</span>
          </div>
          <span className="srec__chip-arrow">→</span>
        </button>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonSpotlight: React.FC = () => (
  <div className="sspt sspt--skeleton">
    <div className="skeleton" style={{ width: "40%", height: 12, marginBottom: 20 }} />
    <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 12, marginBottom: 16 }} />
    <div className="skeleton" style={{ width: "70%", height: 22, marginBottom: 8 }} />
    <div className="skeleton" style={{ width: "45%", height: 12, marginBottom: 20 }} />
    <div className="skeleton" style={{ width: "100%", height: 8, borderRadius: 4, marginBottom: 20 }} />
    <div className="skeleton" style={{ width: "100%", height: 40, borderRadius: 10 }} />
  </div>
);

const SkeletonRow: React.FC<{ i: number }> = ({ i }) => (
  <div className="srow" style={{ opacity: 1 - i * 0.10, pointerEvents: "none" }}>
    <span className="srow__rank skeleton" style={{ width: 18, height: 12 }} />
    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton" style={{ width: "55%", height: 13, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: "38%", height: 10 }} />
    </div>
    <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 4 }} />
    <div className="skeleton" style={{ width: 56, height: 28, borderRadius: 8 }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GoldAchievementsPanel — showcase of mastered (Gold) skills
// ─────────────────────────────────────────────────────────────────────────────

const GoldAchievementsPanel: React.FC<{ skills: EnrichedSkill[] }> = ({ skills }) => {
  if (skills.length === 0) return null;
  return (
    <div className="sgold">
      {/* Corner badge + header */}
      <div className="sgold__header">
        <div className="sgold__crown">🏆</div>
        <div>
          <div className="sgold__title">Gold Achievements</div>
          <div className="sgold__sub">Mastered · {skills.length} skill{skills.length !== 1 ? "s" : ""} — no further attempts needed</div>
        </div>
        <div className="sgold__corner-badge">
          <Icon name="badge-gold" size={32} label="" />
        </div>
      </div>

      {/* Skill chips */}
      <div className="sgold__list">
        {skills.map((s) => {
          const icon = CATEGORY_ICONS[s.raw.category] ?? "cat-default";
          return (
            <div key={s.raw.id} className="sgold__chip">
              <div className="sgold__chip-icon">
                <Icon name={icon} size={14} label="" />
              </div>
              <div className="sgold__chip-info">
                <span className="sgold__chip-name">{s.raw.name}</span>
                <span className="sgold__chip-cat">{s.raw.category}</span>
              </div>
              <span className="sgold__chip-medal">🥇</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const SkillsLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSkills();

  const [searchQuery,    setSearchQuery]    = useState("");
  const [activeFilter,   setActiveFilter]   = useState<"all" | "verified" | "unverified">("all");
  const [spotlightSkill, setSpotlightSkill] = useState<EnrichedSkill | null>(null);

  // ── Onboarding nudge popup ─────────────────────────────────────────────────
  // showNudge=true  → modal open
  // showNudge=false → dismissed for this login session
  //
  // Dismissal is stored in sessionStorage keyed to the current access token.
  // This means:
  //   · "Remind me later" hides the popup AND the trigger button for the rest
  //     of this login session.
  //   · On every NEW login (new token) the popup reappears if skills are pending.
  //   · Navigating away and back within the same session keeps it hidden.
  const [showNudge, setShowNudge] = useState<boolean>(false);

  // Derive the dismissal key from the login token so it resets on each login.
  const getNudgeDismissedKey = useCallback((): string => {
    const token = localStorage.getItem("access_token") ?? "anon";
    // Use a short hash of the token — just enough to distinguish login sessions.
    const shortKey = token.slice(-16);
    return `onboarding_nudge_dismissed_${shortKey}`;
  }, []);

  // Once skills data arrives, decide whether to show the nudge.
  // Runs whenever data loads (and on refetch).
  useEffect(() => {
    if (!data || isLoading) return;
    const hasPending = data.onboardingSkillIds.size > 0 &&
      [...data.onboardingSkillIds].some((id) => {
        const skill = enriched.find((s) => s.raw.id === id);
        return skill && !skill.badge && !skill.raw.isGoldVerified;
      });
    if (!hasPending) {
      setShowNudge(false);
      return;
    }
    // Only show if not already dismissed this login session.
    const dismissedKey = getNudgeDismissedKey();
    const alreadyDismissed = sessionStorage.getItem(dismissedKey) === "1";
    if (!alreadyDismissed) setShowNudge(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  const dismissNudge = useCallback(() => {
    // Hide the popup for the rest of this login session.
    // No trigger button is shown — on next login, the popup reappears
    // automatically if there are still unverified onboarding skills.
    const dismissedKey = getNudgeDismissedKey();
    sessionStorage.setItem(dismissedKey, "1");
    setShowNudge(false);
  }, [getNudgeDismissedKey]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const enriched = useMemo<EnrichedSkill[]>(() => {
    if (!data?.skills.length) return [];
    return enrichSkills(data.skills);
  }, [data]);

  // Onboarding skills cross-referenced against the enriched list
  const onboardingSkills = useMemo<EnrichedSkill[]>(() => {
    if (!data?.onboardingSkillIds.size) return [];
    return enriched.filter((s) => data.onboardingSkillIds.has(s.raw.id));
  }, [enriched, data]);

  // If all onboarding skills are now verified, auto-dismiss and clean up localStorage
  useEffect(() => {
    if (onboardingSkills.length === 0) return;
    const allVerified = onboardingSkills.every((s) => s.badge !== null || s.raw.isGoldVerified);
    if (allVerified) {
      localStorage.removeItem("onboarding_skill_ids");
      setShowNudge(false);
    }
  }, [onboardingSkills]);

  const goldSkills = useMemo(
    () => enriched.filter((s) => s.raw.isGoldVerified),
    [enriched]
  );

  const nonGoldEnriched = useMemo(
    () => enriched.filter((s) => !s.raw.isGoldVerified),
    [enriched]
  );

  const filtered = useMemo(() => {
    let list = nonGoldEnriched;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.raw.name.toLowerCase().includes(q) || s.raw.category.toLowerCase().includes(q));
    }
    if (activeFilter === "verified")   list = list.filter((s) => s.badge !== null);
    if (activeFilter === "unverified") list = list.filter((s) => s.badge === null);
    return list;
  }, [nonGoldEnriched, searchQuery, activeFilter]);

  const byTier = useMemo(() => {
    const map = new Map<DemandTier, EnrichedSkill[]>();
    TIERS.forEach((t) => map.set(t.id, []));
    filtered.forEach((s) => map.get(s.tier)!.push(s));
    return map;
  }, [filtered]);

  const recommended = useMemo(
    () => enriched.filter((s) => !s.badge && s.raw.isActive && !s.raw.attemptsExhausted).slice(0, 6),
    [enriched]
  );

  const stats = useMemo(() => {
    const v = enriched.filter((s) => s.badge !== null);
    return {
      total:   enriched.filter((s) => s.raw.isActive).length,
      verified: v.length,
      gold:    v.filter((s) => s.raw.verification?.currentBadge === "GOLD").length,
      silver:  v.filter((s) => s.raw.verification?.currentBadge === "SILVER").length,
      bronze:  v.filter((s) => s.raw.verification?.currentBadge === "BRONZE").length,
      topTier: enriched.filter((s) => s.tier === "hot" || s.tier === "high").length,
    };
  }, [enriched]);

  const activeSpotlight = spotlightSkill ?? filtered[0] ?? null;

  const goToTest = (skill: EnrichedSkill) => {
    if (skill.raw.isGoldVerified || skill.raw.attemptsExhausted || skill.raw.verification?.isLocked) return;
    navigate(`/skills/test/${skill.raw.id}`, {
      state: { skillName: skill.raw.name, skillCategory: skill.raw.category },
    });
  };

  // Navigate to test from the nudge popup
  const handleNudgeVerify = (skill: EnrichedSkill) => {
    setShowNudge(false);
    goToTest(skill);
  };

  if (error) {
    return (
      <PageLayout pageTitle="Skills">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Failed to load skills</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Skills">

      {/* ── Onboarding nudge popup ───────────────────── */}
      {showNudge && !isLoading && onboardingSkills.length > 0 && (
        <OnboardingNudgePopup
          skills={onboardingSkills}
          onVerify={handleNudgeVerify}
          onDismiss={dismissNudge}
        />
      )}

      {/* ── Page header ───────────────────────────── */}
      <PageHeader
        {...PAGE_CONFIGS.skills}
        right={
          !isLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div className="sctrl__search">
                <svg className="sctrl__search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                  <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  className="input sctrl__search-input"
                  placeholder="Search skills…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="sctrl__search-clear" onClick={() => setSearchQuery("")}>
                    <Icon name="close" size={11} label="Clear" />
                  </button>
                )}
              </div>
              <div className="sctrl__chips">
                {(["all", "verified", "unverified"] as const).map((f) => (
                  <button
                    key={f}
                    className={`schip ${activeFilter === f ? "schip--active" : ""}`}
                    onClick={() => setActiveFilter(f)}
                  >
                    {f === "all" ? "All" : f === "verified" ? "Verified" : "Unverified"}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        }
      />

      {/* ── Coverage bar ──────────────────────────── */}
      {!isLoading && <CoverageBar {...stats} />}

      {/* ── Gold achievements panel ────────────────── */}
      {!isLoading && <GoldAchievementsPanel skills={goldSkills} />}

      {/* ── Recommended strip ─────────────────────── */}
      {!isLoading && recommended.length > 0 && activeFilter !== "verified" && !searchQuery && (
        <RecommendedStrip
          items={recommended}
          onSelect={setSpotlightSkill}
          onAction={goToTest}
        />
      )}

      {/* ── Loading ───────────────────────────────── */}
      {isLoading && (
        <div className="ssplit">
          <div className="ssplit__left"><SkeletonSpotlight /></div>
          <div className="ssplit__right slist">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} i={i} />)}
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────── */}
      {!isLoading && (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="cat-default" size={32} label="" /></div>
            <h3>No skills found</h3>
            <p>Try a different search or filter.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ssplit">

            {/* LEFT — sticky spotlight */}
            <div className="ssplit__left">
              {activeSpotlight && (
                <SkillSpotlight
                  key={activeSpotlight.raw.id}
                  skill={activeSpotlight}
                  onAction={() => goToTest(activeSpotlight)}
                />
              )}
            </div>

            {/* RIGHT — ranked list */}
            <div className="ssplit__right">

              {/* Tier sections */}
              {TIERS.map((tier) => {
                const tierSkills = byTier.get(tier.id) ?? [];
                if (tierSkills.length === 0) return null;

                return (
                  <div key={tier.id} className="stier">
                    {/* Tier header — intensity drives opacity, NOT hue */}
                    <div className="stier__header" style={{ opacity: 0.5 + tier.intensity * 0.5 }}>
                      <Icon name={tier.icon} size={11} label="" style={{ color: ACCENT.color }} />
                      <span className="stier__label">{tier.label}</span>
                      <span className="stier__count">{tierSkills.length}</span>
                      <span className="stier__tagline">{tier.tagline}</span>
                    </div>

                    {/* Rows */}
                    <div className="slist">
                      {tierSkills.map((skill) => (
                        <SkillRow
                          key={skill.raw.id}
                          skill={skill}
                          isActive={activeSpotlight?.raw.id === skill.raw.id}
                          onHover={() => setSpotlightSkill(skill)}
                          onClick={() => goToTest(skill)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = `

/* ── Onboarding nudge popup ─────────────────────────────── */
.onb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: onb-fade-in 0.18s ease;
}
@keyframes onb-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.onb-modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: 0 24px 80px rgba(0,0,0,0.40);
  animation: onb-slide-up 0.22s cubic-bezier(0.16,1,0.3,1);
  position: relative;
}
@keyframes onb-slide-up {
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.onb-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--gradient-primary, linear-gradient(90deg, #7B5EA7, #A78BFA));
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
}

/* Header */
.onb-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.onb-header__icon {
  font-size: 1.8rem;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 2px;
}
.onb-header__text { flex: 1; }
.onb-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-1);
}
.onb-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
  margin: 0;
}
.onb-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--text-base);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color 0.12s, background 0.12s;
  line-height: 1;
}
.onb-close:hover {
  background: var(--color-bg-active);
  color: var(--color-text-primary);
}

/* Progress bar */
.onb-progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.onb-progress__track {
  flex: 1;
  height: 5px;
  background: var(--color-bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.onb-progress__fill {
  height: 100%;
  background: var(--color-primary-400);
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
}
.onb-progress__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Section label */
.onb-section { display: flex; flex-direction: column; gap: var(--space-2); }
.onb-section__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* Already verified chips */
.onb-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.onb-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  font-size: var(--text-xs);
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-overlay);
}
.onb-chip--done {
  /* colors injected via inline style from badge config */
}

/* Skill rows */
.onb-skill-list { display: flex; flex-direction: column; gap: var(--space-2); }
.onb-skill-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  transition: border-color 0.12s, background 0.12s;
}
.onb-skill-row:has(.onb-skill-row__btn:not(:disabled)):hover {
  border-color: rgba(155,124,255,0.28);
  background: var(--color-bg-active);
}
.onb-skill-row__icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-glow);
  border: 1px solid rgba(155,124,255,0.18);
  border-radius: var(--radius-md);
  color: var(--color-primary-400);
  flex-shrink: 0;
}
.onb-skill-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.onb-skill-row__name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.onb-skill-row__cat {
  font-size: 10px;
  color: var(--color-text-muted);
}
.onb-skill-row__btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(155,124,255,0.28);
  background: var(--color-primary-glow);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary-400);
  cursor: pointer;
  transition: background 0.12s, filter 0.12s;
  white-space: nowrap;
}
.onb-skill-row__btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.onb-skill-row__btn--locked,
.onb-skill-row__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: none;
}

/* Footer */
.onb-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

/* Trigger button (shown in page header when popup is dismissed) */
.onb-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(155,124,255,0.28);
  background: var(--color-primary-glow);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary-400);
  cursor: pointer;
  transition: filter 0.12s;
  white-space: nowrap;
  animation: onb-pulse 2.5s ease-in-out infinite;
}
.onb-trigger-btn:hover { filter: brightness(1.1); }
@keyframes onb-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(155,124,255,0.20); }
  50%       { box-shadow: 0 0 0 5px rgba(155,124,255,0.00); }
}

/* ── Gold Achievements Panel ───────────────────────────── */
.sgold {
  position: relative;
  background: linear-gradient(135deg, var(--color-gold-bg) 0%, rgba(255,196,0,0.04) 100%);
  border: 1px solid var(--color-gold-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-5);
  overflow: hidden;
}
.sgold::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, var(--color-gold-light), #ffd700, var(--color-gold-light));
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}
.sgold__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.sgold__crown {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}
.sgold__title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-gold-light);
  letter-spacing: -0.01em;
}
.sgold__sub {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.sgold__corner-badge {
  margin-left: auto;
  color: var(--color-gold-light);
  opacity: 0.35;
  flex-shrink: 0;
}
.sgold__list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
  flex-wrap: wrap;
}
.sgold__list::-webkit-scrollbar { display: none; }
.sgold__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px 7px 8px;
  background: var(--color-gold-bg);
  border: 1px solid var(--color-gold-border);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  cursor: default;
}
.sgold__chip-icon {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,196,0,0.12);
  border: 1px solid var(--color-gold-border);
  border-radius: var(--radius-sm);
  color: var(--color-gold-light);
  flex-shrink: 0;
}
.sgold__chip-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sgold__chip-name {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.sgold__chip-cat {
  font-size: 9px;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.sgold__chip-medal {
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Search + filter controls (in PageHeader right slot) ── */
.sctrl__search {
  position: relative;
  width: 220px;
}
.sctrl__search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.sctrl__search-input {
  padding-left: 2rem !important;
  padding-right: 1.8rem !important;
  width: 100%;
}
.sctrl__search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.12s;
}
.sctrl__search-clear:hover { color: var(--color-text-primary); }
.sctrl__chips { display: flex; gap: 6px; }
.schip {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.schip:hover { border-color: var(--color-border-strong); color: var(--color-text-secondary); }
.schip--active {
  background: var(--color-primary-glow);
  border-color: rgba(155,124,255,0.28);
  color: var(--color-primary-400);
}

/* ── Coverage bar ──────────────────────────────────────── */
.scov {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-6);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.scov__left { flex: 1; min-width: 180px; }
.scov__progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}
.scov__label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.scov__pct {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-primary-400);
  line-height: 1;
}
.scov__track {
  height: 5px;
  background: var(--color-bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 6px;
}
.scov__fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary-400);
  transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
}
.scov__sub {
  font-size: 10px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}
.scov__divider {
  width: 1px;
  height: 40px;
  background: var(--color-border-default);
  flex-shrink: 0;
}
.scov__stats { display: flex; gap: var(--space-5); flex-wrap: wrap; }
.scov__stat { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.scov__stat-val {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 800;
  line-height: 1;
  color: var(--color-text-primary);
}
.scov__stat-lbl {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* ── Recommended strip ─────────────────────────────────── */
.srec {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-5);
}
.srec__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.srec__icon {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-glow);
  border: 1px solid rgba(155,124,255,0.22);
  border-radius: var(--radius-md);
  color: var(--color-primary-400);
  flex-shrink: 0;
}
.srec__title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}
.srec__sub {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.srec__list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.srec__list::-webkit-scrollbar { display: none; }
.srec__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s;
  font-family: var(--font-body);
  text-align: left;
}
.srec__chip:hover {
  border-color: rgba(155,124,255,0.30);
  background: var(--color-bg-active);
}
.srec__chip-icon {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-glow);
  border: 1px solid rgba(155,124,255,0.20);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.srec__chip-text { display: flex; flex-direction: column; gap: 1px; }
.srec__chip-name {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}
.srec__chip-meta {
  font-size: 9px;
  color: var(--color-text-muted);
}
.srec__chip-arrow {
  font-size: 12px;
  color: var(--color-primary-400);
  opacity: 0.6;
  flex-shrink: 0;
}

/* ── Split layout ──────────────────────────────────────── */
.ssplit {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--space-6);
  align-items: start;
}
.ssplit__left { position: sticky; top: 80px; }
.ssplit__right { min-width: 0; }

/* ── Skill Spotlight ───────────────────────────────────── */
.sspt {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: relative;
  transition: border-color 0.2s;
}
.sspt--skeleton { opacity: 0.6; }
.sspt__top-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2.5px;
  background: var(--color-primary-400);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  transition: opacity 0.3s;
}
.sspt__meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.sspt__rank {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}
.sspt__tier-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-primary-400);
  transition: opacity 0.3s;
}
.sspt__badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  border: 1px solid;
  margin-left: auto;
}
.sspt__icon-wrap {
  width: 52px; height: 52px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-glow);
  border: 1px solid rgba(155,124,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-400);
}
.sspt__name {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}
.sspt__category {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.sspt__demand {}
.sspt__demand-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}
.sspt__demand-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.sspt__demand-pct {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 800;
}
.sspt__demand-track {
  height: 6px;
  background: var(--color-bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.sspt__demand-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary-400);
  transition: width 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.3s;
}
.sspt__attempts {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}
.sspt__attempts-warn { color: var(--color-warning); }
.sspt__sep {
  height: 1px;
  background: var(--color-border-subtle);
  margin: 0 calc(-1 * var(--space-6));
}
.sspt__cta {
  width: 100%;
  padding: 11px var(--space-5);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
  letter-spacing: -0.01em;
}
.sspt__cta:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.sspt__cta:disabled { opacity: 0.45; cursor: not-allowed; }
.sspt__cta--locked { opacity: 0.45; cursor: not-allowed; }

/* ── Tier sections ─────────────────────────────────────── */
.stier { margin-bottom: var(--space-5); }
.stier__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
  border-left: 2px solid var(--color-primary-400);
  margin-bottom: var(--space-2);
  transition: opacity 0.3s;
}
.stier__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--color-primary-400);
}
.stier__count {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: var(--color-primary-glow);
  border: 1px solid rgba(155,124,255,0.20);
  color: var(--color-primary-400);
}
.stier__tagline {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-left: var(--space-1);
}

/* ── Ranked skill list ─────────────────────────────────── */
.slist {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--color-bg-surface);
}

/* ── Skill row ─────────────────────────────────────────── */
.srow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.srow:last-child { border-bottom: none; }
.srow:hover { background: var(--color-bg-hover); }
.srow--active { background: var(--color-bg-elevated); }
.srow__active-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2.5px;
  background: var(--color-primary-400);
  border-radius: 0 2px 2px 0;
}
.srow__rank {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-disabled);
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
  transition: color 0.12s;
}
.srow__icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border-default);
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: background 0.15s, border-color 0.15s;
}
.srow__info { flex: 1; min-width: 0; }
.srow__name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.srow__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.srow__badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
}
.srow__bar-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  width: 80px;
}
.srow__bar-track {
  flex: 1;
  height: 3px;
  background: var(--color-bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.srow__bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary-400);
  transition: width 0.6s ease, opacity 0.3s;
}
.srow__pct {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  min-width: 28px;
  text-align: right;
  transition: color 0.12s;
}
.srow__cta {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.srow__cta--verify {
  background: var(--color-primary-glow);
  border-color: rgba(155,124,255,0.28);
  color: var(--color-primary-400);
}
.srow__cta--verify:hover { background: var(--color-primary-glow-strong); }
.srow__cta--badge:hover  { filter: brightness(1.1); }
.srow__cta--locked       { opacity: 0.4; cursor: not-allowed; }
.srow__cta:disabled      { opacity: 0.4; cursor: not-allowed; }

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1080px) {
  .ssplit { grid-template-columns: 260px 1fr; }
}
@media (max-width: 800px) {
  .ssplit { grid-template-columns: 1fr; }
  .ssplit__left { position: static; }
  .scov { flex-direction: column; }
  .sctrl__search { width: 100%; }
  .onb-modal { padding: var(--space-4); }
}
@media (max-width: 560px) {
  .scov__stats { gap: var(--space-3); }
  .onb-footer { flex-direction: column-reverse; }
  .onb-footer .btn { width: 100%; }
}
`;

export default SkillsLibraryPage;