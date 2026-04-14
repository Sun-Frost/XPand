import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { useMockInterview } from "../../hooks/user/useStore";
import { useSentiment } from "../../hooks/user/useSentiment";
import type {
  QuestionFeedback,
  InterviewerMode,
  InterviewTone,
  QuestionType,
  AnswerRecord,
  LiveQuestion,
} from "../../hooks/user/useStore";
import type { SentimentLabel, SentimentResult } from "../../hooks/user/useSentiment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseToBlocks(text: string) {
  const lines = text.split("\n");
  const blocks: Array<{ type: string; content: string; num?: number }> = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blocks.push({ type: "spacer", content: "" }); continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) { blocks.push({ type: "heading", content: hm[2].replace(/\*\*/g, ""), num: hm[1].length }); continue; }
    const bm = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (bm) { blocks.push({ type: "heading", content: bm[1], num: 3 }); continue; }
    const nm = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.:]\s*(.+)$/i);
    if (nm) { blocks.push({ type: "numbered", content: nm[2].replace(/\*\*/g, ""), num: Number(nm[1]) }); continue; }
    const bul = line.match(/^[-•*]\s+(.+)$/);
    if (bul) { blocks.push({ type: "bullet", content: bul[1].replace(/\*\*/g, "") }); continue; }
    blocks.push({ type: "paragraph", content: line.replace(/\*\*([^*]+)\*\*/g, "$1") });
  }
  return blocks;
}

type Block = ReturnType<typeof parseToBlocks>[number];

const ProseBlock: React.FC<{ block: Block; accent?: string }> = ({ block, accent = "#A78BFA" }) => {
  switch (block.type) {
    case "spacer": return <div style={{ height: 10 }} />;
    case "heading":
      return (
        <h3 className={`mi-prose-h mi-prose-h--${block.num}`} style={block.num === 2 ? { color: accent } : block.num === 3 ? { color: `${accent}cc` } : {}}>
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
    default: return <p className="mi-prose-para">{block.content}</p>;
  }
};

// Sentiment display config
const SENTIMENT_CONFIG: Record<SentimentLabel, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  happy:     { emoji: "😊", label: "Happy",      color: "#34D399", bg: "#34D39912", border: "#34D39933" },
  neutral:   { emoji: "😐", label: "Neutral",    color: "#94A3B8", bg: "#94A3B812", border: "#94A3B833" },
  nervous:   { emoji: "😰", label: "Nervous",    color: "#60A5FA", bg: "#60A5FA12", border: "#60A5FA33" },
  angry:     { emoji: "😤", label: "Frustrated", color: "#F87171", bg: "#F8717112", border: "#F8717133" },
  confident: { emoji: "😎", label: "Confident",  color: "#FBBF24", bg: "#FBBF2412", border: "#FBBF2433" },
  unknown:   { emoji: "🎭", label: "Unknown",    color: "#A78BFA", bg: "#A78BFA12", border: "#A78BFA33" },
};

const MODE_CONFIG: Record<InterviewerMode, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  friendly: { label: "Good Cop",  icon: "🤝", color: "#34D399", bg: "#0D2B1F", border: "#34D39933", desc: "Supportive & encouraging" },
  strict:   { label: "Bad Cop",   icon: "⚡", color: "#F87171", bg: "#2B0D0D", border: "#F8717133", desc: "Challenging & direct" },
};

const TONE_CONFIG: Record<InterviewTone, { label: string; color: string; bg: string; border: string; icon: string }> = {
  good_cop: { label: "Good Cop",  icon: "🤝", color: "#34D399", bg: "#0D2B1F", border: "#34D39933" },
  bad_cop:  { label: "Bad Cop",   icon: "⚡", color: "#F87171", bg: "#2B0D0D", border: "#F8717133" },
  neutral:  { label: "Neutral",   icon: "🎯", color: "#94A3B8", bg: "#1A2030", border: "#94A3B833" },
};

const QTYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string; border: string; icon: string }> = {
  technical: { label: "Technical", icon: "⚙️", color: "#60A5FA", bg: "#1E3A5F18", border: "#60A5FA33" },
  personal:  { label: "Personal",  icon: "🙋", color: "#C084FC", bg: "#4A178018", border: "#C084FC33" },
};

// ---------------------------------------------------------------------------
// Camera / Sentiment Widget
// ---------------------------------------------------------------------------

const SentimentWidget: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: string;
  isAnalysing: boolean;
  lastSentiment: SentimentResult | null;
  cameraError: string | null;
  onRequestPermission: () => void;
}> = ({ videoRef, permission, isAnalysing, lastSentiment, cameraError, onRequestPermission }) => {
  const sc = lastSentiment ? SENTIMENT_CONFIG[lastSentiment.label] : null;
  const isGranted = permission === "granted";
  const isRetryable = permission === "pending" || (permission === "denied" && cameraError !== null &&
    !cameraError.includes("was denied") && !cameraError.includes("No camera"));
  const isHardDenied = permission === "denied" && (!cameraError || cameraError.includes("was denied"));

  return (
    <div className="mi-sentiment-widget">
      <div className="mi-camera-box">
        <video
          ref={videoRef}
          className="mi-camera-video"
          autoPlay
          muted
          playsInline
          style={{ display: isGranted ? "block" : "none" }}
        />
        {isGranted && isAnalysing && (
          <div className="mi-camera-scanning"><div className="mi-camera-scanline" /></div>
        )}
        {!isGranted && (
          <div className="mi-camera-placeholder">
            <span className="mi-camera-placeholder__icon">
              {isHardDenied || permission === "unsupported" ? "🚫" : "📷"}
            </span>
            <p className="mi-camera-placeholder__text">
              {cameraError ?? (permission === "pending"
                ? "Click to enable camera for sentiment tracking."
                : "Camera unavailable")}
            </p>
            {(permission === "pending" || isRetryable) && (
              <button className="mi-camera-btn" onClick={onRequestPermission}>
                {permission === "pending" ? "Enable Camera" : "Try Again"}
              </button>
            )}
            {isHardDenied && (
              <p className="mi-camera-settings-hint">
                Go to your browser's site settings and allow camera access, then refresh.
              </p>
            )}
          </div>
        )}
      </div>

      {isGranted && sc && (
        <div className="mi-sentiment-badge" style={{ background: sc.bg, borderColor: sc.border }}>
          <span className="mi-sentiment-badge__emoji">{sc.emoji}</span>
          <div className="mi-sentiment-badge__info">
            <span className="mi-sentiment-badge__label" style={{ color: sc.color }}>{sc.label}</span>
            <span className="mi-sentiment-badge__conf">{Math.round((lastSentiment?.confidence ?? 0) * 100)}% confidence</span>
          </div>
        </div>
      )}

      {!isGranted && (
        <p className="mi-sentiment-hint">
          {isHardDenied || permission === "unsupported"
            ? "Interview will proceed without sentiment tracking."
            : "Camera helps the AI adapt its tone to how you're feeling."}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode Badge
// ---------------------------------------------------------------------------

const ModeBadge: React.FC<{ mode: InterviewerMode }> = ({ mode }) => {
  const mc = MODE_CONFIG[mode];
  return (
    <div className="mi-mode-badge" style={{ background: mc.bg, borderColor: mc.border }}>
      <span className="mi-mode-badge__icon">{mc.icon}</span>
      <div className="mi-mode-badge__info">
        <span className="mi-mode-badge__label" style={{ color: mc.color }}>{mc.label} Mode</span>
        <span className="mi-mode-badge__desc">{mc.desc}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Idle Screen
// ---------------------------------------------------------------------------

const IdleScreen: React.FC<{
  onStart: () => void;
  isStarting: boolean;
  error: string | null;
  onRequestCameraPermission: () => void;
}> = ({ onStart, isStarting, error, onRequestCameraPermission }) => {
  const handleStart = useCallback(async () => {
    await onRequestCameraPermission();
    onStart();
  }, [onStart, onRequestCameraPermission]);

  return (
    <div className="mi-idle">
      <div className="mi-idle__card">
        <div className="mi-idle__glow" />
        <div className="mi-idle__icon">🎙️</div>
        <div className="mi-idle__tag">AI MOCK INTERVIEW</div>
        <h2 className="mi-idle__title">Ready to Practice?</h2>
        <p className="mi-idle__desc">
          Gemini AI asks one question at a time — mixing technical questions with personal questions
          grounded in your actual profile. It reads your confidence and adjusts its tone every round.
        </p>
        <ul className="mi-idle__tips">
          {[
            "Mix of Technical ⚙️ and Personal 🙋 questions",
            "Each question adapts to your previous answer",
            "Camera detects your sentiment in real time (optional)",
            "AI switches between Good Cop 🤝 and Bad Cop ⚡ tone",
            "Full performance summary at the end",
          ].map((t, i) => (
            <li key={i} className="mi-idle__tip"><span className="mi-idle__tip-dot" />{t}</li>
          ))}
        </ul>
        <div className="mi-idle__mode-preview">
          <div className="mi-idle__mode-item" style={{ background: "#0D2B1F", borderColor: "#34D39933" }}>
            <span>🤝</span>
            <div>
              <div style={{ color: "#34D399", fontWeight: 700, fontSize: 12 }}>GOOD COP</div>
              <div style={{ color: "#94A3B8", fontSize: 11 }}>Nervous / weak answer</div>
            </div>
          </div>
          <div className="mi-idle__mode-arrow">↔</div>
          <div className="mi-idle__mode-item" style={{ background: "#2B0D0D", borderColor: "#F8717133" }}>
            <span>⚡</span>
            <div>
              <div style={{ color: "#F87171", fontWeight: 700, fontSize: 12 }}>BAD COP</div>
              <div style={{ color: "#94A3B8", fontSize: 11 }}>Confident / strong answer</div>
            </div>
          </div>
        </div>
        {error && <div className="mi-error-box"><span>⚠</span> {error}</div>}
        <button className="mi-start-btn" onClick={handleStart} disabled={isStarting}>
          {isStarting
            ? <span className="mi-start-btn__inner"><span className="mi-spinner" />Gemini is preparing your first question…</span>
            : "Start Interview →"}
        </button>
        {isStarting && <p className="mi-idle__hint">This usually takes 10–15 seconds</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Transition comment — shown above the next question card
// ---------------------------------------------------------------------------

const TransitionComment: React.FC<{
  text: string;
  tone: InterviewTone;
}> = ({ text, tone }) => {
  const tc = TONE_CONFIG[tone];
  return (
    <div className="mi-transition-comment" style={{ borderColor: tc.border, background: tc.bg }}>
      <span className="mi-transition-comment__icon">{tc.icon}</span>
      <p className="mi-transition-comment__text" style={{ color: tc.color }}>{text}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Per-question Feedback Panel
// ---------------------------------------------------------------------------

const FeedbackPanel: React.FC<{ feedback: QuestionFeedback }> = ({ feedback }) => {
  const mc = MODE_CONFIG[feedback.mode];
  const sc = SENTIMENT_CONFIG[feedback.sentiment];

  if (feedback.isLoading) {
    return (
      <div className="mi-feedback-panel mi-feedback-panel--loading" style={{ borderColor: mc.border }}>
        <div className="mi-feedback-panel__spinner" style={{ borderTopColor: mc.color }} />
        <span className="mi-feedback-panel__loading-text" style={{ color: mc.color }}>
          {feedback.mode === "strict" ? "Analysing your answer…" : "Reviewing your answer…"}
        </span>
      </div>
    );
  }

  return (
    <div className="mi-feedback-panel" style={{ borderColor: mc.border, background: `${mc.bg}` }}>
      <div className="mi-feedback-panel__header">
        <span className="mi-feedback-panel__mode-icon">{mc.icon}</span>
        <span className="mi-feedback-panel__mode-label" style={{ color: mc.color }}>{mc.label} Mode</span>
        <div className="mi-feedback-panel__spacer" />
        <span className="mi-sentiment-chip" style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}>
          {sc.emoji} {sc.label}
        </span>
        <span className="mi-qtype-chip" style={{
          background: QTYPE_CONFIG[feedback.questionType].bg,
          borderColor: QTYPE_CONFIG[feedback.questionType].border,
          color: QTYPE_CONFIG[feedback.questionType].color,
        }}>
          {QTYPE_CONFIG[feedback.questionType].icon} {QTYPE_CONFIG[feedback.questionType].label}
        </span>
      </div>
      <p className="mi-feedback-panel__text">{feedback.feedbackText}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step-by-step answering screen
// ---------------------------------------------------------------------------

const StepByStepScreen: React.FC<{
  currentQuestion: LiveQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  perAnswers: string[];
  perFeedback: QuestionFeedback[];
  isFetchingFeedback: boolean;
  isFetchingNextQuestion: boolean;
  currentMode: InterviewerMode;
  onAnswerChange: (v: string) => void;
  onSubmitAnswer: (sentiment: SentimentResult) => void;
  onNextQuestion: () => void;
  onFinishInterview: () => void;
  error: string | null;
  // Sentiment
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: string;
  isAnalysing: boolean;
  lastSentiment: SentimentResult | null;
  cameraError: string | null;
  onRequestPermission: () => void;
  captureAndAnalyse: () => Promise<SentimentResult>;
}> = ({
  currentQuestion, currentQuestionIndex, totalQuestions,
  perAnswers, perFeedback, isFetchingFeedback, isFetchingNextQuestion,
  currentMode, onAnswerChange, onSubmitAnswer, onNextQuestion, onFinishInterview, error,
  videoRef, permission, isAnalysing, lastSentiment, cameraError, onRequestPermission, captureAndAnalyse,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const currentAnswer = perAnswers[currentQuestionIndex] ?? "";
  const currentFeedback = perFeedback[currentQuestionIndex];
  const hasFeedback = currentFeedback && !currentFeedback.isLoading;
  const feedbackLoading = currentFeedback?.isLoading ?? false;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered = perAnswers.slice(0, totalQuestions).every((a) => a.trim().length > 0);
  const progress = (currentQuestionIndex / totalQuestions) * 100;

  const qtype = QTYPE_CONFIG[currentQuestion.type];
  const tone  = TONE_CONFIG[currentQuestion.tone];

  // ---------------------------------------------------------------------------
  // Rolling sentiment sampler
  // Polls every SAMPLE_INTERVAL_MS while the question is active (before submit).
  // Samples are weighted: earlier samples (reading phase) count more than later
  // ones (typing phase) to capture the genuine first-reaction sentiment.
  // When the user submits, we pick the dominant label by weighted vote.
  // ---------------------------------------------------------------------------
  const SAMPLE_INTERVAL_MS = 4000; // capture every 4 s
  const samplesRef = useRef<Array<{ label: SentimentLabel; confidence: number; weight: number }>>([]);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleCountRef = useRef(0);
  const isCapturingRef = useRef(false);

  // Reset samples whenever the question changes
  useEffect(() => {
    samplesRef.current = [];
    sampleCountRef.current = 0;
  }, [currentQuestionIndex]);

  // Start/stop the interval based on whether the question is active
  useEffect(() => {
    const shouldSample = permission === "granted" && !hasFeedback && !feedbackLoading;

    if (!shouldSample) {
      if (sampleTimerRef.current) {
        clearInterval(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
      return;
    }

    // Kick off an immediate first sample (captures the reading reaction)
    const doSample = async () => {
      if (isCapturingRef.current) return; // skip if a capture is already in-flight
      isCapturingRef.current = true;
      try {
        const result = await captureAndAnalyse();
        if (result.label !== "unknown") {
          // Weight: first 2 samples (reading phase) get 2×, rest get 1×
          const n = sampleCountRef.current;
          const weight = n < 2 ? 2 : 1;
          samplesRef.current.push({ label: result.label, confidence: result.confidence, weight });
          sampleCountRef.current += 1;
        }
      } finally {
        isCapturingRef.current = false;
      }
    };

    doSample(); // immediate sample when question appears
    sampleTimerRef.current = setInterval(doSample, SAMPLE_INTERVAL_MS);

    return () => {
      if (sampleTimerRef.current) {
        clearInterval(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, permission, hasFeedback, feedbackLoading]);

  /** Derive the dominant sentiment from accumulated weighted samples. */
  const getDominantSentiment = useCallback((): SentimentResult => {
    const samples = samplesRef.current;
    if (samples.length === 0) {
      // No samples — fall back to a live capture at submit time
      return { label: "neutral", confidence: 0.5 };
    }

    // Weighted vote across all labels
    const scores: Partial<Record<SentimentLabel, number>> = {};
    let totalWeight = 0;
    for (const s of samples) {
      scores[s.label] = (scores[s.label] ?? 0) + s.weight * s.confidence;
      totalWeight += s.weight;
    }

    // Pick the label with the highest weighted score
    const [dominantLabel, dominantScore] = (Object.entries(scores) as [SentimentLabel, number][])
      .sort(([, a], [, b]) => b - a)[0];

    return {
      label: dominantLabel,
      confidence: Math.min(dominantScore / Math.max(totalWeight, 1), 1),
      rawExpressions: undefined,
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [currentAnswer]);

  useEffect(() => {
    if (hasFeedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [hasFeedback]);

  const handleSubmit = useCallback(async () => {
    // Stop the sampler immediately so no new samples race with submission
    if (sampleTimerRef.current) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }

    // Use the weighted rolling average if we have samples; otherwise fall back
    // to a final live capture so we never send an empty sentiment.
    const sentiment =
      samplesRef.current.length > 0
        ? getDominantSentiment()
        : await captureAndAnalyse();

    onSubmitAnswer(sentiment);
  }, [captureAndAnalyse, getDominantSentiment, onSubmitAnswer]);

  const canSubmit = currentAnswer.trim().length > 10 && !isFetchingFeedback && !hasFeedback && !feedbackLoading;

  return (
    <div className="mi-stepbystep">

      {/* Left column */}
      <div className="mi-stepbystep__main">

        {/* Progress + mode */}
        <div className="mi-progress-row">
          <div className="mi-progress-bar">
            <div className="mi-progress-bar__track">
              <div className="mi-progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="mi-progress-bar__label">Q{currentQuestionIndex + 1} / {totalQuestions}</span>
          </div>
          <ModeBadge mode={currentMode} />
        </div>

        {/* Gemini's comment on the previous answer (transition) */}
        {currentQuestion.feedbackOnPrevious && (
          <TransitionComment text={currentQuestion.feedbackOnPrevious} tone={currentQuestion.tone} />
        )}

        {/* Question card */}
        <div className="mi-question-card">
          <div className="mi-section-header">
            <div className="mi-section-header__bar" style={{ background: "#A78BFA" }} />
            <span className="mi-section-header__title">QUESTION {currentQuestionIndex + 1}</span>
            {/* Question type tag */}
            <span className="mi-qtype-tag" style={{ background: qtype.bg, borderColor: qtype.border, color: qtype.color }}>
              {qtype.icon} {qtype.label}
            </span>
            {/* Tone tag */}
            <span className="mi-tone-tag" style={{ background: tone.bg, borderColor: tone.border, color: tone.color }}>
              {tone.icon} {tone.label}
            </span>
            <span className="mi-section-header__badge">Gemini AI</span>
          </div>
          <p className="mi-question-card__text">{currentQuestion.text}</p>
        </div>

        {/* Answer card */}
        <div className="mi-answer-card">
          <div className="mi-section-header">
            <div className="mi-section-header__bar" style={{ background: "#34D399" }} />
            <span className="mi-section-header__title">YOUR ANSWER</span>
          </div>
          <textarea
            ref={textareaRef}
            className="mi-textarea"
            placeholder="Type your answer here…"
            value={currentAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={feedbackLoading || hasFeedback}
            rows={5}
          />
          <div className="mi-answer-footer">
            <span className="mi-answer-footer__chars">
              {currentAnswer.trim().length} chars
              {currentAnswer.trim().length < 10 && currentAnswer.length > 0 && (
                <span className="mi-answer-footer__warn"> (write more)</span>
              )}
            </span>
            {error && <div className="mi-error-box mi-error-box--inline"><span>⚠</span> {error}</div>}
            {!hasFeedback && !feedbackLoading && (
              <button className="mi-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
                {isFetchingFeedback
                  ? <span className="mi-start-btn__inner"><span className="mi-spinner" />Getting feedback…</span>
                  : "Submit Answer →"}
              </button>
            )}
          </div>
        </div>

        {/* Per-question feedback */}
        {(feedbackLoading || hasFeedback) && (
          <div ref={feedbackRef}>
            <FeedbackPanel feedback={currentFeedback} />
          </div>
        )}

        {/* Navigation */}
        {hasFeedback && (
          <div className="mi-nav-row">
            {!isLastQuestion ? (
              <button
                className="mi-next-btn"
                onClick={onNextQuestion}
                disabled={isFetchingNextQuestion}
              >
                {isFetchingNextQuestion
                  ? <span className="mi-start-btn__inner"><span className="mi-spinner" />Gemini is thinking…</span>
                  : "Next Question →"}
              </button>
            ) : (
              <div className="mi-finish-block">
                <p className="mi-finish-block__hint">
                  All {totalQuestions} questions answered.{" "}
                  {allAnswered ? "Submit for your full AI performance report." : "Ensure all questions are answered."}
                </p>
                <button className="mi-finish-btn" onClick={onFinishInterview} disabled={!allAnswered}>
                  Finish & Get Full Feedback →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right column: camera + sentiment */}
      <div className="mi-stepbystep__sidebar">
        <div className="mi-sidebar-section-label">SENTIMENT ANALYSIS</div>
        <SentimentWidget
          videoRef={videoRef}
          permission={permission}
          isAnalysing={isAnalysing}
          lastSentiment={lastSentiment}
          cameraError={cameraError}
          onRequestPermission={onRequestPermission}
        />

        {/* Sentiment history dots */}
        {perFeedback.filter((f) => f && !f.isLoading).length > 0 && (
          <div className="mi-sentiment-history">
            <div className="mi-sidebar-section-label">SENTIMENT HISTORY</div>
            <div className="mi-sentiment-dots">
              {perFeedback.filter(Boolean).map((f, i) => {
                if (!f || f.isLoading) return null;
                const sc = SENTIMENT_CONFIG[f.sentiment];
                const qc = QTYPE_CONFIG[f.questionType];
                return (
                  <div key={i} className="mi-sentiment-dot" title={`Q${i + 1}: ${sc.label} · ${qc.label}`}>
                    <span className="mi-sentiment-dot__emoji">{sc.emoji}</span>
                    <span className="mi-sentiment-dot__type">{qc.icon}</span>
                    <span className="mi-sentiment-dot__q">Q{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode legend */}
        <div className="mi-mode-legend">
          <div className="mi-sidebar-section-label">MODE GUIDE</div>
          <div className="mi-mode-legend__item">
            <span>🤝</span>
            <div>
              <div style={{ color: "#34D399", fontSize: 11, fontWeight: 700 }}>GOOD COP</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>Nervous / weak answers</div>
            </div>
          </div>
          <div className="mi-mode-legend__item">
            <span>⚡</span>
            <div>
              <div style={{ color: "#F87171", fontSize: 11, fontWeight: 700 }}>BAD COP</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>Confident / strong answers</div>
            </div>
          </div>
          <div className="mi-sidebar-section-label" style={{ marginTop: 8 }}>QUESTION TYPES</div>
          <div className="mi-mode-legend__item">
            <span>⚙️</span>
            <div>
              <div style={{ color: "#60A5FA", fontSize: 11, fontWeight: 700 }}>TECHNICAL</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>Skills & domain knowledge</div>
            </div>
          </div>
          <div className="mi-mode-legend__item">
            <span>🙋</span>
            <div>
              <div style={{ color: "#C084FC", fontSize: 11, fontWeight: 700 }}>PERSONAL</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>Your background & experience</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Completed Screen
// ---------------------------------------------------------------------------

const CompletedScreen: React.FC<{
  questionsText: string;
  userAnswersText: string;
  aiFeedbackText: string;
  sessionSummary: string | null;
  answerRecords: AnswerRecord[];
  createdAt: string;
  onBuyAnother: () => void;
}> = ({ questionsText, userAnswersText, aiFeedbackText, sessionSummary, answerRecords, createdAt, onBuyAnother }) => {
  const feedbackBlocks = useMemo(() => parseToBlocks(aiFeedbackText), [aiFeedbackText]);
  const summaryBlocks  = useMemo(() => sessionSummary ? parseToBlocks(sessionSummary) : [], [sessionSummary]);

  return (
    <div className="mi-completed">
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

      {/* Sentiment + type journey strip */}
      {answerRecords.length > 0 && (
        <div className="mi-journey-strip">
          <div className="mi-journey-strip__title">Your Interview Journey</div>
          <div className="mi-journey-strip__items">
            {answerRecords.map((rec, i) => {
              const sc = SENTIMENT_CONFIG[rec.sentiment.label];
              const mc = MODE_CONFIG[rec.mode];
              const qc = QTYPE_CONFIG[rec.questionType];
              return (
                <div key={i} className="mi-journey-item" title={`${qc.label} · ${sc.label} · ${rec.answerQuality}`}>
                  <span className="mi-journey-item__q">Q{i + 1}</span>
                  <span className="mi-journey-item__type" style={{ color: qc.color }}>{qc.icon}</span>
                  <span className="mi-journey-item__emoji">{sc.emoji}</span>
                  <span className="mi-journey-item__mode-icon" style={{ color: mc.color }}>{mc.icon}</span>
                  <span className="mi-journey-item__quality" style={{
                    color: rec.answerQuality === "strong" ? "#34D399" : rec.answerQuality === "moderate" ? "#FBBF24" : "#F87171"
                  }}>{rec.answerQuality}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mi-completed-layout">
        <div className="mi-completed-main">
          {/* Adaptive summary (Claude) */}
          {summaryBlocks.length > 0 && (
            <div className="mi-summary-card">
              <div className="mi-section-header">
                <div className="mi-section-header__bar" style={{ background: "#FBBF24" }} />
                <span className="mi-section-header__title">ADAPTIVE PERFORMANCE SUMMARY</span>
                <span className="mi-section-header__badge" style={{ background: "#FBBF2412", borderColor: "#FBBF2433", color: "#FBBF24" }}>Claude AI</span>
              </div>
              <div className="mi-feedback-prose card">
                {summaryBlocks.map((b, i) => <ProseBlock key={i} block={b} accent="#FBBF24" />)}
              </div>
            </div>
          )}

          {/* Gemini final feedback */}
          <div className="mi-section-header" style={{ marginTop: summaryBlocks.length > 0 ? 8 : 0 }}>
            <div className="mi-section-header__bar" style={{ background: "#A78BFA" }} />
            <span className="mi-section-header__title">AI FEEDBACK</span>
            <span className="mi-section-header__badge" style={{ background: "#A78BFA12", borderColor: "#A78BFA33", color: "#A78BFA" }}>Gemini</span>
          </div>
          <div className="mi-feedback-prose card">
            {feedbackBlocks.map((b, i) => <ProseBlock key={i} block={b} accent="#A78BFA" />)}
          </div>
        </div>

        <aside className="mi-completed-sidebar">
          <div className="mi-sidebar-card">
            <h3 className="mi-sidebar-card__title">🗺️ Answer Records</h3>
            <div className="mi-sidebar-card__answers">
              {answerRecords.map((rec, i) => {
                const qc = QTYPE_CONFIG[rec.questionType];
                return (
                  <div key={i} className="mi-sidebar-card__answer-chunk">
                    <div className="mi-sidebar-card__answer-meta">
                      <span style={{ color: qc.color, fontSize: 10, fontWeight: 700 }}>{qc.icon} {qc.label}</span>
                      <span className="mi-sidebar-card__answer-q">Q{i + 1}</span>
                    </div>
                    <p className="mi-sidebar-card__answer-question">{rec.question}</p>
                    <p className="mi-sidebar-card__answer-text">{rec.answer}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="mi-buy-btn" onClick={onBuyAnother}>🎙️ Practice Again →</button>
          <button className="mi-skills-btn" onClick={() => window.history.back()}>← Back to Store</button>
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
    interview, phase, isLoading, error,
    currentQuestion, currentQuestionIndex, totalQuestions,
    perAnswers, perFeedback,
    answerRecords, sessionSummary,
    isFetchingFeedback, isFetchingNextQuestion, currentMode,
    goToNextQuestion, setCurrentAnswer,
    submitCurrentAnswer, startInterview, submitAnswers,
  } = useMockInterview(pid);

  const {
    permission, videoRef, isAnalysing, lastSentiment, cameraError,
    requestPermission, captureAndAnalyse,
  } = useSentiment();

  if (isLoading) {
    return (
      <PageLayout pageTitle="Mock Interview">
        <div className="mi-loading"><div className="mi-loading__ring" /><p className="mi-loading__text">Loading session…</p></div>
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
          isStarting={false}
          error={error}
          onRequestCameraPermission={requestPermission}
        />
      )}

      {phase === "starting" && (
        <div className="mi-loading">
          <div className="mi-loading__ring" style={{ borderTopColor: "#A78BFA" }} />
          <p className="mi-loading__text">Gemini is crafting your first question…</p>
          <p className="mi-loading__sub">Usually takes 10–15 seconds</p>
        </div>
      )}

      {phase === "answering" && currentQuestion && (
        <StepByStepScreen
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          perAnswers={perAnswers}
          perFeedback={perFeedback}
          isFetchingFeedback={isFetchingFeedback}
          isFetchingNextQuestion={isFetchingNextQuestion}
          currentMode={currentMode}
          onAnswerChange={setCurrentAnswer}
          onSubmitAnswer={submitCurrentAnswer}
          onNextQuestion={goToNextQuestion}
          onFinishInterview={submitAnswers}
          error={error}
          videoRef={videoRef}
          permission={permission}
          isAnalysing={isAnalysing}
          lastSentiment={lastSentiment}
          cameraError={cameraError}
          onRequestPermission={requestPermission}
          captureAndAnalyse={captureAndAnalyse}
        />
      )}

      {/* fetching_next shows nothing extra — the "Next Question →" button shows a spinner */}

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
          sessionSummary={sessionSummary}
          answerRecords={answerRecords}
          createdAt={interview.createdAt}
          onBuyAnother={() => navigate("/store")}
        />
      )}

      <style>{styles}</style>
    </PageLayout>
  );
};

export default MockInterviewPage;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = `
  /* ── Shared ──────────────────────────────────── */
  .mi-back-btn { background:none; border:none; color:var(--color-text-muted); font-family:var(--font-mono); font-size:12px; letter-spacing:.06em; cursor:pointer; padding:0; margin-bottom:24px; display:flex; align-items:center; gap:6px; transition:color .15s; }
  .mi-back-btn:hover { color:var(--color-text-primary); }
  .mi-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:320px; gap:16px; }
  .mi-loading__ring { width:40px; height:40px; border:3px solid var(--color-border-default); border-top-color:#A78BFA; border-radius:50%; animation:mi-spin 0.8s linear infinite; }
  .mi-loading__text { font-family:var(--font-display); font-size:16px; color:var(--color-text-primary); }
  .mi-loading__sub { font-size:12px; color:var(--color-text-muted); }
  @keyframes mi-spin { to { transform:rotate(360deg); } }
  .mi-section-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
  .mi-section-header__bar { width:3px; height:18px; border-radius:2px; background:#A78BFA; flex-shrink:0; }
  .mi-section-header__title { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.1em; color:var(--color-text-muted); text-transform:uppercase; }
  .mi-section-header__badge { font-family:var(--font-mono); font-size:10px; padding:2px 8px; border-radius:999px; background:#A78BFA12; border:1px solid #A78BFA33; color:#A78BFA; letter-spacing:.04em; }
  .mi-error-box { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#F8717118; border:1px solid #F8717133; border-radius:10px; font-size:13px; color:#F87171; }
  .mi-error-box--inline { margin-top:4px; }
  .mi-prose-h { font-family:var(--font-display); font-weight:700; margin:.5em 0 .25em; display:flex; align-items:center; gap:8px; }
  .mi-prose-h__bar { width:3px; height:1em; border-radius:2px; flex-shrink:0; }
  .mi-prose-h--2 { font-size:16px; } .mi-prose-h--3 { font-size:14px; } .mi-prose-h--4 { font-size:13px; color:var(--color-text-muted); }
  .mi-prose-numbered { display:flex; gap:10px; margin:8px 0; }
  .mi-prose-numbered__n { font-family:var(--font-mono); font-size:13px; font-weight:700; flex-shrink:0; padding-top:1px; }
  .mi-prose-numbered__text { font-size:14px; color:var(--color-text-primary); line-height:1.6; }
  .mi-prose-bullet { display:flex; gap:10px; align-items:flex-start; margin:5px 0; }
  .mi-prose-bullet__dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:7px; }
  .mi-prose-bullet__text { font-size:14px; color:var(--color-text-secondary); line-height:1.6; }
  .mi-prose-para { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin:4px 0; }

  /* ── Question type & tone tags ────────────────── */
  .mi-qtype-tag, .mi-tone-tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.06em; padding:2px 8px; border-radius:999px; border:1px solid; }
  .mi-qtype-chip, .mi-sentiment-chip { font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid; font-family:var(--font-mono); }

  /* ── Transition comment (Gemini's comment on previous answer) ── */
  .mi-transition-comment { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-radius:12px; border:1px solid; margin-bottom:4px; }
  .mi-transition-comment__icon { font-size:1.1rem; flex-shrink:0; margin-top:1px; }
  .mi-transition-comment__text { font-size:13px; line-height:1.65; font-style:italic; }

  /* ── Idle ─────────────────────────────────────── */
  .mi-idle { display:flex; align-items:center; justify-content:center; min-height:480px; }
  .mi-idle__card { position:relative; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:20px; padding:40px; max-width:520px; width:100%; overflow:hidden; }
  .mi-idle__glow { position:absolute; top:-60px; right:-60px; width:220px; height:220px; background:radial-gradient(circle,#A78BFA18,transparent 70%); pointer-events:none; }
  .mi-idle__icon { font-size:2.5rem; margin-bottom:12px; }
  .mi-idle__tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.12em; color:#A78BFA; background:#A78BFA12; border:1px solid #A78BFA33; border-radius:999px; padding:3px 10px; display:inline-block; margin-bottom:14px; }
  .mi-idle__title { font-family:var(--font-display); font-size:26px; font-weight:800; color:var(--color-text-primary); margin-bottom:10px; }
  .mi-idle__desc { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin-bottom:20px; }
  .mi-idle__tips { list-style:none; display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
  .mi-idle__tip { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--color-text-secondary); }
  .mi-idle__tip-dot { width:5px; height:5px; border-radius:50%; background:#A78BFA; flex-shrink:0; }
  .mi-idle__hint { font-size:12px; color:var(--color-text-muted); text-align:center; margin-top:10px; }
  .mi-idle__mode-preview { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
  .mi-idle__mode-item { flex:1; display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; border:1px solid; font-size:1.2rem; }
  .mi-idle__mode-arrow { color:var(--color-text-muted); font-size:18px; }
  .mi-start-btn { width:100%; padding:14px 24px; background:linear-gradient(135deg,#4A2880,#6D4FC4); border:1px solid #A78BFA44; border-radius:12px; color:#fff; font-family:var(--font-mono); font-size:14px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-start-btn:hover:not(:disabled) { box-shadow:0 0 28px #A78BFA22; border-color:#A78BFA88; }
  .mi-start-btn:disabled { opacity:.6; cursor:not-allowed; }
  .mi-start-btn__inner { display:flex; align-items:center; justify-content:center; gap:10px; }
  .mi-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:mi-spin .7s linear infinite; flex-shrink:0; }

  /* ── Step-by-step layout ─────────────────────── */
  .mi-stepbystep { display:grid; grid-template-columns:1fr 240px; gap:24px; align-items:start; }
  .mi-stepbystep__main { display:flex; flex-direction:column; gap:16px; }
  .mi-stepbystep__sidebar { display:flex; flex-direction:column; gap:14px; position:sticky; top:80px; }
  .mi-sidebar-section-label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.12em; color:var(--color-text-muted); text-transform:uppercase; margin-bottom:6px; }

  /* Progress */
  .mi-progress-row { display:flex; align-items:center; gap:12px; }
  .mi-progress-bar { flex:1; display:flex; align-items:center; gap:10px; }
  .mi-progress-bar__track { flex:1; height:4px; background:var(--color-border-default); border-radius:999px; overflow:hidden; }
  .mi-progress-bar__fill { height:100%; background:linear-gradient(90deg,#6D4FC4,#A78BFA); border-radius:999px; transition:width .4s var(--ease-smooth,ease); }
  .mi-progress-bar__label { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); white-space:nowrap; }

  /* Mode badge */
  .mi-mode-badge { display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:8px; border:1px solid; white-space:nowrap; transition:all .25s; }
  .mi-mode-badge__icon { font-size:14px; }
  .mi-mode-badge__info { display:flex; flex-direction:column; }
  .mi-mode-badge__label { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.06em; line-height:1.2; }
  .mi-mode-badge__desc { font-size:10px; color:var(--color-text-muted); line-height:1.2; }

  /* Question card */
  .mi-question-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:24px; }
  .mi-question-card__text { font-size:17px; font-weight:600; color:var(--color-text-primary); line-height:1.6; margin-top:4px; }

  /* Answer card */
  .mi-answer-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:24px; display:flex; flex-direction:column; gap:12px; }
  .mi-textarea { width:100%; min-height:130px; padding:14px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:10px; color:var(--color-text-primary); font-size:14px; font-family:var(--font-body); line-height:1.7; resize:none; outline:none; transition:border-color .13s; box-sizing:border-box; }
  .mi-textarea:focus { border-color:#A78BFA66; }
  .mi-textarea:disabled { opacity:.5; cursor:not-allowed; }
  .mi-answer-footer { display:flex; flex-direction:column; gap:10px; }
  .mi-answer-footer__chars { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); }
  .mi-answer-footer__warn { color:#F87171; }
  .mi-submit-btn { width:100%; padding:12px 24px; background:linear-gradient(135deg,#065F46,#059669); border:1px solid #34D39944; border-radius:10px; color:#fff; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-submit-btn:hover:not(:disabled) { box-shadow:0 0 20px #34D39922; }
  .mi-submit-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* Feedback panel */
  .mi-feedback-panel { border:1px solid; border-radius:14px; padding:20px; transition:all .2s; }
  .mi-feedback-panel--loading { display:flex; align-items:center; gap:12px; padding:16px 20px; }
  .mi-feedback-panel__spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.15); border-radius:50%; animation:mi-spin .7s linear infinite; flex-shrink:0; }
  .mi-feedback-panel__loading-text { font-size:13px; font-family:var(--font-mono); }
  .mi-feedback-panel__header { display:flex; align-items:center; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
  .mi-feedback-panel__mode-icon { font-size:14px; }
  .mi-feedback-panel__mode-label { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.08em; }
  .mi-feedback-panel__spacer { flex:1; }
  .mi-feedback-panel__text { font-size:14px; line-height:1.75; color:var(--color-text-secondary); white-space:pre-wrap; }

  /* Navigation */
  .mi-nav-row { display:flex; justify-content:flex-end; }
  .mi-next-btn { padding:12px 28px; background:linear-gradient(135deg,#1E3A5F,#2563EB); border:1px solid #60A5FA44; border-radius:10px; color:#fff; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-next-btn:hover:not(:disabled) { box-shadow:0 0 20px #60A5FA22; border-color:#60A5FA88; }
  .mi-next-btn:disabled { opacity:.6; cursor:not-allowed; }
  .mi-finish-block { width:100%; display:flex; flex-direction:column; gap:10px; }
  .mi-finish-block__hint { font-size:13px; color:var(--color-text-muted); text-align:center; }
  .mi-finish-btn { width:100%; padding:13px 24px; background:linear-gradient(135deg,#4A2880,#6D4FC4); border:1px solid #A78BFA44; border-radius:10px; color:#fff; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-finish-btn:hover:not(:disabled) { box-shadow:0 0 24px #A78BFA22; }
  .mi-finish-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Sentiment Widget ─────────────────────────── */
  .mi-sentiment-widget { display:flex; flex-direction:column; gap:10px; }
  .mi-camera-box { width:100%; aspect-ratio:4/3; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:12px; overflow:hidden; position:relative; }
  .mi-camera-video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
  .mi-camera-scanning { position:absolute; inset:0; pointer-events:none; }
  .mi-camera-scanline { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#A78BFA,transparent); animation:mi-scan 1.5s linear infinite; }
  @keyframes mi-scan { 0%{top:0} 100%{top:100%} }
  .mi-camera-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:8px; padding:16px; }
  .mi-camera-placeholder__icon { font-size:1.8rem; opacity:.4; }
  .mi-camera-placeholder__text { font-size:11px; color:var(--color-text-muted); text-align:center; line-height:1.5; }
  .mi-camera-btn { padding:6px 14px; background:#A78BFA18; border:1px solid #A78BFA44; border-radius:6px; color:#A78BFA; font-family:var(--font-mono); font-size:11px; font-weight:700; cursor:pointer; transition:all .13s; }
  .mi-camera-btn:hover { background:#A78BFA28; }
  .mi-camera-settings-hint { font-size:10px; color:#F87171; text-align:center; line-height:1.5; margin-top:4px; }
  .mi-sentiment-badge { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:10px; border:1px solid; }
  .mi-sentiment-badge__emoji { font-size:1.4rem; }
  .mi-sentiment-badge__info { display:flex; flex-direction:column; }
  .mi-sentiment-badge__label { font-family:var(--font-mono); font-size:12px; font-weight:700; }
  .mi-sentiment-badge__conf { font-size:10px; color:var(--color-text-muted); }
  .mi-sentiment-hint { font-size:11px; color:var(--color-text-muted); line-height:1.5; text-align:center; }
  .mi-sentiment-history { display:flex; flex-direction:column; gap:6px; }
  .mi-sentiment-dots { display:flex; flex-wrap:wrap; gap:6px; }
  .mi-sentiment-dot { display:flex; flex-direction:column; align-items:center; gap:1px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:8px; padding:5px 8px; }
  .mi-sentiment-dot__emoji { font-size:1rem; }
  .mi-sentiment-dot__type { font-size:.7rem; line-height:1; }
  .mi-sentiment-dot__q { font-family:var(--font-mono); font-size:9px; color:var(--color-text-muted); }
  .mi-mode-legend { display:flex; flex-direction:column; gap:8px; }
  .mi-mode-legend__item { display:flex; align-items:center; gap:8px; font-size:1rem; }

  /* ── Completed ────────────────────────────────── */
  .mi-completed { display:flex; flex-direction:column; gap:24px; }
  .mi-completed-banner { position:relative; background:linear-gradient(135deg,#1A0A30,#2D1B69); border:1px solid #A78BFA33; border-radius:16px; padding:28px 32px; display:flex; align-items:center; justify-content:space-between; overflow:hidden; }
  .mi-completed-banner__glow { position:absolute; top:-40px; left:-40px; width:200px; height:200px; background:radial-gradient(circle,#A78BFA20,transparent 70%); pointer-events:none; }
  .mi-completed-banner__tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.12em; color:#A78BFA; background:#A78BFA18; border:1px solid #A78BFA33; border-radius:999px; padding:3px 10px; display:inline-block; margin-bottom:8px; }
  .mi-completed-banner__title { font-family:var(--font-display); font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
  .mi-completed-banner__date { font-size:13px; color:#A78BFA99; }
  .mi-completed-banner__icon { font-size:2rem; opacity:.6; }
  .mi-journey-strip { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:12px; padding:16px 20px; }
  .mi-journey-strip__title { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.1em; color:var(--color-text-muted); text-transform:uppercase; margin-bottom:12px; }
  .mi-journey-strip__items { display:flex; gap:12px; flex-wrap:wrap; }
  .mi-journey-item { display:flex; align-items:center; gap:5px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:8px; padding:8px 12px; }
  .mi-journey-item__q { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); font-weight:700; }
  .mi-journey-item__type { font-size:.9rem; }
  .mi-journey-item__emoji { font-size:1rem; }
  .mi-journey-item__mode-icon { font-size:.9rem; }
  .mi-journey-item__quality { font-family:var(--font-mono); font-size:10px; font-weight:700; text-transform:uppercase; }
  .mi-completed-layout { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:start; }
  .mi-completed-main { display:flex; flex-direction:column; gap:16px; }
  .mi-summary-card { display:flex; flex-direction:column; gap:10px; }
  .mi-feedback-prose { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:14px; padding:24px; }
  .mi-completed-sidebar { display:flex; flex-direction:column; gap:14px; }
  .mi-sidebar-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:12px; padding:18px; }
  .mi-sidebar-card__title { font-family:var(--font-display); font-size:13px; font-weight:700; color:var(--color-text-primary); margin-bottom:12px; }
  .mi-sidebar-card__answers { display:flex; flex-direction:column; gap:8px; max-height:320px; overflow-y:auto; }
  .mi-sidebar-card__answer-chunk { background:var(--color-bg-surface); border-radius:8px; padding:10px; border-left:2px solid #A78BFA44; }
  .mi-sidebar-card__answer-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
  .mi-sidebar-card__answer-q { font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); }
  .mi-sidebar-card__answer-question { font-size:11px; color:var(--color-text-muted); line-height:1.5; margin-bottom:4px; font-style:italic; }
  .mi-sidebar-card__answer-text { font-size:12px; color:var(--color-text-secondary); line-height:1.6; }
  .mi-buy-btn { width:100%; padding:12px; border-radius:10px; border:1px solid #A78BFA44; background:linear-gradient(135deg,#2D1B69,#1A1040); color:#A78BFA; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all .13s; }
  .mi-buy-btn:hover { box-shadow:0 0 20px #A78BFA18; }
  .mi-skills-btn { width:100%; padding:10px; border-radius:10px; border:1px solid var(--color-border-default); background:transparent; font-size:13px; color:var(--color-text-secondary); cursor:pointer; transition:all .13s; }
  .mi-skills-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  @media (max-width:1024px) {
    .mi-stepbystep { grid-template-columns:1fr; }
    .mi-stepbystep__sidebar { position:static; flex-direction:row; flex-wrap:wrap; }
    .mi-sentiment-widget { max-width:220px; }
    .mi-completed-layout { grid-template-columns:1fr; }
  }
  @media (max-width:640px) {
    .mi-idle__card { padding:24px 18px; }
    .mi-question-card, .mi-answer-card { padding:18px; }
  }
`;