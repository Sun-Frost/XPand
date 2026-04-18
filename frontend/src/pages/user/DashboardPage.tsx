/* ============================================================
   DashboardPage.tsx  — XPand  v6.0
   "Career Arena Map"

   SECTIONS (in render order):
   1. ArenaHeader        — Identity Core (name, tier, XP status)
   2. CareerMap          — Node-based career progression map (SVG)
   3. CareerPath         — Linear bottom guide: next steps with rewards
   ============================================================ */

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import {
  useDashboard,
  type DashboardData,
} from "../../hooks/user/useDashboard";

import "../../assets/css/Dashboardpage.css";

/* ── Motion presets ──────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show:   { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
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

/* ── Visibility score engine ────────────────────────────────────────────── */

function computeVisibilityScore(data: DashboardData): number {
  const skillPts = Math.min(data.verifiedSkills * 8, 40);
  const badgePts = Math.min(data.totalBadges * 5 + data.goldBadges * 5, 30);
  const chalPts  = Math.min(data.completedChallenges * 4, 20);
  const appPts   = Math.min(data.totalApplications * 2, 10);
  return Math.round(skillPts + badgePts + chalPts + appPts);
}

/* ── Career path step builder ───────────────────────────────────────────── */

interface PathStep {
  id:        string;
  label:     string;
  reward:    string;
  req:       string;
  path:      string;
  done:      boolean;
  isNext:    boolean;
}

function buildCareerPath(data: DashboardData): PathStep[] {
  const steps: PathStep[] = [
    {
      id:     "verify-skill",
      label:  "Verify a Skill",
      reward: "+100 XP",
      req:    "Pass skill test",
      path:   "/skills",
      done:   data.verifiedSkills > 0,
      isNext: false,
    },
    {
      id:     "earn-gold",
      label:  "Earn Gold Badge",
      reward: "+200 XP",
      req:    "1+ verified skill",
      path:   "/skills",
      done:   data.goldBadges > 0,
      isNext: false,
    },
    {
      id:     "complete-challenge",
      label:  "Complete Challenge",
      reward: "+40 XP",
      req:    "Any skill",
      path:   "/challenges",
      done:   data.completedChallenges > 0,
      isNext: false,
    },
    {
      id:     "unlock-jobs",
      label:  "Unlock Jobs",
      reward: "Job Access",
      req:    "3+ skills · 1 badge",
      path:   "/jobs",
      done:   data.verifiedSkills >= 3 && data.totalBadges >= 1,
      isNext: false,
    },
    {
      id:     "apply",
      label:  "Apply & Get Hired",
      reward: "Career",
      req:    "Active job matches",
      path:   "/jobs",
      done:   data.acceptedApplications > 0,
      isNext: false,
    },
  ];

  // Mark the first incomplete step as "next"
  let foundNext = false;
  for (const step of steps) {
    if (!step.done && !foundNext) {
      step.isNext = true;
      foundNext = true;
    }
  }

  return steps;
}

/* ── Node type definitions ───────────────────────────────────────────────── */

type NodeStatus = "completed" | "available" | "locked";
type NodeType   = "skill" | "job" | "challenge" | "reputation";

interface MapNode {
  id:       string;
  label:    string;
  sublabel: string;
  type:     NodeType;
  status:   NodeStatus;
  path:     string;
  reward?:  string;
  req?:     string;
  impact?:  string;
  // layout
  angle:    number;  // degrees from top
  ring:     1 | 2;  // distance ring
}

function buildMapNodes(data: DashboardData): MapNode[] {
  const visScore = computeVisibilityScore(data);

  return [
    /* ── SKILLS BRANCH ── */
    {
      id: "skills-verified",
      label: `${data.verifiedSkills} Skills`,
      sublabel: "Verified",
      type: "skill",
      status: data.verifiedSkills > 0 ? "completed" : "available",
      path: "/skills",
      reward: "+100 XP each",
      req: "Pass skill test",
      impact: "Each skill unlocks more job matches",
      angle: -60,
      ring: 1,
    },
    {
      id: "skills-tests",
      label: "Skill Tests",
      sublabel: "Available now",
      type: "skill",
      status: "available",
      path: "/skills",
      reward: "+80–200 XP",
      req: "None",
      impact: "Pass to earn badges and visibility",
      angle: -85,
      ring: 2,
    },
    {
      id: "skills-locked",
      label: "Advanced Skills",
      sublabel: "Locked",
      type: "skill",
      status: data.verifiedSkills >= 3 ? "available" : "locked",
      path: "/skills",
      reward: "+300 XP",
      req: "3+ verified skills",
      impact: "Opens elite job listings",
      angle: -38,
      ring: 2,
    },

    /* ── JOBS BRANCH ── */
    {
      id: "jobs-available",
      label: `${data.totalApplications > 0 ? data.totalApplications : "0"} Applied`,
      sublabel: "Jobs",
      type: "job",
      status: data.verifiedSkills >= 2 ? (data.totalApplications > 0 ? "completed" : "available") : "locked",
      path: "/jobs",
      reward: "Career access",
      req: "2+ skills",
      impact: "Direct path to offers",
      angle: 60,
      ring: 1,
    },
    {
      id: "jobs-locked",
      label: "Premium Jobs",
      sublabel: "Locked",
      type: "job",
      status: data.goldBadges > 0 ? "available" : "locked",
      path: "/jobs",
      reward: "Top offers",
      req: "Gold Badge required",
      impact: "2× higher-paying roles",
      angle: 82,
      ring: 2,
    },
    {
      id: "jobs-matches",
      label: "Job Matches",
      sublabel: data.verifiedSkills >= 2 ? "Active" : "Needs skills",
      type: "job",
      status: data.verifiedSkills >= 2 ? "available" : "locked",
      path: "/jobs",
      reward: "Instant apply",
      req: "Skill match",
      impact: "Curated to your verified stack",
      angle: 42,
      ring: 2,
    },

    /* ── CHALLENGES BRANCH ── */
    {
      id: "challenges-active",
      label: `${data.activeChallenges} Active`,
      sublabel: "Challenges",
      type: "challenge",
      status: data.activeChallenges > 0 ? "available" : (data.completedChallenges > 0 ? "completed" : "available"),
      path: "/challenges",
      reward: `+${Math.max(data.activeChallenges, 1) * 40} XP`,
      req: "None",
      impact: "Proves skills under real pressure",
      angle: 165,
      ring: 1,
    },
    {
      id: "challenges-completed",
      label: `${data.completedChallenges} Done`,
      sublabel: "Completed",
      type: "challenge",
      status: data.completedChallenges > 0 ? "completed" : "locked",
      path: "/challenges",
      reward: "XP + credibility",
      req: "Attempt challenges",
      impact: "Builds recruiter trust score",
      angle: 148,
      ring: 2,
    },

    /* ── REPUTATION BRANCH ── */
    {
      id: "rep-xp",
      label: `${data.xpBalance.toLocaleString()} XP`,
      sublabel: "Balance",
      type: "reputation",
      status: data.xpBalance > 100 ? "completed" : "available",
      path: "/store",
      reward: "Spendable",
      req: "Earn via actions",
      impact: "Unlocks mock interviews + boosts",
      angle: -160,
      ring: 1,
    },
    {
      id: "rep-visibility",
      label: `${visScore}/100`,
      sublabel: "Visibility",
      type: "reputation",
      status: visScore >= 50 ? "completed" : visScore >= 20 ? "available" : "locked",
      path: "/skills",
      reward: "Recruiter reach",
      req: "Skills + badges",
      impact: "Score 50+ to appear in recruiter searches",
      angle: -140,
      ring: 2,
    },
    {
      id: "rep-tier",
      label: getPrestigeTier(data.xpBalance).name,
      sublabel: "Prestige Tier",
      type: "reputation",
      status: data.xpBalance >= 500 ? "completed" : "available",
      path: "/store",
      reward: "Status + perks",
      req: "Earn XP",
      impact: "Higher tier = more job unlocks",
      angle: -175,
      ring: 2,
    },
  ];
}

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
  const visScore = computeVisibilityScore(data);

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

  const R      = 52;
  const circ   = 2 * Math.PI * R;
  const offset = circ * (1 - progress);

  return (
    <motion.div variants={fadeUp} className="arena-header">
      {/* Left: Status + Identity */}
      <div className="arena-id">
        <div className={`arena-status-msg ${statusMessage.cls}`}>
          <span className="arena-status-dot" />
          {statusMessage.text}
        </div>

        <h1 className="arena-name">
          {data.firstName}{" "}
          <span className="arena-name-accent">{data.lastName}</span>
        </h1>

        {data.professionalTitle && (
          <p className="arena-role">{data.professionalTitle}</p>
        )}

        <div className="arena-tags">
          <span className="arena-tag arena-tag-tier" style={{ "--tier-color": tier.color } as React.CSSProperties}>
            {tier.name}
          </span>
          <span className="arena-tag arena-tag-xp">
            {data.xpBalance.toLocaleString()} XP
          </span>
          {data.country && (
            <span className="arena-tag arena-tag-loc">
              {data.country}
            </span>
          )}
        </div>
      </div>

      {/* Center: Avatar + Ring */}
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
          <circle
            cx="62" cy="62" r={R}
            fill="none"
            stroke={`url(#arenaRingGrad)`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 62 62)"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 8px ${tier.color}66)` }}
          />
        </svg>
        <div className="arena-av">
          {data.profilePicture
            ? <img src={data.profilePicture} alt="avatar" />
            : <span>{data.firstName?.[0]?.toUpperCase() ?? "?"}</span>
          }
        </div>
        <div className="arena-tier-badge" style={{ background: tier.color, color: "#0D0F17" }}>
          {tier.abbr}
        </div>
      </div>

      {/* Right: XP Stats */}
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
            <div
              className="arena-xp-progress-fill"
              style={{ width: `${Math.round(progress * 100)}%`, background: tier.color }}
            />
          </div>
          <span className="arena-xp-next-hint">
            {next ? `${xpToNext.toLocaleString()} XP → ${next.name}` : "Max Prestige"}
          </span>
        </div>
        <div className="arena-vis-row">
          <span className="arena-vis-label">Visibility</span>
          <span
            className="arena-vis-score"
            style={{ color: visScore >= 50 ? "#2DD4A0" : visScore >= 30 ? "#F5B731" : "#F87171" }}
          >
            {visScore}/100
          </span>
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   2. CAREER MAP — Node-based SVG map
   ═══════════════════════════════════════════════════════════ */

const NODE_TYPE_COLORS: Record<NodeType, { primary: string; glow: string; bg: string }> = {
  skill:      { primary: "#9B7CFF", glow: "rgba(155,124,255,0.4)", bg: "rgba(155,124,255,0.12)" },
  job:        { primary: "#2DD4A0", glow: "rgba(45,212,160,0.4)",  bg: "rgba(45,212,160,0.10)" },
  challenge:  { primary: "#F5B731", glow: "rgba(245,183,49,0.4)",  bg: "rgba(245,183,49,0.10)" },
  reputation: { primary: "#22D3EE", glow: "rgba(34,211,238,0.4)",  bg: "rgba(34,211,238,0.10)" },
};

const NODE_STATUS_OPACITY: Record<NodeStatus, number> = {
  completed: 1,
  available: 0.85,
  locked: 0.30,
};

interface TooltipData {
  node:    MapNode;
  x:       number;
  y:       number;
  visible: boolean;
}

const CareerMap: React.FC<{
  data:     DashboardData;
  navigate: (p: string) => void;
}> = ({ data, navigate }) => {
  const nodes = useMemo(() => buildMapNodes(data), [data]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG dimensions
  const W  = 700;
  const H  = 520;
  const CX = W / 2;
  const CY = H / 2 + 10;
  const R1 = 130; // inner ring
  const R2 = 230; // outer ring

  // Convert angle (degrees from top, clockwise) to x/y
  const toXY = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };

  const handleNodeClick = useCallback((node: MapNode, e: React.MouseEvent) => {
    if (node.status === "locked") return;
    navigate(node.path);
  }, [navigate]);

  const handleNodeHover = useCallback((node: MapNode, e: React.MouseEvent<SVGGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgEl = e.currentTarget;
    const svgRect = svgEl.getBoundingClientRect();
    setTooltip({
      node,
      x: svgRect.left - rect.left + svgRect.width / 2,
      y: svgRect.top  - rect.top,
      visible: true,
    });
  }, []);

  const clearTooltip = useCallback(() => setTooltip(null), []);

  // Branch label positions (midpoint of each branch)
  const branches: Array<{ label: string; type: NodeType; angle: number }> = [
    { label: "Skills",     type: "skill",      angle: -60  },
    { label: "Jobs",       type: "job",        angle: 60   },
    { label: "Challenges", type: "challenge",  angle: 160  },
    { label: "Reputation", type: "reputation", angle: -155 },
  ];

  const typeIcon: Record<NodeType, string> = {
    skill: "⚡",
    job: "💼",
    challenge: "🎯",
    reputation: "🏆",
  };

  return (
    <motion.div variants={fadeUp} className="career-map-wrap">
      <div className="career-map-label-row">
        <span className="career-map-eyebrow">CAREER ARENA MAP</span>
        <span className="career-map-hint">Hover nodes for details · Click to act</span>
      </div>

      <div className="career-map-svg-container" ref={svgRef as unknown as React.RefObject<HTMLDivElement>}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="career-map-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Career Arena Map"
        >
          <defs>
            {/* Branch gradients */}
            {branches.map(b => {
              const c = NODE_TYPE_COLORS[b.type];
              return (
                <linearGradient key={b.type} id={`branch-grad-${b.type}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={c.primary} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={c.primary} stopOpacity="0.15" />
                </linearGradient>
              );
            })}

            {/* Center glow */}
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="rgba(155,124,255,0.25)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Arena rings */}
            <radialGradient id="arena-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="rgba(13,15,25,0.0)" />
              <stop offset="100%" stopColor="rgba(13,15,25,0.0)" />
            </radialGradient>
          </defs>

          {/* ── Background arena rings ── */}
          <circle cx={CX} cy={CY} r={R1 + 20} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx={CX} cy={CY} r={R2 + 20} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 10" />

          {/* ── Branch lines from center to nodes ── */}
          {nodes.map(node => {
            const pos = toXY(node.angle, node.ring === 1 ? R1 : R2);
            const c   = NODE_TYPE_COLORS[node.type];
            const op  = NODE_STATUS_OPACITY[node.status];
            return (
              <line
                key={`line-${node.id}`}
                x1={CX} y1={CY}
                x2={pos.x} y2={pos.y}
                stroke={c.primary}
                strokeWidth={node.ring === 1 ? 1.5 : 1}
                strokeOpacity={op * 0.45}
                strokeDasharray={node.status === "locked" ? "4 5" : undefined}
              />
            );
          })}

          {/* ── Ring-1 to Ring-2 connectors (within same type) ── */}
          {branches.map(b => {
            const ring1Nodes = nodes.filter(n => n.type === b.type && n.ring === 1);
            const ring2Nodes = nodes.filter(n => n.type === b.type && n.ring === 2);
            return ring1Nodes.map(r1n =>
              ring2Nodes.map(r2n => {
                const p1 = toXY(r1n.angle, R1);
                const p2 = toXY(r2n.angle, R2);
                const c  = NODE_TYPE_COLORS[b.type];
                return (
                  <line
                    key={`conn-${r1n.id}-${r2n.id}`}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke={c.primary}
                    strokeWidth={0.8}
                    strokeOpacity={0.20}
                    strokeDasharray="3 6"
                  />
                );
              })
            );
          })}

          {/* ── Branch labels ── */}
          {branches.map(b => {
            const midR   = (R1 + R2) / 2;
            const pos    = toXY(b.angle, midR - 10);
            const c      = NODE_TYPE_COLORS[b.type];
            const perpAngle = ((b.angle - 90) * Math.PI) / 180;
            const perpX  = -Math.sin(perpAngle) * 18;
            const perpY  =  Math.cos(perpAngle) * 18;
            return (
              <text
                key={`blabel-${b.type}`}
                x={pos.x + perpX}
                y={pos.y + perpY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={c.primary}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                letterSpacing="0.10em"
                textDecoration="none"
                opacity="0.55"
                style={{ textTransform: "uppercase", pointerEvents: "none" }}
              >
                {typeIcon[b.type]} {b.label.toUpperCase()}
              </text>
            );
          })}

          {/* ── CENTER NODE — The User ── */}
          <g>
            {/* Center glow */}
            <circle cx={CX} cy={CY} r={55} fill="url(#center-glow)" />
            <circle cx={CX} cy={CY} r={42} fill="rgba(13,15,23,0.95)" stroke="rgba(155,124,255,0.35)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r={42} fill="none" stroke="rgba(155,124,255,0.12)" strokeWidth="10" />

            {/* Pulsing aura */}
            <circle cx={CX} cy={CY} r={46} fill="none" stroke="rgba(155,124,255,0.18)" strokeWidth="1.5">
              <animate attributeName="r" values="44;52;44" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite" />
            </circle>

            <text
              x={CX} y={CY - 7}
              textAnchor="middle"
              fill="rgba(255,255,255,0.95)"
              fontSize="11"
              fontFamily="var(--font-display)"
              fontWeight="800"
              letterSpacing="-0.01em"
              style={{ pointerEvents: "none" }}
            >
              YOU
            </text>
            <text
              x={CX} y={CY + 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="7"
              fontFamily="var(--font-mono)"
              letterSpacing="0.12em"
              style={{ pointerEvents: "none" }}
            >
              ARENA
            </text>
          </g>

          {/* ── NODES ── */}
          {nodes.map(node => {
            const pos    = toXY(node.angle, node.ring === 1 ? R1 : R2);
            const c      = NODE_TYPE_COLORS[node.type];
            const op     = NODE_STATUS_OPACITY[node.status];
            const r      = node.ring === 1 ? 28 : 24;
            const isLocked = node.status === "locked";
            const isDone   = node.status === "completed";

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                className={`map-node map-node-${node.status}`}
                style={{ cursor: isLocked ? "not-allowed" : "pointer", opacity: op }}
                onClick={e => handleNodeClick(node, e as unknown as React.MouseEvent)}
                onMouseEnter={e => handleNodeHover(node, e as unknown as React.MouseEvent<SVGGElement>)}
                onMouseLeave={clearTooltip}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                aria-label={`${node.label} — ${node.status}`}
              >
                {/* Glow */}
                {!isLocked && (
                  <circle r={r + 8} fill={c.glow} opacity="0.25">
                    {isDone && (
                      <animate attributeName="opacity" values="0.2;0.45;0.2" dur="2.5s" repeatCount="indefinite" />
                    )}
                  </circle>
                )}

                {/* Main circle */}
                <circle
                  r={r}
                  fill={isDone ? c.bg : isLocked ? "rgba(255,255,255,0.04)" : c.bg}
                  stroke={isDone ? c.primary : isLocked ? "rgba(255,255,255,0.10)" : c.primary}
                  strokeWidth={isDone ? 2 : 1.5}
                  strokeDasharray={isLocked ? "4 3" : undefined}
                />

                {/* Completion checkmark for done nodes */}
                {isDone && (
                  <text x={0} y={-8} textAnchor="middle" fill={c.primary} fontSize="9" style={{ pointerEvents: "none" }}>✓</text>
                )}
                {isLocked && (
                  <text x={0} y={-6} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="10" style={{ pointerEvents: "none" }}>🔒</text>
                )}

                {/* Label */}
                <text
                  x={0}
                  y={isDone || isLocked ? 4 : -2}
                  textAnchor="middle"
                  fill={isDone ? c.primary : isLocked ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.90)"}
                  fontSize={node.ring === 1 ? "9" : "8"}
                  fontFamily="var(--font-display)"
                  fontWeight="700"
                  style={{ pointerEvents: "none" }}
                >
                  {node.label}
                </text>
                <text
                  x={0}
                  y={isDone || isLocked ? 13 : 8}
                  textAnchor="middle"
                  fill={isLocked ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.38)"}
                  fontSize="6.5"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.05em"
                  style={{ pointerEvents: "none", textTransform: "uppercase" }}
                >
                  {node.sublabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Tooltip ── */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              className="map-tooltip"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                left: tooltip.x,
                top:  tooltip.y - 10,
                "--tt-c": NODE_TYPE_COLORS[tooltip.node.type].primary,
              } as React.CSSProperties}
            >
              <div className="map-tt-header">
                <span className="map-tt-label">{tooltip.node.label}</span>
                <span className={`map-tt-status map-tt-${tooltip.node.status}`}>{tooltip.node.status}</span>
              </div>
              {tooltip.node.reward && (
                <div className="map-tt-row">
                  <span className="map-tt-key">Reward</span>
                  <span className="map-tt-val map-tt-reward">{tooltip.node.reward}</span>
                </div>
              )}
              {tooltip.node.req && (
                <div className="map-tt-row">
                  <span className="map-tt-key">Requires</span>
                  <span className="map-tt-val">{tooltip.node.req}</span>
                </div>
              )}
              {tooltip.node.impact && (
                <div className="map-tt-impact">{tooltip.node.impact}</div>
              )}
              {tooltip.node.status !== "locked" && (
                <div className="map-tt-cta">Click to open →</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   3. CAREER PATH — Linear next-step guide
   ═══════════════════════════════════════════════════════════ */

const CareerPath: React.FC<{
  data:     DashboardData;
  navigate: (p: string) => void;
}> = ({ data, navigate }) => {
  const steps = useMemo(() => buildCareerPath(data), [data]);

  return (
    <motion.div variants={fadeUp} className="career-path-wrap">
      <div className="career-path-header">
        <span className="career-path-eyebrow">YOUR NEXT MOVES</span>
        <span className="career-path-hint">Follow this path to become hireable</span>
      </div>

      <div className="career-path-track">
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            {/* Step node */}
            <button
              className={`career-step ${step.done ? "step-done" : step.isNext ? "step-next" : "step-pending"}`}
              onClick={() => !step.done && navigate(step.path)}
              aria-label={step.label}
              disabled={step.done}
            >
              <div className="step-icon">
                {step.done ? "✓" : step.isNext ? "▶" : (i + 1).toString()}
              </div>
              <div className="step-body">
                <span className="step-label">{step.label}</span>
                <span className="step-reward">{step.reward}</span>
                <span className="step-req">{step.req}</span>
              </div>
            </button>

            {/* Connector arrow */}
            {i < steps.length - 1 && (
              <div className={`career-connector ${step.done ? "conn-done" : "conn-pending"}`}>
                <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
                  <path d="M0 8 H28 M24 2 L34 8 L24 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

/* ── Skeleton ────────────────────────────────────────────────────────────── */

const SkeletonDash: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div className="dash-skel" style={{ height: 148, borderRadius: 22 }} />
    <div className="dash-skel" style={{ height: 520, borderRadius: 22 }} />
    <div className="dash-skel" style={{ height: 120, borderRadius: 18 }} />
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
    <motion.div
      className="dash-root"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* 1. Identity Core */}
      <ArenaHeader data={data} />

      {/* 2. Career Map */}
      <CareerMap data={data} navigate={navigate} />

      {/* 3. Career Path */}
      <CareerPath data={data} navigate={navigate} />

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
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={refetch}>
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Dashboard">
      <div className="dash-scene">
        {isLoading ? <SkeletonDash /> : <LiveDash data={data!} navigate={navigate} />}
      </div>
    </PageLayout>
  );
};

export default DashboardPage;