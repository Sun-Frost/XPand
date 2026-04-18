// CollectionPage.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
import {
  useStore,
  useReadinessReport,
  useMockInterview,
} from "../../hooks/user/useStore";
import {
  exportReadinessReportPdf,
  exportMockInterviewPdf,
} from "../../utils/pdfExport";
import type { UserPurchaseResponse } from "../../hooks/user/useStore";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: IconName; color: string; glow: string; gradient: string; label: string }> = {
  READINESS_REPORT: { icon: "cat-data", color: "#60A5FA", glow: "#60A5FA28", gradient: "linear-gradient(135deg,#1E3A5F,#162132)", label: "Readiness Report" },
  MOCK_INTERVIEW:   { icon: "interview", color: "#A78BFA", glow: "#A78BFA28", gradient: "linear-gradient(135deg,#2D1B69,#1A1040)", label: "Mock Interview" },
  PRIORITY_SLOT:    { icon: "badge-gold", color: "#FCD34D", glow: "#FCD34D28", gradient: "linear-gradient(135deg,#4A3300,#2A1E00)", label: "Priority Slot" },
};

const STATUS_META = {
  unused: { label: "Ready", color: "#34D399", bg: "#34D39912", border: "#34D39933" },
  used:   { label: "Used",  color: "#94A3B8", bg: "#94A3B812", border: "#94A3B833" },
};

const FILTERS = [
  { id: "ALL",              label: "All" },
  { id: "unused",           label: "Unused" },
  { id: "READINESS_REPORT", label: "Reports" },
  { id: "MOCK_INTERVIEW",   label: "Interviews" },
  { id: "PRIORITY_SLOT",    label: "Priority Slots" },
];

type SortDir = "asc" | "desc";

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
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) { out.push({ type: "heading", content: hm[2].replace(/\*\*/g, ""), num: hm[1].length }); continue; }
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) { out.push({ type: "heading", content: bm[1], num: 3 }); continue; }
    const nm = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.:]\s*(.+)/i);
    if (nm) { out.push({ type: "numbered", content: nm[2].replace(/\*\*/g, ""), num: Number(nm[1]) }); continue; }
    const bl = line.match(/^[-•*]\s+(.+)/);
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
    case "bullet": return (
      <div className="cv-bullet">
        <span className="cv-bullet__dot" style={{ background: accent }} />
        <p className="cv-bullet__text">{b.content}</p>
      </div>
    );
    case "score": return (
      <div className="cv-score-line" style={{ borderLeftColor: accent }}>
        <span><Icon name="cat-data" size={14} label="" /></span>
        <span className="cv-score-line__text" style={{ color: accent }}>{b.content}</span>
      </div>
    );
    default: return <p className="cv-para">{b.content}</p>;
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
            <span className="cv-modal-hdr__icon"><Icon name={meta.icon} size={20} label="" /></span>
            <div>
              <p className="cv-modal-hdr__label" style={{ color: meta.color }}>{meta.label}</p>
              <h2 className="cv-modal-hdr__title">{purchase.itemName}</h2>
              {purchase.associatedJobTitle && <p className="cv-modal-hdr__sub">Role: {purchase.associatedJobTitle}</p>}
            </div>
          </div>
          <div className="cv-modal-hdr__right">
            {headerRight}
            <button className="cv-close" onClick={onClose}><Icon name="close" size={14} label="Close" /></button>
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
  icon: IconName; title: string; desc: string;
  features: string[]; accentColor: string; accentBg: string;
  onGenerate: () => void; isGenerating: boolean; error: string | null;
  hint?: string;
}> = ({ icon, title, desc, features, accentColor, accentBg, onGenerate, isGenerating, error, hint }) => (
  <div className="cv-gen-screen">
    <div className="cv-gen-card">
      <div className="cv-gen-card__glow" style={{ background: `radial-gradient(ellipse,${accentColor}14,transparent 70%)` }} />
      <span className="cv-gen-card__icon"><Icon name={icon} size={24} label="" /></span>
      <h3 className="cv-gen-card__title">{title}</h3>
      <p className="cv-gen-card__desc">{desc}</p>
      <ul className="cv-gen-card__list">
        {features.map((f, i) => (
          <li key={i} className="cv-gen-card__li">
            <span style={{ color: accentColor, fontWeight: 700 }}><Icon name="check" size={12} label="" /></span>{f}
          </li>
        ))}
      </ul>
      {error && <div className="cv-error"><Icon name="warning" size={14} label="" /> {error}</div>}
      <button className="cv-gen-btn" style={{ borderColor: `${accentColor}44`, background: accentBg, color: accentColor }}
        onClick={onGenerate} disabled={isGenerating}>
        {isGenerating ? <><span className="cv-spinner-sm" /> Generating…</> : "Generate →"}
      </button>
      {isGenerating && hint && <p className="cv-gen-hint">{hint}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PDF export button
// ─────────────────────────────────────────────────────────────────────────────

const PdfBtn: React.FC<{ onClick: () => void; loading: boolean; accent?: string }> = ({
  onClick, loading, accent = "#60A5FA"
}) => (
  <button
    className="cv-pdf-btn"
    style={{ borderColor: `${accent}44`, color: accent, background: `${accent}08` }}
    onClick={onClick}
    disabled={loading}
    title="Download as PDF"
  >
    {loading
      ? <><span className="cv-spinner-sm" style={{ borderTopColor: accent }} /> Exporting…</>
      : <>⬇ Export PDF</>}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Report Viewer
// ─────────────────────────────────────────────────────────────────────────────

const ReportViewer: React.FC<{ purchase: UserPurchaseResponse; onClose: () => void }> = ({ purchase, onClose }) => {
  const { report, isLoading, isGenerating, error, generate } = useReadinessReport(purchase.id);
  const [isExporting, setIsExporting] = useState(false);
  const blocks = useMemo(() => (report?.reportContent ? parseBlocks(report.reportContent) : []), [report?.reportContent]);
  const score  = useMemo(() => (report?.reportContent ? extractScore(report.reportContent) : null), [report?.reportContent]);

  const handleExportPdf = useCallback(async () => {
    if (!report?.reportContent) return;
    setIsExporting(true);
    try {
      await exportReadinessReportPdf({
        reportContent: report.reportContent,
        generatedAt: report.generatedAt,
        score,
        itemName: purchase.itemName ?? "Career Readiness Report",
      });
    } catch (e) { console.error("PDF export failed:", e); }
    finally { setIsExporting(false); }
  }, [report, score, purchase.itemName]);

  return (
    <ModalShell purchase={purchase} onClose={onClose}
      headerRight={
        <>
          {report && !isGenerating && (
            <>
              <button className="cv-action-btn" onClick={generate}>↺ Regenerate</button>
              <PdfBtn onClick={handleExportPdf} loading={isExporting} accent="#60A5FA" />
            </>
          )}
        </>
      }
    >
      {isLoading ? (
        <Spin color="#60A5FA" text="Fetching your report…" />
      ) : !report ? (
        <GenerateCard
          icon={"cat-data" as IconName} title="Generate Your Report"
          desc="Gemini AI will analyse your verified skills, identify gaps, and deliver a personalised career readiness score."
          features={["Skill gap analysis against your verified badges","Career readiness score (0–100)","Strengths & weaknesses breakdown","Prioritised recommendations"]}
          accentColor="#60A5FA" accentBg="linear-gradient(135deg,#1E3A5F,#162132)"
          onGenerate={generate} isGenerating={isGenerating} error={error}
          hint="This usually takes 10–20 seconds"
        />
      ) : (
        <div className="cv-report-layout">
          <div className="cv-report-banner">
            <div>
              <span className="cv-report-banner__pill">CAREER READINESS REPORT</span>
              <p className="cv-report-banner__date">Generated {fmtDate(report.generatedAt)}</p>
            </div>
            {score !== null && <ScoreDial score={score} />}
          </div>
          <div className="cv-prose">
            {blocks.map((b, i) => <PB key={i} b={b} accent="#60A5FA" />)}
          </div>
          <div className="cv-export-strip">
            <span className="cv-export-strip__label">Save a copy of this report</span>
            <PdfBtn onClick={handleExportPdf} loading={isExporting} accent="#60A5FA" />
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
  const [isExporting, setIsExporting] = useState(false);
  const feedbackBlocks  = useMemo(() => (interview?.aiFeedbackText ? parseBlocks(interview.aiFeedbackText) : []), [interview?.aiFeedbackText]);
  const questionBlocks  = useMemo(() => (interview?.questionsText  ? parseBlocks(interview.questionsText)  : []), [interview?.questionsText]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [answers]);

  const handleExportPdf = useCallback(async () => {
    if (!interview?.aiFeedbackText) return;
    setIsExporting(true);
    try {
      await exportMockInterviewPdf({
        aiFeedbackText: interview.aiFeedbackText,
        sessionSummary: null,
        questionsText: interview.questionsText ?? "",
        userAnswersText: interview.userAnswersText ?? "",
        answerRecords: [],
        createdAt: interview.createdAt,
        itemName: purchase.itemName ?? "AI Mock Interview",
      });
    } catch (e) { console.error("PDF export failed:", e); }
    finally { setIsExporting(false); }
  }, [interview, purchase.itemName]);

  return (
    <ModalShell purchase={purchase} wide onClose={onClose}
      headerRight={
        phase === "completed" && interview?.aiFeedbackText
          ? <PdfBtn onClick={handleExportPdf} loading={isExporting} accent="#A78BFA" />
          : undefined
      }
    >
      {isLoading ? (
        <Spin color="#A78BFA" text="Loading session…" />
      ) : phase === "idle" ? (
        <GenerateCard
          icon={"interview" as IconName} title="Ready to Practice?"
          desc="Gemini AI will generate personalised interview questions based on the role and your verified skill profile."
          features={["Questions tailored to job requirements","Technical + behavioural question mix","Answer at your own pace","Detailed AI feedback on all answers"]}
          accentColor="#A78BFA" accentBg="linear-gradient(135deg,#2D1B69,#1A1040)"
          onGenerate={startInterview} isGenerating={false} error={error}
        />
      ) : phase === "starting" ? (
        <Spin color="#A78BFA" text="Gemini is crafting your questions…" sub="Usually takes 10–15 seconds" />
      ) : phase === "answering" && interview?.questionsText ? (
        <div className="cv-answering">
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
            {error && <div className="cv-error"><Icon name="warning" size={14} label="" /> {error}</div>}
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <PdfBtn onClick={handleExportPdf} loading={isExporting} accent="#34D399" />
              <span style={{ color: "#34D399" }}><Icon name="check" size={28} label="" /></span>
            </div>
          </div>
          <div className="cv-completed-layout">
            <div>
              <div className="cv-sec-hdr">
                <span className="cv-sec-hdr__bar" style={{ background: "#A78BFA" }} />
                <span className="cv-sec-hdr__title">AI FEEDBACK</span>
                <span className="cv-sec-hdr__badge">Gemini</span>
              </div>
              <div className="cv-prose cv-prose--card">
                {feedbackBlocks.map((b, i) => <PB key={i} b={b} accent="#A78BFA" />)}
              </div>
              <div className="cv-export-strip" style={{ marginTop: 16 }}>
                <span className="cv-export-strip__label">Save your interview feedback</span>
                <PdfBtn onClick={handleExportPdf} loading={isExporting} accent="#A78BFA" />
              </div>
            </div>
            <div className="cv-sidebar">
              <div className="cv-sidebar-card">
                <h4 className="cv-sidebar-card__title"><Icon name="clipboard" size={14} label="" /> Questions</h4>
                <div className="cv-prose">
                  {questionBlocks.filter(b => b.type === "numbered" || b.type === "para")
                    .map((b, i) => <PB key={i} b={b} accent="#60A5FA" />)}
                </div>
              </div>
              {interview.userAnswersText && (
                <div className="cv-sidebar-card">
                  <h4 className="cv-sidebar-card__title"><Icon name="answers" size={14} label="" /> Your Answers</h4>
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

const PurchaseCard: React.FC<{
  purchase: UserPurchaseResponse;
  onView: (p: UserPurchaseResponse) => void;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onArchive: (id: number) => void;
}> = ({ purchase, onView, isSelecting, isSelected, onToggleSelect, onArchive }) => {
  const navigate = useNavigate();
  const meta   = TYPE_META[purchase.itemType] ?? TYPE_META.READINESS_REPORT;
  const status = purchase.isUsed ? STATUS_META.used : STATUS_META.unused;
  const canView = purchase.itemType === "READINESS_REPORT" || purchase.itemType === "MOCK_INTERVIEW";

  const handleView = () => {
    if (isSelecting) { onToggleSelect(purchase.id); return; }
    if (!canView) return;
    if (!purchase.isUsed) {
      if (purchase.itemType === "READINESS_REPORT") navigate(`/store/readiness-report/${purchase.id}`);
      else if (purchase.itemType === "MOCK_INTERVIEW") navigate(`/store/mock-interview/${purchase.id}`);
    } else {
      onView(purchase);
    }
  };

  return (
    <div
      className={`col-card ${isSelected ? "col-card--selected" : ""} ${isSelecting ? "col-card--selecting" : ""}`}
      style={{ "--card-color": meta.color, "--card-glow": meta.glow } as React.CSSProperties}
      onClick={isSelecting ? () => onToggleSelect(purchase.id) : undefined}
    >
      {/* Selection checkbox overlay */}
      {isSelecting && (
        <div className="col-card__checkbox" onClick={(e) => { e.stopPropagation(); onToggleSelect(purchase.id); }}>
          <div className={`col-checkbox ${isSelected ? "col-checkbox--checked" : ""}`}>
            {isSelected && <Icon name="check" size={10} label="" />}
          </div>
        </div>
      )}

      <div className="col-card__glow" />
      <div className="col-card__accent" style={{ background: meta.gradient }} />
      <div className="col-card__body">
        <div className="col-card__top">
          <div className="col-card__icon-wrap" style={{ background: meta.gradient }}>
            <span className="col-card__icon"><Icon name={meta.icon} size={24} label="" /></span>
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
          <span className="col-card__meta-item"><Icon name="date" size={12} label="" /> Purchased {fmtDate(purchase.purchasedAt)}</span>
          {purchase.associatedJobTitle && (
            <span className="col-card__meta-item"><Icon name="work" size={12} label="" /> {purchase.associatedJobTitle}</span>
          )}
        </div>
        {purchase.itemType === "PRIORITY_SLOT" && (
          <div className="col-card__slot-info">
            <span>⭐</span>
            <span>{purchase.isUsed ? "Slot redeemed — you were a priority applicant." : "Voucher ready — use it when applying to a job."}</span>
          </div>
        )}
      </div>
      <div className="col-card__footer">
        {canView && !isSelecting ? (
          <button
            className="col-card__view-btn"
            style={{ color: meta.color, borderColor: `${meta.color}44` }}
            onClick={(e) => { e.stopPropagation(); handleView(); }}
          >
            {purchase.itemType === "READINESS_REPORT"
              ? (purchase.isUsed ? "View Report →" : "Open Report →")
              : (purchase.isUsed ? "View Feedback →" : "Start Interview →")}
          </button>
        ) : !isSelecting ? (
          <span className="col-card__slot-label" style={{ color: purchase.isUsed ? "#94A3B8" : "#FCD34D" }}>
            {purchase.isUsed ? <><Icon name="check" size={12} label="" /> Redeemed</> : "Use when applying"}
          </span>
        ) : null}

        {/* Archive button on card (only when NOT in bulk-select mode) */}
        {!isSelecting && (
          <button
            className="col-card__archive-btn"
            onClick={(e) => { e.stopPropagation(); onArchive(purchase.id); }}
            title="Archive this item"
          >
            <Icon name="archive" size={13} label="Archive" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Archive Confirm Toast / mini-modal
// ─────────────────────────────────────────────────────────────────────────────

const ArchiveToast: React.FC<{
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ count, onConfirm, onCancel }) => (
  <div className="col-archive-toast">
    <span className="col-archive-toast__msg">
      Archive {count} item{count !== 1 ? "s" : ""}?
    </span>
    <div className="col-archive-toast__actions">
      <button className="col-archive-toast__cancel" onClick={onCancel}>Cancel</button>
      <button className="col-archive-toast__confirm" onClick={onConfirm}>Archive</button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CollectionPage
// ─────────────────────────────────────────────────────────────────────────────

const CollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { purchases, unusedPurchases, isLoading, refetch } = useStore();

  // ── filter / sort state
  const [activeFilter, setActiveFilter]   = useState("ALL");
  const [sortDir, setSortDir]             = useState<SortDir>("desc"); // desc = newest first
  const [viewing, setViewing]             = useState<UserPurchaseResponse | null>(null);

  // ── archive state
  const [archivedIds, setArchivedIds]     = useState<Set<number>>(new Set());
  const [showArchived, setShowArchived]   = useState(false);

  // ── bulk-select state
  const [isSelecting, setIsSelecting]     = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set());
  const [pendingArchive, setPendingArchive] = useState(false);

  // ── derived lists
  const visiblePurchases = useMemo(() => {
    return purchases.filter((p) => showArchived ? archivedIds.has(p.id) : !archivedIds.has(p.id));
  }, [purchases, archivedIds, showArchived]);

  const filtered = useMemo(() => {
    const base = visiblePurchases.filter((p) => {
      if (activeFilter === "ALL")    return true;
      if (activeFilter === "unused") return !p.isUsed;
      return p.itemType === activeFilter;
    });
    return [...base].sort((a, b) => {
      const ta = new Date(a.purchasedAt).getTime();
      const tb = new Date(b.purchasedAt).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [visiblePurchases, activeFilter, sortDir]);

  const counts: Record<string, number> = {
    ALL:              visiblePurchases.length,
    unused:           visiblePurchases.filter((p) => !p.isUsed).length,
    READINESS_REPORT: visiblePurchases.filter((p) => p.itemType === "READINESS_REPORT").length,
    MOCK_INTERVIEW:   visiblePurchases.filter((p) => p.itemType === "MOCK_INTERVIEW").length,
    PRIORITY_SLOT:    visiblePurchases.filter((p) => p.itemType === "PRIORITY_SLOT").length,
  };

  // ── select helpers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((p) => p.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setIsSelecting(false); };

  // ── archive helpers
  const archiveSingle = (id: number) => {
    setArchivedIds((prev) => new Set([...prev, id]));
  };

  const archiveSelected = () => {
    setArchivedIds((prev) => new Set([...prev, ...selectedIds]));
    setSelectedIds(new Set());
    setIsSelecting(false);
    setPendingArchive(false);
  };

  const unarchiveAll = () => {
    setArchivedIds(new Set());
    setShowArchived(false);
  };

  // When user clicks "Archive selected" button
  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    setPendingArchive(true);
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

      {/* ── Archive confirm toast ────────────────────────── */}
      {pendingArchive && (
        <ArchiveToast
          count={selectedIds.size}
          onConfirm={archiveSelected}
          onCancel={() => setPendingArchive(false)}
        />
      )}

      <button className="col-back-btn" onClick={() => navigate("/store")}>← Back to Store</button>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="col-hero">
        <div>
          <div className="col-hero__eyebrow">
            <span><Icon name="collection" size={16} label="" /></span>
            <span className="col-hero__eyebrow-text">MY COLLECTION</span>
          </div>
          <h1 className="col-hero__title">Your Purchased Items</h1>
          <p className="col-hero__sub">Click any card to view its content directly here.</p>
        </div>
        {!isLoading && purchases.length > 0 && (
          <div className="col-stats">
            <div className="col-stat">
              <span className="col-stat__val">{purchases.length}</span>
              <span className="col-stat__lbl">Total</span>
            </div>
            <div className="col-stat-div" />
            <div className="col-stat">
              <span className="col-stat__val" style={{ color:"#34D399" }}>{unusedPurchases.length}</span>
              <span className="col-stat__lbl">Unused</span>
            </div>
            <div className="col-stat-div" />
            <div className="col-stat">
              <span className="col-stat__val" style={{ color:"#94A3B8" }}>{purchases.filter(p=>p.isUsed).length}</span>
              <span className="col-stat__lbl">Used</span>
            </div>
            <div className="col-stat-div" />
            <div className="col-stat">
              <span className="col-stat__val" style={{ color:"#FCD34D" }}>{archivedIds.size}</span>
              <span className="col-stat__lbl">Archived</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar: filters + sort + bulk actions ────────── */}
      {!isLoading && purchases.length > 0 && (
        <>
          {/* Filter pills */}
          <div className="col-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`col-pill ${activeFilter === f.id ? "col-pill--active" : ""}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
                {counts[f.id] > 0 && <span className="col-pill__count">{counts[f.id]}</span>}
              </button>
            ))}

            {/* Divider */}
            <div className="col-filter-div" />

            {/* Sort toggle */}
            <button
              className="col-sort-btn"
              onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
              title={sortDir === "desc" ? "Newest first — click for oldest first" : "Oldest first — click for newest first"}
            >
              <Icon name={sortDir === "desc" ? "sort-desc" : "sort-asc"} size={14} label="" />
              {sortDir === "desc" ? "Newest" : "Oldest"}
            </button>

            {/* Archive toggle */}
            <button
              className={`col-sort-btn ${showArchived ? "col-sort-btn--active" : ""}`}
              onClick={() => { setShowArchived((v) => !v); setIsSelecting(false); setSelectedIds(new Set()); }}
            >
              <Icon name="archive" size={14} label="" />
              {showArchived ? "Hide Archived" : `Archived (${archivedIds.size})`}
            </button>

            {/* Bulk select toggle */}
            {!showArchived && (
              <button
                className={`col-sort-btn ${isSelecting ? "col-sort-btn--active" : ""}`}
                onClick={() => { setIsSelecting((v) => !v); setSelectedIds(new Set()); }}
              >
                <Icon name="check" size={14} label="" />
                {isSelecting ? "Cancel" : "Select"}
              </button>
            )}
          </div>

          {/* Bulk-select action bar */}
          {isSelecting && (
            <div className="col-bulk-bar">
              <span className="col-bulk-bar__count">
                {selectedIds.size} selected
              </span>
              <div className="col-bulk-bar__actions">
                <button className="col-bulk-btn col-bulk-btn--ghost" onClick={selectAll}>Select All</button>
                <button className="col-bulk-btn col-bulk-btn--ghost" onClick={clearSelection}>Clear</button>
                <button
                  className="col-bulk-btn col-bulk-btn--archive"
                  disabled={selectedIds.size === 0}
                  onClick={handleBulkArchive}
                >
                  <Icon name="archive" size={13} label="" />
                  Archive Selected ({selectedIds.size})
                </button>
              </div>
            </div>
          )}

          {/* Archived-view action bar */}
          {showArchived && archivedIds.size > 0 && (
            <div className="col-bulk-bar col-bulk-bar--archived">
              <span className="col-bulk-bar__count">{archivedIds.size} archived item{archivedIds.size !== 1 ? "s" : ""}</span>
              <button className="col-bulk-btn col-bulk-btn--ghost" onClick={unarchiveAll}>
                ↺ Restore All
              </button>
            </div>
          )}
        </>
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
          <div className="col-empty__icon"><Icon name="collection" size={40} label="" /></div>
          <h3 className="col-empty__title">Your collection is empty</h3>
          <p className="col-empty__sub">Head to the XP Store and spend your earned XP on career advantages.</p>
          <button className="col-empty__btn" onClick={() => navigate("/store")}>Browse XP Store →</button>
        </div>
      ) : showArchived && archivedIds.size === 0 ? (
        <div className="col-empty">
          <div className="col-empty__icon"><Icon name="archive" size={40} label="" /></div>
          <h3 className="col-empty__title">No archived items</h3>
          <p className="col-empty__sub">Archive items you no longer need to keep your collection tidy.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-empty">
          <div className="col-empty__icon"><Icon name="search" size={40} label="" /></div>
          <h3 className="col-empty__title">No matches</h3>
          <p className="col-empty__sub">Try a different filter.</p>
        </div>
      ) : (
        <div className="col-grid">
          {filtered.map((p) => (
            <PurchaseCard
              key={p.id}
              purchase={p}
              onView={setViewing}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(p.id)}
              onToggleSelect={toggleSelect}
              onArchive={archiveSingle}
            />
          ))}
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

/* ── Filters + sort toolbar ──────────────────────── */
.col-filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center; }
.col-pill { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:var(--radius-full); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:var(--text-sm); color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); white-space:nowrap; }
.col-pill:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }
.col-pill--active { background:var(--color-primary-800); border-color:var(--color-primary-500); color:var(--color-primary-300); }
.col-pill__count { font-family:var(--font-mono); font-size:10px; font-weight:700; padding:1px 6px; border-radius:var(--radius-full); background:var(--color-bg-overlay); }
.col-pill--active .col-pill__count { background:var(--color-primary-700); color:var(--color-primary-300); }

.col-filter-div { width:1px; height:28px; background:var(--color-border-default); margin:0 4px; flex-shrink:0; }

.col-sort-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:var(--radius-full); border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); white-space:nowrap; }
.col-sort-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-secondary); }
.col-sort-btn--active { background:var(--color-bg-elevated); border-color:var(--color-border-strong); color:var(--color-text-primary); }

/* ── Bulk action bar ─────────────────────────────── */
.col-bulk-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 16px; margin-bottom:16px; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-xl); flex-wrap:wrap; }
.col-bulk-bar--archived { border-color:#FCD34D33; background:#FCD34D08; }
.col-bulk-bar__count { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--color-text-secondary); }
.col-bulk-bar__actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.col-bulk-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:var(--radius-lg); border:1px solid var(--color-border-default); background:transparent; font-family:var(--font-mono); font-size:11px; font-weight:700; cursor:pointer; transition:all var(--duration-fast); color:var(--color-text-muted); }
.col-bulk-btn--ghost:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }
.col-bulk-btn--archive { border-color:#F8717144; color:#F87171; background:#F8717108; }
.col-bulk-btn--archive:hover:not(:disabled) { background:#F8717118; border-color:#F87171aa; }
.col-bulk-btn--archive:disabled { opacity:.4; cursor:not-allowed; }

/* ── Archive confirm toast ────────────────────────── */
.col-archive-toast { position:fixed; bottom:calc(var(--layout-bottom-height,64px) + 20px); left:50%; transform:translateX(-50%); z-index:200; display:flex; align-items:center; gap:16px; padding:14px 20px; background:var(--color-bg-elevated); border:1px solid #F8717144; border-radius:var(--radius-xl); box-shadow:0 8px 32px rgba(0,0,0,.5); white-space:nowrap; animation:cv-fadein .15s ease-out; }
.col-archive-toast__msg { font-family:var(--font-mono); font-size:13px; color:var(--color-text-primary); }
.col-archive-toast__actions { display:flex; gap:8px; }
.col-archive-toast__cancel { padding:6px 14px; border-radius:var(--radius-lg); border:1px solid var(--color-border-default); background:transparent; font-family:var(--font-mono); font-size:12px; color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); }
.col-archive-toast__cancel:hover { color:var(--color-text-primary); border-color:var(--color-border-strong); }
.col-archive-toast__confirm { padding:6px 14px; border-radius:var(--radius-lg); border:1px solid #F8717155; background:#F8717112; font-family:var(--font-mono); font-size:12px; font-weight:700; color:#F87171; cursor:pointer; transition:all var(--duration-fast); }
.col-archive-toast__confirm:hover { background:#F8717122; }

/* ── Grid ────────────────────────────────────────── */
.col-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; margin-bottom:8px; }

/* ── Card ────────────────────────────────────────── */
.col-card { position:relative; display:flex; flex-direction:column; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:var(--radius-2xl); overflow:hidden; transition:all var(--duration-base); }
.col-card:hover { border-color:var(--card-color,var(--color-border-strong)); box-shadow:0 0 28px var(--card-glow,transparent); transform:translateY(-2px); }
.col-card--selecting { cursor:pointer; }
.col-card--selected { border-color:var(--card-color,var(--color-primary-500)) !important; box-shadow:0 0 0 2px var(--card-color,var(--color-primary-500))44; }

/* Checkbox overlay */
.col-card__checkbox { position:absolute; top:12px; right:12px; z-index:10; }
.col-checkbox { width:20px; height:20px; border-radius:6px; border:2px solid var(--color-border-strong); background:var(--color-bg-overlay); display:flex; align-items:center; justify-content:center; transition:all var(--duration-fast); }
.col-checkbox--checked { background:var(--color-primary-500); border-color:var(--color-primary-500); color:#fff; }

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
.col-card__footer { padding:0 20px 16px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.col-card__view-btn { padding:8px 16px; border-radius:var(--radius-lg); border:1px solid; background:transparent; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all var(--duration-fast); }
.col-card__view-btn:hover { filter:brightness(1.2); transform:translateX(2px); }
.col-card__slot-label { font-family:var(--font-mono); font-size:11px; }

/* Archive button on card */
.col-card__archive-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--radius-md); border:1px solid var(--color-border-default); background:transparent; color:var(--color-text-muted); cursor:pointer; transition:all var(--duration-fast); flex-shrink:0; margin-left:auto; }
.col-card__archive-btn:hover { border-color:#F8717155; color:#F87171; background:#F8717110; }

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
.cv-backdrop { position:fixed; top:var(--layout-navbar-height,60px); bottom:var(--layout-bottom-height,64px); left:0; right:0; background:rgba(0,0,0,.82); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:150; padding:20px; overflow-y:auto; animation:cv-fadein .15s ease-out; }
@keyframes cv-fadein { from{opacity:0} to{opacity:1} }

.cv-modal { position:relative; width:100%; max-width:760px; max-height:100%; background:var(--color-bg-surface); border:1px solid var(--color-border-strong); border-radius:var(--radius-2xl); overflow:hidden; display:flex; flex-direction:column; box-shadow:0 32px 80px #000000cc; animation:cv-slide .2s cubic-bezier(.34,1.56,.64,1); }
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

.cv-pdf-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 13px; border-radius:var(--radius-lg); border:1px solid; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.04em; cursor:pointer; transition:all var(--duration-fast); white-space:nowrap; flex-shrink:0; }
.cv-pdf-btn:hover:not(:disabled) { filter:brightness(1.15); box-shadow:0 0 10px rgba(96,165,250,.15); }
.cv-pdf-btn:disabled { opacity:.5; cursor:not-allowed; }

.cv-export-strip { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--color-bg-elevated); border:1px solid var(--color-border-subtle); border-radius:var(--radius-lg); }
.cv-export-strip__label { font-size:12px; color:var(--color-text-muted); }

.cv-body { flex:1; overflow-y:auto; padding:22px; }
.cv-body::-webkit-scrollbar { width:4px; }
.cv-body::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }

.cv-spin-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; min-height:36vh; }
.cv-ring { width:48px; height:48px; border:3px solid var(--color-border-default); border-radius:50%; animation:cv-spin .8s linear infinite; }
@keyframes cv-spin { to{transform:rotate(360deg)} }
.cv-spin-text { font-family:var(--font-mono); font-size:13px; color:var(--color-text-secondary); margin:0; }
.cv-spin-sub { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); margin:0; }
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
  .cv-completed-banner { flex-direction:column; gap:12px; align-items:flex-start; }
  .cv-export-strip { flex-direction:column; gap:10px; align-items:flex-start; }
  .col-archive-toast { width:calc(100% - 32px); white-space:normal; flex-direction:column; align-items:flex-start; }
}
`;

export default CollectionPage;