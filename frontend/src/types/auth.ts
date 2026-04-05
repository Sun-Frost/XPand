// src/types/auth.ts
// Additional auth-specific types not in main types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    role: "JOB_SEEKER" | "COMPANY" | "ADMIN";
    firstName: string;
    lastName: string;
  };
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterResponse {
  message: string;
  userId: number;
}

export interface SkillTestSubmission {
  skillId: number;
  answers: Record<number, string>; // questionId → chosen option (A/B/C/D)
}

export interface SkillTestResult {
  skillId: number;
  score: number;
  maxScore: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | null;
  attemptsUsed: number;
  maxAttempts: number;
  lockedUntil?: string;
  passed: boolean;
}

export interface XpTransactionResponse {
  id: number;
  amount: number;
  type: string;
  referenceId?: number;
  createdAt: string;
  description: string;
}

export interface PurchaseRequest {
  storeItemId: number;
  jobId?: number; // required for PRIORITY_SLOT
}