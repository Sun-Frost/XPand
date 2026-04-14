package com.example.xpandbackend.models.Enums;

public enum ChallengeType {

    // ── PROFILE & ONBOARDING ──────────────────────────────────────────────────
    // Triggered by: profile update / project / certification endpoints
    COMPLETE_PROFILE,       // conditionValue = 1  → fill all profile fields
    ADD_PROJECT,            // conditionValue = 1  → add first project
    ADD_CERTIFICATION,      // conditionValue = 2  → add N certifications

    // ── SKILL PROGRESSION ────────────────────────────────────────────────────
    // Triggered by: test submission (SkillVerificationService.submitTest)
    VERIFY_SKILL,           // conditionValue = 1  → pass any skill test
    EARN_BADGE,             // conditionValue = 3  → earn N badges (any level)
    EARN_GOLD_BADGE,        // conditionValue = 1  → earn at least 1 GOLD badge
    MULTI_SKILL_PROGRESS,   // conditionValue = 3  → verified skills in N categories

    // ── ACTIVITY / RETENTION ─────────────────────────────────────────────────
    // Triggered by: login / auth success
    DAILY_LOGIN,            // conditionValue = 1  → log in today
    WEEKLY_ACTIVITY,        // conditionValue = 5  → log in N days in a week
    STREAK_DAYS,            // conditionValue = 7  → consecutive daily logins

    // ── JOB INTERACTION ──────────────────────────────────────────────────────
    // Triggered by: application endpoint
    APPLY_JOB,              // conditionValue = 1  → apply to any job
    APPLY_WITH_GOLD,        // conditionValue = 1  → apply while holding a GOLD badge
    GET_ACCEPTED,           // conditionValue = 1  → application status → ACCEPTED

    // ── XP ECONOMY ───────────────────────────────────────────────────────────
    // Triggered by: store purchase endpoint
    USE_XP_STORE,           // conditionValue = 1  → make any store purchase
    SPEND_XP,               // conditionValue = 200 → spend N XP total

    // ── META / ADVANCED ──────────────────────────────────────────────────────
    // Triggered by: XP award / challenge completion hooks
    REACH_XP,               // conditionValue = 500 → reach N total XP balance
    COMPLETE_CHALLENGE      // conditionValue = 3  → complete N other challenges
}