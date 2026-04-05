import { useState, useCallback, useRef } from "react";
import { get, post } from "../../api/axios";
import type { BadgeLevel } from "./useSkills";

// ---------------------------------------------------------------------------
// Backend DTO types — match Java classes exactly
// ---------------------------------------------------------------------------

export interface QuestionDTO {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficultyLevel: "EASY" | "MEDIUM" | "HARD";
  points: number;
  correctAnswer?: string; // populated after submit from questionResults
}

export interface QuestionResult {
  questionId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficultyLevel: "EASY" | "MEDIUM" | "HARD";
  points: number;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

/** Matches TestAttemptResponse.java — now includes correctCount, totalQuestions, questionResults */
interface TestAttemptResponse {
  attemptId: number;
  skillId: number;
  skillName: string;
  score: number;               // raw points (e.g. 0-125), NOT a percentage
  badgeAwarded: BadgeLevel | null;
  createdAt: string;
  correctCount: number;        // added to backend
  totalQuestions: number;      // added to backend
  questionResults: QuestionResult[]; // always returned now
}

// ---------------------------------------------------------------------------
// Frontend-facing types
// ---------------------------------------------------------------------------

export interface SkillTestData {
  skillId: number;
  skillName: string;
  skillCategory: string;
  questions: QuestionDTO[];
}

export interface AnswerMap {
  [questionId: number]: string; // "A" | "B" | "C" | "D"
}

export interface TestResultData {
  attemptId: number;
  skillId: number;
  skillName: string;
  skillCategory: string;
  score: number;           // raw points from backend
  scorePercent: number;    // kept for dial display (normalised 0-100)
  badgeEarned: BadgeLevel | null;
  xpEarned: number;
  correctCount: number;
  totalQuestions: number;
  isUpgrade: boolean;
  questions: QuestionDTO[];    // enriched with correctAnswer
  answers: AnswerMap;
  questionResults: QuestionResult[];
}

export interface UseSkillTestReturn {
  testData: SkillTestData | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  result: TestResultData | null;
  startTest: (skillId: number) => Promise<void>;
  submitTest: (answers: AnswerMap) => Promise<void>;
  resetTest: () => void;
}

// ---------------------------------------------------------------------------
// XP fallback (until backend adds xpEarned field)
// ---------------------------------------------------------------------------

const XP_FALLBACK: Record<BadgeLevel, number> = {
  BRONZE: 100,
  SILVER: 250,
  GOLD: 500,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useSkillTest = (): UseSkillTestReturn => {
  const [testData, setTestData] = useState<SkillTestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResultData | null>(null);

  const questionsRef = useRef<QuestionDTO[]>([]);
  const skillIdRef = useRef<number | null>(null);

  const startTest = useCallback(async (skillId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setTestData(null);
    skillIdRef.current = skillId;

    try {
      const questions = await get<QuestionDTO[]>(`/user/skills/${skillId}/test`);
      questionsRef.current = questions;
      setTestData({
        skillId,
        skillName: "",
        skillCategory: "",
        questions,
      });
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      const message = (err as any)?.response?.data?.message;
      if (status === 403) {
        setError(message ?? "You have reached the maximum attempts for this skill this month.");
      } else if (status === 401) {
        setError("Session expired. Please log in again.");
      } else if (status === 404) {
        setError("Skill test not found. It may not be active yet.");
      } else {
        setError(message ?? "Failed to load the test. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitTest = useCallback(async (answers: AnswerMap): Promise<void> => {
    const skillId = skillIdRef.current;
    if (!skillId || !testData) return;

    setIsSubmitting(true);

    try {
      const response = await post<TestAttemptResponse>(
        `/user/skills/${skillId}/test`,
        { answers }
      );

      const questions = questionsRef.current;
      const correctCount = response.correctCount;
      const totalQuestions = response.totalQuestions ?? questions.length;

      // XP: backend doesn't send xpEarned yet, use fallback table
      const xpEarned = response.badgeAwarded ? XP_FALLBACK[response.badgeAwarded] : 0;

      // Enrich questions with correctAnswer from questionResults
      const correctMap = new Map(
        response.questionResults.map((r) => [r.questionId, r.correctAnswer])
      );
      const enrichedQuestions = questions.map((q) => ({
        ...q,
        correctAnswer: correctMap.get(q.id),
      }));

      // Normalise raw points to 0-100% for the score dial.
      // Compute max from actual question points so it works with any scoring scheme.
      const maxScore = response.questionResults.reduce((sum, q) => sum + q.points, 0) || 30;
      const scorePercent = Math.min(100, Math.round((response.score / maxScore) * 100));

      setResult({
        attemptId: response.attemptId,
        skillId: response.skillId,
        skillName: response.skillName,
        skillCategory: testData.skillCategory, // from route state
        score: response.score,
        scorePercent,
        badgeEarned: response.badgeAwarded,
        xpEarned,
        correctCount,
        totalQuestions,
        isUpgrade: response.badgeAwarded !== null,
        questions: enrichedQuestions,
        answers,
        questionResults: response.questionResults,
      });
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      const message = (err as any)?.response?.data?.message;
      if (status === 403) {
        setError(message ?? "Submission not allowed.");
      } else if (status === 401) {
        setError("Session expired. Your answers could not be submitted.");
      } else {
        setError(message ?? "Failed to submit test. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [testData]);

  const resetTest = useCallback(() => {
    setTestData(null);
    setResult(null);
    setError(null);
    questionsRef.current = [];
    skillIdRef.current = null;
  }, []);

  return { testData, isLoading, isSubmitting, error, result, startTest, submitTest, resetTest };
};