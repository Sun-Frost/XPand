import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import {
  useStore,
  useReadinessReport,
  useMockInterview,
} from "../../hooks/user/useStore";
import type { UserPurchaseResponse } from "../../hooks/user/useStore";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string; glow: string; gradient: string; label: string }> = {
  READINESS_REPORT: { icon: "📊", color: "#60A5FA", glow: "#60A5FA28", gradient: "linear-gradient(135deg,#1E3A5F,#162132)", label: "Readiness Report" },
  MOCK_INTERVIEW:   { icon: "🎙️", color: "#A78BFA", glow: "#A78BFA28", gradient: "linear-gradient(135deg,#2D1B69,#1A1040)", label: "Mock Interview"   },
  PRIORITY_SLOT:    { icon: "⭐",  color: "#FCD34D", glow: "#FCD34D28", gradient: "linear-gradient(135deg,#4A3300,#2A1E00)", label: "Priority Slot"    },
};

const STATUS_META = {
  unused: { label: "Ready", color: "#34D399", bg: "#34D39912", border: "#34D39933" },
  used:   { label: "Used",  color: "#94A3B8", bg: "#94A3B812", border: "#94A3B833" },
};

const FILTERS = [
  { id: "ALL",              label: "All"            },
  { id: "unused",           label: "Unused"         },
  { id: "READINESS_REPORT", label: "Reports"        },
  { id: "MOCK_INTERVIEW",   label: "Interviews"     },
  { id: "PRIORITY_SLOT",    label: "Priority Slots" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared prose parser + renderer
// ─────────────────────────────────────────────────────────────────────────────

function parseBlocks(text: string) {
  const out: Array<{ type: string; content: string; num?: number }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { out.push({ type: "spacer", content: "" }); continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) { out.push({ type: "heading", content: hm[2].replace(/\*\*/g, ""), num: hm[1].length }); continue; }
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) { out.push({ type: "heading", content: bm[1], num: 3 }); continue; }
    const nm = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.:]\s*(.+)$/i);
    if (nm) { out.push({ type: "numbered", content: nm[2].replace(/\*\*/g, ""), num: Number(nm[1]) }); continue; }
    const bl = line.match(/^[-•*]\s+(.+)$/);
    if (bl) { out.push({ type: "bullet", content: bl[1].replace(/\*\*/g, "") }); continue; }
    const sc = line.match(/score[:\s]+(\d+)\s*(?:\/\s*100)?/i);
    if (sc) { out.push({ type: "score", content: line.replace(/\*\*/g, ""), num: Number(sc[1]) }); continue; }
    out.push({ type: "para", content: line.replace(/\*\*([^*]+)\*\*/g, "$1") });
  }
  return out;
}

type Block = ReturnType<typeof parseBlocks>[number];

const PB: React.FC<{ b: Block; accent?: string }> = ({ b, accent = "#60A5FA" }) => {
  switch (b.type) {
    case "spacer":   return <div style={{ height: 10 }} />;
    case "heading":  return (
      <h3 className={`cv-h cv-h--${b.num}`} style={b.num === 2 ? { color: accent } : b.num === 3 ? { color: `${accent}bb` } : {}}>
        {b.num === 2 && <span className="cv-h__bar" style={{ background: accent }} />}
        {b.content}
      </h3>
    );
    case "numbered": return (
      <div className="cv-numbered">
        <span className="cv-numbered__n" style={{ color: accent }}>Q{b.num}.</span>
        <p className="cv-numbered__text">{b.content}</p>
      </div>
    );
    case "bullet":   return (
      <div className="cv-bullet">
        <span className="cv-bullet__dot" style={{ background: accent }} />
        <p className="cv-bullet__text">{b.content}</p>
      </div>
    );
    case "score":    return (
      <div className="cv-score-line" style={{ borderLeftColor: accent }}>
        <span>📊</span>
        <span className="cv-score-line__text" style={{ color: accent }}>{b.content}</span>
      </div>
    );
    default:         return <p className="cv-para">{b.content}</p>;
  }
};

function extractScore(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*\/\s*100/) ?? text.match(/score[:\s]+(\d{1,3})/i);
  if (m) { const n = Number(m[1]); if (n >= 0 && n <= 100) return n; }
  return null;
}
const scoreColor = (n: number) => n >= 80 ? "#34D399" : n >= 60 ? "#60A5FA" : n >= 40 ? "#FCD34D" : "#F87171";
const scoreLabel = (n: number) => n >= 80 ? "Job Ready" : n >= 60 ? "Nearly There" : n >= 40 ? "In Progress" : "Early Stage";

// ─────────────────────────────────────────────────────────────────────────────
// Score Dial
// ─────────────────────────────────────────────────────────────────────────────

const ScoreDial: React.FC<{ score: number }> = ({ score }) => {
  const col = scoreColor(score);
  const size = 120; const r = size / 2 - 10; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff08" strokeWidth="8"
        strokeDasharray={`${circ*.75} ${circ}`} strokeLinecap="round"
        style={{ transform:"rotate(-225deg)", transformOrigin:"50% 50%" }} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="8"
        strokeDasharray={`${(score/100)*circ*.75} ${circ}`} strokeLinecap="round"
        style={{ transform:"rotate(-225deg)", transformOrigin:"50% 50%", filter:`drop-shadow(0 0 8px ${col}88)`, transition:"stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1)" }} />
      <text x={size/2} y={size/2-3} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={size*.22} fontFamily="var(--font-mono)" fontWeight="700">{score}</text>
      <text x={size/2} y={size/2+size*.18} textAnchor="middle" fill={col} fontSize={size*.09} fontFamily="var(--font-mono)" opacity={.75} letterSpacing="1.5">{scoreLabel(score).toUpperCase()}</text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal shell
// ─────────────────────────────────────────────────────────────────────────────

const ModalShell: React.FC<{
  purchase: UserPurchaseResponse;
  wide?: boolean;
  onClose: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}> = ({ purchase, wide, onClose, headerRight, children }) => {
  const meta = TYPE_META[purchase.itemType] ?? TYPE_META.READINESS_REPORT;
  return (
    <div className="cv-backdrop" onClick={onClose}>
      <div className={`cv-modal ${wide ? "cv-modal--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-hdr">
          <div className="cv-modal-hdr__left">
            <span className="cv-modal-hdr__icon">{meta.icon}</span>
            <div>
              <p className="cv-modal-hdr__label" style={{ color: meta.color }}>{meta.label}</p>
              <h2 className="cv-modal-hdr__title">{purchase.itemName}</h2>
              {purchase.associatedJobTitle && <p className="cv-modal-hdr__sub">Role: {purchase.associatedJobTitle}</p>}
            </div>
          </div>
          <div className="cv-modal-hdr__right">
            {headerRight}
            <button className="cv-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="cv-body">{children}</div>
      </div>
    </div>
  );
};

// Spinner
const Spin: React.FC<{ color?: string; text?: string; sub?: string }> = ({ color = "#60A5FA", text, sub }) => (
  <div className="cv-spin-wrap">
    <div className="cv-ring" style={{ borderTopColor: color }} />
    {text && <p className="cv-spin-text">{text}</p>}
    {sub  && <p className="cv-spin-sub">{sub}</p>}
  </div>
);

// Generate card
const GenerateCard: React.FC<{
  icon: string; title: string; desc: string;
  features: string[]; accentColor: string; accentBg: string;
  onGenerate: () => void; isGenerating: boolean; error: string | null;
  hint?: string;
}> = ({ icon, title, desc, features, accentColor, accentBg, onGenerate, isGenerating, error, hint }) => (
  <div className="cv-gen-screen">
    <div className="cv-gen-card">
      <div className="cv-gen-card__glow" style={{ background: `radial-gradient(ellipse,${accentColor}14,transparent 70%)` }} />
      <span className="cv-gen-card__icon">{icon}</span>
      <h3 className="cv-gen-card__title">{title}</h3>
      <p className="cv-gen-card__desc">{desc}</p>
      <ul className="cv-gen-card__list">
        {features.map((f, i) => (
          <li key={i} className="cv-gen-card__li"><span style={{ color: accentColor, fontWeight: 700 }}>✓</span>{f}</li>
        ))}
      </ul>
      {error && <div className="cv-error">⚠ {error}</div>}
      <button
        className="cv-gen-btn"
        style={{ borderColor: `${accentColor}44`, background: accentBg, color: accentColor }}
        onClick={onGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? <><span className="cv-spinner-sm" /> Generating…</> : "Generate →"}
      </button>
      {isGenerating && hint && <p className="cv-gen-hint">{hint}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Report Viewer
// ─────────────────────────────────────────────────────────────────────────────

const ReportViewer: React.FC<{ purchase: UserPurchaseResponse; onClose: () => void }> = ({ purchase, onClose }) => {
  const { report, isLoading, isGenerating, error, generate } = useReadinessReport(purchase.id);
  const blocks = useMemo(() => (report?.reportContent ? parseBlocks(report.reportContent) : []), [report?.reportContent]);
  const score  = useMemo(() => (report?.reportContent ? extractScore(report.reportContent) : null), [report?.reportContent]);

  return (
    <ModalShell
      purchase={purchase}
      onClose={onClose}
      headerRight={report && !isGenerating
        ? <button className="cv-action-btn" onClick={generate}>↺ Regenerate</button>
        : undefined
      }
    >
      {isLoading ? (
        <Spin color="#60A5FA" text="Fetching your report…" />
      ) : !report ? (
        <GenerateCard
          icon="📊" title="Generate Your Report"
          desc="Gemini AI will analyse your verified skills, identify gaps, and deliver a personalised career readiness score."
          features={["Skill gap analysis against your verified badges","Career readiness score (0–100)","Strengths & weaknesses breakdown","Prioritised recommendations"]}
          accentColor="#60A5FA" accentBg="linear-gradient(135deg,#1E3A5F,#162132)"
          onGenerate={generate} isGenerating={isGenerating} error={error}
          hint="This usually takes 10–20 seconds"
        />
      ) : (
        <div className="cv-report-layout">
          {/* Banner */}
          <div className="cv-report-banner">
            <div>
              <span className="cv-report-banner__pill">CAREER READINESS REPORT</span>
              <p className="cv-report-banner__date">Generated {fmtDate(report.generatedAt)}</p>
            </div>
            {score !== null && <ScoreDial score={score} />}
          </div>
          {/* Prose */}
          <div className="cv-prose">
            {blocks.map((b, i) => <PB key={i} b={b} accent="#60A5FA" />)}
          </div>
        </div>
      )}
    </ModalShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Interview Viewer
// ─────────────────────────────────────────────────────────────────────────────

const InterviewViewer: React.FC<{ purchase: UserPurchaseResponse; onClose: () => void }> = ({ purchase, onClose }) => {
  const { interview, phase, answers, isLoading, error, setAnswers, startInterview, submitAnswers } = useMockInterview(purchase.id);
  const feedbackBlocks = useMemo(() => (interview?.aiFeedbackText ? parseBlocks(interview.aiFeedbackText) : []), [interview?.aiFeedbackText]);
  const questionBlocks = useMemo(() => (interview?.questionsText  ? parseBlocks(interview.questionsText)  : []), [interview?.questionsText]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [answers]);

  return (
    <ModalShell purchase={purchase} wide onClose={onClose}>
      {isLoading ? (
        <Spin color="#A78BFA" text="Loading session…" />

      ) : phase === "idle" ? (
        <GenerateCard
          icon="🎙️" title="Ready to Practice?"
          desc="Gemini AI will generate personalised interview questions based on the role and your verified skill profile."
          features={["Questions tailored to job requirements","Technical + behavioural question mix","Answer at your own pace","Detailed AI feedback on all answers"]}
          accentColor="#A78BFA" accentBg="linear-gradient(135deg,#2D1B69,#1A1040)"
          onGenerate={startInterview} isGenerating={false} error={error}
        />

      ) : phase === "starting" ? (
        <Spin color="#A78BFA" text="Gemini is crafting your questions…" sub="Usually takes 10–15 seconds" />

      ) : phase === "answering" && interview?.questionsText ? (
        <div className="cv-answering">
          {/* Questions */}
          <div className="cv-panel">
            <div className="cv-sec-hdr">
              <span className="cv-sec-hdr__bar" style={{ background: "#A78BFA" }} />
              <span className="cv-sec-hdr__title">YOUR QUESTIONS</span>
              <span className="cv-sec-hdr__badge">Gemini AI</span>
            </div>
            <div className="cv-prose">
              {questionBlocks.map((b, i) => <PB key={i} b={b} accent="#A78BFA" />)}
            </div>
          </div>
          {/* Answers */}
          <div className="cv-panel">
            <div className="cv-sec-hdr">
              <span className="cv-sec-hdr__bar" style={{ background: "#34D399" }} />
              <span className="cv-sec-hdr__title">YOUR ANSWERS</span>
            </div>
            <div className="cv-answer-hint">
              Label each answer clearly: <code className="cv-code">Q1: [your answer]</code>
            </div>
            <textarea
              ref={taRef}
              className="cv-ta"
              placeholder={"Q1: [Your answer here]\n\nQ2: [Your answer here]\n\nQ3: ..."}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              rows={12}
            />
            <span className="cv-char-count">{answers.trim().length} chars</span>
            {error && <div className="cv-error">⚠ {error}</div>}
            <button className="cv-submit-btn" onClick={submitAnswers} disabled={answers.trim().length < 20}>
              Submit for Feedback →
            </button>
            <p className="cv-hint-sm">Feedback usually takes 15–25 seconds</p>
          </div>
        </div>

      ) : phase === "submitting" ? (
        <Spin color="#34D399" text="AI is evaluating your answers…" sub="Usually takes 15–25 seconds" />

      ) : phase === "completed" && interview?.aiFeedbackText ? (
        <div className="cv-completed">
          <div className="cv-completed-banner">
            <div>
              <span className="cv-tag">SESSION COMPLETE</span>
              <h3 className="cv-completed-title">AI Feedback Ready</h3>
              {interview.createdAt && <p className="cv-completed-date">Completed {fmtDate(interview.createdAt)}</p>}
            </div>
            <span style={{ fontSize:"2rem", color:"#34D399", filter:"drop-shadow(0 0 10px #34D39966)" }}>✓</span>
          </div>

          <div className="cv-completed-layout">
            {/* Feedback */}
            <div>
              <div className="cv-sec-hdr">
                <span className="cv-sec-hdr__bar" style={{ background: "#A78BFA" }} />
                <span className="cv-sec-hdr__title">AI FEEDBACK</span>
                <span className="cv-sec-hdr__badge">Gemini</span>
              </div>
              <div className="cv-prose cv-prose--card">
                {feedbackBlocks.map((b, i) => <PB key={i} b={b} accent="#A78BFA" />)}
              </div>
            </div>

            {/* Sidebar */}
            <div className="cv-sidebar">
              <div className="cv-sidebar-card">
                <h4 className="cv-sidebar-card__title">📋 Questions</h4>
                <div className="cv-prose">
                  {questionBlocks.filter(b => b.type === "numbered" || b.type === "para")
                    .map((b, i) => <PB key={i} b={b} accent="#60A5FA" />)}
                </div>
              </div>
              {interview.userAnswersText && (
                <div className="cv-sidebar-card">
                  <h4 className="cv-sidebar-card__title">✍️ Your Answers</h4>
                  <div className="cv-answers-scroll">
                    {interview.userAnswersText.split(/\n{2,}/).filter(Boolean).map((chunk, i) => (
                      <div key={i} className="cv-answer-chunk">
                        <p className="cv-answer-chunk__text">{chunk.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : null}
    </ModalShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Card
// ─────────────────────────────────────────────────────────────────────────────

const PurchaseCard: React.FC<{ purchase: UserPurchaseResponse; onView: (p: UserPurchaseResponse) => void }> = ({ purchase, onView }) => {
  const meta   = TYPE_META[purchase.itemType] ?? TYPE_META.READINESS_REPORT;
  const status = purchase.isUsed ? STATUS_META.used : STATUS_META.unused;
  const canView = purchase.itemType === "READINESS_REPORT" || purchase.itemType === "MOCK_INTERVIEW";

  return (
    <div className="col-card" style={{ "--card-color": meta.color, "--card-glow": meta.glow } as React.CSSProperties}>
      <div className="col-card__glow" />
      <div className="col-card__accent" style={{ background: meta.gradient }} />
      <div className="col-card__body">
        <div className="col-card__top">
          <div className="col-card__icon-wrap" style={{ background: meta.gradient }}>
            <span className="col-card__icon">{meta.icon}</span>
          </div>
          <div className="col-card__header">
            <p className="col-card__type" style={{ color: meta.color }}>{meta.label}</p>
            <h3 className="col-card__name">{purchase.itemName}</h3>
          </div>
          <div className="col-card__status" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
            <span className="col-card__status-dot" style={{ background: status.color }} />
            {status.label}
          </div>
        </div>
        <div className="col-card__meta">
          <span className="col-card__meta-item">🗓 Purchased {fmtDate(purchase.purchasedAt)}</span>
          {purchase.associatedJobTitle && <span className="col-card__meta-item">💼 {purchase.associatedJobTitle}</span>}
        </div>
        {purchase.itemType === "PRIORITY_SLOT" && (
          <div className="col-card__slot-info">
            <span>⭐</span>
            <span>{purchase.isUsed ? "Slot redeemed — you were a priority applicant." : "Voucher ready — use it when applying to a job."}</span>
          </div>
        )}
      </div>
      <div className="col-card__footer">
        {canView ? (
          <button className="col-card__view-btn" style={{ color: meta.color, borderColor: `${meta.color}44` }} onClick={() => onView(purchase)}>
            {purchase.itemType === "READINESS_REPORT"
              ? (purchase.isUsed ? "View Report →" : "Open Report →")
              : (purchase.isUsed ? "View Feedback →" : "Start Interview →")}
          </button>
        ) : (
          <span className="col-card__slot-label" style={{ color: purchase.isUsed ? "#94A3B8" : "#FCD34D" }}>
            {purchase.isUsed ? "✓ Redeemed" : "Use when applying"}
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CollectionPage
// ─────────────────────────────────────────────────────────────────────────────

const CollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { purchases, unusedPurchases, isLoading, refetch } = useStore();
  const [activeFilter, setActiveFilter]     = useState("ALL");
  const [viewing, setViewing] = useState<UserPurchaseResponse | null>(null);

  const filtered = purchases.filter((p) => {
    if (activeFilter === "ALL")    return true;
    if (activeFilter === "unused") return !p.isUsed;
    return p.itemType === activeFilter;
  });

  const counts: Record<string, number> = {
    ALL:              purchases.length,
    unused:           unusedPurchases.length,
    READINESS_REPORT: purchases.filter((p) => p.itemType === "READINESS_REPORT").length,
    MOCK_INTERVIEW:   purchases.filter((p) => p.itemType === "MOCK_INTERVIEW").length,
    PRIORITY_SLOT:    purchases.filter((p) => p.itemType === "PRIORITY_SLOT").length,
  };

  return (
    <PageLayout pageTitle="My Collection">

      {/* ── Inline viewers ──────────────────────────────── */}
      {viewing?.itemType === "READINESS_REPORT" && (
        <ReportViewer purchase={viewing} onClose={() => setViewing(null)} />
      )}
      {viewing?.itemType === "MOCK_INTERVIEW" && (
        <InterviewViewer purchase={viewing} onClose={() => setViewing(null)} />
      )}

      <button className="col-back-btn" onClick={() => navigate("/store")}>← Back to Store</button>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="col-hero">
        <div>
          <div className="col-hero__eyebrow"><span>🧳</span><span className="col-hero__eyebrow-text">MY COLLECTION</span></div>
          <h1 className="col-hero__title">Your Purchased Items</h1>
          <p className="col-hero__sub">Click any card to view its content directly here.</p>
        </div>
        {!isLoading && purchases.length > 0 && (
          <div className="col-stats">
            <div className="col-stat"><span className="col-stat__val">{purchases.length}</span><span className="col-stat__lbl">Total</span></div>
            <div className="col-stat-div" />
            <div className="col-stat"><span className="col-stat__val" style={{ color:"#34D399" }}>{unusedPurchases.length}</span><span className="col-stat__lbl">Unused</span></div>
            <div className="col-stat-div" />
            <div className="col-stat"><span className="col-stat__val" style={{ color:"#94A3B8" }}>{purchases.filter(p=>p.isUsed).length}</span><span className="col-stat__lbl">Used</span></div>
          </div>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      {!isLoading && purchases.length > 0 && (
        <div className="col-filters">
          {FILTERS.map((f) => (
            <button key={f.id} className={`col-pill ${activeFilter === f.id ? "col-pill--active" : ""}`} onClick={() => setActiveFilter(f.id)}>
              {f.label}
              {counts[f.id] > 0 && <span className="col-pill__count">{counts[f.id]}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="col-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="col-skeleton">
              <div className="skeleton" style={{ height:4, borderRadius:0 }} />
              <div style={{ padding:20 }}>
                <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                  <div className="skeleton" style={{ width:48, height:48, borderRadius:12, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div className="skeleton" style={{ height:11, width:"45%", marginBottom:7, borderRadius:4 }} />
                    <div className="skeleton" style={{ height:16, width:"70%", borderRadius:4 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height:11, width:"80%", marginBottom:7, borderRadius:4 }} />
                <div className="skeleton" style={{ height:11, width:"55%", borderRadius:4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="col-empty">
          <div className="col-empty__icon">🧳</div>
          <h3 className="col-empty__title">Your collection is empty</h3>
          <p className="col-empty__sub">Head to the XP Store and spend your earned XP on career advantages.</p>
          <button className="col-empty__btn" onClick={() => navigate("/store")}>Browse XP Store →</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-empty">
          <div className="col-empty__icon">🔍</div>
          <h3 className="col-empty__title">No matches</h3>
          <p className="col-empty__sub">Try a different filter.</p>
        </div>
      ) : (
        <div className="col-grid">
          {filtered.map((p) => <PurchaseCard key={p.id} purchase={p} onView={setViewing} />)}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      {!isLoading && (
        <div className="col-footer">
          <button className="col-footer__btn" onClick={() => navigate("/store")}>+ Buy More Items</button>
          <button className="col-footer__btn col-footer__btn--ghost" onClick={refetch}>↺ Refresh</button>
        </div>
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  .col-back-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; margin-bottom:20px; border-radius:var(--radius-lg); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:13px; color:var(--color-text-secondary); cursor:pointer; transition:all var(--duration-fast); }
  .col-back-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  .col-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:28px; flex-wrap:wrap; }
  .col-hero__eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .col-hero__eyebrow-text { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.2em; color:var(--color-text-muted); }
  .col-hero__title { font-family:var(--font-display); font-size:var(--text-3xl); font-weight:800; color:var(--color-text-primary); margin:0 0 6px; letter-spacing:-.02em; }
  .col-hero__sub { font-size:var(--text-sm); color:var(--color-text-muted); margin:0; }

  .col-stats { display:flex; align-items:center; gap:20px; padding:16px 20px; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-xl); flex-shrink:0; }
  .col-stat { display:flex; flex-direction:column; align-items:center; gap:2px; }
  .col-stat__val { font-family:var(--font-mono); font-size:var(--text-2xl); font-weight:700; color:var(--color-text-primary); line-height:1; }
  .col-stat__lbl { font-family:var(--font-mono); font-size:10px; letter-spacing:.1em; color:var(--color-text-muted); text-transform:uppercase; }
  .col-stat-div { width:1px; height:32px; background:var(--color-border-default); }

  .col-filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
  .col-pill { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:var(--radius-full); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:var(--text-sm); color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); white-space:nowrap; }
  .col-pill:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }
  .col-pill--active { background:var(--color-primary-800); border-color:var(--color-primary-500); color:var(--color-primary-300); }
  .col-pill__count { font-family:var(--font-mono); font-size:10px; font-weight:700; padding:1px 6px; border-radius:var(--radius-full); background:var(--color-bg-overlay); }
  .col-pill--active .col-pill__count { background:var(--color-primary-700); color:var(--color-primary-300); }

  .col-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }

  .col-card { position:relative; display:flex; flex-direction:column; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-2xl); overflow:hidden; transition:all var(--duration-base); }
  .col-card:hover { border-color:var(--card-color,var(--color-border-strong)); box-shadow:0 0 28px var(--card-glow,transparent); transform:translateY(-2px); }
  .col-card__glow { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%,var(--card-glow,transparent),transparent 60%); opacity:0; transition:opacity var(--duration-base); pointer-events:none; }
  .col-card:hover .col-card__glow { opacity:1; }
  .col-card__accent { height:4px; }
  .col-card__body { padding:20px; display:flex; flex-direction:column; gap:14px; flex:1; position:relative; }
  .col-card__top { display:flex; align-items:flex-start; gap:12px; }
  .col-card__icon-wrap { width:48px; height:48px; border-radius:var(--radius-xl); display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1px solid rgba(255,255,255,.08); }
  .col-card__icon { font-size:1.4rem; }
  .col-card__header { flex:1; min-width:0; }
  .col-card__type { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.1em; margin:0 0 3px; text-transform:uppercase; }
  .col-card__name { font-family:var(--font-display); font-size:var(--text-base); font-weight:700; color:var(--color-text-primary); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .col-card__status { display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:var(--radius-full); border:1px solid; font-family:var(--font-mono); font-size:10px; font-weight:700; white-space:nowrap; flex-shrink:0; }
  .col-card__status-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
  .col-card__meta { display:flex; flex-direction:column; gap:4px; }
  .col-card__meta-item { font-size:var(--text-xs); color:var(--color-text-muted); }
  .col-card__slot-info { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; background:#FCD34D08; border:1px solid #FCD34D22; border-radius:var(--radius-lg); font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.5; }
  .col-card__footer { padding:0 20px 20px; display:flex; justify-content:flex-end; }
  .col-card__view-btn { padding:8px 16px; border-radius:var(--radius-lg); border:1px solid; background:transparent; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all var(--duration-fast); }
  .col-card__view-btn:hover { filter:brightness(1.2); transform:translateX(2px); }
  .col-card__slot-label { font-family:var(--font-mono); font-size:11px; }

  .col-skeleton { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-2xl); overflow:hidden; }

  .col-empty { display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px 24px; gap:16px; }
  .col-empty__icon { font-size:3rem; }
  .col-empty__title { font-family:var(--font-display); font-size:var(--text-xl); font-weight:700; color:var(--color-text-primary); margin:0; }
  .col-empty__sub { font-size:var(--text-sm); color:var(--color-text-muted); max-width:360px; line-height:var(--leading-relaxed); margin:0; }
  .col-empty__btn { padding:10px 24px; border-radius:var(--radius-lg); border:1px solid var(--color-primary-500); background:var(--color-primary-900); color:var(--color-primary-300); font-family:var(--font-mono); font-size:var(--text-sm); font-weight:700; cursor:pointer; transition:all var(--duration-fast); margin-top:8px; }
  .col-empty__btn:hover { background:var(--color-primary-800); }

  .col-footer { display:flex; justify-content:center; gap:12px; margin-top:40px; padding-top:24px; border-top:1px solid var(--color-border-subtle); }
  .col-footer__btn { padding:10px 24px; border-radius:var(--radius-lg); border:1px solid var(--color-primary-500); background:var(--color-primary-900); color:var(--color-primary-300); font-family:var(--font-mono); font-size:var(--text-sm); font-weight:700; cursor:pointer; transition:all var(--duration-fast); }
  .col-footer__btn:hover { background:var(--color-primary-800); }
  .col-footer__btn--ghost { background:transparent; border-color:var(--color-border-default); color:var(--color-text-muted); }
  .col-footer__btn--ghost:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }

  /* ═══ VIEWER MODAL ══════════════════════════════════ */
  .cv-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.82); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:cv-fadein .15s ease-out; }
  @keyframes cv-fadein { from{opacity:0} to{opacity:1} }

  .cv-modal { position:relative; width:100%; max-width:760px; max-height:90vh; background:var(--color-bg-surface); border:1px solid var(--color-border-strong); border-radius:var(--radius-2xl); overflow:hidden; display:flex; flex-direction:column; box-shadow:0 32px 80px #000000cc; animation:cv-slide .2s cubic-bezier(.34,1.56,.64,1); }
  .cv-modal--wide { max-width:1080px; }
  @keyframes cv-slide { from{transform:translateY(22px);opacity:0} to{transform:translateY(0);opacity:1} }

  .cv-modal-hdr { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 22px; border-bottom:1px solid var(--color-border-subtle); flex-shrink:0; }
  .cv-modal-hdr__left { display:flex; align-items:center; gap:14px; min-width:0; }
  .cv-modal-hdr__icon { font-size:1.8rem; flex-shrink:0; }
  .cv-modal-hdr__label { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.15em; margin:0 0 2px; }
  .cv-modal-hdr__title { font-family:var(--font-display); font-size:var(--text-lg); font-weight:700; color:var(--color-text-primary); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cv-modal-hdr__sub { font-size:var(--text-xs); color:var(--color-text-muted); margin:2px 0 0; }
  .cv-modal-hdr__right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .cv-action-btn { padding:6px 12px; border-radius:var(--radius-lg); border:1px solid var(--color-border-default); background:var(--color-bg-overlay); font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); }
  .cv-action-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
  .cv-close { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-md); border:1px solid var(--color-border-default); background:var(--color-bg-overlay); color:var(--color-text-muted); cursor:pointer; font-size:14px; transition:all var(--duration-fast); flex-shrink:0; }
  .cv-close:hover { background:var(--color-bg-hover); color:var(--color-text-primary); }

  .cv-body { flex:1; overflow-y:auto; padding:22px; }
  .cv-body::-webkit-scrollbar { width:4px; }
  .cv-body::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

  .cv-spin-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; min-height:36vh; }
  .cv-ring { width:48px; height:48px; border:3px solid var(--color-border-default); border-radius:50%; animation:cv-spin .8s linear infinite; }
  @keyframes cv-spin { to{transform:rotate(360deg)} }
  .cv-spin-text { font-family:var(--font-mono); font-size:13px; color:var(--color-text-secondary); margin:0; }
  .cv-spin-sub  { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); margin:0; }
  .cv-spinner-sm { display:inline-block; width:12px; height:12px; border:2px solid rgba(255,255,255,.2); border-top-color:currentColor; border-radius:50%; animation:cv-spin .6s linear infinite; }

  .cv-gen-screen { display:flex; justify-content:center; }
  .cv-gen-card { position:relative; max-width:460px; width:100%; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-2xl); padding:34px; overflow:hidden; display:flex; flex-direction:column; gap:16px; }
  .cv-gen-card__glow { position:absolute; top:-60px; left:50%; transform:translateX(-50%); width:260px; height:160px; pointer-events:none; }
  .cv-gen-card__icon { font-size:2.4rem; text-align:center; }
  .cv-gen-card__title { font-family:var(--font-display); font-size:19px; font-weight:700; color:var(--color-text-primary); margin:0; text-align:center; }
  .cv-gen-card__desc { font-size:13px; color:var(--color-text-secondary); line-height:1.7; margin:0; text-align:center; }
  .cv-gen-card__list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
  .cv-gen-card__li { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--color-text-muted); line-height:1.5; }
  .cv-error { display:flex; align-items:flex-start; gap:8px; padding:10px 13px; background:#450a0a55; border:1px solid #7f1d1d55; border-radius:10px; font-size:13px; color:#FCA5A5; line-height:1.5; }
  .cv-gen-btn { width:100%; padding:13px; border-radius:12px; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; border:1px solid; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .cv-gen-btn:disabled { opacity:.6; cursor:not-allowed; }
  .cv-gen-hint { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); text-align:center; margin:0; }

  .cv-report-layout { display:flex; flex-direction:column; gap:20px; }
  .cv-report-banner { display:flex; align-items:center; justify-content:space-between; padding:22px 26px; background:linear-gradient(150deg,#0e1420,#121b2e); border:1px solid #ffffff0e; border-radius:var(--radius-xl); }
  .cv-report-banner__pill { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.2em; color:#60A5FA; background:#60A5FA12; border:1px solid #60A5FA33; padding:3px 10px; border-radius:999px; display:inline-block; margin-bottom:6px; }
  .cv-report-banner__date { font-family:var(--font-mono); font-size:11px; color:#ffffff33; margin:4px 0 0; }

  .cv-prose { display:flex; flex-direction:column; gap:0; }
  .cv-prose--card { background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:var(--radius-xl); padding:22px 26px; }
  .cv-h { margin:0; line-height:1.3; }
  .cv-h--1 { font-family:var(--font-display); font-size:19px; font-weight:700; color:var(--color-text-primary); padding-top:6px; }
  .cv-h--2 { font-family:var(--font-display); font-size:15px; font-weight:700; display:flex; align-items:center; gap:10px; padding:13px 0 4px; border-top:1px solid var(--color-border-subtle); margin-top:6px; }
  .cv-h--3 { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding-top:10px; color:var(--color-text-muted); }
  .cv-h--4 { font-size:13px; font-weight:600; color:var(--color-text-secondary); padding-top:4px; }
  .cv-h__bar { display:inline-block; width:3px; height:15px; border-radius:2px; flex-shrink:0; }
  .cv-para { font-size:14px; color:var(--color-text-secondary); line-height:1.75; margin:4px 0; }
  .cv-numbered { display:flex; align-items:flex-start; gap:12px; padding:7px 0; }
  .cv-numbered__n { font-family:var(--font-mono); font-size:13px; font-weight:700; flex-shrink:0; min-width:24px; padding-top:1px; }
  .cv-numbered__text { font-size:14px; color:var(--color-text-primary); line-height:1.65; margin:0; font-weight:500; }
  .cv-bullet { display:flex; align-items:flex-start; gap:10px; padding:3px 0; }
  .cv-bullet__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:7px; }
  .cv-bullet__text { font-size:14px; color:var(--color-text-secondary); line-height:1.65; margin:0; }
  .cv-score-line { display:flex; align-items:center; gap:10px; padding:10px 16px; background:linear-gradient(90deg,#0d1a2e,transparent); border-left:3px solid; border-radius:0 10px 10px 0; margin:8px 0; }
  .cv-score-line__text { font-family:var(--font-mono); font-size:13px; font-weight:700; }

  .cv-answering { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
  .cv-panel { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-xl); padding:22px; }
  .cv-sec-hdr { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .cv-sec-hdr__bar { width:3px; height:15px; border-radius:2px; flex-shrink:0; }
  .cv-sec-hdr__title { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.16em; color:var(--color-text-muted); flex:1; }
  .cv-sec-hdr__badge { font-family:var(--font-mono); font-size:9px; padding:2px 8px; border-radius:999px; background:#A78BFA12; border:1px solid #A78BFA33; color:#A78BFA; }
  .cv-answer-hint { font-size:12px; color:var(--color-text-muted); line-height:1.6; padding:10px 12px; background:var(--color-bg-overlay); border-radius:8px; }
  .cv-code { font-family:var(--font-mono); font-size:11px; background:#A78BFA18; border:1px solid #A78BFA33; border-radius:4px; padding:1px 5px; color:#A78BFA; }
  .cv-ta { width:100%; min-height:220px; padding:14px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:12px; color:var(--color-text-primary); font-size:14px; font-family:var(--font-body); line-height:1.7; resize:vertical; outline:none; transition:border-color .13s; box-sizing:border-box; }
  .cv-ta:focus { border-color:#A78BFA66; }
  .cv-char-count { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); }
  .cv-hint-sm { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); text-align:center; margin:0; }
  .cv-submit-btn { width:100%; padding:13px; border-radius:12px; border:1px solid #34D39944; background:linear-gradient(135deg,#064E3B,#032B21); color:#34D399; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .cv-submit-btn:not(:disabled):hover { box-shadow:0 0 20px #34D39920; }
  .cv-submit-btn:disabled { opacity:.4; cursor:not-allowed; }

  .cv-completed { display:flex; flex-direction:column; gap:18px; }
  .cv-completed-banner { display:flex; align-items:center; justify-content:space-between; padding:20px 26px; background:linear-gradient(135deg,#0d2618,#062618); border:1px solid #34D39922; border-radius:var(--radius-xl); }
  .cv-tag { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.2em; color:#34D399; background:#34D39914; border:1px solid #34D39933; padding:3px 10px; border-radius:999px; display:inline-block; margin-bottom:8px; }
  .cv-completed-title { font-family:var(--font-display); font-size:19px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px; }
  .cv-completed-date { font-family:var(--font-mono); font-size:11px; color:#34D39966; margin:0; }
  .cv-completed-layout { display:grid; grid-template-columns:1fr 270px; gap:18px; align-items:start; }
  .cv-sidebar { display:flex; flex-direction:column; gap:12px; }
  .cv-sidebar-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-xl); padding:16px; }
  .cv-sidebar-card__title { font-family:var(--font-display); font-size:13px; font-weight:600; color:var(--color-text-primary); margin:0 0 12px; }
  .cv-answers-scroll { display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; }
  .cv-answers-scroll::-webkit-scrollbar { width:3px; }
  .cv-answers-scroll::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }
  .cv-answer-chunk { padding:10px 12px; background:var(--color-bg-overlay); border-radius:8px; border-left:2px solid #A78BFA44; }
  .cv-answer-chunk__text { font-size:12px; color:var(--color-text-muted); line-height:1.6; margin:0; }

  @media (max-width:900px) {
    .col-hero { flex-direction:column; align-items:flex-start; }
    .col-grid { grid-template-columns:1fr; }
    .cv-answering { grid-template-columns:1fr; }
    .cv-completed-layout { grid-template-columns:1fr; }
    .cv-modal--wide { max-width:100%; }
  }
  @media (max-width:600px) {
    .col-hero__title { font-size:var(--text-2xl); }
    .cv-body { padding:16px; }
    .cv-report-banner { flex-direction:column; gap:14px; }
  }
`;

export default CollectionPage;