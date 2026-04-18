import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon } from "../../components/ui/Icon";
import { useReadinessReport } from "../../hooks/user/useStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders raw Gemini prose. Detects common patterns:
 *   - Lines starting with "1." "2." etc → numbered list items
 *   - Lines starting with "- " or "• " → bullet list items
 *   - Lines starting with "#" → section headings
 *   - Lines starting with "**text**" → bold headings
 *   - Blank lines → paragraph breaks
 */
function parseProseToBlocks(text: string): Array<{ type: string; content: string; level?: number }> {
  const lines = text.split("\n");
  const blocks: Array<{ type: string; content: string; level?: number }> = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "spacer", content: "" });
      continue;
    }

    // Markdown headings ## ###
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", content: headingMatch[2].replace(/\*\*/g, ""), level: headingMatch[1].length });
      continue;
    }

    // Bold-only line (acts as heading): **Something**
    const boldOnlyMatch = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (boldOnlyMatch) {
      blocks.push({ type: "heading", content: boldOnlyMatch[1], level: 3 });
      continue;
    }

    // Numbered list: "1. " "2. " etc
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({ type: "numbered", content: numberedMatch[2].replace(/\*\*/g, ""), level: Number(numberedMatch[1]) });
      continue;
    }

    // Bullet list: "- " or "• " or "* "
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", content: bulletMatch[1].replace(/\*\*/g, "") });
      continue;
    }

    // Score line: "Score: 72/100" or "Readiness Score: 72"
    const scoreMatch = line.match(/score[:\s]+(\d+)\s*(?:\/\s*100)?/i);
    if (scoreMatch) {
      blocks.push({ type: "score", content: line.replace(/\*\*/g, ""), level: Number(scoreMatch[1]) });
      continue;
    }

    // Plain paragraph — strip inline ** bold
    blocks.push({ type: "paragraph", content: line.replace(/\*\*([^*]+)\*\*/g, "$1") });
  }

  return blocks;
}

// Extract a numeric score from the prose (first occurrence of N/100 or "Score: N")
function extractScore(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*\/\s*100/) ?? text.match(/score[:\s]+(\d{1,3})/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 0 && n <= 100) return n;
  }
  return null;
}

function scoreColor(n: number): string {
  if (n >= 80) return "#34D399";
  if (n >= 60) return "#60A5FA";
  if (n >= 40) return "#FCD34D";
  return "#F87171";
}

function scoreLabel(n: number): string {
  if (n >= 80) return "Job Ready";
  if (n >= 60) return "Nearly There";
  if (n >= 40) return "In Progress";
  return "Early Stage";
}

// ---------------------------------------------------------------------------
// Score Dial
// ---------------------------------------------------------------------------

const ScoreDial: React.FC<{ score: number }> = ({ score }) => {
  const color = scoreColor(score);
  const size = 160;
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ * 0.75;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#ffffff08" strokeWidth="10"
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-225deg)", transformOrigin: "50% 50%" }}
      />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-225deg)", transformOrigin: "50% 50%", filter: `drop-shadow(0 0 10px ${color}88)`, transition: "stroke-dasharray 1.4s cubic-bezier(.22,1,.36,1)" }}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontFamily="var(--font-mono)" fontWeight="700">
        {score}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.17} textAnchor="middle"
        fill={color} fontSize={size * 0.09} fontFamily="var(--font-mono)" opacity={0.75} letterSpacing="1.5">
        {scoreLabel(score).toUpperCase()}
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Prose renderer
// ---------------------------------------------------------------------------

const ProseBlock: React.FC<{ block: ReturnType<typeof parseProseToBlocks>[number] }> = ({ block }) => {
  switch (block.type) {
    case "spacer":
      return <div className="rr-spacer" />;
    case "heading":
      return (
        <h3
          className={`rr-heading rr-heading--${block.level}`}
          style={block.level === 2 ? { color: "#60A5FA" } : block.level === 3 ? { color: "#A78BFA" } : {}}
        >
          {block.level === 2 && <span className="rr-heading__bar" />}
          {block.content}
        </h3>
      );
    case "numbered":
      return (
        <div className="rr-numbered">
          <span className="rr-numbered__n">{block.level}.</span>
          <p className="rr-numbered__text">{block.content}</p>
        </div>
      );
    case "bullet":
      return (
        <div className="rr-bullet">
          <span className="rr-bullet__dot" />
          <p className="rr-bullet__text">{block.content}</p>
        </div>
      );
    case "score":
      return (
        <div className="rr-score-line">
          <span className="rr-score-line__icon"><Icon name="cat-data" size={18} label="" /></span>
          <span className="rr-score-line__text">{block.content}</span>
        </div>
      );
    case "paragraph":
    default:
      return <p className="rr-para">{block.content}</p>;
  }
};

// ---------------------------------------------------------------------------
// ReadinessReportPage
// ---------------------------------------------------------------------------

const ReadinessReportPage: React.FC = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const pid = purchaseId ? Number(purchaseId) : null;

  const { report, isLoading, isGenerating, error, generate } = useReadinessReport(pid);

  const blocks = useMemo(
    () => (report?.reportContent ? parseProseToBlocks(report.reportContent) : []),
    [report?.reportContent]
  );

  const score = useMemo(
    () => (report?.reportContent ? extractScore(report.reportContent) : null),
    [report?.reportContent]
  );

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageLayout pageTitle="Readiness Report">
        <div className="rr-loading">
          <div className="rr-loading__ring" />
          <p className="rr-loading__text">Fetching your report…</p>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  // ── Not yet generated ────────────────────────────────────────────────────

  if (!report) {
    return (
      <PageLayout pageTitle="Readiness Report">
        <div className="rr-generate-screen">
          <button className="rr-back-btn" onClick={() => navigate("/store")}>← Store</button>

          <div className="rr-generate-card">
            <div className="rr-generate-card__glow" />
            <div className="rr-generate-card__icon"><Icon name="cat-data" size={32} label="" /></div>
            <h2 className="rr-generate-card__title">Career Readiness Report</h2>
            <p className="rr-generate-card__desc">
              Your Gemini AI will analyse your verified skills, identify gaps, and deliver
              a personalised career readiness score with actionable next steps.
            </p>

            <ul className="rr-generate-card__features">
              {["Skill gap analysis against your verified badges", "Career readiness score (0–100)", "Strengths & weaknesses breakdown", "Prioritised recommendations"].map((f, i) => (
                <li key={i} className="rr-generate-card__feature">
                  <span className="rr-generate-card__check"><Icon name="check" size={12} label="" /></span>{f}
                </li>
              ))}
            </ul>

            {error && (
              <div className="rr-error-box">
                <Icon name="warning" size={14} label="" /> {error}
              </div>
            )}

            <button
              className="rr-generate-btn"
              onClick={generate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="rr-generate-btn__inner">
                  <span className="rr-spinner" />
                  Gemini is analysing your profile…
                </span>
              ) : (
                "Generate My Report →"
              )}
            </button>

            {isGenerating && (
              <p className="rr-generate-card__hint">This usually takes 10–20 seconds</p>
            )}
          </div>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  // ── Report ready ─────────────────────────────────────────────────────────

  return (
    <PageLayout pageTitle="Readiness Report">

      {/* Back */}
      <button className="rr-back-btn" onClick={() => navigate("/store")}>← Store</button>

      {/* Header banner */}
      <div className="rr-header">
        <div className="rr-header__noise" aria-hidden="true" />
        <div className="rr-header__content">
          <div className="rr-header__label-row">
            <span className="rr-header__label">CAREER READINESS REPORT</span>
            <span className="rr-header__date">
              Generated {new Date(report.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="rr-header__sub">
            AI-powered analysis of your verified skills, market fit, and career trajectory.
          </p>
          <div className="rr-header__actions">
            <button className="rr-header__action-btn" onClick={generate} disabled={isGenerating}>
              {isGenerating ? <><span className="rr-spinner rr-spinner--sm" /> Regenerating…</> : "↺ Regenerate"}
            </button>
          </div>
        </div>

        {score !== null && (
          <div className="rr-header__dial">
            <span className="rr-header__dial-label">READINESS SCORE</span>
            <ScoreDial score={score} />
          </div>
        )}
      </div>

      {/* Report body */}
      <div className="rr-body">
        <div className="rr-prose">
          {blocks.map((b, i) => <ProseBlock key={i} block={b} />)}
        </div>

        {/* CTA sidebar */}
        <aside className="rr-sidebar">
          <div className="rr-sidebar__card">
            <h3 className="rr-sidebar__title">Next Steps</h3>
            <div className="rr-sidebar__actions">
              <button className="rr-sidebar__btn rr-sidebar__btn--primary" onClick={() => navigate("/skills")}>
                <Icon name="cat-default" size={14} label="" /> Verify Skills →
              </button>
              <button className="rr-sidebar__btn" onClick={() => navigate("/challenges")}>
                <Icon name="xp" size={14} label="" /> Earn XP
              </button>
              <button className="rr-sidebar__btn" onClick={() => navigate("/jobs")}>
                <Icon name="work" size={14} label="" /> Browse Jobs
              </button>
              <button className="rr-sidebar__btn" onClick={() => navigate("/store")}>
                <Icon name="store" size={14} label="" /> Back to Store
              </button>
            </div>
          </div>

          {score !== null && (
            <div className="rr-sidebar__score-card">
              <span className="rr-sidebar__score-label">YOUR SCORE</span>
              <span className="rr-sidebar__score-value" style={{ color: scoreColor(score) }}>
                {score}<span className="rr-sidebar__score-denom">/100</span>
              </span>
              <span className="rr-sidebar__score-grade" style={{ color: scoreColor(score) }}>
                {scoreLabel(score)}
              </span>
            </div>
          )}

          {error && (
            <div className="rr-error-box rr-error-box--sm">
              <Icon name="warning" size={14} label="" /> {error}
            </div>
          )}
        </aside>
      </div>

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* ── Loading ─────────────────────────────────────── */
  .rr-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; min-height:60vh; }
  .rr-loading__ring { width:52px; height:52px; border:3px solid var(--color-border-default); border-top-color:#60A5FA; border-radius:50%; animation:rr-spin .9s linear infinite; }
  .rr-loading__text { font-family:var(--font-mono); font-size:13px; color:var(--color-text-muted); letter-spacing:.06em; }
  @keyframes rr-spin { to { transform:rotate(360deg); } }

  /* ── Back btn ─────────────────────────────────────── */
  .rr-back-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; margin-bottom:24px; border-radius:var(--radius-lg,10px); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:13px; font-family:var(--font-body); color:var(--color-text-secondary); cursor:pointer; transition:all .13s; }
  .rr-back-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  /* ── Generate screen ─────────────────────────────── */
  .rr-generate-screen { display:flex; flex-direction:column; align-items:center; padding:40px 16px; }
  .rr-generate-card { position:relative; max-width:520px; width:100%; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:24px; padding:40px; overflow:hidden; display:flex; flex-direction:column; gap:20px; }
  .rr-generate-card__glow { position:absolute; top:-60px; left:50%; transform:translateX(-50%); width:300px; height:200px; background:radial-gradient(ellipse,#60A5FA14,transparent 70%); pointer-events:none; }
  .rr-generate-card__icon { font-size:3rem; text-align:center; }
  .rr-generate-card__title { font-family:var(--font-display); font-size:22px; font-weight:700; color:var(--color-text-primary); margin:0; text-align:center; }
  .rr-generate-card__desc { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin:0; text-align:center; }
  .rr-generate-card__features { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
  .rr-generate-card__feature { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--color-text-muted); line-height:1.5; }
  .rr-generate-card__check { color:#60A5FA; font-weight:700; flex-shrink:0; }
  .rr-generate-card__hint { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); text-align:center; margin:0; }

  .rr-generate-btn { width:100%; padding:14px; border-radius:12px; border:none; background:linear-gradient(135deg,#1E3A5F,#162132); color:#60A5FA; font-family:var(--font-mono); font-size:14px; font-weight:700; letter-spacing:.06em; cursor:pointer; border:1px solid #60A5FA44; transition:all .15s; }
  .rr-generate-btn:hover:not(:disabled) { background:linear-gradient(135deg,#1a3a60,#1d2e48); box-shadow:0 0 24px #60A5FA22; }
  .rr-generate-btn:disabled { opacity:.6; cursor:not-allowed; }
  .rr-generate-btn__inner { display:flex; align-items:center; justify-content:center; gap:10px; }

  /* ── Header ──────────────────────────────────────── */
  .rr-header { position:relative; display:flex; align-items:center; justify-content:space-between; gap:32px; padding:36px 40px; background:linear-gradient(150deg,#0e1420,#121b2e,#0b1016); border:1px solid #ffffff10; border-radius:20px; overflow:hidden; margin-bottom:28px; }
  .rr-header__noise { position:absolute; inset:0; opacity:.025; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); pointer-events:none; }
  .rr-header__content { flex:1; position:relative; z-index:1; }
  .rr-header__label-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:10px; }
  .rr-header__label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#60A5FA; background:#60A5FA12; border:1px solid #60A5FA33; padding:3px 10px; border-radius:999px; }
  .rr-header__date { font-family:var(--font-mono); font-size:11px; color:#ffffff33; }
  .rr-header__sub { font-size:14px; color:var(--color-text-secondary); line-height:1.6; margin:0 0 16px; max-width:460px; }
  .rr-header__actions { display:flex; gap:8px; }
  .rr-header__action-btn { padding:6px 14px; border-radius:8px; border:1px solid var(--color-border-default); background:var(--color-bg-overlay); font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); cursor:pointer; transition:all .13s; display:flex; align-items:center; gap:6px; }
  .rr-header__action-btn:hover:not(:disabled) { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .rr-header__action-btn:disabled { opacity:.5; cursor:not-allowed; }
  .rr-header__dial { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0; }
  .rr-header__dial-label { font-family:var(--font-mono); font-size:9px; letter-spacing:.2em; color:#ffffff33; }

  /* ── Body layout ─────────────────────────────────── */
  .rr-body { display:grid; grid-template-columns:1fr 240px; gap:24px; align-items:start; }

  /* ── Prose ───────────────────────────────────────── */
  .rr-prose { background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:16px; padding:36px 40px; display:flex; flex-direction:column; gap:0; }

  .rr-spacer { height:12px; }

  .rr-heading { margin:0; line-height:1.3; }
  .rr-heading--1 { font-family:var(--font-display); font-size:22px; font-weight:700; color:var(--color-text-primary); margin-top:8px; }
  .rr-heading--2 { font-family:var(--font-display); font-size:17px; font-weight:700; display:flex; align-items:center; gap:10px; padding:16px 0 6px; border-top:1px solid var(--color-border-subtle); margin-top:8px; }
  .rr-heading--3 { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; padding-top:12px; }
  .rr-heading--4 { font-size:13px; font-weight:600; color:var(--color-text-secondary); padding-top:6px; }
  .rr-heading__bar { display:inline-block; width:3px; height:18px; background:#60A5FA; border-radius:2px; flex-shrink:0; }

  .rr-para { font-size:14px; color:var(--color-text-secondary); line-height:1.75; margin:4px 0; }

  .rr-numbered { display:flex; align-items:flex-start; gap:12px; padding:6px 0; }
  .rr-numbered__n { font-family:var(--font-mono); font-size:12px; font-weight:700; color:#60A5FA; flex-shrink:0; min-width:20px; padding-top:2px; }
  .rr-numbered__text { font-size:14px; color:var(--color-text-secondary); line-height:1.65; margin:0; }

  .rr-bullet { display:flex; align-items:flex-start; gap:12px; padding:4px 0; }
  .rr-bullet__dot { width:6px; height:6px; border-radius:50%; background:#60A5FA; flex-shrink:0; margin-top:7px; }
  .rr-bullet__text { font-size:14px; color:var(--color-text-secondary); line-height:1.65; margin:0; }

  .rr-score-line { display:flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(90deg,#0d1a2e,transparent); border-left:3px solid #60A5FA; border-radius:0 10px 10px 0; margin:8px 0; }
  .rr-score-line__icon { font-size:1.1rem; }
  .rr-score-line__text { font-family:var(--font-mono); font-size:13px; font-weight:700; color:#60A5FA; }

  /* ── Sidebar ─────────────────────────────────────── */
  .rr-sidebar { display:flex; flex-direction:column; gap:16px; position:sticky; top:calc(var(--navbar-height,64px) + 24px); }

  .rr-sidebar__card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:20px; }
  .rr-sidebar__title { font-family:var(--font-display); font-size:14px; font-weight:600; color:var(--color-text-primary); margin:0 0 14px; }
  .rr-sidebar__actions { display:flex; flex-direction:column; gap:8px; }
  .rr-sidebar__btn { width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:13px; font-family:var(--font-body); color:var(--color-text-secondary); cursor:pointer; text-align:left; transition:all .13s; }
  .rr-sidebar__btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .rr-sidebar__btn--primary { background:linear-gradient(135deg,#1E3A5F,#162132); border-color:#60A5FA44; color:#60A5FA; font-weight:600; }
  .rr-sidebar__btn--primary:hover { box-shadow:0 0 16px #60A5FA18; }

  .rr-sidebar__score-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:16px; padding:20px; display:flex; flex-direction:column; align-items:center; gap:4px; }
  .rr-sidebar__score-label { font-family:var(--font-mono); font-size:9px; letter-spacing:.18em; color:var(--color-text-muted); }
  .rr-sidebar__score-value { font-family:var(--font-mono); font-size:44px; font-weight:700; line-height:1; }
  .rr-sidebar__score-denom { font-size:18px; opacity:.5; }
  .rr-sidebar__score-grade { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.1em; }

  /* ── Error ───────────────────────────────────────── */
  .rr-error-box { display:flex; align-items:flex-start; gap:8px; padding:12px 14px; background:#450a0a55; border:1px solid #7f1d1d55; border-radius:10px; font-size:13px; color:#FCA5A5; line-height:1.5; }
  .rr-error-box--sm { font-size:12px; padding:10px 12px; }

  /* ── Spinner ─────────────────────────────────────── */
  .rr-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.2); border-top-color:currentColor; border-radius:50%; animation:rr-spin .6s linear infinite; }
  .rr-spinner--sm { width:11px; height:11px; }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width:860px) {
    .rr-body { grid-template-columns:1fr; }
    .rr-sidebar { position:static; }
    .rr-header { flex-direction:column; padding:24px; }
    .rr-header__dial { align-self:center; }
    .rr-prose { padding:24px 20px; }
  }
`;

export default ReadinessReportPage;