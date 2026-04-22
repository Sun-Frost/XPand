import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon, type IconName } from "../../components/ui/Icon";
import type { TestResultData, QuestionDTO } from "../../hooks/user/useSkillTest";
import type { BadgeLevel } from "../../hooks/user/useSkills";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BADGE_CONFIG: Record<BadgeLevel, {
  label: string; icon: IconName; cls: string;
  color: string; bg: string; border: string;
  glow: string; gradient: string; message: string;
}> = {
  BRONZE: {
    label: "Bronze", icon: "badge-bronze" as IconName, cls: "bronze",
    color: "var(--color-bronze-light)",
    bg: "var(--color-bronze-bg)",
    border: "var(--color-bronze-border)",
    glow: "var(--glow-bronze)",
    gradient: "var(--gradient-bronze, linear-gradient(90deg,#7B4A1A,#CD7F32,#E8A85A))",
    message: "Good start! Keep practising to reach Silver.",
  },
  SILVER: {
    label: "Silver", icon: "badge-silver" as IconName, cls: "silver",
    color: "var(--color-silver-light)",
    bg: "var(--color-silver-bg)",
    border: "var(--color-silver-border)",
    glow: "var(--glow-silver)",
    gradient: "var(--gradient-silver, linear-gradient(90deg,#4A5A68,#94A3B8,#CBD5E1))",
    message: "Great performance! Push for Gold with 90%+.",
  },
  GOLD: {
    label: "Gold", icon: "badge-gold" as IconName, cls: "gold",
    color: "var(--color-gold-light,#FCD34D)",
    bg: "var(--color-gold-bg)",
    border: "var(--color-gold-border)",
    glow: "var(--glow-gold)",
    gradient: "var(--gradient-gold, linear-gradient(90deg,#92400E,#F59E0B,#FCD34D))",
    message: "Outstanding! You've mastered this skill.",
  },
};

const DIFFICULTY_LABELS: Record<string, { label: string; cls: string }> = {
  EASY: { label: "Easy", cls: "diff-easy" },
  MEDIUM: { label: "Medium", cls: "diff-medium" },
  HARD: { label: "Hard", cls: "diff-hard" },
};

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const THRESHOLDS = [
  { pct: 50, label: "Bronze", cls: "bronze" },
  { pct: 70, label: "Silver", cls: "silver" },
  { pct: 90, label: "Gold", cls: "gold" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const AnimatedNumber: React.FC<{ target: number; duration?: number; suffix?: string }> = ({
  target, duration = 1400, suffix = "",
}) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{value}{suffix}</>;
};

const ScoreDial: React.FC<{ scorePercent: number; badge: BadgeLevel | null }> = ({
  scorePercent, badge,
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circumference * (1 - scorePercent / 100)), 300);
    return () => clearTimeout(t);
  }, [scorePercent, circumference]);

  const strokeColor = badge === "GOLD" ? "#F59E0B" : badge === "SILVER" ? "#94A3B8" : badge === "BRONZE" ? "#CD7F32" : "var(--color-border-strong)";

  return (
    <div className="score-dial">
      <svg viewBox="0 0 128 128" className="score-dial__svg">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--color-bg-overlay)" strokeWidth="10" />
        <circle cx="64" cy="64" r={radius} fill="none" stroke={strokeColor} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
        {THRESHOLDS.map(({ pct }) => {
          const angle = (pct / 100) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          return (
            <circle key={pct} cx={64 + (radius + 8) * Math.cos(rad)} cy={64 + (radius + 8) * Math.sin(rad)}
              r="3" fill={strokeColor} opacity="0.4" />
          );
        })}
      </svg>
      <div className="score-dial__center">
        <span className="score-dial__pct"><AnimatedNumber target={scorePercent} suffix="%" /></span>
        <span className="score-dial__label label">Score</span>
      </div>
    </div>
  );
};

const XpFloater: React.FC<{ xp: number }> = ({ xp }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);
  if (!visible || !xp) return null;
  return <div className="xp-gain result-xp-float" style={{ position: "relative" }}><Icon name="xp" size={14} label="" /> +{xp.toLocaleString()} XP</div>;
};

// ---------------------------------------------------------------------------
// Answer review helper — works with or without correctAnswer
// ---------------------------------------------------------------------------

const QuestionReview: React.FC<{
  q: QuestionDTO;
  index: number;
  userAnswer: string | undefined;
}> = ({ q, index, userAnswer }) => {
  // correctAnswer is only available if backend returned questionResults
  const correctAnswer = q.correctAnswer;
  const isCorrect = correctAnswer ? userAnswer === correctAnswer : undefined;
  const diffConfig = DIFFICULTY_LABELS[q.difficultyLevel] ?? { label: q.difficultyLevel, cls: "" };

  return (
    <div
      className={`review-item card animate-fade-in ${isCorrect === true ? "review-item--correct" : isCorrect === false ? "review-item--incorrect" : ""
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="review-item__header">
        <div className="review-item__meta">
          <span className="badge badge-muted">Q{index + 1}</span>
          <span className={`badge ${diffConfig.cls}`}>{diffConfig.label}</span>
          <span className="label review-item__pts">+{q.points} pts</span>
        </div>
        {isCorrect !== undefined && (
          <span className={`review-item__result-badge badge ${isCorrect ? "badge-verified" : "badge-danger"}`}>
            {isCorrect ? <><Icon name="check" size={12} label="" /> Correct</> : <><Icon name="close" size={12} label="" /> Incorrect</>}
          </span>
        )}
        {isCorrect === undefined && userAnswer && (
          <span className="badge badge-muted">Your answer: {userAnswer}</span>
        )}
      </div>

      <p className="review-item__question">{q.questionText}</p>

      <div className="review-options">
        {OPTION_LABELS.map((opt) => {
          const optText = opt === "A" ? q.optionA : opt === "B" ? q.optionB : opt === "C" ? q.optionC : q.optionD;
          const isUser = userAnswer === opt;
          const isCorrectOpt = correctAnswer ? correctAnswer === opt : false;

          let cls = "review-opt";
          if (correctAnswer) {
            if (isCorrectOpt) cls += " review-opt--correct";
            else if (isUser && !isCorrect) cls += " review-opt--wrong";
            else cls += " review-opt--neutral";
          } else {
            // No correct answer from backend — just highlight user's choice
            cls += isUser ? " review-opt--selected" : " review-opt--neutral";
          }

          return (
            <div key={opt} className={cls}>
              <span className="review-opt__letter">{opt}</span>
              <span className="review-opt__text">{optText}</span>
              <span className="review-opt__indicator">
                {correctAnswer
                  ? isCorrectOpt ? <Icon name="check" size={12} label="" /> : isUser && !isCorrect ? <Icon name="close" size={12} label="" /> : ""
                  : isUser ? "●" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {isCorrect === false && !userAnswer && (
        <p className="review-item__skipped label">
          <Icon name="warning" size={12} label="" /> Skipped{correctAnswer ? ` — correct answer was ${correctAnswer}` : ""}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TestResultPage
// ---------------------------------------------------------------------------

const TestResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result as TestResultData | undefined;

  const [showReview, setShowReview] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (badgeRef.current) badgeRef.current.classList.add("animate-level-up");
  }, []);

  if (!result) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="cat-default" size={32} label="" /></div>
          <h3>No result found</h3>
          <p>Please take a skill test first.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/skills")}>
            Go to Skills
          </button>
        </div>
      </div>
    );
  }

  const {
    skillId, skillName, skillCategory,
    score,          // raw points
    scorePercent,   // 0-100, already normalised by useSkillTest
    correctCount, totalQuestions,
    badgeEarned, xpEarned,
    questions, answers,
  } = result;

  const badge = badgeEarned ? BADGE_CONFIG[badgeEarned] : null;
  const passed = badgeEarned !== null;

  return (
    <div className="page-content result-page animate-fade-in" style={{ marginLeft: "auto", marginRight: "auto" }}>

      {/* ══ Hero card ══ */}
      <div className={`result-hero card ${badge ? `result-hero--${badge.cls}` : "result-hero--fail"}`}>
        {badge && <div className="result-hero__stripe" style={{ background: badge.gradient }} />}

        <div className="result-hero__inner">

          {/* Score dial */}
          <div className="result-hero__score-section">
            <ScoreDial scorePercent={scorePercent} badge={badgeEarned} />
            <div className="result-hero__stats">
              <div className="result-stat">
                <span className="result-stat__value" style={{ color: "var(--color-verified)" }}>{correctCount}</span>
                <span className="label result-stat__label">Correct</span>
              </div>
              <div className="result-stat-divider" />
              <div className="result-stat">
                <span className="result-stat__value" style={{ color: "var(--color-danger)" }}>{totalQuestions - correctCount}</span>
                <span className="label result-stat__label">Incorrect</span>
              </div>
              <div className="result-stat-divider" />
              <div className="result-stat">
                <span className="result-stat__value">{totalQuestions}</span>
                <span className="label result-stat__label">Total</span>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="result-hero__badge-section">
            <p className="result-hero__skill-label label">{skillCategory} · Verification</p>
            <h1 className="result-hero__skill-name">{skillName}</h1>

            {badge ? (
              <div className="result-badge-display" ref={badgeRef}>
                <div className="result-badge-icon"
                  style={{ background: badge.bg, borderColor: badge.border, boxShadow: badge.glow }}>
                  <Icon name={badge.icon} size={36} label={badge.label} />
                </div>
                <div className="result-badge-info">
                  <h2 className="result-badge-name" style={{ color: badge.color }}>{badge.label} Badge</h2>
                  <p className="result-badge-message">{badge.message}</p>
                </div>
              </div>
            ) : (
              <div className="result-fail-display">
                <div className="result-fail-icon"><Icon name="result-fail" size={48} label="" /></div>
                <div>
                  <h2 className="result-fail-title">Not quite yet</h2>
                  <p className="result-fail-message">
                    Score: <strong>{score} pts</strong> — you need 18 pts for Bronze. Keep practising!
                  </p>
                </div>
              </div>
            )}

            {xpEarned > 0 && (
              <div className="result-xp-reward">
                <div className="xp-display">
                  <span className="xp-icon"><Icon name="xp" size={16} label="" /></span>
                  <span className="xp-amount">+<AnimatedNumber target={xpEarned} /></span>
                  <span className="result-xp-reward__unit font-display">XP Earned</span>
                </div>
                <XpFloater xp={xpEarned} />
              </div>
            )}
          </div>

          {/* Thresholds */}
          <div className="result-hero__thresholds">
            <p className="label result-hero__thresholds-title">Badge Thresholds</p>
            {[
              { pts: 18, label: "Bronze", cls: "bronze", icon: "badge-bronze" as IconName },
              { pts: 24, label: "Silver", cls: "silver", icon: "badge-silver" as IconName },
              { pts: 28, label: "Gold", cls: "gold", icon: "badge-gold" as IconName },
            ].map(({ pts, label, cls, icon }) => {
              const isEarned = score >= pts;
              return (
                <div key={cls} className={`result-threshold result-threshold--${cls} ${isEarned ? "result-threshold--earned" : ""}`}>
                  <span className="result-threshold__pct">{pts}+ pts</span>
                  <span className="result-threshold__label"><Icon name={icon} size={14} label="" /> {label}</span>
                  {isEarned && <span className="result-threshold__check"><Icon name="check" size={12} label="" /></span>}
                </div>
              );
            })}
            <div className="result-hero__your-score label mt-4">
              Your score: <strong style={{ color: "var(--color-text-primary)" }}>{score} pts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Actions ══ */}
      <div className="result-actions">
        <button className="btn btn-ghost" onClick={() => navigate("/skills")}>← Back to Skills</button>
        <div className="result-actions__right">
          {questions.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setShowReview(!showReview)}>
              {showReview ? "Hide" : "Review"} Answers
            </button>
          )}
          {passed && (
            <button className="btn btn-ghost" onClick={() => navigate("/jobs")}><Icon name="work" size={14} label="" /> Browse Jobs</button>
          )}
          <button className="btn btn-xp" onClick={() => navigate(`/skills/test/${skillId}`, { state: { skillName, skillCategory } })}>
            {passed ? <><Icon name="xp" size={14} label="" /> Retake for Higher Badge</> : <><Icon name="xp" size={14} label="" /> Try Again</>}
          </button>
        </div>
      </div>

      {/* ══ Answer review ══ */}
      {showReview && questions.length > 0 && (
        <section className="result-review animate-fade-in">
          <h2 className="result-review__title">Answer Review</h2>
          <p className="result-review__subtitle">
            {correctCount} of {totalQuestions} correct — see where you went wrong.
          </p>
          <div className="result-review__list">
            {questions.map((q, i) => (
              <QuestionReview key={q.id} q={q} index={i} userAnswer={answers[q.id]} />
            ))}
          </div>
        </section>
      )}

      <style>{styles}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  .result-page { max-width: 1100px; width:100%; margin-left:auto; margin-right:auto; }
  .result-hero { position:relative;overflow:hidden;border-radius:var(--radius-2xl);border:1px solid var(--color-border-default); }
  .result-hero--bronze { border-color:var(--color-bronze-border); }
  .result-hero--silver { border-color:var(--color-silver-border); }
  .result-hero--gold   { border-color:var(--color-gold-border);box-shadow:var(--glow-gold); }
  .result-hero--fail   { border-color:var(--color-danger-border); }
  .result-hero__stripe { position:absolute;top:0;left:0;right:0;height:3px; }
  .result-hero__inner { display:grid;grid-template-columns:minmax(200px,240px) 1fr minmax(180px,220px);gap:var(--space-6);padding:var(--space-8);align-items:start; }
  .result-hero__score-section { display:flex;flex-direction:column;align-items:center;gap:var(--space-4); }
  .score-dial { position:relative;width:128px;height:128px;flex-shrink:0; }
  .score-dial__svg { width:100%;height:100%; }
  .score-dial__center { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px; }
  .score-dial__pct { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary);line-height:1; }
  .score-dial__label { color:var(--color-text-muted); }
  .result-hero__stats { display:flex;align-items:center;gap:var(--space-3);background:var(--color-bg-overlay);border:1px solid var(--color-border-subtle);border-radius:var(--radius-xl);padding:var(--space-3) var(--space-4);flex-wrap:wrap;justify-content:center; }
  .result-stat { display:flex;flex-direction:column;align-items:center;gap:2px; }
  .result-stat__value { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary);line-height:1; }
  .result-stat__label { color:var(--color-text-muted); }
  .result-stat-divider { width:1px;height:32px;background:var(--color-border-subtle); }
  .result-hero__badge-section { display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-4); }
  .result-hero__skill-label { color:var(--color-text-muted); }
  .result-hero__skill-name { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary);margin:0;line-height:1.2; }
  .result-badge-display { display:flex;flex-direction:column;align-items:center;gap:var(--space-3); }
  .result-badge-icon { width:80px;height:80px;border-radius:var(--radius-2xl);border:2px solid;display:flex;align-items:center;justify-content:center;font-size:2.5rem;animation:badge-bounce 0.6s var(--ease-spring,cubic-bezier(0.34,1.56,0.64,1)) 0.5s both; }
  @keyframes badge-bounce { 0% { transform:scale(0) rotate(-20deg);opacity:0; } 60% { transform:scale(1.15) rotate(5deg);opacity:1; } 100% { transform:scale(1) rotate(0deg);opacity:1; } }
  .result-badge-name { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);margin:0;line-height:1; }
  .result-badge-message { font-size:var(--text-sm);color:var(--color-text-muted);margin:0;max-width:280px; }
  .result-fail-display { display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:var(--space-6);background:var(--color-danger-bg);border:1px solid var(--color-danger-border);border-radius:var(--radius-xl); }
  .result-fail-icon { font-size:3rem; }
  .result-fail-title { font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-danger);margin:0; }
  .result-fail-message { font-size:var(--text-sm);color:var(--color-text-muted);margin:0;max-width:280px; }
  .result-fail-message strong { color:var(--color-danger); }
  .result-xp-reward { display:flex;flex-direction:column;align-items:center;gap:var(--space-2); }
  .result-xp-reward__unit { font-size:var(--text-sm);color:var(--color-xp-light,#FCD34D);letter-spacing:var(--tracking-wide); }
  .result-xp-float { position:relative !important;font-size:var(--text-xl);animation:result-xp-pop 0.6s ease both; }
  @keyframes result-xp-pop { from { opacity:0;transform:scale(0.5) translateY(10px); } to { opacity:1;transform:scale(1) translateY(0); } }
  .result-hero__thresholds { display:flex;flex-direction:column;gap:var(--space-2);background:var(--color-bg-overlay);border:1px solid var(--color-border-subtle);border-radius:var(--radius-xl);padding:var(--space-4); }
  .result-hero__thresholds-title { color:var(--color-text-muted);margin-bottom:var(--space-2); }
  .result-threshold { display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);border:1px solid var(--color-border-subtle);background:var(--color-bg-elevated);opacity:0.5;transition:opacity 200ms ease; }
  .result-threshold--earned { opacity:1; }
  .result-threshold--bronze.result-threshold--earned { background:var(--color-bronze-bg);border-color:var(--color-bronze-border); }
  .result-threshold--silver.result-threshold--earned { background:var(--color-silver-bg);border-color:var(--color-silver-border); }
  .result-threshold--gold.result-threshold--earned   { background:var(--color-gold-bg);border-color:var(--color-gold-border);box-shadow:var(--glow-gold); }
  .result-threshold__pct { font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--weight-bold);color:var(--color-text-muted);min-width:40px; }
  .result-threshold__label { flex:1;font-size:var(--text-sm);font-weight:var(--weight-medium);color:var(--color-text-secondary); }
  .result-threshold--earned .result-threshold__label { color:var(--color-text-primary); }
  .result-threshold__check { font-size:var(--text-xs);font-weight:var(--weight-bold);color:var(--color-verified); }
  .result-hero__your-score { color:var(--color-text-muted); }
  .result-actions { display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-top:var(--space-6);flex-wrap:wrap; }
  .result-actions__right { display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap; }
  .result-review { margin-top:var(--space-8); }
  .result-review__title { font-family:var(--font-display);font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-text-primary);margin-bottom:var(--space-2); }
  .result-review__subtitle { color:var(--color-text-muted);margin-bottom:var(--space-6); }
  .result-review__list { display:flex;flex-direction:column;gap:var(--space-4); }
  .review-item { padding:var(--space-5) var(--space-6);border-left:3px solid var(--color-border-default); }
  .review-item--correct   { border-left-color:var(--color-verified); }
  .review-item--incorrect { border-left-color:var(--color-danger); }
  .review-item__header { display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap; }
  .review-item__meta { display:flex;align-items:center;gap:var(--space-2); }
  .review-item__pts { color:var(--color-xp,#F59E0B); }
  .review-item__question { font-size:var(--text-base);font-weight:var(--weight-medium);color:var(--color-text-primary);line-height:var(--leading-relaxed);margin-bottom:var(--space-4); }
  .review-options { display:flex;flex-direction:column;gap:var(--space-2); }
  .review-opt { display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);border:1px solid var(--color-border-subtle);background:var(--color-bg-overlay); }
  .review-opt--correct  { background:var(--color-verified-bg);border-color:var(--color-verified-border); }
  .review-opt--wrong    { background:var(--color-danger-bg);border-color:var(--color-danger-border); }
  .review-opt--selected { background:var(--color-info-bg,rgba(139,92,246,0.08));border-color:var(--color-info-border,rgba(139,92,246,0.22)); }
  .review-opt--neutral  { opacity:0.5; }
  .review-opt__letter { width:24px;height:24px;border-radius:var(--radius-sm);background:var(--color-bg-elevated);border:1px solid var(--color-border-default);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--weight-bold);color:var(--color-text-muted);flex-shrink:0; }
  .review-opt--correct .review-opt__letter { background:var(--color-verified);border-color:var(--color-verified);color:#0C0F15; }
  .review-opt--wrong   .review-opt__letter { background:var(--color-danger);border-color:var(--color-danger);color:#fff; }
  .review-opt__text { flex:1;font-size:var(--text-sm);color:var(--color-text-secondary);line-height:var(--leading-relaxed); }
  .review-opt--correct .review-opt__text { color:var(--color-text-primary); }
  .review-opt__indicator { font-weight:var(--weight-bold);font-size:var(--text-sm);flex-shrink:0; }
  .review-opt--correct .review-opt__indicator { color:var(--color-verified); }
  .review-opt--wrong   .review-opt__indicator { color:var(--color-danger); }
  .review-item__skipped { color:var(--color-warning);margin-top:var(--space-3); }
  .badge-verified { background:var(--color-verified-bg);border-color:var(--color-verified-border);color:var(--color-verified); }
  .badge-danger   { background:var(--color-danger-bg);border-color:var(--color-danger-border);color:var(--color-danger); }
  .diff-easy   { background:var(--color-verified-bg);border-color:var(--color-verified-border);color:var(--color-verified); }
  .diff-medium { background:var(--color-warning-bg);border-color:var(--color-warning-border);color:var(--color-warning); }
  .diff-hard   { background:var(--color-danger-bg);border-color:var(--color-danger-border);color:var(--color-danger); }
  @media (max-width:960px) {
    .result-hero__inner { grid-template-columns:1fr;gap:var(--space-5);padding:var(--space-6); }
    .result-hero__score-section { flex-direction:row;flex-wrap:wrap;justify-content:center;gap:var(--space-4); }
    .result-hero__thresholds { flex-direction:row;flex-wrap:wrap;gap:var(--space-2); }
    .result-threshold { flex:1;min-width:110px; }
    .result-hero__badge-section { padding:0 var(--space-4); }
  }
  @media (max-width:600px) {
    .result-actions { flex-direction:column;align-items:stretch; }
    .result-actions__right { flex-direction:column; }
    .result-actions .btn,.result-actions__right .btn { width:100%;justify-content:center; }
    .review-item { padding:var(--space-4); }
  }
`;

export default TestResultPage;