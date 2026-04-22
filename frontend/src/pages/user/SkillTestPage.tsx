import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useSkillTest } from "../../hooks/user/useSkillTest";
import type { AnswerMap, QuestionDTO } from "../../hooks/user/useSkillTest";
import Modal from "../../components/ui/Modal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_SECONDS = 15 * 60; // 15 minutes for 15 questions

/** Points shown per difficulty — kept for display even though level is hidden */
const POINTS_BY_DIFFICULTY: Record<string, number> = {
  EASY: 10, MEDIUM: 15, HARD: 20,
};

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatCodeLines(code: string): string {
  // Split on semicolons, keeping the semicolon at end of each line
  return code
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s + ";")
    .join("\n");
}

function getCategoryIcon(category: string): IconName {
  const icons: Record<string, IconName> = {
    Frontend: "cat-frontend" as IconName, Backend: "cat-backend" as IconName, Data: "cat-data" as IconName, Cloud: "cat-cloud" as IconName, Mobile: "cat-mobile" as IconName,
  };
  return icons[category] ?? "cat-default";
}

// ---------------------------------------------------------------------------
// Attempt warning modal — shown before starting
// ---------------------------------------------------------------------------

const AttemptWarning: React.FC<{
  skillName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ skillName, onConfirm, onCancel }) => (
  <Modal onClose={onCancel}>
    <div className="modal test-confirm-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3><Icon name="warning" size={16} label="" /> Attempt Warning</h3>
        <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onCancel}><Icon name="close" size={14} label="Close" /></button>
      </div>
      <div className="modal-body">
        <div className="test-confirm-warning">
          <span className="test-confirm-warning__icon"><Icon name="clipboard" size={20} label="" /></span>
          <p>
            Starting the <strong>{skillName}</strong> test will use one of your{" "}
            <strong>3 monthly attempts</strong>. You cannot undo this.
            <br /><br />
            Exiting mid-test or submitting will both count as an attempt.
          </p>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Go Back</button>
        <button className="btn btn-xp" onClick={onConfirm}><Icon name="xp" size={14} label="" /> Start Test</button>
      </div>
    </div>
  </Modal>
);

// ---------------------------------------------------------------------------
// SkillTestPage
// ---------------------------------------------------------------------------

const SkillTestPage: React.FC = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Skill metadata passed from SkillsLibraryPage via route state
  const routeState = location.state as { skillName?: string; skillCategory?: string } | null;
  const skillName = routeState?.skillName ?? "Skill Test";
  const skillCategory = routeState?.skillCategory ?? "";

  const { testData, isLoading, isSubmitting, error, result, startTest, submitTest } = useSkillTest();

  // ── Local state ────────────────────────────────────────────
  const [showAttemptWarning, setShowAttemptWarning] = useState(true); // show before starting
  const [testStarted, setTestStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [showConfirm, setShowConfirm] = useState(false);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoSubmitted = useRef(false);

  // ── Navigate to result when ready ─────────────────────────
  useEffect(() => {
    if (result) {
      navigate("/skills/result", { state: { result }, replace: true });
    }
  }, [result, navigate]);

  // ── Timer (only runs after test started) ──────────────────
  useEffect(() => {
    if (!testData || isSubmitting || !testStarted) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            submitTest(answers);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [testData, isSubmitting, testStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────

  const handleConfirmStart = async () => {
    setShowAttemptWarning(false);
    setTestStarted(true);
    await startTest(Number(skillId));
  };

  const handleCancelStart = () => {
    navigate("/skills", { replace: true });
  };

  const handleAnswer = (option: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
  };

  const toggleFlag = () => {
    if (!current) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(current.id) ? next.delete(current.id) : next.add(current.id);
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    setShowConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    console.log("=== SUBMITTING ===");
    console.log("Answers:", JSON.stringify(answers));
    console.log("Answer count:", Object.keys(answers).length);
    console.log("Questions:", questions.map(q => ({ id: q.id, text: q.questionText.slice(0, 20) })));
    await submitTest(answers);
  }, [answers, submitTest]);
  // ── Derived ────────────────────────────────────────────────
  const questions: QuestionDTO[] = testData?.questions ?? [];
  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const isUrgent = secondsLeft <= 120;

  // ── Pre-start warning ──────────────────────────────────────
  if (showAttemptWarning) {
    return (
      <>
        <div className="test-page" style={{ minHeight: "100vh", background: "var(--color-bg-base)" }}>
          <style>{styles}</style>
        </div>
        <AttemptWarning
          skillName={skillName}
          onConfirm={handleConfirmStart}
          onCancel={handleCancelStart}
        />
        <style>{styles}</style>
      </>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-content test-page test-loading">
        <div className="test-loading__inner">
          <div className="test-loading__spinner animate-spin"><Icon name="cat-backend" size={32} label="" /></div>
          <h2>Loading test...</h2>
          <p>Preparing your 15 questions</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || (!isLoading && testStarted && !testData)) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="warning" size={32} label="" /></div>
          <h3>Test unavailable</h3>
          <p>{error ?? "Could not load this skill test."}</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/skills")}>
            Back to Skills
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!current) return null;

  const currentAnswer = answers[current.id];
  const isCurrentFlagged = flagged.has(current.id);
  const pointsDisplay = POINTS_BY_DIFFICULTY[current.difficultyLevel] ?? current.points;

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="test-page animate-fade-in">

      {/* ══ Top bar ══ */}
      <div className="test-topbar">
        <div className="test-topbar__left">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(true)}>
            ← Exit
          </button>
          <div className="test-skill-info">
            <span className="test-skill-info__icon"><Icon name={getCategoryIcon(skillCategory)} size={20} label="" /></span>
            <div>
              <p className="label test-skill-info__label">Skill Verification</p>
              <h2 className="test-skill-info__name">{skillName}</h2>
            </div>
          </div>
        </div>

        <div className="test-topbar__right">
          <div className="test-progress-info">
            <span className="label">Progress</span>
            <span className="test-progress-info__count">{answeredCount} / {questions.length}</span>
          </div>
          <div className={`test-timer ${isUrgent ? "test-timer--urgent" : ""}`}>
            <span className="test-timer__icon">{isUrgent ? <Icon name="warning" size={14} label="" /> : <Icon name="timer" size={14} label="" />}</span>
            <span className="test-timer__time">{formatTime(secondsLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="test-progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="test-layout">

        {/* ══ Question panel ══ */}
        <main className="test-main">
          <div className="test-question-card">

            <div className="test-question-card__header">
              <div className="test-question-card__meta">
                <span className="test-q-badge">Q{currentIndex + 1} / {questions.length}</span>
                
              </div>
              <button
                className={`btn btn-icon btn-sm test-flag-btn ${isCurrentFlagged ? "test-flag-btn--active" : ""}`}
                onClick={toggleFlag} title={isCurrentFlagged ? "Unflag" : "Flag for review"}
              >
                <Icon name="flag" size={14} label="" />
              </button>
            </div>

            <div className="test-question-card__body">
              {(() => {
                const text = current.questionText;
                // Detect if there's any code in the question
                const hasCode = text.includes(";") || text.includes("=>") || text.includes("->") || /\w+\s*\(/.test(text) || /\w+\[/.test(text);
                if (!hasCode) return <p className="test-question-text">{text}</p>;

                // Try to split on a sentence-ending question mark or colon that separates prose from code
                // e.g. "What is the output? x = [1,2,3];" or "What does this print: print(x)"
                const splitMatch = text.match(/^([^?:]+[?:])\s*([\s\S]+)$/);
                if (splitMatch) {
                  return (
                    <div className="test-question-content">
                      <p className="test-question-text test-question-text--prefix">{splitMatch[1].trim()}</p>
                      <pre className="test-question-code"><code>{formatCodeLines(splitMatch[2].trim())}</code></pre>
                    </div>
                  );
                }

                // No prose prefix found — entire question is code
                return (
                  <div className="test-question-content">
                    <pre className="test-question-code"><code>{formatCodeLines(text)}</code></pre>
                  </div>
                );
              })()}
            </div>

            <div className="test-options">
              {OPTION_LABELS.map((opt) => {
                const optionText = opt === "A" ? current.optionA : opt === "B" ? current.optionB : opt === "C" ? current.optionC : current.optionD;
                const isSelected = currentAnswer === opt;
                return (
                  <button key={opt} className={`test-option ${isSelected ? "test-option--selected" : ""}`}
                    onClick={() => handleAnswer(opt)}>
                    <span className={`test-option__letter ${isSelected ? "test-option__letter--selected" : ""}`}>{opt}</span>
                    <span className="test-option__text">{optionText}</span>
                    {isSelected && <span className="test-option__check"><Icon name="check" size={14} label="" /></span>}
                  </button>
                );
              })}
            </div>

            <div className="test-navigation">
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}>← Previous</button>

              <div className="test-navigation__center">
                {isCurrentFlagged && <span className="badge badge-warning"><Icon name="flag" size={12} label="" /> Flagged</span>}
                {currentAnswer && !isCurrentFlagged && <span className="badge badge-verified"><Icon name="check" size={12} label="" /> Answered</span>}
              </div>

              {currentIndex < questions.length - 1 ? (
                <button className="btn btn-primary btn-sm"
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-xp btn-sm" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : <><Icon name="xp" size={14} label="" /> Submit Test</>}
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ══ Sidebar ══ */}
        <aside className="test-sidebar">
          <div className="test-sidebar__card">
            <h4 className="test-sidebar__title">QUESTIONS</h4>

            <div className="test-question-nav">
              {questions.map((q, i) => {
                const answered = !!answers[q.id];
                const isFlagged = flagged.has(q.id);
                const isActive = i === currentIndex;
                return (
                  <button key={q.id}
                    className={["test-nav-dot", isActive ? "test-nav-dot--active" : "", answered ? "test-nav-dot--answered" : "", isFlagged ? "test-nav-dot--flagged" : ""].filter(Boolean).join(" ")}
                    onClick={() => setCurrentIndex(i)} title={`Q${i + 1}${isFlagged ? " (flagged)" : ""}`}>
                    {isFlagged ? <Icon name="flag" size={12} label="" /> : i + 1}
                  </button>
                );
              })}
            </div>

            <div className="test-sidebar__legend">
              <div className="test-legend-item"><span className="test-nav-dot test-nav-dot--answered test-legend-dot" /><span>Answered</span></div>
              <div className="test-legend-item"><span className="test-nav-dot test-legend-dot" /><span>Unanswered</span></div>
              <div className="test-legend-item"><span className="test-legend-flag"><Icon name="flag" size={12} label="" /></span><span>Flagged</span></div>
            </div>

            <div className="test-sidebar__score-preview">
              <p className="test-sidebar__title" style={{ marginBottom: 8 }}>ANSWERED</p>
              <div className="test-sidebar__score-bar">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="test-sidebar__score-pct">{answeredCount}/{questions.length}</span>
              </div>
            </div>

            <button className="test-submit-btn" onClick={() => setShowConfirm(true)}
              disabled={isSubmitting || answeredCount === 0}>
              {isSubmitting ? <span className="test-loading__ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Icon name="xp" size={14} label="" /> Submit Test</>}
            </button>
          </div>
        </aside>
      </div>

      {/* ══ Confirm submit / exit modal ══ */}
      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <div className="modal test-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Test?</h3>
              <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setShowConfirm(false)}><Icon name="close" size={14} label="Close" /></button>
            </div>
            <div className="modal-body">
              {answeredCount < questions.length ? (
                <div className="test-confirm-warning">
                  <span className="test-confirm-warning__icon"><Icon name="warning" size={20} label="" /></span>
                  <p>
                    You have <strong>{questions.length - answeredCount} unanswered</strong> question{questions.length - answeredCount !== 1 ? "s" : ""}. Unanswered questions count as incorrect.
                    <br /><br />
                    <strong>This will use one of your monthly attempts regardless.</strong>
                  </p>
                </div>
              ) : (
                <p>All {questions.length} questions answered. Ready to submit?</p>
              )}
              <div className="test-confirm-stats mt-4">
                <div className="test-confirm-stat"><span className="test-confirm-stat__value">{answeredCount}</span><span className="label">Answered</span></div>
                <div className="test-confirm-stat"><span className="test-confirm-stat__value">{questions.length - answeredCount}</span><span className="label">Skipped</span></div>
                <div className="test-confirm-stat"><span className="test-confirm-stat__value">{flagged.size}</span><span className="label">Flagged</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Continue Test</button>
              <button className="btn btn-xp" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : <><Icon name="xp" size={14} label="" /> Confirm Submit</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Submitting overlay ══ */}
      {isSubmitting && (
        <div className="test-submitting-overlay">
          <div className="test-submitting-inner">
            <div className="test-submitting-spinner"><Icon name="xp" size={32} label="" /></div>
            <h3>Analysing your answers...</h3>
            <p>Calculating score and badge</p>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (identical to original, kept in full)
// ---------------------------------------------------------------------------

const styles = `
  /* ── Page shell ──────────────────────────────────────── */
  .test-page { min-height:100vh; display:flex; flex-direction:column; background:var(--color-bg-base); }

  /* ── Loading ─────────────────────────────────────────── */
  .test-loading { display:flex; align-items:center; justify-content:center; min-height:60vh; }
  .test-loading__inner { text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px; }
  .test-loading__ring { width:48px; height:48px; border:3px solid var(--color-border-default); border-top-color:#60A5FA; border-radius:50%; animation:test-spin .9s linear infinite; }
  @keyframes test-spin { to { transform:rotate(360deg); } }
  .test-loading__inner h2 { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-text-primary); margin:0; }
  .test-loading__inner p { font-family:var(--font-mono); font-size:12px; color:var(--color-text-muted); letter-spacing:.06em; margin:0; }

  /* ── Top bar ─────────────────────────────────────────── */
  .test-topbar { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:14px 32px; background:linear-gradient(180deg,#0e1420,#0b1016); border-bottom:1px solid #ffffff0d; position:sticky; top:0; z-index:var(--z-sticky); backdrop-filter:blur(12px); }
  .test-topbar__left, .test-topbar__right { display:flex; align-items:center; gap:16px; }

  .test-skill-info { display:flex; align-items:center; gap:12px; }
  .test-skill-info__icon { width:38px; height:38px; display:flex; align-items:center; justify-content:center; background:#60A5FA12; border:1px solid #60A5FA33; border-radius:10px; color:#60A5FA; }
  .test-skill-info__label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.2em; color:#60A5FA; display:block; margin-bottom:2px; }
  .test-skill-info__name { font-family:var(--font-display); font-size:17px; font-weight:700; color:var(--color-text-primary); line-height:1; margin:0; }

  .test-progress-info { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
  .test-progress-info .label { font-family:var(--font-mono); font-size:9px; letter-spacing:.18em; color:#ffffff33; }
  .test-progress-info__count { font-family:var(--font-mono); font-size:15px; font-weight:700; color:var(--color-text-primary); }

  .test-timer { display:flex; align-items:center; gap:8px; background:#ffffff08; border:1px solid #ffffff14; border-radius:10px; padding:7px 14px; transition:all 200ms ease; }
  .test-timer--urgent { background:rgba(251,191,36,.08); border-color:rgba(251,191,36,.3); animation:test-pulse 1s ease-in-out infinite; }
  @keyframes test-pulse { 0%,100% { box-shadow:none; } 50% { box-shadow:0 0 14px rgba(251,191,36,.2); } }
  .test-timer__icon { color:#ffffff55; }
  .test-timer__time { font-family:var(--font-mono); font-size:17px; font-weight:700; color:var(--color-text-primary); min-width:52px; }
  .test-timer--urgent .test-timer__icon,
  .test-timer--urgent .test-timer__time { color:#FCD34D; }

  /* ── Progress bar ────────────────────────────────────── */
  .test-progress-bar { height:2px; border-radius:0; background:#ffffff08; }
  .test-progress-bar .progress-fill { background:linear-gradient(90deg,#34D399,#60A5FA); transition:width 300ms ease; height:100%; border-radius:0; }

  /* ── Layout ──────────────────────────────────────────── */
  .test-layout { display:grid; grid-template-columns:1fr 272px; gap:24px; padding:28px 32px; flex:1; align-items:start; }

  /* ── Question card ───────────────────────────────────── */
  .test-question-card { background:var(--color-bg-elevated); border:1px solid #ffffff0d; border-radius:20px; overflow:hidden; display:flex; flex-direction:column; }
  .test-question-card__header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #ffffff08; background:linear-gradient(180deg,#ffffff04,transparent); }
  .test-question-card__meta { display:flex; gap:8px; align-items:center; }
  .test-q-badge { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.1em; color:#60A5FA; background:#60A5FA12; border:1px solid #60A5FA33; padding:3px 10px; border-radius:999px; }

  .test-question-card__body { padding:28px 28px 24px; border-bottom:1px solid #ffffff08; }
  .test-question-content { display:flex; flex-direction:column; gap:14px; }
  .test-question-text { font-size:18px; font-weight:600; color:var(--color-text-primary); line-height:1.65; white-space:pre-wrap; margin:0; }
  .test-question-text--prefix { font-size:15px; font-weight:500; color:var(--color-text-secondary); margin:0; line-height:1.6; }
  .test-question-code { margin:0; padding:16px 20px; background:#0d1520; border:1px solid #60A5FA22; border-left:3px solid #60A5FA55; border-radius:0 12px 12px 0; font-family:var(--font-mono); font-size:13px; color:#93C5FD; line-height:1.8; overflow-x:auto; white-space:pre; }
  .test-question-code code { font-family:inherit; color:inherit; background:none; padding:0; }

  /* ── Options ─────────────────────────────────────────── */
  .test-options { padding:20px 24px; display:flex; flex-direction:column; gap:10px; border-bottom:1px solid #ffffff08; }
  .test-option { display:flex; align-items:center; gap:14px; padding:14px 18px; background:#ffffff05; border:1px solid #ffffff0d; border-radius:12px; cursor:pointer; text-align:left; transition:all 140ms ease; position:relative; }
  .test-option:hover:not(.test-option--selected) { border-color:#ffffff22; background:#ffffff0a; transform:translateX(3px); }
  .test-option--selected { background:linear-gradient(135deg,#0d2a1a,#0a1f14); border-color:#34D39944; box-shadow:0 0 20px #34D39914; }
  .test-option__letter { width:30px; height:30px; border-radius:8px; border:1px solid #ffffff1a; background:#ffffff08; display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--color-text-muted); flex-shrink:0; transition:all 140ms ease; }
  .test-option__letter--selected { background:#34D399; border-color:#34D399; color:#0C0F15; }
  .test-option__text { flex:1; font-size:14px; color:var(--color-text-secondary); line-height:1.6; }
  .test-option--selected .test-option__text { color:var(--color-text-primary); }
  .test-option__check { font-size:14px; color:#34D399; flex-shrink:0; }

  /* ── Flag button ─────────────────────────────────────── */
  .test-flag-btn { opacity:.35; transition:opacity 130ms ease; }
  .test-flag-btn:hover { opacity:.7; }
  .test-flag-btn--active { opacity:1 !important; background:rgba(251,191,36,.1) !important; border-color:rgba(251,191,36,.35) !important; color:#FCD34D !important; }

  /* ── Navigation row ──────────────────────────────────── */
  .test-navigation { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 24px; }
  .test-navigation__center { display:flex; align-items:center; gap:8px; }

  /* ── Sidebar ─────────────────────────────────────────── */
  .test-sidebar { position:sticky; top:calc(var(--layout-navbar-height,60px) + 56px + 28px); display:flex; flex-direction:column; gap:16px; }
  .test-sidebar__card { background:var(--color-bg-elevated); border:1px solid #ffffff0d; border-radius:20px; padding:20px; display:flex; flex-direction:column; gap:16px; }
  .test-sidebar__title { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.22em; color:#60A5FA; margin:0; }

  .test-question-nav { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .test-nav-dot { width:100%; aspect-ratio:1; border-radius:8px; border:1px solid #ffffff10; background:#ffffff06; color:#ffffff33; font-family:var(--font-mono); font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 130ms ease; }
  .test-nav-dot:hover { border-color:#ffffff22; color:var(--color-text-secondary); }
  .test-nav-dot--answered { background:#34D39914; border-color:#34D39940; color:#34D399; }
  .test-nav-dot--active { background:#60A5FA18; border-color:#60A5FA55; color:#60A5FA; font-weight:700; box-shadow:0 0 12px #60A5FA18; }
  .test-nav-dot--flagged { background:rgba(251,191,36,.1) !important; border-color:rgba(251,191,36,.35) !important; color:#FCD34D !important; }

  .test-sidebar__legend { display:flex; flex-direction:column; gap:8px; padding:12px; background:#ffffff04; border-radius:10px; border:1px solid #ffffff08; }
  .test-legend-item { display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); letter-spacing:.04em; }
  .test-legend-dot { width:16px; height:16px; flex-shrink:0; border-radius:5px; }
  .test-legend-flag { font-size:12px; color:#FCD34D; }

  .test-sidebar__score-bar { display:flex; align-items:center; gap:8px; }
  .test-sidebar__score-bar .progress-track { flex:1; height:4px; background:#ffffff0a; border-radius:99px; overflow:hidden; }
  .test-sidebar__score-bar .progress-fill { height:100%; background:linear-gradient(90deg,#34D399,#60A5FA); border-radius:99px; transition:width 300ms ease; }
  .test-sidebar__score-pct { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); white-space:nowrap; }

  .test-submit-btn { width:100%; padding:11px; border-radius:10px; border:none; background:linear-gradient(135deg,#1E3A5F,#162132); color:#60A5FA; font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:.06em; cursor:pointer; border:1px solid #60A5FA33; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .test-submit-btn:hover:not(:disabled) { box-shadow:0 0 20px #60A5FA22; border-color:#60A5FA55; }
  .test-submit-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Confirm modal internals ─────────────────────────── */
  .test-confirm-warning { display:flex; align-items:flex-start; gap:12px; background:rgba(251,191,36,.07); border:1px solid rgba(251,191,36,.25); border-radius:12px; padding:16px; margin-bottom:8px; }
  .test-confirm-warning__icon { font-size:1.2rem; flex-shrink:0; }
  .test-confirm-warning p { color:var(--color-text-secondary); margin:0; font-size:13px; line-height:1.65; }
  .test-confirm-warning strong { color:#FCD34D; }
  .test-confirm-stats { display:flex; gap:16px; justify-content:center; padding:16px; background:#ffffff04; border-radius:12px; border:1px solid #ffffff0a; }
  .test-confirm-stat { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .test-confirm-stat__value { font-family:var(--font-display); font-size:28px; font-weight:700; color:var(--color-text-primary); line-height:1; }

  /* ── Submitting overlay ──────────────────────────────── */
  .test-submitting-overlay { position:fixed; inset:0; background:rgba(8,11,18,.92); backdrop-filter:blur(12px); z-index:var(--z-max); display:flex; align-items:center; justify-content:center; }
  .test-submitting-inner { text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px; animation:fadeIn 0.3s ease both; }
  .test-submitting-spinner { font-size:4rem; animation:test-spin-scale 1.5s ease-in-out infinite; }
  @keyframes test-spin-scale { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15) rotate(10deg); } }
  .test-submitting-inner h3 { font-family:var(--font-display); font-size:22px; font-weight:700; color:var(--color-text-primary); margin:0; }
  .test-submitting-inner p { font-family:var(--font-mono); font-size:12px; color:var(--color-text-muted); letter-spacing:.06em; margin:0; }

  /* ── Badges / utility ────────────────────────────────── */
  .badge-verified { background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.3); color:#34D399; border-radius:999px; padding:2px 10px; font-size:11px; font-family:var(--font-mono); font-weight:700; display:inline-flex; align-items:center; gap:4px; }
  .badge-muted { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); background:#ffffff08; border:1px solid #ffffff10; border-radius:999px; padding:2px 10px; display:inline-flex; align-items:center; gap:4px; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width:900px) {
    .test-layout { grid-template-columns:1fr; padding:16px; }
    .test-sidebar { position:static; }
    .test-topbar { padding:12px 16px; }
  }
  @media (max-width:600px) {
    .test-topbar { flex-wrap:wrap; gap:10px; }
    .test-topbar__right { width:100%; justify-content:space-between; }
    .test-question-card__body, .test-options, .test-navigation, .test-question-card__header { padding:16px; }
    .test-question-text { font-size:15px; }
  }
`;

export default SkillTestPage;