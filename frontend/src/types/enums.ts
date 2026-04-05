// types/enums.ts

export const DifficultyLevel = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;

export type DifficultyLevel =
  (typeof DifficultyLevel)[keyof typeof DifficultyLevel];


export const BadgeLevel = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
} as const;

export type BadgeLevel =
  (typeof BadgeLevel)[keyof typeof BadgeLevel];


export const JobType = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  REMOTE: "REMOTE",
} as const;

export type JobType =
  (typeof JobType)[keyof typeof JobType];


export const JobStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CLOSED: "CLOSED",
} as const;

export type JobStatus =
  (typeof JobStatus)[keyof typeof JobStatus];


export const ApplicationStatus = {
  PENDING: "PENDING",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];


export const StoreItemType = {
  READINESS_REPORT: "READINESS_REPORT",
  MOCK_INTERVIEW: "MOCK_INTERVIEW",
  PRIORITY_SLOT: "PRIORITY_SLOT",
} as const;

export type StoreItemType =
  (typeof StoreItemType)[keyof typeof StoreItemType];


export const TransactionSourceType = {
  CHALLENGE: "CHALLENGE",
  STORE_PURCHASE: "STORE_PURCHASE",
} as const;

export type TransactionSourceType =
  (typeof TransactionSourceType)[keyof typeof TransactionSourceType];


export const JobSkillImportance = {
  MAJOR: "MAJOR",
  MINOR: "MINOR",
} as const;

export type JobSkillImportance =
  (typeof JobSkillImportance)[keyof typeof JobSkillImportance];


export const ChallengeStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type ChallengeStatus =
  (typeof ChallengeStatus)[keyof typeof ChallengeStatus];