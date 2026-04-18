import { useState, useEffect, useCallback, useRef } from "react";
import { AI_TIMEOUT_MS, get, post } from "../../api/axios";
import type { SentimentLabel, SentimentResult } from "./useSentiment";
import type { IconName } from "../../components/ui/Icon";

// ---------------------------------------------------------------------------
// Types — aligned to Java DTOs exactly
// ---------------------------------------------------------------------------

export type ItemType = "READINESS_REPORT" | "MOCK_INTERVIEW" | "PRIORITY_SLOT";
export type TransactionType = "CHALLENGE" | "STORE_PURCHASE";
export type StoreCategory = "REPORT" | "INTERVIEW" | "VISIBILITY";
// Mirrors com.example.xpandbackend.models.Enums.SlotRank — Jackson serialises enums as their name by default
export type SlotRank = "FIRST" | "SECOND" | "THIRD";

export interface StoreItemResponse {
  id: number;
  name: string;
  description: string;
  costXp: number;
  itemType: ItemType;
}

export interface UserPurchaseResponse {
  id: number;
  itemId: number;
  itemName: string;
  itemType: ItemType;
  slotRank: SlotRank | null; // FIRST/SECOND/THIRD for PRIORITY_SLOT; null for all other item types
  associatedJobId: number | null;
  associatedJobTitle: string | null;
  isUsed: boolean;
  purchasedAt: string;
}

export interface XPTransactionResponse {
  id: number;
  amount: number;
  sourceType: TransactionType;
  referenceId: number | null;
  createdAt: string;
}

export interface MockInterviewResponse {
  id: number;
  purchaseId: number;
  questionsText: string | null;
  userAnswersText: string | null;
  aiFeedbackText: string | null;
  createdAt: string;
}

export interface ReadinessReportResponse {
  id: number;
  purchaseId: number;
  reportContent: string | null;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface StoreItemWithMeta extends StoreItemResponse {
  category: StoreCategory;
  icon: IconName;
  tagline: string;
  features: string[];
  badge?: "POPULAR" | "NEW" | "LIMITED";
}

// ---------------------------------------------------------------------------
// Interview phase
// ---------------------------------------------------------------------------

export type InterviewPhase =
  | "idle"
  | "starting"       // waiting for first question from backend
  | "answering"      // candidate is typing their answer
  | "fetching_next"  // submitted answer, waiting for next question from Gemini
  | "submitting"     // all questions answered, generating final report
  | "completed";

// ---------------------------------------------------------------------------
// Adaptive AI types
// ---------------------------------------------------------------------------

export type InterviewerMode = "friendly" | "strict";

/** Tone values returned by the backend */
export type InterviewTone = "good_cop" | "bad_cop" | "neutral";

/** "personal" questions are anchored to candidate profile; "technical" to skills/job */
export type QuestionType = "technical" | "personal";

export interface AnswerRecord {
  questionIndex: number;
  question: string;
  questionType: QuestionType;
  answer: string;
  sentiment: SentimentResult;
  tone: InterviewTone;
  mode: InterviewerMode;       // derived from tone for UI
  feedbackText: string;        // per-answer feedback from Claude (frontend)
  feedbackOnPrevious: string;  // Gemini's comment on this answer (in next question response)
  answerQuality: "weak" | "moderate" | "strong";
}

export interface QuestionFeedback {
  questionIndex: number;
  feedbackText: string;        // Claude AI per-answer feedback
  feedbackOnPrevious: string;  // Gemini's transition comment
  isLoading: boolean;
  mode: InterviewerMode;
  tone: InterviewTone;
  sentiment: SentimentLabel;
  questionType: QuestionType;
}

/** Shape of a question in the live session */
export interface LiveQuestion {
  text: string;
  type: QuestionType;
  tone: InterviewTone;
  /** Gemini's comment on the previous answer — shown above the question card */
  feedbackOnPrevious: string | null;
}

// ---------------------------------------------------------------------------
// Item metadata
// ---------------------------------------------------------------------------

const ITEM_META: Record<ItemType, Omit<StoreItemWithMeta, keyof StoreItemResponse>> = {
  READINESS_REPORT: {
    category: "REPORT", icon: "readiness", tagline: "Know exactly where you stand.",
    features: ["Full skill-gap analysis vs. job requirements", "Percentile ranking among verified candidates", "Specific areas to improve before applying", "AI-generated recommendations"],
    badge: "POPULAR",
  },
  MOCK_INTERVIEW: {
    category: "INTERVIEW", icon: "interview", tagline: "Practice until perfect.",
    features: ["Questions tailored to job requirements & personal history", "Adaptive AI — adjusts to your confidence in real time", "Mix of technical and personal questions", "Sentiment-driven tone: Good Cop or Bad Cop", "Full performance summary at the end"],
    badge: "NEW",
  },
  PRIORITY_SLOT: {
    category: "VISIBILITY", icon: "badge-gold", tagline: "Get seen first.",
    features: ["Jump to top of applicant list", "Highlighted profile badge", "Priority review by hiring managers", "Choose your slot rank (1st, 2nd, 3rd)"],
  },
};

function enrichItem(raw: StoreItemResponse): StoreItemWithMeta {
  return { ...raw, ...(ITEM_META[raw.itemType] ?? { category: "REPORT" as StoreCategory, icon: "collection" as IconName, tagline: raw.description, features: [] }) };
}

// ---------------------------------------------------------------------------
// useStore
// ---------------------------------------------------------------------------

export interface UseStoreReturn {
  items: StoreItemWithMeta[];
  purchases: UserPurchaseResponse[];
  unusedPurchases: UserPurchaseResponse[];
  xpBalance: number;
  isLoading: boolean;
  isPurchasing: boolean;
  error: string | null;
  purchaseItem: (itemId: number, associatedJobId?: number | null, slotRank?: number | null) => Promise<{ success: boolean; purchaseId?: number; error?: string }>;
  refetch: () => void;
}

export const useStore = (): UseStoreReturn => {
  const [items, setItems] = useState<StoreItemWithMeta[]>([]);
  const [purchases, setPurchases] = useState<UserPurchaseResponse[]>([]);
  const [unusedPurchases, setUnusedPurchases] = useState<UserPurchaseResponse[]>([]);
  const [xpBalance, setXpBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      get<StoreItemResponse[]>("/user/store/items"),
      get<UserPurchaseResponse[]>("/user/store/purchases"),
      get<UserPurchaseResponse[]>("/user/store/purchases/unused"),
      get<{ xpBalance: number }>("/user/profile"),
    ])
      .then(([rawItems, rawPurchases, rawUnused, profile]) => {
        if (cancelled) return;
        setItems(rawItems.map(enrichItem));
        setPurchases(rawPurchases);
        setUnusedPurchases(rawUnused);
        setXpBalance(profile.xpBalance ?? 0);
      })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load store."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const purchaseItem = useCallback(async (itemId: number, associatedJobId?: number | null, slotRank?: number | null) => {
    setIsPurchasing(true);
    try {
      const body: { itemId: number; associatedJobId?: number | null; slotRank?: number } = { itemId };
      if (associatedJobId != null) body.associatedJobId = associatedJobId;
      if (slotRank != null) body.slotRank = slotRank;
      const purchase = await post<UserPurchaseResponse>("/user/store/purchase", body);
      setPurchases((prev) => [purchase, ...prev]);
      if (!purchase.isUsed) setUnusedPurchases((prev) => [purchase, ...prev]);
      try {
        const profile = await get<{ xpBalance: number }>("/user/profile");
        setXpBalance(profile.xpBalance ?? 0);
      } catch {
        const item = items.find((i) => i.id === itemId);
        if (item) setXpBalance((prev) => Math.max(0, prev - item.costXp));
      }
      return { success: true, purchaseId: purchase.id };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message ?? "Purchase failed." };
    } finally {
      setIsPurchasing(false);
    }
  }, [items]);

  return { items, purchases, unusedPurchases, xpBalance, isLoading, isPurchasing, error, purchaseItem, refetch: () => setTick((t) => t + 1) };
};

// ---------------------------------------------------------------------------
// useReadinessReport
// ---------------------------------------------------------------------------

export interface UseReadinessReportReturn {
  report: ReadinessReportResponse | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

export function useReadinessReport(purchaseId: number | null): UseReadinessReportReturn {
  const [report, setReport] = useState<ReadinessReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchaseId) return;
    setIsLoading(true);
    setError(null);
    get<ReadinessReportResponse>(`/user/ai/report/${purchaseId}`)
      .then((res) => setReport(res))
      .catch(() => setReport(null))
      .finally(() => setIsLoading(false));
  }, [purchaseId]);

  const generate = useCallback(async () => {
    if (!purchaseId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await post<ReadinessReportResponse>(`/user/ai/report/${purchaseId}`, {}, { timeout: AI_TIMEOUT_MS });
      setReport(res);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  }, [purchaseId]);

  return { report, isLoading, isGenerating, error, generate };
}

// ---------------------------------------------------------------------------
// Adaptive AI helpers
// ---------------------------------------------------------------------------

/** Maps backend tone to the UI's InterviewerMode for styling */
export function toneToMode(tone: InterviewTone): InterviewerMode {
  return tone === "good_cop" ? "friendly" : tone === "bad_cop" ? "strict" : "friendly";
}

/** Client-side mode determination — used as an optimistic estimate while the
    backend response is in-flight (avoids a blank mode badge). */
export function determineMode(sentiment: SentimentLabel, quality: "weak" | "moderate" | "strong"): InterviewerMode {
  if (sentiment === "nervous" || sentiment === "angry") return "friendly";
  if (sentiment === "confident") return "strict";
  if (sentiment === "happy" && quality === "strong") return "strict";
  if (sentiment === "neutral" && quality === "strong") return "strict";
  return "friendly";
}

export function estimateAnswerQuality(answer: string): "weak" | "moderate" | "strong" {
  const len = answer.trim().length;
  if (len < 80) return "weak";
  if (len < 280) return "moderate";
  return "strong";
}

// ---------------------------------------------------------------------------
// Backend: fetch next question
// ---------------------------------------------------------------------------

interface QARound {
  question: string;
  questionType: string;
  answer: string;
  answerQuality: string;
  sentiment: string;
}

interface NextQuestionApiResponse {
  question: string;
  questionType: QuestionType;
  tone: InterviewTone;
  feedbackOnPrevious: string | null;
  isLastQuestion: boolean;
}

async function fetchNextQuestion(
  purchaseId: number,
  answeredIndex: number,
  totalQuestions: number,
  sentiment: SentimentResult,
  history: QARound[]
): Promise<NextQuestionApiResponse> {
  return post<NextQuestionApiResponse>(
    "/user/ai/interview/next-question",
    {
      purchaseId,
      answeredIndex,
      totalQuestions,
      sentimentLabel: sentiment.label,
      sentimentConfidence: sentiment.confidence,
      history,
    },
    { timeout: AI_TIMEOUT_MS }
  );
}

// ---------------------------------------------------------------------------
// Frontend: per-answer feedback via Claude
// ---------------------------------------------------------------------------

async function fetchAdaptiveFeedback(
  question: string,
  questionType: QuestionType,
  answer: string,
  qNum: number,
  total: number,
  sentiment: SentimentResult,
  tone: InterviewTone,
  history: AnswerRecord[]
): Promise<{ feedbackText: string; answerQuality: "weak" | "moderate" | "strong" }> {
  const estQuality = estimateAnswerQuality(answer);

  const toneBlock =
    tone === "good_cop"
      ? `INTERVIEWER MODE: FRIENDLY (Good Cop)
- Be warm, encouraging, and supportive
- Acknowledge strengths first before pointing out gaps
- End with a short word of encouragement`
      : tone === "bad_cop"
      ? `INTERVIEWER MODE: STRICT (Bad Cop)
- Be direct and challenging — skip warm-up
- Push deeper: challenge assumptions, probe edge cases or missing nuance
- Maintain pressure — this candidate can handle it`
      : `INTERVIEWER MODE: NEUTRAL
- Be professional and balanced
- State strengths and gaps factually without emotional coloring`;

  const questionContext =
    questionType === "personal"
      ? "This was a PERSONAL/BEHAVIOURAL question about the candidate's background or experience."
      : "This was a TECHNICAL question about skills or domain knowledge.";

  const histCtx =
    history.length > 0
      ? `Previous answer qualities: ${history.map((r) => r.answerQuality).join(", ")}.`
      : "This is the first answer.";

  const prompt = `You are an adaptive AI interviewer giving per-answer feedback.

${questionContext}
Candidate appears: ${sentiment.label} (${Math.round(sentiment.confidence * 100)}% confidence).
${histCtx}

${toneBlock}

---
Question ${qNum} of ${total}: "${question}"
Candidate's Answer: "${answer}"
---

Give feedback in 3–5 sentences. Be specific to this answer and the question type.
For personal questions: comment on clarity, self-awareness, and use of concrete examples.
For technical questions: comment on accuracy, depth, and any missing edge cases.
Do not repeat the question.

After your feedback, on a new line write exactly one of:
QUALITY: weak
QUALITY: moderate
QUALITY: strong`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error("AI request failed.");

  const data = await res.json();
  const raw =
    (data.content as Array<{ type: string; text?: string }>)
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() ?? "";

  const qMatch = raw.match(/\nQUALITY:\s*(weak|moderate|strong)\s*$/i);
  const answerQuality = (qMatch?.[1]?.toLowerCase() ?? estQuality) as "weak" | "moderate" | "strong";
  const feedbackText = raw.replace(/\nQUALITY:\s*(weak|moderate|strong)\s*$/i, "").trim();

  return { feedbackText, answerQuality };
}

// ---------------------------------------------------------------------------
// Session summary via Claude
// ---------------------------------------------------------------------------

async function fetchSessionSummary(records: AnswerRecord[]): Promise<string> {
  const recap = records
    .map(
      (r, i) =>
        `Q${i + 1} [${r.questionType}]: "${r.question}"\n` +
        `Answer: "${r.answer}"\n` +
        `Sentiment: ${r.sentiment.label} | Quality: ${r.answerQuality} | Tone: ${r.tone}`
    )
    .join("\n\n");

  const prompt = `You are an AI interview coach writing a comprehensive post-session report.

Session data (mix of technical and personal questions):
${recap}

Write a structured performance summary with these sections:
1. **Overall Performance** — general impression
2. **Technical Questions** — how well they handled skill/domain questions
3. **Personal Questions** — communication style, self-awareness, use of specific examples
4. **Strongest Answer** — which question they handled best and why
5. **Needs Most Work** — weakest area with specific advice
6. **Sentiment Journey** — how confidence/nervousness evolved and affected answers
7. **Top 3 Action Items** — concrete things to improve before the real interview

Be honest, constructive, and motivating. 300–400 words.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error("Summary request failed.");
  const data = await res.json();
  return (
    (data.content as Array<{ type: string; text?: string }>)
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim() ?? "Summary unavailable."
  );
}

// ---------------------------------------------------------------------------
// useMockInterview — one-question-at-a-time, sentiment-driven
// ---------------------------------------------------------------------------

const TOTAL_QUESTIONS = 5;

export interface UseMockInterviewReturn {
  interview: MockInterviewResponse | null;
  phase: InterviewPhase;

  /** Current live question, or null while loading */
  currentQuestion: LiveQuestion | null;
  /** 0-based index */
  currentQuestionIndex: number;
  /** Total questions this session */
  totalQuestions: number;

  perAnswers: string[];
  perFeedback: QuestionFeedback[];
  answerRecords: AnswerRecord[];
  sessionSummary: string | null;

  /** True while the per-answer Claude feedback is being fetched */
  isFetchingFeedback: boolean;
  /** True while the next Gemini question is being fetched */
  isFetchingNextQuestion: boolean;

  currentMode: InterviewerMode;

  error: string | null;
  isLoading: boolean;

  answers: string;

  setCurrentAnswer: (v: string) => void;
  submitCurrentAnswer: (sentiment: SentimentResult) => Promise<void>;
  goToNextQuestion: () => void;
  startInterview: () => Promise<void>;
  submitAnswers: () => Promise<void>;
  setAnswers: (v: string) => void;
}

export function useMockInterview(purchaseId: number | null): UseMockInterviewReturn {
  const [interview, setInterview] = useState<MockInterviewResponse | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions] = useState(TOTAL_QUESTIONS);

  const [perAnswers, setPerAnswers] = useState<string[]>([]);
  const [perFeedback, setPerFeedback] = useState<QuestionFeedback[]>([]);
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);

  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [isFetchingNextQuestion, setIsFetchingNextQuestion] = useState(false);
  const [currentMode, setCurrentMode] = useState<InterviewerMode>("friendly");
  const [answers, setAnswers] = useState("");

  // Keep a ref to answerRecords so async callbacks always see the latest value
  const answerRecordsRef = useRef<AnswerRecord[]>([]);
  answerRecordsRef.current = answerRecords;

  // ── Load existing session on mount ──────────────────────────────────────

  useEffect(() => {
    if (!purchaseId) return;
    setIsLoading(true);
    setError(null);
    get<MockInterviewResponse>(`/user/ai/interview/${purchaseId}`)
      .then((res) => {
        setInterview(res);
        if (res.aiFeedbackText) {
          // Already completed
          setPhase("completed");
          setAnswers(res.userAnswersText ?? "");
        } else if (res.questionsText) {
          // Mid-session: parse the first question from questionsText JSON
          try {
            const parsed = JSON.parse(res.questionsText);
            setCurrentQuestion({
              text: parsed.question ?? res.questionsText,
              type: (parsed.questionType ?? "technical") as QuestionType,
              tone: (parsed.tone ?? "neutral") as InterviewTone,
              feedbackOnPrevious: parsed.feedbackOnPrevious ?? null,
            });
          } catch {
            // Fallback: treat the raw text as the first question
            setCurrentQuestion({ text: res.questionsText, type: "technical", tone: "neutral", feedbackOnPrevious: null });
          }
          setPerAnswers(new Array(TOTAL_QUESTIONS).fill(""));
          setPhase("answering");
        } else {
          setPhase("idle");
        }
      })
      .catch(() => setPhase("idle"))
      .finally(() => setIsLoading(false));
  }, [purchaseId]);

  // ── Start interview ──────────────────────────────────────────────────────

  const startInterview = useCallback(async () => {
    if (!purchaseId) return;
    setPhase("starting");
    setError(null);
    try {
      const res = await post<MockInterviewResponse>(
        `/user/ai/interview/start/${purchaseId}`,
        {},
        { timeout: AI_TIMEOUT_MS }
      );
      setInterview(res);

      // The backend stores the first question as JSON in questionsText
      let firstQuestion: LiveQuestion;
      try {
        const parsed = JSON.parse(res.questionsText ?? "{}");
        firstQuestion = {
          text: parsed.question ?? "Tell me about yourself.",
          type: (parsed.questionType ?? "personal") as QuestionType,
          tone: (parsed.tone ?? "neutral") as InterviewTone,
          feedbackOnPrevious: null,
        };
      } catch {
        firstQuestion = {
          text: res.questionsText ?? "Tell me about yourself.",
          type: "personal",
          tone: "neutral",
          feedbackOnPrevious: null,
        };
      }

      setCurrentQuestion(firstQuestion);
      setPerAnswers(new Array(TOTAL_QUESTIONS).fill(""));
      setPerFeedback([]);
      setAnswerRecords([]);
      setCurrentQuestionIndex(0);
      setCurrentMode("friendly");
      setPhase("answering");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to start interview.");
      setPhase("idle");
    }
  }, [purchaseId]);

  // ── Set current answer ───────────────────────────────────────────────────

  const setCurrentAnswer = useCallback((v: string) => {
    setPerAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = v;
      return next;
    });
  }, [currentQuestionIndex]);

  // ── Submit current answer ────────────────────────────────────────────────
  // Two things happen in parallel:
  //   1. Claude gives per-answer feedback (fast, ~2s)
  //   2. Gemini fetches the next question (slower, ~10-15s)
  // We show the Claude feedback immediately; when the next question arrives
  // we reveal the "Next Question →" button.

  const submitCurrentAnswer = useCallback(async (sentiment: SentimentResult) => {
    if (!purchaseId) return;
    const currentAnswer = perAnswers[currentQuestionIndex]?.trim();
    if (!currentAnswer || isFetchingFeedback) return;
    if (!currentQuestion) return;

    setIsFetchingFeedback(true);
    setError(null);

    const estQuality = estimateAnswerQuality(currentAnswer);
    const estMode = determineMode(sentiment.label, estQuality);
    setCurrentMode(estMode);

    // Optimistic loading state for feedback panel
    setPerFeedback((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = {
        questionIndex: currentQuestionIndex,
        feedbackText: "",
        feedbackOnPrevious: "",
        isLoading: true,
        mode: estMode,
        tone: sentiment.label === "nervous" ? "good_cop" : sentiment.label === "confident" ? "bad_cop" : "neutral",
        sentiment: sentiment.label,
        questionType: currentQuestion.type,
      };
      return next;
    });

    // Build history for the backend request
    const currentHistory: QARound[] = answerRecordsRef.current.map((r) => ({
      question: r.question,
      questionType: r.questionType,
      answer: r.answer,
      answerQuality: r.answerQuality,
      sentiment: r.sentiment.label,
    }));

    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    try {
      // Fire both in parallel
      const [feedbackResult, nextQuestionResult] = await Promise.allSettled([
        fetchAdaptiveFeedback(
          currentQuestion.text,
          currentQuestion.type,
          currentAnswer,
          currentQuestionIndex + 1,
          totalQuestions,
          sentiment,
          currentQuestion.tone,
          answerRecordsRef.current
        ),
        // Don't fetch next question if this is the last one
        isLastQuestion
          ? Promise.resolve(null)
          : fetchNextQuestion(
              purchaseId,
              currentQuestionIndex,
              totalQuestions,
              sentiment,
              [
                ...currentHistory,
                {
                  question: currentQuestion.text,
                  questionType: currentQuestion.type,
                  answer: currentAnswer,
                  answerQuality: estQuality,
                  sentiment: sentiment.label,
                },
              ]
            ),
      ]);

      // Process Claude feedback
      let feedbackText = "Could not load feedback. Your answer has been saved.";
      let answerQuality: "weak" | "moderate" | "strong" = estQuality;
      let resolvedTone: InterviewTone = currentQuestion.tone;

      if (feedbackResult.status === "fulfilled") {
        feedbackText  = feedbackResult.value.feedbackText;
        answerQuality = feedbackResult.value.answerQuality;
      }

      // Process next question from Gemini
      let nextQuestion: LiveQuestion | null = null;
      if (!isLastQuestion && nextQuestionResult.status === "fulfilled" && nextQuestionResult.value) {
        const nq = nextQuestionResult.value;
        resolvedTone = nq.tone;
        nextQuestion = {
          text: nq.question,
          type: nq.questionType,
          tone: nq.tone,
          feedbackOnPrevious: nq.feedbackOnPrevious ?? null,
        };
      } else if (!isLastQuestion && nextQuestionResult.status === "rejected") {
        // Non-fatal: user can still navigate, we just won't have a pre-fetched question
        console.error("Failed to pre-fetch next question:", (nextQuestionResult as PromiseRejectedResult).reason);
      }

      const resolvedMode = toneToMode(resolvedTone);

      // Commit the answer record
      const record: AnswerRecord = {
        questionIndex: currentQuestionIndex,
        question: currentQuestion.text,
        questionType: currentQuestion.type,
        answer: currentAnswer,
        sentiment,
        tone: resolvedTone,
        mode: resolvedMode,
        feedbackText,
        feedbackOnPrevious: nextQuestion?.feedbackOnPrevious ?? "",
        answerQuality,
      };

      setAnswerRecords((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = record;
        return next;
      });

      setPerFeedback((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = {
          questionIndex: currentQuestionIndex,
          feedbackText,
          feedbackOnPrevious: nextQuestion?.feedbackOnPrevious ?? "",
          isLoading: false,
          mode: resolvedMode,
          tone: resolvedTone,
          sentiment: sentiment.label,
          questionType: currentQuestion.type,
        };
        return next;
      });

      setCurrentMode(resolvedMode);

      // Store the pre-fetched next question so goToNextQuestion is instant
      if (nextQuestion) {
        // We store it temporarily in a ref-like pattern by encoding it into
        // perFeedback's nextQuestion field — but the cleanest approach is to
        // keep a separate "queued next question" state.
        setQueuedNextQuestion(nextQuestion);
      }

    } catch {
      setPerFeedback((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = {
          questionIndex: currentQuestionIndex,
          feedbackText: "Could not load feedback. Your answer has been saved.",
          feedbackOnPrevious: "",
          isLoading: false,
          mode: estMode,
          tone: "neutral",
          sentiment: sentiment.label,
          questionType: currentQuestion.type,
        };
        return next;
      });
    } finally {
      setIsFetchingFeedback(false);
    }
  }, [purchaseId, perAnswers, currentQuestionIndex, currentQuestion, totalQuestions, isFetchingFeedback]);

  // Queued next question — set by submitCurrentAnswer when Gemini responds
  const [queuedNextQuestion, setQueuedNextQuestion] = useState<LiveQuestion | null>(null);

  // ── Move to next question ────────────────────────────────────────────────

  const goToNextQuestion = useCallback(async () => {
    if (!purchaseId) return;

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= totalQuestions) return;

    // If we already have the next question pre-fetched, switch immediately
    if (queuedNextQuestion) {
      setCurrentQuestion(queuedNextQuestion);
      setQueuedNextQuestion(null);
      setCurrentQuestionIndex(nextIndex);
      setCurrentMode("friendly");
      return;
    }

    // Otherwise fetch it now (fallback — shouldn't normally happen)
    setIsFetchingNextQuestion(true);
    setError(null);

    const lastRecord = answerRecordsRef.current[currentQuestionIndex];
    const sentiment: SentimentResult = lastRecord?.sentiment ?? { label: "neutral", confidence: 0.5 };

    const historyForBackend: QARound[] = answerRecordsRef.current.slice(0, nextIndex).map((r) => ({
      question: r.question,
      questionType: r.questionType,
      answer: r.answer,
      answerQuality: r.answerQuality,
      sentiment: r.sentiment.label,
    }));

    try {
      const nq = await fetchNextQuestion(purchaseId, currentQuestionIndex, totalQuestions, sentiment, historyForBackend);
      setCurrentQuestion({
        text: nq.question,
        type: nq.questionType,
        tone: nq.tone,
        feedbackOnPrevious: nq.feedbackOnPrevious ?? null,
      });
      setCurrentQuestionIndex(nextIndex);
      setCurrentMode(toneToMode(nq.tone));
    } catch {
      setError("Could not fetch next question. Please try again.");
    } finally {
      setIsFetchingNextQuestion(false);
    }
  }, [purchaseId, currentQuestionIndex, totalQuestions, queuedNextQuestion]);

  // ── Final submission ─────────────────────────────────────────────────────

  const submitAnswers = useCallback(async () => {
    if (!purchaseId) return;
    const combinedAnswers = perAnswers
      .map((ans, i) => `Q${i + 1}: ${ans.trim()}`)
      .join("\n\n");
    setAnswers(combinedAnswers);
    setPhase("submitting");
    setError(null);

    const sentimentHistory = answerRecordsRef.current.map((r) => ({
      question: r.question,
      questionType: r.questionType,
      sentiment: r.sentiment.label,
      answerQuality: r.answerQuality,
      tone: r.tone,
    }));

    const summaryPromise =
      answerRecordsRef.current.length > 0
        ? fetchSessionSummary(answerRecordsRef.current).then(setSessionSummary).catch(() => null)
        : Promise.resolve();

    try {
      const [res] = await Promise.all([
        post<MockInterviewResponse>(
          "/user/ai/interview/submit",
          { purchaseId, userAnswersText: combinedAnswers, sentimentHistory },
          { timeout: AI_TIMEOUT_MS }
        ),
        summaryPromise,
      ]);
      setInterview(res);
      setPhase("completed");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to submit answers.");
      setPhase("answering");
    }
  }, [purchaseId, perAnswers]);

  return {
    interview, phase,
    currentQuestion, currentQuestionIndex, totalQuestions,
    perAnswers, perFeedback, answerRecords, sessionSummary,
    isFetchingFeedback, isFetchingNextQuestion, currentMode,
    error, isLoading, answers,
    setCurrentAnswer, submitCurrentAnswer, goToNextQuestion,
    startInterview, submitAnswers, setAnswers,
  };
}