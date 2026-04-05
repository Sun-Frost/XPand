import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSkillTest } from "../../hooks/user/useSkillTest";
import type { AnswerMap, QuestionDTO } from "../../hooks/user/useSkillTest";

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

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Frontend: "🖥️", Backend: "⚙️", Data: "📊", Cloud: "☁️", Mobile: "📱",
  };
  return icons[category] ?? "🎯";
}

// ---------------------------------------------------------------------------
// Attempt warning modal — shown before starting
// ---------------------------------------------------------------------------

const AttemptWarning: React.FC<{
  skillName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ skillName, onConfirm, onCancel }) => (
  <div className="modal-backdrop">
    <div className="modal test-confirm-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>⚠️ Attempt Warning</h3>
        <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onCancel}>✕</button>
      </div>
      <div className="modal-body">
        <div className="test-confirm-warning">
          <span className="test-confirm-warning__icon">📋</span>
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
        <button className="btn btn-xp" onClick={onConfirm}>⚡ Start Test</button>
      </div>
    </div>
  </div>
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
          <div className="test-loading__spinner animate-spin">⚙️</div>
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
          <div className="empty-state-icon">⚠️</div>
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
            <span className="test-skill-info__icon">{getCategoryIcon(skillCategory)}</span>
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
            <span className="test-timer__icon">{isUrgent ? "⚠️" : "⏱"}</span>
            <span className="test-timer__time">{formatTime(secondsLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track test-progress-bar">
        <div className="progress-fill progress-verified" style={{ width: `${progress}%` }} />
      </div>

      <div className="test-layout">

        {/* ══ Question panel ══ */}
        <main className="test-main">
          <div className="test-question-card card">

            <div className="test-question-card__header">
              <div className="test-question-card__meta">
                <span className="badge badge-muted">Q{currentIndex + 1} / {questions.length}</span>
                {/* Note: difficulty is intentionally NOT shown to users */}
                <span className="badge badge-muted">{pointsDisplay} pts</span>
              </div>
              <button
                className={`btn btn-icon btn-sm test-flag-btn ${isCurrentFlagged ? "test-flag-btn--active" : ""}`}
                onClick={toggleFlag} title={isCurrentFlagged ? "Unflag" : "Flag for review"}
              >
                🚩
              </button>
            </div>

            <div className="test-question-card__body">
              <p className="test-question-text">{current.questionText}</p>
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
                    {isSelected && <span className="test-option__check">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="test-navigation">
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}>← Previous</button>

              <div className="test-navigation__center">
                {isCurrentFlagged && <span className="badge badge-warning">🚩 Flagged</span>}
                {currentAnswer && !isCurrentFlagged && <span className="badge badge-verified">✓ Answered</span>}
              </div>

              {currentIndex < questions.length - 1 ? (
                <button className="btn btn-primary btn-sm"
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-xp btn-sm" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Test ⚡"}
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ══ Sidebar ══ */}
        <aside className="test-sidebar">
          <div className="test-sidebar__card card">
            <h4 className="test-sidebar__title">Questions</h4>

            <div className="test-question-nav">
              {questions.map((q, i) => {
                const answered = !!answers[q.id];
                const isFlagged = flagged.has(q.id);
                const isActive = i === currentIndex;
                return (
                  <button key={q.id}
                    className={["test-nav-dot", isActive ? "test-nav-dot--active" : "", answered ? "test-nav-dot--answered" : "", isFlagged ? "test-nav-dot--flagged" : ""].filter(Boolean).join(" ")}
                    onClick={() => setCurrentIndex(i)} title={`Q${i + 1}${isFlagged ? " (flagged)" : ""}`}>
                    {isFlagged ? "🚩" : i + 1}
                  </button>
                );
              })}
            </div>

            <div className="test-sidebar__legend">
              <div className="test-legend-item"><span className="test-nav-dot test-nav-dot--answered test-legend-dot" /><span>Answered</span></div>
              <div className="test-legend-item"><span className="test-nav-dot test-legend-dot" /><span>Unanswered</span></div>
              <div className="test-legend-item"><span className="test-legend-flag">🚩</span><span>Flagged</span></div>
            </div>

            <div className="test-sidebar__score-preview">
              <p className="label">Answered</p>
              <div className="test-sidebar__score-bar">
                <div className="progress-track">
                  <div className="progress-fill progress-verified" style={{ width: `${progress}%` }} />
                </div>
                <span className="test-sidebar__score-pct label">{answeredCount}/{questions.length}</span>
              </div>
            </div>

            <button className="btn btn-xp btn-sm w-full" onClick={() => setShowConfirm(true)}
              disabled={isSubmitting || answeredCount === 0}>
              {isSubmitting ? <span className="animate-spin">⚙️</span> : <>⚡ Submit Test</>}
            </button>
          </div>
        </aside>
      </div>

      {/* ══ Confirm submit / exit modal ══ */}
      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="modal test-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Test?</h3>
              <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {answeredCount < questions.length ? (
                <div className="test-confirm-warning">
                  <span className="test-confirm-warning__icon">⚠️</span>
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
                {isSubmitting ? "Submitting..." : "⚡ Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Submitting overlay ══ */}
      {isSubmitting && (
        <div className="test-submitting-overlay">
          <div className="test-submitting-inner">
            <div className="test-submitting-spinner">⚡</div>
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
  .test-page { min-height:100vh;display:flex;flex-direction:column; }
  .test-loading { display:flex;align-items:center;justify-content:center;min-height:60vh; }
  .test-loading__inner { text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-4); }
  .test-loading__spinner { font-size:3rem; }
  .test-topbar { display:flex;align-items:center;justify-content:space-between;gap:var(--space-6);padding:var(--space-4) var(--space-8);background:var(--color-bg-surface);border-bottom:1px solid var(--color-border-subtle);position:sticky;top:0;z-index:var(--z-sticky);backdrop-filter:blur(8px); }
  .test-topbar__left,.test-topbar__right { display:flex;align-items:center;gap:var(--space-4); }
  .test-skill-info { display:flex;align-items:center;gap:var(--space-3); }
  .test-skill-info__icon { font-size:1.5rem;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:var(--color-bg-overlay);border-radius:var(--radius-lg);border:1px solid var(--color-border-default); }
  .test-skill-info__label { display:block;margin-bottom:1px; }
  .test-skill-info__name { font-family:var(--font-display);font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--color-text-primary);line-height:1;margin:0; }
  .test-progress-info { display:flex;flex-direction:column;align-items:flex-end;gap:2px; }
  .test-progress-info__count { font-family:var(--font-mono);font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--color-text-primary); }
  .test-timer { display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-4);transition:all 200ms ease; }
  .test-timer--urgent { background:var(--color-warning-bg);border-color:var(--color-warning-border);animation:pulse-glow 1s ease-in-out infinite; }
  .test-timer__icon { font-size:var(--text-base); }
  .test-timer__time { font-family:var(--font-mono);font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--color-text-primary);min-width:50px; }
  .test-timer--urgent .test-timer__time { color:var(--color-warning); }
  .test-progress-bar { height:3px;border-radius:0; }
  .test-layout { display:grid;grid-template-columns:1fr 280px;gap:var(--space-6);padding:var(--space-6) var(--space-8);flex:1;align-items:start; }
  .test-question-card { background:var(--color-bg-surface);border-radius:var(--radius-xl);overflow:hidden;display:flex;flex-direction:column;gap:0; }
  .test-question-card__header { display:flex;align-items:center;justify-content:space-between;padding:var(--space-5) var(--space-6);border-bottom:1px solid var(--color-border-subtle); }
  .test-question-card__meta { display:flex;gap:var(--space-2);align-items:center; }
  .test-question-card__body { padding:var(--space-6);border-bottom:1px solid var(--color-border-subtle); }
  .test-question-text { font-size:var(--text-lg);font-weight:var(--weight-medium);color:var(--color-text-primary);line-height:var(--leading-relaxed);white-space:pre-wrap;margin:0; }
  .test-options { padding:var(--space-5) var(--space-6);display:flex;flex-direction:column;gap:var(--space-3);border-bottom:1px solid var(--color-border-subtle); }
  .test-option { display:flex;align-items:flex-start;gap:var(--space-4);padding:var(--space-4) var(--space-5);background:var(--color-bg-elevated);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);cursor:pointer;text-align:left;transition:all 120ms ease;position:relative; }
  .test-option:hover:not(.test-option--selected) { border-color:var(--color-border-strong);background:var(--color-bg-hover);transform:translateX(2px); }
  .test-option--selected { background:var(--color-verified-bg);border-color:var(--color-verified-border);box-shadow:var(--glow-verified); }
  .test-option__letter { width:28px;height:28px;border-radius:var(--radius-md);border:1px solid var(--color-border-strong);background:var(--color-bg-overlay);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--weight-bold);color:var(--color-text-muted);flex-shrink:0;transition:all 120ms ease; }
  .test-option__letter--selected { background:var(--color-verified);border-color:var(--color-verified);color:#0C0F15; }
  .test-option__text { flex:1;font-size:var(--text-base);color:var(--color-text-secondary);line-height:var(--leading-relaxed); }
  .test-option--selected .test-option__text { color:var(--color-text-primary); }
  .test-option__check { font-size:var(--text-base);color:var(--color-verified);font-weight:var(--weight-bold);flex-shrink:0; }
  .test-flag-btn { opacity:0.4;transition:opacity 120ms ease; }
  .test-flag-btn:hover { opacity:0.8; }
  .test-flag-btn--active { opacity:1 !important;background:var(--color-warning-bg) !important;border-color:var(--color-warning-border) !important; }
  .test-navigation { display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-5) var(--space-6); }
  .test-navigation__center { display:flex;align-items:center;gap:var(--space-2); }
  .badge-verified { background:var(--color-verified-bg);border-color:var(--color-verified-border);color:var(--color-verified); }
  .test-sidebar { position:sticky;top:calc(var(--layout-navbar-height,60px) + 60px + var(--space-6)); }
  .test-sidebar__card { padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4); }
  .test-sidebar__title { font-family:var(--font-display);font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--color-text-primary);margin:0; }
  .test-question-nav { display:grid;grid-template-columns:repeat(5,1fr);gap:var(--space-2); }
  .test-nav-dot { width:100%;aspect-ratio:1;border-radius:var(--radius-md);border:1px solid var(--color-border-default);background:var(--color-bg-overlay);color:var(--color-text-muted);font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--weight-medium);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 120ms ease; }
  .test-nav-dot--answered { background:var(--color-verified-bg);border-color:var(--color-verified-border);color:var(--color-verified); }
  .test-nav-dot--active { background:var(--color-premium-bg);border-color:var(--color-premium-border);color:var(--color-premium);font-weight:var(--weight-bold); }
  .test-nav-dot--flagged { background:var(--color-warning-bg) !important;border-color:var(--color-warning-border) !important; }
  .test-sidebar__legend { display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-3);background:var(--color-bg-overlay);border-radius:var(--radius-md);border:1px solid var(--color-border-subtle); }
  .test-legend-item { display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);color:var(--color-text-muted); }
  .test-legend-dot { width:18px;height:18px;flex-shrink:0;font-size:10px;aspect-ratio:unset;border-radius:var(--radius-sm); }
  .test-legend-flag { font-size:var(--text-sm); }
  .test-sidebar__score-bar { display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1); }
  .test-sidebar__score-bar .progress-track { flex:1; }
  .test-sidebar__score-pct { white-space:nowrap; }
  .test-confirm-warning { display:flex;align-items:flex-start;gap:var(--space-3);background:var(--color-warning-bg);border:1px solid var(--color-warning-border);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-2); }
  .test-confirm-warning__icon { font-size:1.25rem;flex-shrink:0; }
  .test-confirm-warning p { color:var(--color-text-secondary);margin:0;font-size:var(--text-sm); }
  .test-confirm-warning strong { color:var(--color-warning); }
  .test-confirm-stats { display:flex;gap:var(--space-4);justify-content:center;padding:var(--space-4);background:var(--color-bg-overlay);border-radius:var(--radius-lg);border:1px solid var(--color-border-subtle); }
  .test-confirm-stat { display:flex;flex-direction:column;align-items:center;gap:4px; }
  .test-confirm-stat__value { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary);line-height:1; }
  .test-submitting-overlay { position:fixed;inset:0;background:rgba(12,15,21,0.88);backdrop-filter:blur(8px);z-index:var(--z-max);display:flex;align-items:center;justify-content:center; }
  .test-submitting-inner { text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-4);animation:fadeIn 0.3s ease both; }
  .test-submitting-spinner { font-size:4rem;animation:xp-float-spin 1.5s ease-in-out infinite; }
  @keyframes xp-float-spin { 0%,100% { transform:scale(1); } 50% { transform:scale(1.2) rotate(10deg); } }
  .test-submitting-inner h3 { font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text-primary);margin:0; }
  .test-submitting-inner p { color:var(--color-text-muted);margin:0; }
  @media (max-width:900px) {
    .test-layout { grid-template-columns:1fr;padding:var(--space-4); }
    .test-sidebar { position:static; }
    .test-topbar { padding:var(--space-3) var(--space-4); }
  }
  @media (max-width:600px) {
    .test-topbar { flex-wrap:wrap;gap:var(--space-3); }
    .test-topbar__right { width:100%;justify-content:space-between; }
    .test-question-card__body,.test-options,.test-navigation,.test-question-card__header { padding:var(--space-4); }
    .test-question-text { font-size:var(--text-base); }
  }
`;

export default SkillTestPage;