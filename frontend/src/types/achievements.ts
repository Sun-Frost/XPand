// ---------------------------------------------------------------------------
// Types mirroring the backend UserSkillVerificationResponse DTO
// and any achievement-related data
// ---------------------------------------------------------------------------

export type BadgeLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface UserSkillVerification {
  verificationId: number;
  skillId: number;
  skillName: string;
  category: string;
  currentBadge: BadgeLevel | null;
  attemptCount: number;
  isLocked: boolean;
  lockExpiry: string | null;      // ISO datetime or null
  verifiedDate: string | null;    // ISO datetime or null
}