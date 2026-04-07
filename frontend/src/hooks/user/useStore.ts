import { useState, useEffect, useCallback } from "react";
import { AI_TIMEOUT_MS, get, post } from "../../api/axios";
import type { SentimentLabel, SentimentResult } from "./useSentiment";

// ---------------------------------------------------------------------------
// Types — aligned to Java DTOs exactly
// ---------------------------------------------------------------------------

export type ItemType = "READINESS_REPORT" | "MOCK_INTERVIEW" | "PRIORITY_SLOT";
export type TransactionType = "CHALLENGE" | "STORE_PURCHASE";
export type StoreCategory = "REPORT" | "INTERVIEW" | "VISIBILITY";

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
  icon: string;
  tagline: string;
  features: string[];
  badge?: "POPULAR" | "NEW" | "LIMITED";
}

// ---------------------------------------------------------------------------
// Interview phase
// ---------------------------------------------------------------------------

export type InterviewPhase = "idle" | "starting" | "answering" | "submitting" | "completed";

// ---------------------------------------------------------------------------
// Adaptive AI types
// ---------------------------------------------------------------------------

export type InterviewerMode = "friendly" | "strict";

export interface AnswerRecord {
  questionIndex: number;
  question: string;
  answer: string;
  sentiment: SentimentResult;
  mode: InterviewerMode;
  feedbackText: string;
  answerQuality: "weak" | "moderate" | "strong";
}

export interface QuestionFeedback {
  questionIndex: number;
  feedbackText: string;
  isLoading: boolean;
  mode: InterviewerMode;
  sentiment: SentimentLabel;
}

// ---------------------------------------------------------------------------
// Item metadata
// ---------------------------------------------------------------------------

const ITEM_META: Record<ItemType, Omit<StoreItemWithMeta, keyof StoreItemResponse>> = {
  READINESS_REPORT: {
    category: "REPORT", icon: "📊", tagline: "Know exactly where you stand.",
    features: ["Full skill-gap analysis vs. job requirements", "Percentile ranking among verified candidates", "Specific areas to improve before applying", "AI-generated recommendations"],
    badge: "POPULAR",
  },
  MOCK_INTERVIEW: {
    category: "INTERVIEW", icon: "🎙️", tagline: "Practice until perfect.",
    features: ["Questions tailored to job requirements", "Adaptive AI — adjusts to your confidence", "Sentiment-aware feedback in real time", "Overall performance summary at the end"],
    badge: "NEW",
  },
  PRIORITY_SLOT: {
    category: "VISIBILITY", icon: "⭐", tagline: "Get seen first.",
    features: ["Jump to top of applicant list", "Highlighted profile badge", "Priority review by hiring managers", "Choose your slot rank (1st, 2nd, 3rd)"],
  },
};

function enrichItem(raw: StoreItemResponse): StoreItemWithMeta {
  return { ...raw, ...(ITEM_META[raw.itemType] ?? { category: "REPORT" as StoreCategory, icon: "📦", tagline: raw.description, features: [] }) };
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

/**
 * Determine interviewer mode from sentiment + answer quality.
 *
 * Nervous/Angry   → always friendly (support & de-escalate)
 * Confident       → always strict (push limits)
 * Happy + strong  → strict (they can handle pressure)
 * Happy + weak/mod→ friendly (keep momentum)
 * Neutral + strong→ strict
 * Neutral + weak  → friendly
 */
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

async function fetchAdaptiveFeedback(
  question: string,
  answer: string,
  qNum: number,
  total: number,
  sentiment: SentimentResult,
  history: AnswerRecord[]
): Promise<{ feedbackText: string; answerQuality: "weak" | "moderate" | "strong"; mode: InterviewerMode }> {
  const estQuality = estimateAnswerQuality(answer);
  const mode = determineMode(sentiment.label, estQuality);

  const modeBlock = mode === "friendly"
    ? `INTERVIEWER MODE: FRIENDLY (Good Cop)
- Be warm, encouraging, and supportive
- Acknowledge strengths first
- If answer was weak: "That's a good start. Let's build on that…"
- Offer gentle hints for improvement
- End with a short word of encouragement`
    : `INTERVIEWER MODE: STRICT (Bad Cop)
- Be direct and challenging — skip warm-up
- Push deeper immediately: challenge assumptions, probe edge cases
- If answer was strong: "Good, but what happens under X condition?"
- Point out gaps or missing nuance clearly
- Maintain pressure — this candidate can handle it`;

  const histCtx = history.length > 0
    ? `Previous answer qualities: ${history.map((r) => r.answerQuality).join(", ")}.`
    : "This is the first answer.";

  const prompt = `You are an adaptive AI interviewer.

Candidate appears: ${sentiment.label} (${Math.round(sentiment.confidence * 100)}% confidence).
${histCtx}

${modeBlock}

---
Question ${qNum} of ${total}: "${question}"
Candidate's Answer: "${answer}"
---

Give feedback in 3–5 sentences. Be specific to this answer. Do not repeat the question.
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
  const raw = (data.content as Array<{ type: string; text?: string }>)
    ?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim() ?? "";

  const qMatch = raw.match(/\nQUALITY:\s*(weak|moderate|strong)\s*$/i);
  const answerQuality = (qMatch?.[1]?.toLowerCase() ?? estQuality) as "weak" | "moderate" | "strong";
  const feedbackText = raw.replace(/\nQUALITY:\s*(weak|moderate|strong)\s*$/i, "").trim();

  return { feedbackText, answerQuality, mode };
}

async function fetchSessionSummary(records: AnswerRecord[]): Promise<string> {
  const recap = records.map((r, i) =>
    `Q${i + 1}: "${r.question}"\nAnswer: "${r.answer}"\nSentiment: ${r.sentiment.label} | Quality: ${r.answerQuality} | AI mode: ${r.mode}`
  ).join("\n\n");

  const prompt = `You are an AI interview coach writing a comprehensive post-session report.

Session data:
${recap}

Write a structured performance summary with these sections:
1. **Overall Performance** — general impression
2. **Strongest Answer** — which question they handled best and why
3. **Needs Most Work** — weakest area with specific advice
4. **Sentiment Journey** — how confidence/nervousness evolved and affected answers
5. **Top 3 Action Items** — concrete things to improve before the real interview

Be honest, constructive, and motivating. 250–350 words.`;

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
  return (data.content as Array<{ type: string; text?: string }>)
    ?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim() ?? "Summary unavailable.";
}

function parseQuestions(text: string): string[] {
  const questions: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const m = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[.:]\s*(.+)$/i);
    if (m) questions.push(m[2].replace(/\*\*/g, "").trim());
  }
  if (questions.length === 0)
    return text.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean).slice(0, 10);
  return questions;
}

// ---------------------------------------------------------------------------
// useMockInterview — Adaptive AI with Sentiment
// ---------------------------------------------------------------------------

export interface UseMockInterviewReturn {
  interview: MockInterviewResponse | null;
  phase: InterviewPhase;
  questions: string[];
  currentQuestionIndex: number;
  perAnswers: string[];
  perFeedback: QuestionFeedback[];
  answerRecords: AnswerRecord[];
  sessionSummary: string | null;
  isFetchingFeedback: boolean;
  currentMode: InterviewerMode;
  goToNextQuestion: () => void;
  answers: string;
  isLoading: boolean;
  error: string | null;
  setCurrentAnswer: (v: string) => void;
  submitCurrentAnswer: (sentiment: SentimentResult) => Promise<void>;
  startInterview: () => Promise<void>;
  submitAnswers: () => Promise<void>;
  setAnswers: (v: string) => void;
}

export function useMockInterview(purchaseId: number | null): UseMockInterviewReturn {
  const [interview, setInterview] = useState<MockInterviewResponse | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [perAnswers, setPerAnswers] = useState<string[]>([]);
  const [perFeedback, setPerFeedback] = useState<QuestionFeedback[]>([]);
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [currentMode, setCurrentMode] = useState<InterviewerMode>("friendly");
  const [answers, setAnswers] = useState("");

  useEffect(() => {
    if (!purchaseId) return;
    setIsLoading(true);
    setError(null);
    get<MockInterviewResponse>(`/user/ai/interview/${purchaseId}`)
      .then((res) => {
        setInterview(res);
        if (res.aiFeedbackText) {
          setPhase("completed");
          setAnswers(res.userAnswersText ?? "");
        } else if (res.questionsText) {
          const parsed = parseQuestions(res.questionsText);
          setQuestions(parsed);
          setPerAnswers(new Array(parsed.length).fill(""));
          setPhase("answering");
        } else {
          setPhase("idle");
        }
      })
      .catch(() => setPhase("idle"))
      .finally(() => setIsLoading(false));
  }, [purchaseId]);

  const startInterview = useCallback(async () => {
    if (!purchaseId) return;
    setPhase("starting");
    setError(null);
    try {
      const res = await post<MockInterviewResponse>(`/user/ai/interview/start/${purchaseId}`, {}, { timeout: AI_TIMEOUT_MS });
      setInterview(res);
      const parsed = parseQuestions(res.questionsText ?? "");
      setQuestions(parsed);
      setPerAnswers(new Array(parsed.length).fill(""));
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

  const setCurrentAnswer = useCallback((v: string) => {
    setPerAnswers((prev) => { const next = [...prev]; next[currentQuestionIndex] = v; return next; });
  }, [currentQuestionIndex]);

  const submitCurrentAnswer = useCallback(async (sentiment: SentimentResult) => {
    const currentAnswer = perAnswers[currentQuestionIndex]?.trim();
    if (!currentAnswer || isFetchingFeedback) return;

    setIsFetchingFeedback(true);
    setError(null);

    const estMode = determineMode(sentiment.label, estimateAnswerQuality(currentAnswer));
    setCurrentMode(estMode);

    setPerFeedback((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = { questionIndex: currentQuestionIndex, feedbackText: "", isLoading: true, mode: estMode, sentiment: sentiment.label };
      return next;
    });

    try {
      const result = await fetchAdaptiveFeedback(
        questions[currentQuestionIndex], currentAnswer,
        currentQuestionIndex + 1, questions.length, sentiment, answerRecords
      );

      const record: AnswerRecord = {
        questionIndex: currentQuestionIndex,
        question: questions[currentQuestionIndex],
        answer: currentAnswer,
        sentiment,
        mode: result.mode,
        feedbackText: result.feedbackText,
        answerQuality: result.answerQuality,
      };

      setAnswerRecords((prev) => { const next = [...prev]; next[currentQuestionIndex] = record; return next; });
      setPerFeedback((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = { questionIndex: currentQuestionIndex, feedbackText: result.feedbackText, isLoading: false, mode: result.mode, sentiment: sentiment.label };
        return next;
      });
      setCurrentMode(result.mode);
    } catch {
      setPerFeedback((prev) => {
        const next = [...prev];
        next[currentQuestionIndex] = { questionIndex: currentQuestionIndex, feedbackText: "Could not load feedback. Your answer has been saved.", isLoading: false, mode: estMode, sentiment: sentiment.label };
        return next;
      });
    } finally {
      setIsFetchingFeedback(false);
    }
  }, [perAnswers, currentQuestionIndex, questions, isFetchingFeedback, answerRecords]);

  const goToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
    setCurrentMode("friendly");
  }, [questions.length]);

  const submitAnswers = useCallback(async () => {
    if (!purchaseId) return;
    const combinedAnswers = perAnswers.map((ans, i) => `Q${i + 1}: ${ans.trim()}`).join("\n\n");
    setAnswers(combinedAnswers);
    setPhase("submitting");
    setError(null);

    const summaryPromise = answerRecords.length > 0
      ? fetchSessionSummary(answerRecords).then(setSessionSummary).catch(() => null)
      : Promise.resolve();

    try {
      const [res] = await Promise.all([
        post<MockInterviewResponse>("/user/ai/interview/submit", { purchaseId, userAnswersText: combinedAnswers }, { timeout: AI_TIMEOUT_MS }),
        summaryPromise,
      ]);
      setInterview(res);
      setPhase("completed");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to submit answers.");
      setPhase("answering");
    }
  }, [purchaseId, perAnswers, answerRecords]);

  return {
    interview, phase,
    questions, currentQuestionIndex, perAnswers, perFeedback,
    answerRecords, sessionSummary, isFetchingFeedback, currentMode, goToNextQuestion,
    answers, isLoading, error,
    setCurrentAnswer, submitCurrentAnswer, startInterview, submitAnswers, setAnswers,
  };
}