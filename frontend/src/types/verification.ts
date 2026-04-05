// types/verification.ts

import { BadgeLevel } from "./enums";

export interface UserSkillVerification {
  verificationId: number;

  userId: number;
  skillId: number;

  currentBadge?: BadgeLevel;

  attemptCount: number;

  isLocked: boolean;

  lockExpiry?: string;

  verifiedDate?: string;

  lastAttemptDate?: string;
}

export interface TestAttempt {
  attemptId: number;

  userId: number;
  skillId: number;

  score: number;

  badgeAwarded?: BadgeLevel;

  createdAt: string;
}

export interface TestAttemptQuestion {
  attemptId: number;
  questionId: number;

  userAnswer?: string;

  isCorrect?: boolean;
}