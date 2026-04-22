import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../../components/user/PageLayout";
import { Icon, type IconName } from "../../components/ui/Icon";
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

// ---------------------------------------------------------------------------
// Sentiment & coaching config
// ---------------------------------------------------------------------------

const SENTIMENT_CONFIG: Record<SentimentLabel, { icon: IconName; label: string; color: string; bg: string; border: string }> = {
  happy:     { icon: "mood-happy"        as IconName, label: "Happy",      color: "#34D399", bg: "#34D39912", border: "#34D39933" },
  neutral:   { icon: "mood-neutral"      as IconName, label: "Neutral",    color: "#94A3B8", bg: "#94A3B812", border: "#94A3B833" },
  nervous:   { icon: "mood-nervous"      as IconName, label: "Nervous",    color: "#60A5FA", bg: "#60A5FA12", border: "#60A5FA33" },
  angry:     { icon: "mood-frustrated"   as IconName, label: "Frustrated", color: "#F87171", bg: "#F8717112", border: "#F8717133" },
  confident: { icon: "mood-confident"    as IconName, label: "Confident",  color: "#FBBF24", bg: "#FBBF2412", border: "#FBBF2433" },
  unknown:   { icon: "interviewer-unknown" as IconName, label: "Unknown",  color: "#A78BFA", bg: "#A78BFA12", border: "#A78BFA33" },
};

// Real-interviewer coaching tips per sentiment
const COACHING_TIPS: Record<SentimentLabel, { headline: string; tips: string[]; color: string; border: string; bg: string; icon: string }> = {
  nervous: {
    headline: "You look nervous — reset before it affects you",
    tips: [
      "Take one slow breath before you type your next sentence.",
      "Slow down — interviewers value clarity over speed.",
      "You already know this material. Trust your preparation.",
      `If you need a moment, it's okay to say "Let me think about that."`,
    ],
    color: "#60A5FA", border: "#60A5FA44", bg: "#0F1E35", icon: "💙",
  },
  angry: {
    headline: "Frustration detected — stay composed",
    tips: [
      "A real interviewer notices irritation. Keep your tone even.",
      "If the question feels unfair, address it calmly and professionally.",
      "Channel the energy into a confident, structured answer.",
    ],
    color: "#F87171", border: "#F8717144", bg: "#2B0D0D", icon: "🧘",
  },
  confident: {
    headline: "Great confidence — now challenge yourself",
    tips: [
      "Don't rush — confident answers that are also thorough leave the best impression.",
      "Add depth: mention edge cases, trade-offs, or real-world examples.",
      "The interviewer may push back — stay composed and defend your reasoning.",
    ],
    color: "#FBBF24", border: "#FBBF2444", bg: "#1F1500", icon: "⚡",
  },
  happy: {
    headline: "You're in a great headspace — keep it up",
    tips: [
      "Positive energy reads well. Don't suppress it — channel it into structure.",
      "Make sure enthusiasm doesn't lead to rushing your answers.",
    ],
    color: "#34D399", border: "#34D39944", bg: "#0D2B1F", icon: "✨",
  },
  neutral: {
    headline: "Neutral is solid — push for warmth",
    tips: [
      "Add a touch of genuine enthusiasm when discussing things you're good at.",
      "A neutral face can read as disengaged — let your passion for the topic come through.",
    ],
    color: "#94A3B8", border: "#94A3B844", bg: "#141B26", icon: "🎯",
  },
  unknown: {
    headline: "Camera couldn't read your expression",
    tips: [
      "Make sure your face is well-lit and visible.",
      "Position yourself centrally in the camera frame.",
    ],
    color: "#A78BFA", border: "#A78BFA44", bg: "#1A1040", icon: "📷",
  },
};

const MODE_CONFIG: Record<InterviewerMode, { label: string; color: string; bg: string; border: string; icon: IconName; desc: string }> = {
  friendly: { label: "Good Cop",  icon: "challenge-social", color: "#34D399", bg: "#0D2B1F", border: "#34D39933", desc: "Supportive & encouraging" },
  strict:   { label: "Bad Cop",   icon: "xp",               color: "#F87171", bg: "#2B0D0D", border: "#F8717133", desc: "Challenging & direct" },
};

const TONE_CONFIG: Record<InterviewTone, { label: string; color: string; bg: string; border: string; icon: IconName }> = {
  good_cop: { label: "Good Cop", icon: "challenge-social", color: "#34D399", bg: "#0D2B1F", border: "#34D39933" },
  bad_cop:  { label: "Bad Cop",  icon: "xp",               color: "#F87171", bg: "#2B0D0D", border: "#F8717133" },
  neutral:  { label: "Neutral",  icon: "cat-default",      color: "#94A3B8", bg: "#1A2030", border: "#94A3B833" },
};

const QTYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string; border: string; icon: IconName }> = {
  technical: { label: "Technical", icon: "cat-backend",       color: "#60A5FA", bg: "#1E3A5F18", border: "#60A5FA33" },
  personal:  { label: "Personal",  icon: "question-personal", color: "#C084FC", bg: "#4A178018", border: "#C084FC33" },
};

// ---------------------------------------------------------------------------
// Coaching Toast — shown when nervous/angry detected
// ---------------------------------------------------------------------------

interface CoachingToastProps {
  sentiment: SentimentLabel;
  visible: boolean;
  onDismiss: () => void;
}

const CoachingToast: React.FC<CoachingToastProps> = ({ sentiment, visible, onDismiss }) => {
  const cfg = COACHING_TIPS[sentiment];
  const tip = useMemo(() => cfg.tips[Math.floor(Math.random() * cfg.tips.length)], [sentiment]);

  return (
    <div className={`mi-coaching-toast ${visible ? "mi-coaching-toast--visible" : ""}`}
         style={{ borderColor: cfg.border, background: cfg.bg }}>
      <div className="mi-coaching-toast__header">
        <span className="mi-coaching-toast__icon">{cfg.icon}</span>
        <span className="mi-coaching-toast__headline" style={{ color: cfg.color }}>{cfg.headline}</span>
        <button className="mi-coaching-toast__close" onClick={onDismiss}>✕</button>
      </div>
      <p className="mi-coaching-toast__tip">{tip}</p>
      <div className="mi-coaching-toast__bar" style={{ background: cfg.color }} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sentiment Coach Panel (sidebar) — full contextual coaching card
// ---------------------------------------------------------------------------

const SentimentCoachPanel: React.FC<{
  sentiment: SentimentResult | null;
  sentimentHistory: SentimentLabel[];
}> = ({ sentiment, sentimentHistory }) => {
  if (!sentiment) return null;

  const cfg  = COACHING_TIPS[sentiment.label];
  const scfg = SENTIMENT_CONFIG[sentiment.label];

  // Derive arc description
  const arcDesc = useMemo(() => {
    if (sentimentHistory.length < 2) return null;
    const first = sentimentHistory[0];
    const last  = sentimentHistory[sentimentHistory.length - 1];
    if (first === last) return null;
    const arrow = `${first} → ${last}`;
    const improved = (first === "nervous" || first === "angry") && (last === "confident" || last === "happy");
    const regressed = (first === "confident" || first === "happy") && (last === "nervous" || last === "angry");
    if (improved) return { text: `${arrow} · Great recovery!`, color: "#34D399" };
    if (regressed) return { text: `${arrow} · Regaining focus?`, color: "#FBBF24" };
    return { text: arrow, color: "#94A3B8" };
  }, [sentimentHistory]);

  return (
    <div className="mi-coach-panel" style={{ borderColor: cfg.border, background: cfg.bg }}>
      <div className="mi-coach-panel__header">
        <span className="mi-coach-panel__emoji">{cfg.icon}</span>
        <div>
          <div className="mi-coach-panel__label" style={{ color: cfg.color }}>{scfg.label}</div>
          <div className="mi-coach-panel__conf">{Math.round(sentiment.confidence * 100)}% confidence</div>
        </div>
        {arcDesc && (
          <div className="mi-coach-panel__arc" style={{ color: arcDesc.color }}>{arcDesc.text}</div>
        )}
      </div>
      <p className="mi-coach-panel__headline" style={{ color: cfg.color }}>{cfg.headline}</p>
      <ul className="mi-coach-panel__tips">
        {cfg.tips.map((t, i) => (
          <li key={i} className="mi-coach-panel__tip">
            <span className="mi-coach-panel__tip-dot" style={{ background: cfg.color }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sentiment Arc Sparkline — mini timeline of emotion dots
// ---------------------------------------------------------------------------

const SentimentArcBar: React.FC<{ history: SentimentLabel[] }> = ({ history }) => {
  if (history.length === 0) return null;
  return (
    <div className="mi-arc-bar">
      <div className="mi-arc-bar__label">EMOTION ARC</div>
      <div className="mi-arc-bar__track">
        {history.map((label, i) => {
          const sc = SENTIMENT_CONFIG[label];
          return (
            <div key={i} className="mi-arc-bar__node" title={`Step ${i + 1}: ${sc.label}`}>
              <div className="mi-arc-bar__dot" style={{ background: sc.color, boxShadow: `0 0 6px ${sc.color}88` }} />
              {i < history.length - 1 && (
                <div className="mi-arc-bar__connector" style={{ background: `linear-gradient(90deg, ${sc.color}, ${SENTIMENT_CONFIG[history[i + 1]].color})` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Breath Prompt — brief mindfulness nudge when nervous ≥ 2 consecutive
// ---------------------------------------------------------------------------

const BreathPrompt: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div className={`mi-breath-prompt ${visible ? "mi-breath-prompt--visible" : ""}`}>
    <div className="mi-breath-ring" />
    <p className="mi-breath-text">Breathe in… hold… breathe out. You've got this.</p>
  </div>
);

// ---------------------------------------------------------------------------
// Camera / Sentiment Widget
// ---------------------------------------------------------------------------

const SentimentWidget: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: string;
  isAnalysing: boolean;
  lastSentiment: SentimentResult | null;
  sentimentHistory: SentimentLabel[];
  cameraError: string | null;
  onRequestPermission: () => void;
}> = ({ videoRef, permission, isAnalysing, lastSentiment, sentimentHistory, cameraError, onRequestPermission }) => {
  const sc = lastSentiment ? SENTIMENT_CONFIG[lastSentiment.label] : null;
  const isGranted = permission === "granted";
  const isHardDenied = permission === "denied" && (!cameraError || cameraError.includes("was denied"));
  const isRetryable = permission === "pending" || (permission === "denied" && cameraError !== null &&
    !cameraError.includes("was denied") && !cameraError.includes("No camera"));

  return (
    <div className="mi-sentiment-widget">
      <div className="mi-camera-box">
        <video
          ref={videoRef}
          className="mi-camera-video"
          autoPlay muted playsInline
          style={{ display: isGranted ? "block" : "none" }}
        />
        {isGranted && isAnalysing && (
          <div className="mi-camera-scanning"><div className="mi-camera-scanline" /></div>
        )}
        {isGranted && lastSentiment && sc && (
          <div className="mi-camera-overlay-badge" style={{ background: sc.bg, borderColor: sc.border }}>
            <span style={{ color: sc.color, fontWeight: 700, fontSize: 11, fontFamily: "var(--font-mono)" }}>{sc.label}</span>
          </div>
        )}
        {!isGranted && (
          <div className="mi-camera-placeholder">
            <span className="mi-camera-placeholder__icon">
              {isHardDenied || permission === "unsupported"
                ? <Icon name="blocked" size={24} label="" />
                : <Icon name="camera" size={24} label="" />}
            </span>
            <p className="mi-camera-placeholder__text">
              {cameraError ?? (permission === "pending"
                ? "Enable camera for real-time coaching."
                : "Camera unavailable")}
            </p>
            {(permission === "pending" || isRetryable) && (
              <button className="mi-camera-btn" onClick={onRequestPermission}>
                {permission === "pending" ? "Enable Camera" : "Try Again"}
              </button>
            )}
            {isHardDenied && (
              <p className="mi-camera-settings-hint">
                Allow camera in browser site settings, then refresh.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sentiment arc sparkline below camera */}
      <SentimentArcBar history={sentimentHistory} />

      {!isGranted && (
        <p className="mi-sentiment-hint">
          {isHardDenied || permission === "unsupported"
            ? "Interview proceeds without sentiment coaching."
            : "Camera enables real-time coaching based on your confidence."}
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
      <span className="mi-mode-badge__icon"><Icon name={mc.icon} size={16} label={mc.label} /></span>
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
        <div className="mi-idle__glow mi-idle__glow--2" />
        <div className="mi-idle__icon"><Icon name="interview" size={40} label="" /></div>
        <div className="mi-idle__tag">AI MOCK INTERVIEW</div>
        <h2 className="mi-idle__title">Ready to Practice?</h2>
        <p className="mi-idle__desc">
          Gemini AI conducts a real interview — adapting its tone, difficulty, and coaching
          based on your confidence in real time. Prepare like a professional.
        </p>
        <ul className="mi-idle__tips">
          {[
            { icon: "🎭", text: "Mix of Technical and Personal questions" },
            { icon: "🧠", text: "Each question adapts to your answer quality" },
            { icon: "📸", text: "Camera reads your confidence every 4 seconds" },
            { icon: "💬", text: "Live coaching when nervousness is detected" },
            { icon: "⚡", text: "Good Cop / Bad Cop tone switching" },
            { icon: "📊", text: "Full performance report at the end" },
          ].map((t, i) => (
            <li key={i} className="mi-idle__tip">
              <span className="mi-idle__tip-icon">{t.icon}</span>
              {t.text}
            </li>
          ))}
        </ul>
        <div className="mi-idle__mode-preview">
          <div className="mi-idle__mode-item" style={{ background: "#0D2B1F", borderColor: "#34D39933" }}>
            <Icon name="challenge-social" size={16} label="" />
            <div>
              <div style={{ color: "#34D399", fontWeight: 700, fontSize: 12 }}>GOOD COP</div>
              <div style={{ color: "#94A3B8", fontSize: 11 }}>Nervous / weak answer</div>
            </div>
          </div>
          <div className="mi-idle__mode-arrow">↔</div>
          <div className="mi-idle__mode-item" style={{ background: "#2B0D0D", borderColor: "#F8717133" }}>
            <Icon name="xp" size={16} label="" />
            <div>
              <div style={{ color: "#F87171", fontWeight: 700, fontSize: 12 }}>BAD COP</div>
              <div style={{ color: "#94A3B8", fontSize: 11 }}>Confident / strong answer</div>
            </div>
          </div>
        </div>
        {error && <div className="mi-error-box"><Icon name="warning" size={14} label="" /> {error}</div>}
        <button className="mi-start-btn" onClick={handleStart} disabled={isStarting}>
          {isStarting
            ? <span className="mi-start-btn__inner"><span className="mi-spinner" />Gemini is preparing your first question…</span>
            : "Start Interview →"}
        </button>
        {isStarting && <p className="mi-idle__hint">Usually takes 10–15 seconds</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Transition comment
// ---------------------------------------------------------------------------

const TransitionComment: React.FC<{ text: string; tone: InterviewTone }> = ({ text, tone }) => {
  const tc = TONE_CONFIG[tone];
  return (
    <div className="mi-transition-comment" style={{ borderColor: tc.border, background: tc.bg }}>
      <div className="mi-transition-comment__icon-wrap" style={{ background: `${tc.color}18`, borderColor: tc.border }}>
        <Icon name={tc.icon} size={14} label="" />
      </div>
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
          {feedback.mode === "strict" ? "Evaluating your answer…" : "Reviewing your answer…"}
        </span>
      </div>
    );
  }

  return (
    <div className="mi-feedback-panel" style={{ borderColor: mc.border, background: mc.bg }}>
      <div className="mi-feedback-panel__header">
        <span className="mi-feedback-panel__mode-icon"><Icon name={mc.icon} size={14} label="" /></span>
        <span className="mi-feedback-panel__mode-label" style={{ color: mc.color }}>{mc.label} Mode</span>
        <div className="mi-feedback-panel__spacer" />
        <span className="mi-sentiment-chip" style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}>
          <Icon name={sc.icon} size={12} label="" /> {sc.label}
        </span>
        <span className="mi-qtype-chip" style={{
          background: QTYPE_CONFIG[feedback.questionType].bg,
          borderColor: QTYPE_CONFIG[feedback.questionType].border,
          color: QTYPE_CONFIG[feedback.questionType].color,
        }}>
          {QTYPE_CONFIG[feedback.questionType].label}
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

  const currentAnswer  = perAnswers[currentQuestionIndex] ?? "";
  const currentFeedback = perFeedback[currentQuestionIndex];
  const hasFeedback    = currentFeedback && !currentFeedback.isLoading;
  const feedbackLoading = currentFeedback?.isLoading ?? false;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered    = perAnswers.slice(0, totalQuestions).every((a) => a.trim().length > 0);
  const progress       = (currentQuestionIndex / totalQuestions) * 100;

  const qtype = QTYPE_CONFIG[currentQuestion.type];
  const tone  = TONE_CONFIG[currentQuestion.tone];

  // ── Rolling sentiment sampler ──────────────────────────────────────────────
  const SAMPLE_INTERVAL_MS = 4000;
  const samplesRef      = useRef<Array<{ label: SentimentLabel; confidence: number; weight: number }>>([]);
  const sampleTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleCountRef  = useRef(0);
  const isCapturingRef  = useRef(false);

  // Flat timeline of all labels seen across all rounds (for arc sparkline + coaching)
  const [globalSentimentHistory, setGlobalSentimentHistory] = useState<SentimentLabel[]>([]);
  // Per-question sample list just for coaching context
  const [questionSentimentHistory, setQuestionSentimentHistory] = useState<SentimentLabel[]>([]);

  // ── Coaching toast state ────────────────────────────────────────────────────
  const [toastVisible, setToastVisible]             = useState(false);
  const [toastSentiment, setToastSentiment]         = useState<SentimentLabel>("neutral");
  const [showBreathPrompt, setShowBreathPrompt]     = useState(false);
  const consecutiveNervousRef                       = useRef(0);
  const lastToastSentimentRef                       = useRef<SentimentLabel | null>(null);
  const toastDismissTimerRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCoachingToast = useCallback((label: SentimentLabel) => {
    // Only show for actionable sentiments, and don't re-show the same one immediately
    const actionable: SentimentLabel[] = ["nervous", "angry", "confident"];
    if (!actionable.includes(label)) return;
    if (lastToastSentimentRef.current === label) return;

    lastToastSentimentRef.current = label;
    setToastSentiment(label);
    setToastVisible(true);

    if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
    toastDismissTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      lastToastSentimentRef.current = null;
    }, 8000);
  }, []);

  const dismissToast = useCallback(() => {
    setToastVisible(false);
    if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
    lastToastSentimentRef.current = null;
  }, []);

  // Reset on question change
  useEffect(() => {
    samplesRef.current = [];
    sampleCountRef.current = 0;
    setQuestionSentimentHistory([]);
    consecutiveNervousRef.current = 0;
    lastToastSentimentRef.current = null;
    setToastVisible(false);
    setShowBreathPrompt(false);
  }, [currentQuestionIndex]);

  // Start/stop the interval
  useEffect(() => {
    const shouldSample = permission === "granted" && !hasFeedback && !feedbackLoading;

    if (!shouldSample) {
      if (sampleTimerRef.current) { clearInterval(sampleTimerRef.current); sampleTimerRef.current = null; }
      return;
    }

    const doSample = async () => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      try {
        const result = await captureAndAnalyse();
        if (result.label !== "unknown") {
          const n = sampleCountRef.current;
          const weight = n < 2 ? 2 : 1;
          samplesRef.current.push({ label: result.label, confidence: result.confidence, weight });
          sampleCountRef.current += 1;

          // Update histories
          setQuestionSentimentHistory(prev => [...prev, result.label]);
          setGlobalSentimentHistory(prev => [...prev, result.label]);

          // Track consecutive nervous
          if (result.label === "nervous") {
            consecutiveNervousRef.current += 1;
          } else {
            consecutiveNervousRef.current = 0;
          }

          // Show breath prompt after 2 consecutive nervous samples
          if (consecutiveNervousRef.current >= 2) {
            setShowBreathPrompt(true);
            setTimeout(() => setShowBreathPrompt(false), 5000);
          }

          // Trigger coaching toast
          triggerCoachingToast(result.label);
        }
      } finally {
        isCapturingRef.current = false;
      }
    };

    doSample();
    sampleTimerRef.current = setInterval(doSample, SAMPLE_INTERVAL_MS);

    return () => {
      if (sampleTimerRef.current) { clearInterval(sampleTimerRef.current); sampleTimerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, permission, hasFeedback, feedbackLoading]);

  const getDominantSentiment = useCallback((): SentimentResult => {
    const samples = samplesRef.current;
    if (samples.length === 0) return { label: "neutral", confidence: 0.5 };
    const scores: Partial<Record<SentimentLabel, number>> = {};
    let totalWeight = 0;
    for (const s of samples) {
      scores[s.label] = (scores[s.label] ?? 0) + s.weight * s.confidence;
      totalWeight += s.weight;
    }
    const [dominantLabel, dominantScore] = (Object.entries(scores) as [SentimentLabel, number][])
      .sort(([, a], [, b]) => b - a)[0];
    return { label: dominantLabel, confidence: Math.min(dominantScore / Math.max(totalWeight, 1), 1) };
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
    if (sampleTimerRef.current) { clearInterval(sampleTimerRef.current); sampleTimerRef.current = null; }
    const sentiment = samplesRef.current.length > 0 ? getDominantSentiment() : await captureAndAnalyse();
    onSubmitAnswer(sentiment);
  }, [captureAndAnalyse, getDominantSentiment, onSubmitAnswer]);

  const canSubmit = currentAnswer.trim().length > 10 && !isFetchingFeedback && !hasFeedback && !feedbackLoading;

  return (
    <div className="mi-stepbystep">

      {/* Coaching Toast — top-right floating */}
      <CoachingToast sentiment={toastSentiment} visible={toastVisible} onDismiss={dismissToast} />

      {/* Breathing prompt — centered overlay */}
      <BreathPrompt visible={showBreathPrompt} />

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

        {/* Gemini's transition comment */}
        {currentQuestion.feedbackOnPrevious && (
          <TransitionComment text={currentQuestion.feedbackOnPrevious} tone={currentQuestion.tone} />
        )}

        {/* Question card */}
        <div className="mi-question-card">
          <div className="mi-section-header">
            <div className="mi-section-header__bar" style={{ background: "#A78BFA" }} />
            <span className="mi-section-header__title">QUESTION {currentQuestionIndex + 1}</span>
            <span className="mi-qtype-tag" style={{ background: qtype.bg, borderColor: qtype.border, color: qtype.color }}>
              <Icon name={qtype.icon} size={10} label="" /> {qtype.label}
            </span>
            <span className="mi-tone-tag" style={{ background: tone.bg, borderColor: tone.border, color: tone.color }}>
              <Icon name={tone.icon} size={10} label="" /> {tone.label}
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
            {error && <div className="mi-error-box mi-error-box--inline"><Icon name="warning" size={14} label="" /> {error}</div>}
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
          <div ref={feedbackRef}><FeedbackPanel feedback={currentFeedback} /></div>
        )}

        {/* Navigation */}
        {hasFeedback && (
          <div className="mi-nav-row">
            {!isLastQuestion ? (
              <button className="mi-next-btn" onClick={onNextQuestion} disabled={isFetchingNextQuestion}>
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

      {/* Right sidebar */}
      <div className="mi-stepbystep__sidebar">

        {/* Camera */}
        <div className="mi-sidebar-section-label">LIVE ANALYSIS</div>
        <SentimentWidget
          videoRef={videoRef}
          permission={permission}
          isAnalysing={isAnalysing}
          lastSentiment={lastSentiment}
          sentimentHistory={globalSentimentHistory}
          cameraError={cameraError}
          onRequestPermission={onRequestPermission}
        />

        {/* Coaching panel — always visible when camera is on */}
        {permission === "granted" && lastSentiment && (
          <>
            <div className="mi-sidebar-section-label" style={{ marginTop: 4 }}>REAL-TIME COACHING</div>
            <SentimentCoachPanel
              sentiment={lastSentiment}
              sentimentHistory={questionSentimentHistory}
            />
          </>
        )}

        {/* Sentiment history dots */}
        {perFeedback.filter((f) => f && !f.isLoading).length > 0 && (
          <div className="mi-sentiment-history">
            <div className="mi-sidebar-section-label">ROUND HISTORY</div>
            <div className="mi-sentiment-dots">
              {perFeedback.filter(Boolean).map((f, i) => {
                if (!f || f.isLoading) return null;
                const sc = SENTIMENT_CONFIG[f.sentiment];
                const qc = QTYPE_CONFIG[f.questionType];
                const mc = MODE_CONFIG[f.mode];
                return (
                  <div key={i} className="mi-sentiment-dot" title={`Q${i + 1}: ${sc.label} · ${qc.label} · ${f.mode}`}
                       style={{ borderColor: sc.border }}>
                    <span className="mi-sentiment-dot__emoji"><Icon name={sc.icon} size={13} label={sc.label} /></span>
                    <span className="mi-sentiment-dot__type" style={{ color: qc.color }}><Icon name={qc.icon} size={11} label={qc.label} /></span>
                    <span className="mi-sentiment-dot__q">Q{i + 1}</span>
                    <span className="mi-sentiment-dot__mode" style={{ color: mc.color }}><Icon name={mc.icon} size={9} label="" /></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode legend */}
        <div className="mi-mode-legend">
          <div className="mi-sidebar-section-label">GUIDE</div>
          {[
            { icon: "challenge-social" as IconName, color: "#34D399", label: "GOOD COP", sub: "Nervous / weak" },
            { icon: "xp" as IconName, color: "#F87171", label: "BAD COP", sub: "Confident / strong" },
          ].map((item) => (
            <div key={item.label} className="mi-mode-legend__item">
              <Icon name={item.icon} size={14} label="" />
              <div>
                <div style={{ color: item.color, fontSize: 10, fontWeight: 700 }}>{item.label}</div>
                <div style={{ color: "#64748B", fontSize: 10 }}>{item.sub}</div>
              </div>
            </div>
          ))}
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

  // Derive overall sentiment arc for the completed screen
  const overallArc = useMemo(() => {
    if (answerRecords.length === 0) return null;
    const labels = answerRecords.map(r => r.sentiment.label);
    const first  = labels[0];
    const last   = labels[labels.length - 1];
    const improved = (first === "nervous" || first === "angry") && (last === "confident" || last === "happy");
    const consistent = labels.every(l => l === first);
    if (improved) return { text: "You recovered your confidence as the interview progressed. 🔥", color: "#34D399" };
    if (consistent && (first === "confident" || first === "happy")) return { text: "Consistently confident throughout. Excellent. ⚡", color: "#FBBF24" };
    if (consistent && first === "nervous") return { text: "Nerves stayed high — focus on pre-interview breathing exercises.", color: "#60A5FA" };
    return { text: `Your emotional arc: ${labels.join(" → ")}`, color: "#94A3B8" };
  }, [answerRecords]);

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
          {overallArc && (
            <p className="mi-completed-banner__arc" style={{ color: overallArc.color }}>{overallArc.text}</p>
          )}
        </div>
        <div className="mi-completed-banner__icon"><Icon name="check" size={24} label="" /></div>
      </div>

      {/* Journey strip */}
      {answerRecords.length > 0 && (
        <div className="mi-journey-strip">
          <div className="mi-journey-strip__title">YOUR INTERVIEW JOURNEY</div>
          <div className="mi-journey-strip__items">
            {answerRecords.map((rec, i) => {
              const sc = SENTIMENT_CONFIG[rec.sentiment.label];
              const mc = MODE_CONFIG[rec.mode];
              const qc = QTYPE_CONFIG[rec.questionType];
              return (
                <div key={i} className="mi-journey-item" title={`${qc.label} · ${sc.label} · ${rec.answerQuality}`}
                     style={{ borderColor: sc.border }}>
                  <span className="mi-journey-item__q">Q{i + 1}</span>
                  <span className="mi-journey-item__type" style={{ color: qc.color }}><Icon name={qc.icon} size={13} label="" /></span>
                  <span className="mi-journey-item__emoji" style={{ color: sc.color }}><Icon name={sc.icon} size={13} label="" /></span>
                  <span className="mi-journey-item__mode-icon" style={{ color: mc.color }}><Icon name={mc.icon} size={12} label="" /></span>
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
          {summaryBlocks.length > 0 && (
            <div className="mi-summary-card">
              <div className="mi-section-header">
                <div className="mi-section-header__bar" style={{ background: "#FBBF24" }} />
                <span className="mi-section-header__title">ADAPTIVE PERFORMANCE SUMMARY</span>
                <span className="mi-section-header__badge" style={{ background: "#FBBF2412", borderColor: "#FBBF2433", color: "#FBBF24" }}>Claude AI</span>
              </div>
              <div className="mi-feedback-prose">
                {summaryBlocks.map((b, i) => <ProseBlock key={i} block={b} accent="#FBBF24" />)}
              </div>
            </div>
          )}

          <div className="mi-section-header" style={{ marginTop: summaryBlocks.length > 0 ? 8 : 0 }}>
            <div className="mi-section-header__bar" style={{ background: "#A78BFA" }} />
            <span className="mi-section-header__title">GEMINI FEEDBACK</span>
            <span className="mi-section-header__badge">Gemini AI</span>
          </div>
          <div className="mi-feedback-prose">
            {feedbackBlocks.map((b, i) => <ProseBlock key={i} block={b} accent="#A78BFA" />)}
          </div>
        </div>

        <aside className="mi-completed-sidebar">
          <div className="mi-sidebar-card">
            <h3 className="mi-sidebar-card__title"><Icon name="map" size={14} label="" /> Answer Records</h3>
            <div className="mi-sidebar-card__answers">
              {answerRecords.map((rec, i) => {
                const qc = QTYPE_CONFIG[rec.questionType];
                const sc = SENTIMENT_CONFIG[rec.sentiment.label];
                return (
                  <div key={i} className="mi-sidebar-card__answer-chunk" style={{ borderLeftColor: sc.color }}>
                    <div className="mi-sidebar-card__answer-meta">
                      <span style={{ color: qc.color, fontSize: 10, fontWeight: 700 }}><Icon name={qc.icon} size={10} label="" /> {qc.label}</span>
                      <span className="mi-sidebar-card__answer-q" style={{ color: sc.color }}>Q{i + 1} · {sc.label}</span>
                    </div>
                    <p className="mi-sidebar-card__answer-question">{rec.question}</p>
                    <p className="mi-sidebar-card__answer-text">{rec.answer}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="mi-buy-btn" onClick={onBuyAnother}><Icon name="interview" size={14} label="" /> Practice Again →</button>
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
        <IdleScreen onStart={startInterview} isStarting={false} error={error} onRequestCameraPermission={requestPermission} />
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
  /* ── Shared ─────────────────────────────────────── */
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

  /* ── Coaching Toast ──────────────────────────────── */
  .mi-coaching-toast {
    position:fixed; top:24px; right:24px; z-index:1000;
    width:300px; border-radius:14px; border:1px solid;
    padding:0; overflow:hidden;
    transform:translateX(340px) scale(0.95);
    opacity:0;
    transition:transform .35s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }
  .mi-coaching-toast--visible { transform:translateX(0) scale(1); opacity:1; }
  .mi-coaching-toast__header { display:flex; align-items:center; gap:10px; padding:12px 14px 8px; }
  .mi-coaching-toast__icon { font-size:18px; flex-shrink:0; }
  .mi-coaching-toast__headline { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:.04em; flex:1; line-height:1.4; }
  .mi-coaching-toast__close { background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:12px; padding:2px 4px; border-radius:4px; transition:color .13s; flex-shrink:0; }
  .mi-coaching-toast__close:hover { color:var(--color-text-primary); }
  .mi-coaching-toast__tip { font-size:12px; color:var(--color-text-secondary); line-height:1.6; padding:0 14px 12px; }
  .mi-coaching-toast__bar { height:3px; width:100%; animation:mi-toast-shrink 8s linear forwards; }
  @keyframes mi-toast-shrink { from { width:100%; } to { width:0%; } }

  /* ── Breathing Prompt ─────────────────────────────── */
  .mi-breath-prompt {
    position:fixed; inset:0; z-index:999;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:rgba(0,0,0,.6); backdrop-filter:blur(6px);
    opacity:0; pointer-events:none;
    transition:opacity .4s ease;
  }
  .mi-breath-prompt--visible { opacity:1; pointer-events:auto; }
  .mi-breath-ring {
    width:100px; height:100px; border-radius:50%;
    border:3px solid #60A5FA44;
    box-shadow:0 0 0 0 #60A5FA44;
    animation:mi-breath 4s ease-in-out infinite;
  }
  @keyframes mi-breath {
    0%,100% { transform:scale(1); box-shadow:0 0 0 0 #60A5FA44; }
    50% { transform:scale(1.3); box-shadow:0 0 0 20px #60A5FA08; }
  }
  .mi-breath-text { color:#60A5FA; font-family:var(--font-mono); font-size:13px; letter-spacing:.08em; margin-top:20px; text-align:center; }

  /* ── Sentiment Coach Panel ────────────────────────── */
  .mi-coach-panel { border:1px solid; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:all .3s ease; }
  .mi-coach-panel__header { display:flex; align-items:center; gap:10px; }
  .mi-coach-panel__emoji { font-size:20px; flex-shrink:0; }
  .mi-coach-panel__label { font-family:var(--font-mono); font-size:12px; font-weight:700; line-height:1.2; }
  .mi-coach-panel__conf { font-size:10px; color:var(--color-text-muted); }
  .mi-coach-panel__arc { margin-left:auto; font-family:var(--font-mono); font-size:10px; font-weight:700; white-space:nowrap; }
  .mi-coach-panel__headline { font-size:12px; font-weight:600; color:var(--color-text-primary); line-height:1.5; }
  .mi-coach-panel__tips { list-style:none; display:flex; flex-direction:column; gap:6px; }
  .mi-coach-panel__tip { display:flex; align-items:flex-start; gap:7px; font-size:11px; color:var(--color-text-secondary); line-height:1.5; }
  .mi-coach-panel__tip-dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; margin-top:5px; }

  /* ── Sentiment Arc Bar ────────────────────────────── */
  .mi-arc-bar { display:flex; flex-direction:column; gap:6px; padding:10px 12px; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:10px; }
  .mi-arc-bar__label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.1em; color:var(--color-text-muted); text-transform:uppercase; }
  .mi-arc-bar__track { display:flex; align-items:center; flex-wrap:wrap; gap:0; }
  .mi-arc-bar__node { display:flex; align-items:center; }
  .mi-arc-bar__dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
  .mi-arc-bar__connector { width:16px; height:2px; flex-shrink:0; }

  /* ── Question type & tone tags ────────────────────── */
  .mi-qtype-tag, .mi-tone-tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.06em; padding:2px 8px; border-radius:999px; border:1px solid; display:flex; align-items:center; gap:4px; }
  .mi-qtype-chip, .mi-sentiment-chip { font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid; font-family:var(--font-mono); display:flex; align-items:center; gap:4px; }

  /* ── Transition comment ───────────────────────────── */
  .mi-transition-comment { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-radius:12px; border:1px solid; margin-bottom:4px; }
  .mi-transition-comment__icon-wrap { width:28px; height:28px; border-radius:8px; border:1px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .mi-transition-comment__text { font-size:13px; line-height:1.65; font-style:italic; flex:1; margin-top:4px; }

  /* ── Idle ─────────────────────────────────────────── */
  .mi-idle { display:flex; align-items:center; justify-content:center; min-height:480px; }
  .mi-idle__card { position:relative; background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:20px; padding:40px; max-width:540px; width:100%; overflow:hidden; }
  .mi-idle__glow { position:absolute; top:-60px; right:-60px; width:220px; height:220px; background:radial-gradient(circle,#A78BFA18,transparent 70%); pointer-events:none; }
  .mi-idle__glow--2 { top:auto; bottom:-60px; right:auto; left:-60px; background:radial-gradient(circle,#34D39910,transparent 70%); }
  .mi-idle__icon { font-size:2.5rem; margin-bottom:12px; }
  .mi-idle__tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.12em; color:#A78BFA; background:#A78BFA12; border:1px solid #A78BFA33; border-radius:999px; padding:3px 10px; display:inline-block; margin-bottom:14px; }
  .mi-idle__title { font-family:var(--font-display); font-size:26px; font-weight:800; color:var(--color-text-primary); margin-bottom:10px; }
  .mi-idle__desc { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin-bottom:20px; }
  .mi-idle__tips { list-style:none; display:flex; flex-direction:column; gap:7px; margin-bottom:20px; }
  .mi-idle__tip { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--color-text-secondary); }
  .mi-idle__tip-icon { font-size:14px; flex-shrink:0; width:20px; text-align:center; }
  .mi-idle__hint { font-size:12px; color:var(--color-text-muted); text-align:center; margin-top:10px; }
  .mi-idle__mode-preview { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
  .mi-idle__mode-item { flex:1; display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; border:1px solid; }
  .mi-idle__mode-arrow { color:var(--color-text-muted); font-size:18px; }
  .mi-start-btn { width:100%; padding:14px 24px; background:linear-gradient(135deg,#4A2880,#6D4FC4); border:1px solid #A78BFA44; border-radius:12px; color:#fff; font-family:var(--font-mono); font-size:14px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-start-btn:hover:not(:disabled) { box-shadow:0 0 28px #A78BFA22; border-color:#A78BFA88; transform:translateY(-1px); }
  .mi-start-btn:disabled { opacity:.6; cursor:not-allowed; }
  .mi-start-btn__inner { display:flex; align-items:center; justify-content:center; gap:10px; }
  .mi-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:mi-spin .7s linear infinite; flex-shrink:0; }

  /* ── Step-by-step layout ──────────────────────────── */
  .mi-stepbystep { display:grid; grid-template-columns:1fr 256px; gap:24px; align-items:start; }
  .mi-stepbystep__main { display:flex; flex-direction:column; gap:16px; }
  .mi-stepbystep__sidebar { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
  .mi-sidebar-section-label { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:.12em; color:var(--color-text-muted); text-transform:uppercase; margin-bottom:4px; }

  /* Progress */
  .mi-progress-row { display:flex; align-items:center; gap:12px; }
  .mi-progress-bar { flex:1; display:flex; align-items:center; gap:10px; }
  .mi-progress-bar__track { flex:1; height:4px; background:var(--color-border-default); border-radius:999px; overflow:hidden; }
  .mi-progress-bar__fill { height:100%; background:linear-gradient(90deg,#6D4FC4,#A78BFA); border-radius:999px; transition:width .5s cubic-bezier(.34,1.56,.64,1); }
  .mi-progress-bar__label { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); white-space:nowrap; }

  /* Mode badge */
  .mi-mode-badge { display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:8px; border:1px solid; white-space:nowrap; transition:all .25s; }
  .mi-mode-badge__icon { font-size:14px; }
  .mi-mode-badge__info { display:flex; flex-direction:column; }
  .mi-mode-badge__label { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.06em; line-height:1.2; }
  .mi-mode-badge__desc { font-size:10px; color:var(--color-text-muted); line-height:1.2; }

  /* Question card */
  .mi-question-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:16px; padding:24px; animation:mi-slide-in .25s ease; }
  @keyframes mi-slide-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
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
  .mi-submit-btn:hover:not(:disabled) { box-shadow:0 0 20px #34D39922; transform:translateY(-1px); }
  .mi-submit-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* Feedback panel */
  .mi-feedback-panel { border:1px solid; border-radius:14px; padding:20px; animation:mi-slide-in .25s ease; }
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
  .mi-next-btn:hover:not(:disabled) { box-shadow:0 0 20px #60A5FA22; border-color:#60A5FA88; transform:translateY(-1px); }
  .mi-next-btn:disabled { opacity:.6; cursor:not-allowed; }
  .mi-finish-block { width:100%; display:flex; flex-direction:column; gap:10px; }
  .mi-finish-block__hint { font-size:13px; color:var(--color-text-muted); text-align:center; }
  .mi-finish-btn { width:100%; padding:13px 24px; background:linear-gradient(135deg,#4A2880,#6D4FC4); border:1px solid #A78BFA44; border-radius:10px; color:#fff; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; }
  .mi-finish-btn:hover:not(:disabled) { box-shadow:0 0 24px #A78BFA22; transform:translateY(-1px); }
  .mi-finish-btn:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Camera Widget ──────────────────────────────── */
  .mi-sentiment-widget { display:flex; flex-direction:column; gap:10px; }
  .mi-camera-box { width:100%; aspect-ratio:4/3; background:var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius:12px; overflow:hidden; position:relative; }
  .mi-camera-video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
  .mi-camera-overlay-badge { position:absolute; bottom:8px; left:50%; transform:translateX(-50%); padding:3px 10px; border-radius:999px; border:1px solid; backdrop-filter:blur(8px); }
  .mi-camera-scanning { position:absolute; inset:0; pointer-events:none; }
  .mi-camera-scanline { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#A78BFA,transparent); animation:mi-scan 1.5s linear infinite; }
  @keyframes mi-scan { 0%{top:0} 100%{top:100%} }
  .mi-camera-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:8px; padding:16px; }
  .mi-camera-placeholder__icon { font-size:1.8rem; opacity:.4; }
  .mi-camera-placeholder__text { font-size:11px; color:var(--color-text-muted); text-align:center; line-height:1.5; }
  .mi-camera-btn { padding:6px 14px; background:#A78BFA18; border:1px solid #A78BFA44; border-radius:6px; color:#A78BFA; font-family:var(--font-mono); font-size:11px; font-weight:700; cursor:pointer; transition:all .13s; }
  .mi-camera-btn:hover { background:#A78BFA28; }
  .mi-camera-settings-hint { font-size:10px; color:#F87171; text-align:center; line-height:1.5; margin-top:4px; }
  .mi-sentiment-hint { font-size:11px; color:var(--color-text-muted); line-height:1.5; text-align:center; }
  .mi-sentiment-history { display:flex; flex-direction:column; gap:6px; }
  .mi-sentiment-dots { display:flex; flex-wrap:wrap; gap:6px; }
  .mi-sentiment-dot { display:flex; flex-direction:column; align-items:center; gap:2px; background:var(--color-bg-surface); border:1px solid; border-radius:8px; padding:5px 8px; transition:transform .13s; cursor:default; }
  .mi-sentiment-dot:hover { transform:scale(1.05); }
  .mi-sentiment-dot__emoji { font-size:.95rem; }
  .mi-sentiment-dot__type { font-size:.7rem; line-height:1; }
  .mi-sentiment-dot__q { font-family:var(--font-mono); font-size:9px; color:var(--color-text-muted); }
  .mi-sentiment-dot__mode { font-size:.7rem; line-height:1; }
  .mi-mode-legend { display:flex; flex-direction:column; gap:7px; }
  .mi-mode-legend__item { display:flex; align-items:center; gap:8px; }

  /* ── Completed ──────────────────────────────────── */
  .mi-completed { display:flex; flex-direction:column; gap:24px; }
  .mi-completed-banner { position:relative; background:linear-gradient(135deg,#1A0A30,#2D1B69); border:1px solid #A78BFA33; border-radius:16px; padding:28px 32px; display:flex; align-items:center; justify-content:space-between; overflow:hidden; }
  .mi-completed-banner__glow { position:absolute; top:-40px; left:-40px; width:200px; height:200px; background:radial-gradient(circle,#A78BFA20,transparent 70%); pointer-events:none; }
  .mi-completed-banner__tag { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.12em; color:#A78BFA; background:#A78BFA18; border:1px solid #A78BFA33; border-radius:999px; padding:3px 10px; display:inline-block; margin-bottom:8px; }
  .mi-completed-banner__title { font-family:var(--font-display); font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
  .mi-completed-banner__date { font-size:13px; color:#A78BFA99; }
  .mi-completed-banner__arc { font-size:13px; margin-top:8px; font-weight:600; }
  .mi-completed-banner__icon { font-size:2rem; opacity:.6; }
  .mi-journey-strip { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:12px; padding:16px 20px; }
  .mi-journey-strip__title { font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:.1em; color:var(--color-text-muted); text-transform:uppercase; margin-bottom:12px; }
  .mi-journey-strip__items { display:flex; gap:10px; flex-wrap:wrap; }
  .mi-journey-item { display:flex; align-items:center; gap:5px; background:var(--color-bg-surface); border:1px solid; border-radius:8px; padding:8px 12px; transition:transform .13s; cursor:default; }
  .mi-journey-item:hover { transform:translateY(-2px); }
  .mi-journey-item__q { font-family:var(--font-mono); font-size:11px; color:var(--color-text-muted); font-weight:700; }
  .mi-journey-item__type,.mi-journey-item__emoji,.mi-journey-item__mode-icon { font-size:.9rem; display:flex; align-items:center; }
  .mi-journey-item__quality { font-family:var(--font-mono); font-size:10px; font-weight:700; text-transform:uppercase; }
  .mi-completed-layout { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:start; }
  .mi-completed-main { display:flex; flex-direction:column; gap:16px; }
  .mi-summary-card { display:flex; flex-direction:column; gap:10px; }
  .mi-feedback-prose { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:14px; padding:24px; }
  .mi-completed-sidebar { display:flex; flex-direction:column; gap:14px; }
  .mi-sidebar-card { background:var(--color-bg-elevated); border:1px solid var(--color-border-default); border-radius:12px; padding:18px; }
  .mi-sidebar-card__title { font-family:var(--font-display); font-size:13px; font-weight:700; color:var(--color-text-primary); margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .mi-sidebar-card__answers { display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto; }
  .mi-sidebar-card__answer-chunk { background:var(--color-bg-surface); border-radius:8px; padding:10px; border-left:2px solid; }
  .mi-sidebar-card__answer-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
  .mi-sidebar-card__answer-q { font-family:var(--font-mono); font-size:10px; }
  .mi-sidebar-card__answer-question { font-size:11px; color:var(--color-text-muted); line-height:1.5; margin-bottom:4px; font-style:italic; }
  .mi-sidebar-card__answer-text { font-size:12px; color:var(--color-text-secondary); line-height:1.6; }
  .mi-buy-btn { width:100%; padding:12px; border-radius:10px; border:1px solid #A78BFA44; background:linear-gradient(135deg,#2D1B69,#1A1040); color:#A78BFA; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:.05em; cursor:pointer; transition:all .13s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .mi-buy-btn:hover { box-shadow:0 0 20px #A78BFA18; transform:translateY(-1px); }
  .mi-skills-btn { width:100%; padding:10px; border-radius:10px; border:1px solid var(--color-border-default); background:transparent; font-size:13px; color:var(--color-text-secondary); cursor:pointer; transition:all .13s; }
  .mi-skills-btn:hover { border-color:var(--color-border-strong); color:var(--color-text-primary); }

  @media (max-width:1024px) {
    .mi-stepbystep { grid-template-columns:1fr; }
    .mi-stepbystep__sidebar { position:static; flex-direction:row; flex-wrap:wrap; }
    .mi-sentiment-widget { max-width:220px; }
    .mi-completed-layout { grid-template-columns:1fr; }
    .mi-coaching-toast { top:16px; right:16px; width:280px; }
  }
  @media (max-width:640px) {
    .mi-idle__card { padding:24px 18px; }
    .mi-question-card, .mi-answer-card { padding:18px; }
    .mi-coaching-toast { top:12px; right:12px; left:12px; width:auto; }
  }
`;