/* ============================================================
   DashboardPage.tsx  — XPand  v7.0
   "Arena Header + 3D Card Deck"

   LAYOUT:
   1. ArenaHeader   — Identity Core (from v6, unchanged)
   2. CardDeck      — Horizontal scroll, 3D flip cards:
        · Mission          (priority next action)
        · Market Presence  (visibility score + readiness)
        · Stats            (5 key metrics)
        · Market Intel     (skills market bars)
        · My Skills        (badges)
        · Quick Actions    (next moves)
        · Activity         (log)
   ============================================================ */

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import PageHeader, { PAGE_CONFIGS } from "../../components/ui/PageHeader";
import {
  useDashboard,
  type DashboardData,
  type ActivityItem,
  type MarketSkillItem,
  type SkillBadgeSummary,
} from "../../hooks/user/useDashboard";

import "../../assets/css/Dashboardpage.css";
import { avatarSrc } from "../../components/ui/AvatarPicker";

/* ── Motion presets ──────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

/* ── Prestige tier system ─────────────────────────────────────────────────── */

const PRESTIGE_TIERS = [
  { name: "Prospect",  abbr: "PRSP", min: 0,     color: "#8899AA" },
  { name: "Contender", abbr: "CNTR", min: 500,   color: "#9B7CFF" },
  { name: "Proven",    abbr: "PRVN", min: 1500,  color: "#22D3EE" },
  { name: "Elite",     abbr: "ELIT", min: 4000,  color: "#F5B731" },
  { name: "Titan",     abbr: "TITN", min: 9000,  color: "#FF6B6B" },
  { name: "Legend",    abbr: "LGND", min: 20000, color: "#FF9F43" },
] as const;

function getPrestigeTier(xp: number) {
  for (let i = PRESTIGE_TIERS.length - 1; i >= 0; i--)
    if (xp >= PRESTIGE_TIERS[i].min) return PRESTIGE_TIERS[i];
  return PRESTIGE_TIERS[0];
}

function getNextPrestigeTier(xp: number) {
  for (let i = 0; i < PRESTIGE_TIERS.length; i++)
    if (xp < PRESTIGE_TIERS[i].min) return PRESTIGE_TIERS[i];
  return null;
}

function getPrestigeProgress(xp: number): number {
  const cur  = getPrestigeTier(xp);
  const next = getNextPrestigeTier(xp);
  if (!next) return 1;
  const span = next.min - cur.min;
  return span > 0 ? (xp - cur.min) / span : 1;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Visibility score ────────────────────────────────────────────────────── */

interface VisibilityMetrics {
  score:            number;
  aheadPct:         number;
  isRecruiterReady: boolean;
  label:            string;
  strengths:        Array<{ text: string; type: "strong" | "weak" | "warning" | "info" }>;
}

function computeVisibility(data: DashboardData): VisibilityMetrics {
  const skillPts  = Math.min(data.verifiedSkills * 8,  40);
  const badgePts  = Math.min(data.totalBadges * 5 + data.goldBadges * 5, 30);
  const chalPts   = Math.min(data.completedChallenges * 4, 20);
  const appPts    = Math.min(data.totalApplications * 2, 10);
  const score     = Math.round(skillPts + badgePts + chalPts + appPts);
  const aheadPct  = Math.round(Math.min(Math.pow(score / 100, 0.65) * 100, 99));
  const isRecruiterReady = score >= 50 && data.verifiedSkills >= 3 && data.totalBadges >= 2;

  const strengths: VisibilityMetrics["strengths"] = [];
  if (data.goldBadges > 0)
    strengths.push({ text: `${data.goldBadges} Gold Badge${data.goldBadges > 1 ? "s" : ""} — top credential signal`, type: "strong" });
  else if (data.totalBadges > 0)
    strengths.push({ text: "No Gold Badges yet — silver/bronze don't unlock premium jobs", type: "warning" });
  if (data.verifiedSkills >= 5)
    strengths.push({ text: `${data.verifiedSkills} verified skills — strong proof stack`, type: "strong" });
  else if (data.verifiedSkills >= 2)
    strengths.push({ text: `Only ${data.verifiedSkills} verified skills — add ${5 - data.verifiedSkills} more to stand out`, type: "warning" });
  else
    strengths.push({ text: "Critical: 0–1 verified skills — invisible to smart recruiters", type: "weak" });
  if (data.totalApplications === 0)
    strengths.push({ text: "Zero applications — no market exposure right now", type: "weak" });
  else if (data.acceptedApplications > 0)
    strengths.push({ text: `${data.acceptedApplications} application accepted — momentum building`, type: "info" });
  if (data.activeChallenges > 0)
    strengths.push({ text: `${data.activeChallenges} active challenge${data.activeChallenges > 1 ? "s" : ""} in progress`, type: "info" });

  const label = score >= 80 ? "Highly visible" : score >= 55 ? "Moderately visible" : score >= 30 ? "Low visibility" : "Not visible yet";
  return { score, aheadPct, isRecruiterReady, label, strengths };
}

/* ── Mission engine ──────────────────────────────────────────────────────── */

interface MissionItem {
  id: string; icon: string; eyebrow: string; title: string; desc: string;
  progressPct: number; progressLabel: string; rewardXP: number;
  ctaText: string; ctaPath: string; tension?: string; score: number;
}

function computeMission(data: DashboardData): MissionItem {
  const candidates: MissionItem[] = [];

  if (data.verifiedSkills === 0)
    candidates.push({ id:"first-skill", icon:"🎯", eyebrow:"PRIORITY MISSION",
      title:"Verify your first skill — unlock the job market",
      desc:"You currently have zero verified skills. Recruiters cannot find you. One test changes that.",
      progressPct:0, progressLabel:"0 / 1 skills verified", rewardXP:100,
      ctaText:"Take a Skill Test →", ctaPath:"/skills",
      tension:"You are invisible to every recruiter right now", score:1.0 });

  if (data.goldBadges === 0 && data.verifiedSkills > 0)
    candidates.push({ id:"first-gold", icon:"🥇", eyebrow:"CAREER ACCELERATOR",
      title:"Pass the top test → earn your first Gold Badge",
      desc:"Gold Badges unlock premium job listings and push you to the top of recruiter search results.",
      progressPct:Math.min(data.totalBadges / 3 * 100, 95),
      progressLabel:`${data.totalBadges} badge${data.totalBadges !== 1 ? "s" : ""} earned — Gold is next`,
      rewardXP:200, ctaText:"Earn Gold Badge →", ctaPath:"/skills",
      tension:"Gold unlocks 2× more job matches", score:0.94 });

  if (data.totalApplications === 0 && data.verifiedSkills >= 2)
    candidates.push({ id:"first-apply", icon:"📤", eyebrow:"MARKET ENTRY",
      title:"Apply to your first matched job — enter the arena",
      desc:`You have ${data.verifiedSkills} verified skills. Matching jobs exist. Zero applications = zero outcomes.`,
      progressPct:0, progressLabel:"0 applications sent", rewardXP:50,
      ctaText:"View Matched Jobs →", ctaPath:"/jobs",
      tension:"You are behind candidates who already applied", score:0.85 });

  if (data.activeChallenges > 0)
    candidates.push({ id:"active-challenge", icon:"⚡", eyebrow:"ACTIVE MISSION",
      title:`Finish your challenge — claim +${data.activeChallenges * 40} XP`,
      desc:`${data.activeChallenges} challenge${data.activeChallenges > 1 ? "s" : ""} waiting for you.`,
      progressPct:Math.min((data.completedChallenges / (data.completedChallenges + data.activeChallenges)) * 100, 90),
      progressLabel:`${data.completedChallenges} completed · ${data.activeChallenges} in progress`,
      rewardXP:data.activeChallenges * 40, ctaText:"Go to Challenges →", ctaPath:"/challenges",
      score:0.75 });

  if (data.xpBalance >= 300)
    candidates.push({ id:"spend-xp", icon:"💎", eyebrow:"XP READY TO DEPLOY",
      title:"Unlock a mock interview — practice before the real thing",
      desc:`You have ${data.xpBalance.toLocaleString()} XP. Convert practice into offers.`,
      progressPct:Math.min((data.xpBalance / 500) * 100, 100),
      progressLabel:`${data.xpBalance.toLocaleString()} XP available to spend`,
      rewardXP:0, ctaText:"Visit XP Store →", ctaPath:"/store", score:0.68 });

  if (candidates.length === 0)
    candidates.push({ id:"grow", icon:"📈", eyebrow:"KEEP CLIMBING",
      title:`Add ${Math.max(5 - data.verifiedSkills, 1)} more verified skills`,
      desc:"Each verified skill expands your job matches and lifts your visibility score.",
      progressPct:Math.min((data.verifiedSkills / 10) * 100, 95),
      progressLabel:`${data.verifiedSkills} / 10 target skills`,
      rewardXP:80, ctaText:"Verify a Skill →", ctaPath:"/skills", score:0.5 });

  return candidates.sort((a, b) => b.score - a.score)[0];
}

/* ── Smart actions ───────────────────────────────────────────────────────── */

interface SmartAction { icon: IconName; title: string; sub: string; path: string; glow: string; }

function buildSmartActions(data: DashboardData): SmartAction[] {
  const actions: SmartAction[] = [];
  const topMissingSkill = data.topMarketSkills.find(s => !s.userHasIt);
  actions.push(topMissingSkill
    ? { icon:"challenge-skill", title:`Pass ${topMissingSkill.skillName} Test`, sub:`Unlock ${topMissingSkill.jobCount} more job matches`, path:"/skills", glow:"rgba(155,124,255,0.22)" }
    : { icon:"challenge-skill", title:"Verify Next Skill", sub:"Expand your job eligibility", path:"/skills", glow:"rgba(155,124,255,0.22)" }
  );
  actions.push({
    icon:"work",
    title: data.totalApplications === 0 ? "Apply to 3 Matching Jobs" : `Apply to ${Math.max(3 - data.totalApplications, 1)} More Jobs`,
    sub: data.totalApplications === 0 ? "Zero applications = zero chance right now" : `${data.acceptedApplications} accepted · build momentum`,
    path:"/jobs", glow:"rgba(45,212,160,0.20)",
  });
  actions.push(data.activeChallenges > 0
    ? { icon:"quest", title:`Finish Challenge → +${data.activeChallenges * 40} XP`, sub:`${data.activeChallenges} in progress`, path:"/challenges", glow:"rgba(34,211,238,0.20)" }
    : { icon:"quest", title:"Start a Challenge", sub:"Earn XP + prove skills under pressure", path:"/challenges", glow:"rgba(34,211,238,0.20)" }
  );
  actions.push({
    icon:"xp-spend",
    title: data.xpBalance >= 200 ? `Spend ${data.xpBalance.toLocaleString()} XP` : "Unlock Mock Interview",
    sub: data.xpBalance >= 200 ? "Mock interview · readiness report · priority slot" : "Earn XP to unlock career advantages",
    path:"/store", glow:"rgba(245,183,49,0.22)",
  });
  return actions;
}

/* ── AnimCount ───────────────────────────────────────────────────────────── */

const AnimCount: React.FC<{ value: number; duration?: number }> = ({ value, duration = 800 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const steps = 36;
    const step  = Math.max(1, Math.ceil(value / steps));
    let cur = 0;
    const id = setInterval(() => {
      cur += step;
      if (cur >= value) { setN(value); clearInterval(id); }
      else setN(cur);
    }, duration / steps);
    return () => clearInterval(id);
  }, [value, duration]);
  return <>{n.toLocaleString()}</>;
};

/* ── XP burst ────────────────────────────────────────────────────────────── */

interface XpBurst { id: number; x: number; y: number; amount: number; }

const XpBurstLayer: React.FC<{ bursts: XpBurst[] }> = ({ bursts }) =>
  createPortal(
    <div className="xp-burst-portal" aria-hidden="true">
      {bursts.map(b => (
        <div key={b.id} className="xp-burst-float" style={{ left: b.x, top: b.y }}>
          +{b.amount} XP
        </div>
      ))}
    </div>,
    document.body
  );

/* ═══════════════════════════════════════════════════════════
   1. ARENA HEADER — Identity Core
   ═══════════════════════════════════════════════════════════ */

const ArenaHeader: React.FC<{ data: DashboardData }> = ({ data }) => {
  const tier     = getPrestigeTier(data.xpBalance);
  const next     = getNextPrestigeTier(data.xpBalance);
  const progress = getPrestigeProgress(data.xpBalance);
  const xpToNext = next ? next.min - data.xpBalance : 0;

  const skillPts = Math.min(data.verifiedSkills * 8,  40);
  const badgePts = Math.min(data.totalBadges * 5 + data.goldBadges * 5, 30);
  const chalPts  = Math.min(data.completedChallenges * 4, 20);
  const appPts   = Math.min(data.totalApplications * 2, 10);
  const visScore = Math.round(skillPts + badgePts + chalPts + appPts);

  const statusMessage = useMemo(() => {
    if (next && xpToNext <= 200)
      return { text: `You are ${xpToNext} XP away from ${next.name.toUpperCase()}`, cls: "status-urgent" };
    if (data.verifiedSkills === 0)
      return { text: "You are not yet visible to top jobs", cls: "status-danger" };
    if (data.goldBadges === 0)
      return { text: "Earn a Gold Badge to unlock premium job access", cls: "status-warn" };
    if (visScore < 50)
      return { text: `Visibility ${visScore}/100 — boost skills to reach recruiter radar`, cls: "status-warn" };
    return { text: `Rank ${tier.name} · ${visScore}/100 visibility — keep climbing`, cls: "status-ok" };
  }, [data, tier, next, xpToNext, visScore]);

  const R = 52, circ = 2 * Math.PI * R, offset = circ * (1 - progress);

  return (
    <motion.div variants={fadeUp} className="arena-header">
      <div className="arena-id">
        <div className={`arena-status-msg ${statusMessage.cls}`}>
          <span className="arena-status-dot" />
          {statusMessage.text}
        </div>
        <h1 className="arena-name">
          {data.firstName}{" "}
          <span className="arena-name-accent">{data.lastName}</span>
        </h1>
        {data.professionalTitle && <p className="arena-role">{data.professionalTitle}</p>}
        <div className="arena-tags">
          <span className="arena-tag arena-tag-tier" style={{ "--tier-color": tier.color } as React.CSSProperties}>
            {tier.name}
          </span>
          <span className="arena-tag arena-tag-xp">{data.xpBalance.toLocaleString()} XP</span>
          {data.country && <span className="arena-tag arena-tag-loc">{data.country}</span>}
        </div>
      </div>

      <div className="arena-av-hub">
        <div className="arena-av-outer-ring" />
        <svg className="arena-ring-svg" width="124" height="124" viewBox="0 0 124 124">
          <defs>
            <linearGradient id="arenaRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={tier.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={tier.color} />
            </linearGradient>
          </defs>
          <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="62" cy="62" r={R} fill="none" stroke="url(#arenaRingGrad)" strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 62 62)"
            style={{ transition:"stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)", filter:`drop-shadow(0 0 8px ${tier.color}66)` }}
          />
        </svg>
        <div className="arena-av">
          {avatarSrc(data.profilePicture)
            ? <img src={avatarSrc(data.profilePicture)!} alt="avatar" />
            : <span>{data.firstName?.[0]?.toUpperCase() ?? "?"}</span>
          }
        </div>
        <div className="arena-tier-badge" style={{ background: tier.color, color: "#0D0F17" }}>
          {tier.abbr}
        </div>
      </div>

      <div className="arena-xp-stats">
        <div className="arena-xp-primary">
          <span className="arena-xp-value">{data.xpBalance.toLocaleString()}</span>
          <span className="arena-xp-label">Total XP</span>
        </div>
        <div className="arena-xp-row">
          <span className="arena-xp-sub-label">This week</span>
          <span className="arena-xp-sub-value">+{data.xpGainedThisWeek.toLocaleString()}</span>
        </div>
        <div className="arena-xp-progress-wrap">
          <div className="arena-xp-progress-track">
            <div className="arena-xp-progress-fill" style={{ width:`${Math.round(progress * 100)}%`, background: tier.color }} />
          </div>
          <span className="arena-xp-next-hint">
            {next ? `${xpToNext.toLocaleString()} XP → ${next.name}` : "Max Prestige"}
          </span>
        </div>
        <div className="arena-vis-row">
          <span className="arena-vis-label">Visibility</span>
          <span className="arena-vis-score" style={{ color: visScore >= 50 ? "#2DD4A0" : visScore >= 30 ? "#F5B731" : "#F87171" }}>
            {visScore}/100
          </span>
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   2. 3D FLIP CARD SHELL
   ═══════════════════════════════════════════════════════════ */

interface ExpandCardProps {
  accentColor:  string;
  glowColor:    string;
  icon:         React.ReactNode;
  eyebrow:      string;
  frontSummary: React.ReactNode;
  back:         React.ReactNode;
  width?:       number;
  animDelay?:   number;
}

const ExpandCard: React.FC<ExpandCardProps> = ({
  accentColor, glowColor, icon, eyebrow, frontSummary, back, width = 280, animDelay = 0,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="fc-scene"
      style={{ "--fc-accent": accentColor, "--fc-glow": glowColor } as React.CSSProperties}
      variants={fadeUp}
      transition={{ delay: animDelay }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className={`fc-card ${expanded ? "fc-expanded" : ""}`}>
        <div className="fc-top-beam" />
        <div className="fc-corner-glow" />

        {/* FRONT — always visible */}
        <div className="fc-face fc-front">
          <div className="fc-header">
            <span className="fc-icon">{icon}</span>
            <span className="fc-eyebrow">{eyebrow}</span>
          </div>
          <div className="fc-front-body">{frontSummary}</div>
          <div className="fc-flip-hint">Hover to expand ↓</div>
        </div>

        {/* BACK — revealed on expand */}
        <div className="fc-face fc-back">
          <div className="fc-back-body">{back}</div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Card: Mission ───────────────────────────────────────────────────────── */

const MissionCardFC: React.FC<{
  data: DashboardData;
  navigate: (p: string) => void;
  onBurst: (x: number, y: number, amt: number) => void;
}> = ({ data, navigate, onBurst }) => {
  const mission = useMemo(() => computeMission(data), [data]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const front = (
    <div className="fc-mission-front">
      <div className="fc-mission-icon-big">
        <Icon name="challenge-skill" size={36} label="" />
      </div>
      <p className="fc-mission-eyebrow-sub">{mission.eyebrow}</p>
      <p className="fc-mission-title-sm">{mission.title}</p>
      {mission.rewardXP > 0 && <div className="fc-mission-reward-preview">+{mission.rewardXP} XP</div>}
    </div>
  );

  const back = (
    <div className="fc-mission-back">
      <p className="fc-detail-desc">{mission.desc}</p>
      {mission.tension && <div className="fc-tension">{mission.tension}</div>}
      <div className="fc-progress-wrap">
        <div className="fc-progress-meta">
          <span>{mission.progressLabel}</span>
          <span>{Math.round(mission.progressPct)}%</span>
        </div>
        <div className="fc-progress-track">
          <div className="fc-progress-fill" style={{ width: mounted ? `${mission.progressPct}%` : "0%" }} />
        </div>
      </div>
      <button
        className="fc-cta-btn"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onBurst(r.left + r.width / 2, r.top - 10, mission.rewardXP);
          navigate(mission.ctaPath);
        }}
      >
        {mission.ctaText}
      </button>
    </div>
  );

  return (
    <ExpandCard accentColor="rgba(155,124,255,1)" glowColor="rgba(155,124,255,0.30)"
      icon={<Icon name="challenge-skill" size={18} label="" />} eyebrow="Priority Mission" frontSummary={front} back={back} width={280} animDelay={0} />
  );
};

/* ── Card: Market Presence ───────────────────────────────────────────────── */

const MarketPresenceFC: React.FC<{ data: DashboardData }> = ({ data }) => {
  const vis = useMemo(() => computeVisibility(data), [data]);
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 140); return () => clearTimeout(t); }, []);

  const scoreColor = vis.score >= 70 ? "#2DD4A0" : vis.score >= 40 ? "#F5B731" : "#F87171";

  const front = (
    <div className="fc-presence-front">
      <div className="fc-big-number" style={{ color: scoreColor }}>
        <AnimCount value={vis.score} />
        <span className="fc-big-denom">/100</span>
      </div>
      <p className="fc-label-muted">Visibility Score</p>
      <div className="fc-progress-track" style={{ marginTop: 10 }}>
        <div className="fc-progress-fill" style={{ width: show ? `${vis.score}%` : "0%", background: scoreColor }} />
      </div>
      <p className="fc-ahead-text">Ahead of {vis.aheadPct}% of candidates</p>
    </div>
  );

  const back = (
    <div className="fc-presence-back">
      <div className={`fc-readiness-badge ${vis.isRecruiterReady ? "fc-ready" : "fc-not-ready"}`}>
        <span className={`fc-readiness-dot ${vis.isRecruiterReady ? "dot-on" : "dot-off"}`} />
        {vis.isRecruiterReady ? "Visible to recruiters" : "NOT visible to top jobs"}
      </div>
      <div className="fc-strengths">
        {vis.strengths.slice(0, 4).map((s, i) => (
          <div key={i} className="fc-strength-row">
            <span className={`fc-sdot fc-sdot-${s.type}`} />
            <span className="fc-stext">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ExpandCard accentColor={scoreColor} glowColor={`${scoreColor}44`}
      icon={<Icon name="badge" size={18} label="" />} eyebrow="Market Presence" frontSummary={front} back={back} width={280} animDelay={0.06} />
  );
};

/* ── Card: Stats ─────────────────────────────────────────────────────────── */

const StatsCardFC: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const stats = [
    { label:"Gold Badges",    value:data.goldBadges,         color:"#F5B731", impact: data.goldBadges > 0 ? `Unlocks ${data.goldBadges*8}+ premium jobs` : "Earn one → unlock premium jobs", path:"/skills" },
    { label:"Total Badges",   value:data.totalBadges,        color:"#B8C8D8", impact: data.totalBadges > 0 ? `${data.silverBadges}s · ${data.bronzeBadges}b` : "Zero badges — no proof", path:"/skills" },
    { label:"Verified Skills",value:data.verifiedSkills,     color:"#22D3EE", impact: data.verifiedSkills >= 5 ? "Strong profile" : `Need ${Math.max(5-data.verifiedSkills,0)} more`, path:"/skills" },
    { label:"Applications",   value:data.totalApplications,  color:"#2DD4A0", impact: data.totalApplications === 0 ? "0 = 0 market exposure" : `${data.acceptedApplications} accepted`, path:"/applications" },
    { label:"Active Quests",  value:data.activeChallenges,   color:"#9B7CFF", impact: data.activeChallenges > 0 ? `+${data.activeChallenges*40} XP waiting` : `${data.completedChallenges} done`, path:"/challenges" },
  ];

  const front = (
    <div className="fc-stats-grid">
      {stats.slice(0, 3).map(s => (
        <div key={s.label} className="fc-stat-mini">
          <span className="fc-stat-val" style={{ color: s.color }}><AnimCount value={s.value} /></span>
          <span className="fc-stat-lbl">{s.label}</span>
        </div>
      ))}
    </div>
  );

  const back = (
    <div className="fc-stats-list">
      {stats.map(s => (
        <button key={s.label} className="fc-stat-row" onClick={() => navigate(s.path)}>
          <div className="fc-stat-row-left">
            <span className="fc-stat-row-val" style={{ color: s.color }}>{s.value}</span>
            <span className="fc-stat-row-lbl">{s.label}</span>
          </div>
          <span className="fc-stat-row-impact" style={{ color: s.color }}>{s.impact}</span>
        </button>
      ))}
    </div>
  );

  return (
    <ExpandCard accentColor="#9B7CFF" glowColor="rgba(155,124,255,0.28)"
      icon={<Icon name="badge-gold" size={18} label="" />} eyebrow="Your Stats" frontSummary={front} back={back} width={280} animDelay={0.12} />
  );
};

/* ── Card: Market Intelligence ───────────────────────────────────────────── */

const MarketIntelCardFC: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  const maxJobs = data.topMarketSkills[0]?.jobCount ?? 1;

  const front = (
    <div className="fc-market-front">
      {data.topMarketSkills.slice(0, 3).map(item => (
        <div key={item.skillName} className="fc-market-preview-row">
          <span className="fc-market-skill-name">{item.skillName}</span>
          <span className={`fc-market-have ${item.userHasIt ? "have-yes" : "have-no"}`}>
            {item.userHasIt ? <Icon name="badge" size={12} label="" /> : <Icon name="xp-spend" size={12} label="" />}
          </span>
          <span className="fc-market-jobs-cnt">{item.jobCount}</span>
        </div>
      ))}
      <p className="fc-label-muted" style={{ marginTop: 8 }}>Top skills employers need</p>
    </div>
  );

  const back = (
    <div className="fc-market-back">
      {data.topMarketSkills.map(item => {
        const pct = maxJobs > 0 ? (item.jobCount / maxJobs) * 100 : 0;
        return (
          <div key={item.skillName} className="fc-market-bar-row" onClick={() => !item.userHasIt && navigate("/skills")}>
            <div className="fc-market-bar-head">
              <span className="fc-market-bar-name">{item.skillName}</span>
              <div className="fc-market-bar-meta">
                {item.userHasIt ? <span className="have-yes">✓ Got it</span> : <span className="have-no">Gap ↗</span>}
                <span className="fc-market-jobs-cnt">{item.jobCount} jobs</span>
              </div>
            </div>
            <div className="fc-progress-track">
              <div className={`fc-progress-fill ${item.userHasIt ? "fill-green" : "fill-violet"}`}
                style={{ width: mounted ? `${pct}%` : "0%" }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ExpandCard accentColor="#9B7CFF" glowColor="rgba(155,124,255,0.26)"
      icon={<Icon name="work" size={18} label="" />} eyebrow="Market Intel" frontSummary={front} back={back} width={280} animDelay={0.18} />
  );
};

/* ── Card: My Skills ─────────────────────────────────────────────────────── */

const MySkillsCardFC: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const front = (
    <div className="fc-skills-front">
      {data.topSkills.length === 0 ? (
        <p className="fc-empty-hint">No verified skills yet — your first badge changes everything.</p>
      ) : (
        data.topSkills.slice(0, 3).map(s => {
          const tier = s.badge === "GOLD" ? "gold" : s.badge === "SILVER" ? "silver" : "bronze";
          return (
            <div key={s.skillId} className="fc-skill-preview">
              <span className="fc-skill-name">{s.skillName}</span>
              <span className={`fc-badge-chip fc-badge-${tier}`}>{s.badge}</span>
            </div>
          );
        })
      )}
      {data.topSkills.length > 3 && <p className="fc-more-hint">+{data.topSkills.length - 3} more skills</p>}
    </div>
  );

  const back = (
    <div className="fc-skills-back">
      {data.topSkills.length === 0 ? (
        <div className="fc-empty-state">
          <p className="fc-empty-hint">No verified skills yet.</p>
          <button className="fc-cta-btn" onClick={() => navigate("/skills")}>Start verifying →</button>
        </div>
      ) : (
        <>
          {data.topSkills.map(s => {
            const tier = s.badge === "GOLD" ? "gold" : s.badge === "SILVER" ? "silver" : "bronze";
            return (
              <div key={s.skillId} className="fc-skill-row">
                <div>
                  <span className="fc-skill-name">{s.skillName}</span>
                  <span className="fc-skill-cat">{s.category}</span>
                </div>
                <span className={`fc-badge-chip fc-badge-${tier}`}>{s.badge}</span>
              </div>
            );
          })}
          <button className="fc-link-btn" onClick={() => navigate("/skills")}>All badges →</button>
        </>
      )}
    </div>
  );

  return (
    <ExpandCard accentColor="#22D3EE" glowColor="rgba(34,211,238,0.26)"
      icon={<Icon name="badge-silver" size={18} label="" />} eyebrow="My Skills" frontSummary={front} back={back} width={280} animDelay={0.24} />
  );
};

/* ── Card: Quick Actions ─────────────────────────────────────────────────── */

const QuickActionsCardFC: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const actions = useMemo(() => buildSmartActions(data), [data]);

  const front = (
    <div className="fc-qa-front">
      <p className="fc-qa-headline">Your top move right now:</p>
      <div className="fc-qa-top">
        <span className="fc-qa-top-title">{actions[0].title}</span>
        <span className="fc-qa-top-sub">{actions[0].sub}</span>
      </div>
      <p className="fc-label-muted">{actions.length - 1} more actions below</p>
    </div>
  );

  const back = (
    <div className="fc-qa-back">
      {actions.map((a, i) => (
        <button key={a.path + i} className="fc-qa-btn"
          style={{ "--qa-g": a.glow } as React.CSSProperties}
          onClick={() => navigate(a.path)}>
          <span className="fc-qa-icon"><Icon name={a.icon} size={16} label="" /></span>
          <div>
            <span className="fc-qa-title">{a.title}</span>
            <span className="fc-qa-sub">{a.sub}</span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <ExpandCard accentColor="#F5B731" glowColor="rgba(245,183,49,0.26)"
      icon={<Icon name="xp" size={18} label="" />} eyebrow="Next Moves" frontSummary={front} back={back} width={280} animDelay={0.30} />
  );
};

/* ── Card: Activity Feed ─────────────────────────────────────────────────── */

const ActivityCardFC: React.FC<{ data: DashboardData }> = ({ data }) => {
  const getConfig = (type: string) => {
    if (type === "XP_GAIN")  return { color:"#F5B731", bg:"rgba(245,183,49,0.12)",  border:"rgba(245,183,49,0.26)" };
    if (type === "XP_SPEND") return { color:"#9B7CFF", bg:"rgba(155,124,255,0.10)", border:"rgba(155,124,255,0.22)" };
    return                          { color:"#22D3EE", bg:"rgba(34,211,238,0.08)",  border:"rgba(34,211,238,0.18)" };
  };

  const front = (
    <div className="fc-activity-front">
      {data.recentActivity.length === 0 ? (
        <p className="fc-empty-hint">No activity yet — earn your first XP to start the log.</p>
      ) : (
        data.recentActivity.slice(0, 3).map((item, i) => {
          const cfg = getConfig(item.type);
          return (
            <div key={i} className="fc-act-preview" style={{ "--act-c": cfg.color } as React.CSSProperties}>
              <span className="fc-act-dot" style={{ background: cfg.color }} />
              <span className="fc-act-label">{item.label}</span>
              <span className="fc-act-time">{timeAgo(item.timestamp)}</span>
            </div>
          );
        })
      )}
    </div>
  );

  const back = (
    <div className="fc-activity-back">
      {data.recentActivity.length === 0 ? (
        <p className="fc-empty-hint">No activity yet.</p>
      ) : (
        data.recentActivity.map((item, i) => {
          const cfg = getConfig(item.type);
          const iconName: IconName = item.type === "XP_GAIN" ? "xp" : item.type === "XP_SPEND" ? "xp-spend" : "badge";
          return (
            <div key={i} className="fc-act-row"
              style={{ "--act-c":cfg.color, "--act-bg":cfg.bg, "--act-border":cfg.border } as React.CSSProperties}>
              <div className="fc-act-icon-box"><Icon name={iconName} size={11} label="" /></div>
              <div className="fc-act-info">
                <span className="fc-act-label">{item.label}</span>
                <span className="fc-act-detail">{item.detail}</span>
              </div>
              <span className="fc-act-time-sm">{timeAgo(item.timestamp)}</span>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <ExpandCard accentColor="#2DD4A0" glowColor="rgba(45,212,160,0.24)"
      icon={<Icon name="clipboard" size={18} label="" />} eyebrow="Activity Log" frontSummary={front} back={back} width={280} animDelay={0.36} />
  );
};

/* ═══════════════════════════════════════════════════════════
   CARD DECK — Horizontal scroll strip
   ═══════════════════════════════════════════════════════════ */

const CardDeck: React.FC<{
  data: DashboardData;
  navigate: (p: string) => void;
  onBurst: (x: number, y: number, amt: number) => void;
}> = ({ data, navigate, onBurst }) => (
  <motion.div variants={stagger} className="deck-track-wrap">
    <div className="deck-track">
      <MissionCardFC      data={data} navigate={navigate} onBurst={onBurst} />
      <MarketPresenceFC   data={data} />
      <StatsCardFC        data={data} navigate={navigate} />
      <MarketIntelCardFC  data={data} navigate={navigate} />
      <MySkillsCardFC     data={data} navigate={navigate} />
      <QuickActionsCardFC data={data} navigate={navigate} />
      <ActivityCardFC     data={data} />
    </div>
  </motion.div>
);

/* ── Skeleton ────────────────────────────────────────────────────────────── */

const SkeletonDash: React.FC = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
    <div className="dash-skel" style={{ height:148, borderRadius:22 }} />
    <div style={{ display:"flex", gap:14, overflow:"hidden", padding:"14px 24px 60px" }}>
      {[0,1,2,3,4,5,6].map(i => (
        <div key={i} className="dash-skel" style={{ height:220, borderRadius:20, minWidth:280, flexShrink:0 }} />
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   LIVE DASHBOARD
   ═══════════════════════════════════════════════════════════ */

const LiveDash: React.FC<{ data: DashboardData; navigate: (p: string) => void }> = ({ data, navigate }) => {
  const [xpBursts, setXpBursts] = useState<XpBurst[]>([]);
  const burstId = useRef(0);

  const triggerXpBurst = useCallback((x: number, y: number, amt: number) => {
    if (amt <= 0) return;
    const id = ++burstId.current;
    setXpBursts(prev => [...prev, { id, x, y, amount: amt }]);
    setTimeout(() => setXpBursts(prev => prev.filter(b => b.id !== id)), 1500);
  }, []);

  return (
    <motion.div className="dash-root" variants={stagger} initial="hidden" animate="show">
      <ArenaHeader data={data} />
      <CardDeck data={data} navigate={navigate} onBurst={triggerXpBurst} />
      <XpBurstLayer bursts={xpBursts} />
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════════════════ */

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
          <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={refetch}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Dashboard">
      <PageHeader {...PAGE_CONFIGS.dashboard} />
      <div className="dash-scene">
        {isLoading ? <SkeletonDash /> : <LiveDash data={data!} navigate={navigate} />}
      </div>
    </PageLayout>
  );
};

export default DashboardPage;