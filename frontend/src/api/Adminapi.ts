/* ============================================================
   adminApi.ts
   All admin API calls — wraps the shared axios instance.
   Maps 1-to-1 with AdminController.java endpoints.
   ============================================================ */

import { get, post, put, patch, del } from "./axios";

// ── Types ──────────────────────────────────────────────────────

export interface UserProfileResponse {
  id:               number;
  email:            string;
  firstName:        string;
  lastName:         string;
  phoneNumber?:     string;
  country?:         string;
  city?:            string;
  professionalTitle?: string;
  aboutMe?:         string;
  xpBalance?:       number;
  isSuspended?:     boolean;
  createdAt:        string;
}

export interface CompanyProfileResponse {
  id:          number;
  email:       string;
  companyName: string;
  description?: string;
  websiteUrl?:  string;
  industry?:    string;
  location?:    string;
  isApproved:  boolean;
  createdAt:   string;
}

export interface SkillResponse {
  id:       number;
  name:     string;
  category: string;
  isActive: boolean;
}

// ChallengeType enum values — must match backend exactly
export type ChallengeType =
  | "COMPLETE_PROFILE"
  | "ADD_PROJECT"
  | "ADD_CERTIFICATION"
  | "VERIFY_SKILL"
  | "EARN_BADGE"
  | "EARN_GOLD_BADGE"
  | "MULTI_SKILL_PROGRESS"
  | "DAILY_LOGIN"
  | "WEEKLY_ACTIVITY"
  | "STREAK_DAYS"
  | "APPLY_JOB"
  | "APPLY_WITH_GOLD"
  | "GET_ACCEPTED"
  | "USE_XP_STORE"
  | "SPEND_XP"
  | "REACH_XP"
  | "COMPLETE_CHALLENGE";

export interface ChallengeResponse {
  id:             number;
  title:          string;
  description:    string;
  type:           ChallengeType;   // was challengeType: string
  conditionValue: number;          // was targetValue
  xpReward:       number;
  isActive:       boolean;         // new field
  isRepeatable:   boolean;
  startDate?:     string;          // new field
  endDate?:       string;          // new field
}

export interface StoreItemResponse {
  id:          number;
  name:        string;
  description: string;
  costXp:      number;
  itemType:    string;
}

// ── Create / Update Payloads ──────────────────────────────────

export interface CreateSkillPayload {
  name:     string;
  category: string;
}

export interface CreateChallengePayload {
  title:          string;
  description:    string;
  type:           ChallengeType;   // was challengeType: string
  conditionValue: number;          // was targetValue
  xpReward:       number;
  isActive:       boolean;         // new field
  isRepeatable:   boolean;
  startDate?:     string;          // new field (ISO string)
  endDate?:       string;          // new field (ISO string)
}

export interface CreateStoreItemPayload {
  name:        string;
  description: string;
  costXp:      number;
  itemType:    string;
}

export interface CreateQuestionPayload {
  skillId:        number;
  difficultyLevel: string;
  questionText:   string;
  optionA:        string;
  optionB:        string;
  optionC:        string;
  optionD:        string;
  correctAnswer:  string;
  points:         number;
}

// ── Admin API ─────────────────────────────────────────────────

// Users
export const adminGetAllUsers        = ()                             => get<UserProfileResponse[]>("/admin/users");
export const adminSuspendUser        = (userId: number)               => patch<string>(`/admin/users/${userId}/suspend`);
export const adminDeleteUser         = (userId: number)               => del<void>(`/admin/users/${userId}`);

// Companies  (no delete — suspend only)
export const adminGetAllCompanies    = ()                             => get<CompanyProfileResponse[]>("/admin/companies");
export const adminGetPendingCompanies= ()                             => get<CompanyProfileResponse[]>("/admin/companies/pending");
export const adminApproveCompany     = (id: number)                   => patch<CompanyProfileResponse>(`/admin/companies/${id}/approve`);
export const adminSuspendCompany     = (id: number)                   => patch<string>(`/admin/companies/${id}/suspend`);

// Skills
export const adminGetAllSkills       = ()                             => get<SkillResponse[]>("/admin/skills");
export const adminCreateSkill        = (p: CreateSkillPayload)        => post<SkillResponse>("/admin/skills", p);
export const adminUpdateSkill        = (id: number, p: CreateSkillPayload) => put<SkillResponse>(`/admin/skills/${id}`, p);
export const adminDeactivateSkill    = (id: number)                   => patch<string>(`/admin/skills/${id}/deactivate`);
export const adminActivateSkill      = (id: number)                   => patch<string>(`/admin/skills/${id}/activate`);

// Questions
export const adminCreateQuestion     = (p: CreateQuestionPayload)     => post<string>("/admin/questions", p);
export const adminDeleteQuestion     = (questionId: number)           => del<void>(`/admin/questions/${questionId}`);

// Challenges
export const adminGetAllChallenges   = ()                             => get<ChallengeResponse[]>("/admin/challenges");
export const adminCreateChallenge    = (p: CreateChallengePayload)    => post<ChallengeResponse>("/admin/challenges", p);
export const adminUpdateChallenge    = (id: number, p: CreateChallengePayload) => put<ChallengeResponse>(`/admin/challenges/${id}`, p);
export const adminDeleteChallenge    = (id: number)                   => del<void>(`/admin/challenges/${id}`);

// Store Items
export const adminGetAllStoreItems   = ()                             => get<StoreItemResponse[]>("/admin/store-items");
export const adminCreateStoreItem    = (p: CreateStoreItemPayload)    => post<StoreItemResponse>("/admin/store-items", p);
export const adminUpdateStoreItem    = (id: number, p: CreateStoreItemPayload) => put<StoreItemResponse>(`/admin/store-items/${id}`, p);
export const adminDeleteStoreItem    = (id: number)                   => del<void>(`/admin/store-items/${id}`);