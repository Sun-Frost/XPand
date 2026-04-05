import React, { useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useMockInterview } from "../../hooks/user/useStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse raw Gemini prose into render blocks. Same logic as ReadinessReportPage
 * but tuned for interview question numbering (Q1, Q2, etc.)
 */
function parseToBlocks(text: string) {
  const lines = text.split("\n");
  const blocks: Array<{ type: string; content: string; num?: number }> = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blocks.push({ type: "spacer", content: "" }); continue; }

    // ## headings
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) { blocks.push({ type: "heading", content: hm[2].replace(/\*\*/g, ""), num: hm[1].length }); continue; }

    // **Bold heading**
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) { blocks.push({ type: "heading", content: bm[1], num: 3 }); continue; }

    // Numbered: "1. " or "Question 1:" or "Q1:"
    const nm = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.:]\s*(.+)$/i);
    if (nm) { blocks.push({ type: "numbered", content: nm[2].replace(/\*\*/g, ""), num: Number(nm[1]) }); continue; }

    // Bullet
    const bul = line.match(/^[-•*]\s+(.+)$/);
    if (bul) { blocks.push({ type: "bullet", content: bul[1].replace(/\*\*/g, "") }); continue; }

    blocks.push({ type: "paragraph", content: line.replace(/\*\*([^*]+)\*\*/g, "$1") });
  }

  return blocks;
}

type Block = ReturnType<typeof parseToBlocks>[number];

const ProseBlock: React.FC<{ block: Block; accent?: string }> = ({ block, accent = "#A78BFA" }) => {
  switch (block.type) {
    case "spacer":
      return <div style={{ height: 10 }} />;
    case "heading":
      return (
        <h3
          className={`mi-prose-h mi-prose-h--${block.num}`}
          style={block.num === 2 ? { color: accent } : block.num === 3 ? { color: `${accent}cc` } : {}}
        >
          {block.num === 2 && <span className="mi-prose-h__bar" style={{ background: accent }} />}
          {block.content}
        </h3>
      );
    case "numbered":
      return (
        <div className="mi-prose-numbered">
          <span className="mi-prose-numbered__n" style={{ color: accent }}>Q{block.num}.</span>
          <p className="mi-prose-numbered__text">{block.content}</p>
        </div>
      );
    case "bullet":
      return (
        <div className="mi-prose-bullet">
          <span className="mi-prose-bullet__dot" style={{ background: accent }} />
          <p className="mi-prose-bullet__text">{block.content}</p>
        </div>
      );
    default:
      return <p className="mi-prose-para">{block.content}</p>;
  }
};

// ---------------------------------------------------------------------------
// Phase screens
// ---------------------------------------------------------------------------

// ── IDLE (not started) ───────────────────────────────────────────────────────

const IdleScreen: React.FC<{
  onStart: () => void;
  isStarting: boolean;
  error: string | null;
  jobTitle?: string | null;
}> = ({ onStart, isStarting, error, jobTitle }) => (
  <div className="mi-idle">
    <div className="mi-idle__card">
      <div className="mi-idle__glow" />
      <div className="mi-idle__icon">🎙️</div>
      <div className="mi-idle__tag">AI MOCK INTERVIEW</div>
      <h2 className="mi-idle__title">Ready to Practice?</h2>
      {jobTitle && <p className="mi-idle__job">Role: <strong>{jobTitle}</strong></p>}
      <p className="mi-idle__desc">
        Gemini AI will generate personalised interview questions based on the target role
        and your verified skill profile. Answer in your own words — there are no wrong attempts.
      </p>

      <ul className="mi-idle__tips">
        {[
          "Questions are tailored to the job requirements",
          "Take your time — answer all questions in one session",
          "AI feedback analyses your answers in detail",
          "Technical + behavioural questions included",
        ].map((t, i) => (
          <li key={i} className="mi-idle__tip">
            <span className="mi-idle__tip-dot" />
            {t}
          </li>
        ))}
      </ul>

      {error && <div className="mi-error-box"><span>⚠</span> {error}</div>}

      <button className="mi-start-btn" onClick={onStart} disabled={isStarting}>
        {isStarting ? (
          <span className="mi-start-btn__inner">
            <span className="mi-spinner" />
            Gemini is preparing your questions…
          </span>
        ) : (
          "Start Interview →"
        )}
      </button>
      {isStarting && <p className="mi-idle__hint">This usually takes 10–15 seconds</p>}
    </div>
  </div>
);

// ── ANSWERING ────────────────────────────────────────────────────────────────

const AnsweringScreen: React.FC<{
  questionsText: string;
  answers: string;
  onAnswersChange: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}> = ({ questionsText, answers, onAnswersChange, onSubmit, isSubmitting, error }) => {
  const blocks = useMemo(() => parseToBlocks(questionsText), [questionsText]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [answers]);

  const canSubmit = answers.trim().length > 20 && !isSubmitting;

  return (
    <div className="mi-answering">

      {/* Questions panel */}
      <div className="mi-questions-panel">
        <div className="mi-section-header">
          <div className="mi-section-header__bar" />
          <span className="mi-section-header__title">YOUR QUESTIONS</span>
          <span className="mi-section-header__badge">Gemini AI</span>
        </div>
        <div className="mi-questions-prose">
          {blocks.map((b, i) => <ProseBlock key={i} block={b} accent="#A78BFA" />)}
        </div>
      </div>

      {/* Answer panel */}
      <div className="mi-answer-panel">
        <div className="mi-section-header">
          <div className="mi-section-header__bar" style={{ background: "#34D399" }} />
          <span className="mi-section-header__title">YOUR ANSWERS</span>
        </div>

        <div className="mi-answer-panel__hint">
          Write your answers below. Label each answer clearly, e.g.
          <code className="mi-answer-panel__code"> Q1: [your answer]</code>
        </div>

        <textarea
          ref={textareaRef}
          className="mi-textarea"
          placeholder="Q1: [Your answer here]&#10;&#10;Q2: [Your answer here]&#10;&#10;Q3: ..."
          value={answers}
          onChange={(e) => onAnswersChange(e.target.value)}
          disabled={isSubmitting}
          rows={12}
        />

        <div className="mi-answer-footer">
          <span className="mi-answer-footer__chars">
            {answers.trim().length} chars
            {answers.trim().length < 20 && answers.length > 0 && (
              <span className="mi-answer-footer__warn"> (write more)</span>
            )}
          </span>

          {error && <div className="mi-error-box mi-error-box--inline"><span>⚠</span> {error}</div>}

          <button
            className="mi-submit-btn"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <span className="mi-start-btn__inner">
                <span className="mi-spinner" />
                AI is evaluating your answers…
              </span>
            ) : (
              "Submit for Feedback →"
            )}
          </button>

          {isSubmitting && (
            <p className="mi-answer-footer__hint">Feedback usually takes 15–25 seconds</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── COMPLETED ────────────────────────────────────────────────────────────────

const CompletedScreen: React.FC<{
  questionsText: string;
  userAnswersText: string;
  aiFeedbackText: string;
  createdAt: string;
  onBuyAnother: () => void;
}> = ({ questionsText, userAnswersText, aiFeedbackText, createdAt, onBuyAnother }) => {
  const feedbackBlocks = useMemo(() => parseToBlocks(aiFeedbackText), [aiFeedbackText]);
  const questionBlocks = useMemo(() => parseToBlocks(questionsText), [questionsText]);

  return (
    <div className="mi-completed">

      {/* Success banner */}
      <div className="mi-completed-banner">
        <div className="mi-completed-banner__glow" />
        <div className="mi-completed-banner__left">
          <span className="mi-completed-banner__tag">SESSION COMPLETE</span>
          <h2 className="mi-completed-banner__title">AI Feedback Ready</h2>
          <p className="mi-completed-banner__date">
            Completed {new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="mi-completed-banner__icon">✓</div>
      </div>

      {/* Two-col layout: feedback main, session sidebar */}
      <div className="mi-completed-layout">

        {/* Main: AI Feedback */}
        <div className="mi-completed-main">
          <div className="mi-section-header">
            <div className="mi-section-header__bar" style={{ background: "#A78BFA" }} />
            <span className="mi-section-header__title">AI FEEDBACK</span>
            <span className="mi-section-header__badge" style={{ background: "#A78BFA12", borderColor: "#A78BFA33", color: "#A78BFA" }}>Gemini</span>
          </div>
          <div className="mi-feedback-prose card">
            {feedbackBlocks.map((b, i) => <ProseBlock key={i} block={b} accent="#A78BFA" />)}
          </div>
        </div>

        {/* Sidebar: questions + your answers */}
        <aside className="mi-completed-sidebar">

          {/* Questions recap */}
          <div className="mi-sidebar-card">
            <h3 className="mi-sidebar-card__title">📋 Interview Questions</h3>
            <div className="mi-sidebar-card__prose">
              {questionBlocks.filter(b => b.type === "numbered" || b.type === "paragraph").map((b, i) => (
                <ProseBlock key={i} block={b} accent="#60A5FA" />
              ))}
            </div>
          </div>

          {/* Your answers */}
          <div className="mi-sidebar-card">
            <h3 className="mi-sidebar-card__title">✍️ Your Answers</h3>
            <div className="mi-sidebar-card__answers">
              {userAnswersText.split(/\n{2,}/).filter(Boolean).map((chunk, i) => (
                <div key={i} className="mi-sidebar-card__answer-chunk">
                  <p className="mi-sidebar-card__answer-text">{chunk.trim()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button className="mi-buy-btn" onClick={onBuyAnother}>
            🎙️ Practice Again →
          </button>
          <button className="mi-skills-btn" onClick={() => window.history.back()}>
            ← Back to Store
          </button>
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MockInterviewPage
// ---------------------------------------------------------------------------

const MockInterviewPage: React.FC = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const pid = purchaseId ? Number(purchaseId) : null;

  const {
    interview, phase, answers, isLoading, error,
    setAnswers, startInterview, submitAnswers,
  } = useMockInterview(pid);

  if (isLoading) {
    return (
      <PageLayout pageTitle="Mock Interview">
        <div className="mi-loading">
          <div className="mi-loading__ring" />
          <p className="mi-loading__text">Loading session…</p>
        </div>
        <style>{styles}</style>
      </PageLayout>
    );
  }

  return (
    <PageLayout pageTitle="Mock Interview">
      <button className="mi-back-btn" onClick={() => navigate("/store")}>← Store</button>

      {phase === "idle" && (
        <IdleScreen
          onStart={startInterview}
          isStarting={phase === "idle" && false /* startInterview sets "starting" */}
          error={error}
          jobTitle={interview?.questionsText ? null : null}
        />
      )}

      {phase === "starting" && (
        <div className="mi-loading">
          <div className="mi-loading__ring" style={{ borderTopColor: "#A78BFA" }} />
          <p className="mi-loading__text">Gemini is crafting your questions…</p>
          <p className="mi-loading__sub">Usually takes 10–15 seconds</p>
        </div>
      )}

      {phase === "answering" && interview?.questionsText && (
        <AnsweringScreen
          questionsText={interview.questionsText}
          answers={answers}
          onAnswersChange={setAnswers}
          onSubmit={submitAnswers}
          isSubmitting={false}
          error={error}
        />
      )}

      {phase === "submitting" && (
        <div className="mi-loading">
          <div className="mi-loading__ring" style={{ borderTopColor: "#34D399" }} />
          <p className="mi-loading__text">AI is evaluating your answers…</p>
          <p className="mi-loading__sub">Usually takes 15–25 seconds</p>
        </div>
      )}

      {phase === "completed" && interview?.aiFeedbackText && (
        <CompletedScreen
          questionsText={interview.questionsText ?? ""}
          userAnswersText={interview.userAnswersText ?? ""}
          aiFeedbackText={interview.aiFeedbackText}
          createdAt={interview.createdAt}
          onBuyAnother={() => navigate("/store")}
        />
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* ── Shared ──────────────────────────────────────── */
  .mi-back-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; margin-bottom:24px; border-radius:10px; border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:13px; font-family:var(--font-body); color:var(--color-text-secondary); cursor:pointer; transition:all .13s; }
  .mi-back-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  .mi-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; min-height:50vh; }
  .mi-loading__ring { width:52px; height:52px; border:3px solid var(--color-border-default); border-top-color:#A78BFA; border-radius:50%; animation:mi-spin .8s linear infinite; }
  .mi-loading__text { font-family:var(--font-mono); font-size:14px; color:var(--color-text-secondary); letter-spacing:.05em; margin:0; }
  .mi-loading__sub { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); margin:0; }
  @keyframes mi-spin { to { transform:rotate(360deg); } }

  .mi-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.2); border-top-color:currentColor; border-radius:50%; animation:mi-spin .6s linear infinite; }

  .mi-error-box { display:flex; align-items:flex-start; gap:8px; padding:12px 14px; background:#450a0a55; border:1px solid #7f1d1d55; border-radius:10px; font-size:13px; color:#FCA5A5; line-height:1.5; margin-top:4px; }
  .mi-error-box--inline { margin-top:0; }

  /* ── Prose blocks ────────────────────────────────── */
  .mi-prose-h { margin:0; line-height:1.3; }
  .mi-prose-h--1 { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-text-primary); padding-top:8px; }
  .mi-prose-h--2 { font-family:var(--font-display); font-size:16px; font-weight:700; display:flex; align-items:center; gap:10px; padding:14px 0 4px; border-top:1px solid var(--color-border-subtle); margin-top:6px; }
  .mi-prose-h--3 { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding-top:10px; }
  .mi-prose-h--4 { font-size:13px; font-weight:600; color:var(--color-text-secondary); padding-top:4px; }
  .mi-prose-h__bar { display:inline-block; width:3px; height:16px; border-radius:2px; flex-shrink:0; }
  .mi-prose-para { font-size:14px; color:var(--color-text-secondary); line-height:1.75; margin:4px 0; }
  .mi-prose-numbered { display:flex; align-items:flex-start; gap:12px; padding:8px 0; }
  .mi-prose-numbered__n { font-family:var(--font-mono); font-size:13px; font-weight:700; flex-shrink:0; min-width:24px; padding-top:1px; }
  .mi-prose-numbered__text { font-size:14px; color:var(--color-text-primary); line-height:1.65; margin:0; font-weight:500; }
  .mi-prose-bullet { display:flex; align-items:flex-start; gap:10px; padding:3px 0; }
  .mi-prose-bullet__dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:7px; }
  .mi-prose-bullet__text { font-size:14px; color:var(--color-text-secondary); line-height:1.65; margin:0; }

  /* ── Section header ──────────────────────────────── */
  .mi-section-header { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .mi-section-header__bar { width:3px; height:18px; background:#A78BFA; border-radius:2px; flex-shrink:0; }
  .mi-section-header__title { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.16em; color:var(--color-text-muted); flex:1; }
  .mi-section-header__badge { font-family:var(--font-mono); font-size:9px; padding:2px 8px; border-radius:999px; background:#A78BFA12; border:1px solid #A78BFA33; color:#A78BFA; }

  /* ── Idle ─────────────────────────────────────────── */
  .mi-idle { display:flex; justify-content:center; padding:20px 0; }
  .mi-idle__card { position:relative; max-width:560px; width:100%; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:24px; padding:44px 40px; overflow:hidden; display:flex; flex-direction:column; gap:20px; }
  .mi-idle__glow { position:absolute; top:-80px; left:50%; transform:translateX(-50%); width:320px; height:240px; background:radial-gradient(ellipse,#A78BFA14,transparent 70%); pointer-events:none; }
  .mi-idle__icon { font-size:2.8rem; text-align:center; }
  .mi-idle__tag { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#A78BFA; background:#A78BFA12; border:1px solid #A78BFA33; padding:3px 10px; border-radius:999px; text-align:center; align-self:center; }
  .mi-idle__title { font-family:var(--font-display); font-size:24px; font-weight:700; color:var(--color-text-primary); margin:0; text-align:center; }
  .mi-idle__job { font-size:14px; color:var(--color-text-muted); text-align:center; margin:0; }
  .mi-idle__job strong { color:var(--color-text-secondary); }
  .mi-idle__desc { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin:0; text-align:center; }
  .mi-idle__tips { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; background:var(--color-bg-overlay); border-radius:12px; padding:16px; }
  .mi-idle__tip { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--color-text-muted); line-height:1.5; }
  .mi-idle__tip-dot { width:5px; height:5px; border-radius:50%; background:#A78BFA; flex-shrink:0; margin-top:7px; }
  .mi-idle__hint { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); text-align:center; margin:0; }

  .mi-start-btn { width:100%; padding:15px; border-radius:12px; border:1px solid #A78BFA44; background:linear-gradient(135deg,#2D1B69,#1A1040); color:#A78BFA; font-family:var(--font-mono); font-size:14px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-start-btn:hover:not(:disabled) { box-shadow:0 0 28px #A78BFA22; border-color:#A78BFA88; }
  .mi-start-btn:disabled { opacity:.6; cursor:not-allowed; }
  .mi-start-btn__inner { display:flex; align-items:center; justify-content:center; gap:10px; }

  /* ── Answering ───────────────────────────────────── */
  .mi-answering { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }

  .mi-questions-panel { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:28px; }
  .mi-questions-prose { display:flex; flex-direction:column; gap:0; }

  .mi-answer-panel { display:flex; flex-direction:column; gap:14px; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:28px; }
  .mi-answer-panel__hint { font-size:12px; color:var(--color-text-muted); line-height:1.6; padding:10px 12px; background:var(--color-bg-overlay); border-radius:8px; }
  .mi-answer-panel__code { font-family:var(--font-mono); font-size:11px; background:#A78BFA18; border:1px solid #A78BFA33; border-radius:4px; padding:1px 5px; color:#A78BFA; }

  .mi-textarea { width:100%; min-height:300px; padding:16px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:12px; color:var(--color-text-primary); font-size:14px; font-family:var(--font-body); line-height:1.7; resize:none; outline:none; transition:border-color .13s; box-sizing:border-box; }
  .mi-textarea:focus { border-color:#A78BFA66; }
  .mi-textarea:disabled { opacity:.5; }

  .mi-answer-footer { display:flex; flex-direction:column; gap:10px; }
  .mi-answer-footer__chars { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); }
  .mi-answer-footer__warn { color:#F87171; }
  .mi-answer-footer__hint { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); text-align:center; margin:0; }

  .mi-submit-btn { width:100%; padding:14px; border-radius:12px; border:1px solid #34D39944; background:linear-gradient(135deg,#064E3B,#032B21); color:#34D399; font-family:var(--font-mono); font-size:14px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-submit-btn:hover:not(:disabled) { box-shadow:0 0 24px #34D39920; }
  .mi-submit-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* ── Completed ───────────────────────────────────── */
  .mi-completed { display:flex; flex-direction:column; gap:24px; }

  .mi-completed-banner { position:relative; display:flex; align-items:center; justify-content:space-between; padding:28px 36px; background:linear-gradient(135deg,#0d2618,#062618); border:1px solid #34D39922; border-radius:20px; overflow:hidden; }
  .mi-completed-banner__glow { position:absolute; right:-60px; top:-60px; width:200px; height:200px; background:radial-gradient(circle,#34D39918,transparent 70%); pointer-events:none; }
  .mi-completed-banner__left { position:relative; z-index:1; }
  .mi-completed-banner__tag { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#34D399; background:#34D39914; border:1px solid #34D39933; padding:3px 10px; border-radius:999px; display:inline-block; margin-bottom:10px; }
  .mi-completed-banner__title { font-family:var(--font-display); font-size:22px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px; }
  .mi-completed-banner__date { font-family:var(--font-mono); font-size:11px; color:#34D39966; margin:0; }
  .mi-completed-banner__icon { font-size:2.5rem; color:#34D399; filter:drop-shadow(0 0 12px #34D39966); position:relative; z-index:1; }

  .mi-completed-layout { display:grid; grid-template-columns:1fr 300px; gap:24px; align-items:start; }

  .mi-feedback-prose { padding:28px 32px; display:flex; flex-direction:column; gap:0; }

  .mi-completed-sidebar { display:flex; flex-direction:column; gap:16px; position:sticky; top:calc(var(--navbar-height,64px) + 24px); }

  .mi-sidebar-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:14px; padding:20px; }
  .mi-sidebar-card__title { font-family:var(--font-display); font-size:13px; font-weight:600; color:var(--color-text-primary); margin:0 0 12px; }
  .mi-sidebar-card__prose { display:flex; flex-direction:column; gap:0; }
  .mi-sidebar-card__answers { display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; }
  .mi-sidebar-card__answers::-webkit-scrollbar { width:3px; }
  .mi-sidebar-card__answers::-webkit-scrollbar-thumb { background:var(--color-border-strong); border-radius:2px; }
  .mi-sidebar-card__answer-chunk { padding:10px 12px; background:var(--color-bg-overlay); border-radius:8px; border-left:2px solid #A78BFA44; }
  .mi-sidebar-card__answer-text { font-size:12px; color:var(--color-text-muted); line-height:1.6; margin:0; }

  .mi-buy-btn { width:100%; padding:12px; border-radius:10px; border:1px solid #A78BFA44; background:linear-gradient(135deg,#2D1B69,#1A1040); color:#A78BFA; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all .13s; }
  .mi-buy-btn:hover { box-shadow:0 0 20px #A78BFA18; }
  .mi-skills-btn { width:100%; padding:10px; border-radius:10px; border:1px solid var(--color-border-default); background:var(--color-bg-surface); font-size:13px; font-family:var(--font-body); color:var(--color-text-secondary); cursor:pointer; transition:all .13s; }
  .mi-skills-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width:900px) {
    .mi-answering { grid-template-columns:1fr; }
    .mi-completed-layout { grid-template-columns:1fr; }
    .mi-completed-sidebar { position:static; }
  }
  @media (max-width:600px) {
    .mi-idle__card { padding:28px 20px; }
    .mi-questions-panel, .mi-answer-panel, .mi-feedback-prose { padding:20px 16px; }
  }
`;

export default MockInterviewPage;