package com.example.xpandbackend.models.Enums;

/**
 * Defines every challenge type supported by the gamification engine.
 *
 * <p>Each constant maps to one category of user behaviour. {@code conditionValue}
 * on the {@link com.example.xpandbackend.models.Challenge} entity sets the threshold
 * that must be reached for the challenge to complete.
 *
 * <p>{@link com.example.xpandbackend.service.ChallengeEvaluationService} evaluates
 * challenges of the relevant type(s) after every qualifying event.
 */
public enum ChallengeType {

    // ── Profile & onboarding ─────────────────────────────────────────────────
    /** Fill all required profile fields (conditionValue = 1). */
    COMPLETE_PROFILE,
    /** Add first portfolio project (conditionValue = 1). */
    ADD_PROJECT,
    /** Add N certifications (conditionValue = 2). */
    ADD_CERTIFICATION,

    // ── Skill progression ────────────────────────────────────────────────────
    /** Pass any skill test (conditionValue = 1). */
    VERIFY_SKILL,
    /** Earn N badges of any level (conditionValue = 3). */
    EARN_BADGE,
    /** Earn at least one GOLD badge (conditionValue = 1). */
    EARN_GOLD_BADGE,
    /** Earn verified badges in N distinct skill categories (conditionValue = 3). */
    MULTI_SKILL_PROGRESS,

    // ── Activity / retention ─────────────────────────────────────────────────
    /** Log in today (conditionValue = 1). */
    DAILY_LOGIN,
    /** Log in on N distinct days in the current ISO week (conditionValue = 5). */
    WEEKLY_ACTIVITY,
    /** Maintain a consecutive daily login streak of N days (conditionValue = 7). */
    STREAK_DAYS,

    // ── Job interaction ──────────────────────────────────────────────────────
    /** Apply to any job (conditionValue = 1). */
    APPLY_JOB,
    /** Apply to a job while holding at least one GOLD badge (conditionValue = 1). */
    APPLY_WITH_GOLD,
    /** Have an application moved to SHORTLISTED (conditionValue = 1). */
    GET_ACCEPTED,

    // ── XP economy ───────────────────────────────────────────────────────────
    /** Make any store purchase (conditionValue = 1). */
    USE_XP_STORE,
    /** Spend N XP total across all purchases (conditionValue = 200). */
    SPEND_XP,

    // ── Meta / advanced ──────────────────────────────────────────────────────
    /** Reach an XP balance of N (conditionValue = 500). */
    REACH_XP,
    /** Complete N other challenges (conditionValue = 3). */
    COMPLETE_CHALLENGE
}