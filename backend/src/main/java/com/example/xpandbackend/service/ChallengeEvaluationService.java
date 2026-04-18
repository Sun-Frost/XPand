package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.BadgeLevel;
import com.example.xpandbackend.models.Enums.ChallengeStatus;
import com.example.xpandbackend.models.Enums.ChallengeType;
import com.example.xpandbackend.models.Enums.TransactionType;
import com.example.xpandbackend.repository.*;import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChallengeEvaluationService {

    private final ChallengeRepository challengeRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final UserRepository userRepository;
    private final XPTransactionRepository xpTransactionRepository;
    private final UserSkillVerificationRepository verificationRepository;

    // ── SKILL PROGRESSION ────────────────────────────────────────────────────

    /**
     * Call after every successful test submission (in SkillVerificationService).
     * Evaluates VERIFY_SKILL, EARN_BADGE, EARN_GOLD_BADGE, MULTI_SKILL_PROGRESS.
     */
    @Transactional
    public void evaluateSkillExpansion(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;

        List<UserSkillVerification> verified = verificationRepository.findVerifiedByUserId(userId);

        // VERIFY_SKILL: total verified skills
        evaluate(user, ChallengeType.VERIFY_SKILL, verified.size());

        // EARN_BADGE: total badges earned (any level)
        long badgeCount = verified.stream()
                .filter(v -> v.getCurrentBadge() != null)
                .count();
        evaluate(user, ChallengeType.EARN_BADGE, (int) badgeCount);

        // EARN_GOLD_BADGE: at least one GOLD
        long goldCount = verified.stream()
                .filter(v -> v.getCurrentBadge() == BadgeLevel.GOLD)
                .count();
        evaluate(user, ChallengeType.EARN_GOLD_BADGE, (int) goldCount);

        // MULTI_SKILL_PROGRESS: distinct skill categories verified
        long distinctCategories = verificationRepository.countDistinctCategoriesByUserId(userId);
        evaluate(user, ChallengeType.MULTI_SKILL_PROGRESS, (int) distinctCategories);
    }

    // ── ACTIVITY / RETENTION ─────────────────────────────────────────────────

    /**
     * Call on every successful login.
     * Evaluates DAILY_LOGIN, WEEKLY_ACTIVITY, STREAK_DAYS.
     */
    @Transactional
    public void evaluateLogin(Integer userId, int currentStreakDays, int loginsThisWeek) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.DAILY_LOGIN, 1);
        evaluate(user, ChallengeType.WEEKLY_ACTIVITY, loginsThisWeek);
        evaluate(user, ChallengeType.STREAK_DAYS, currentStreakDays);
    }

    // ── JOB INTERACTION ──────────────────────────────────────────────────────

    /**
     * Call after a user submits a job application.
     * Evaluates APPLY_JOB, APPLY_WITH_GOLD.
     */
    @Transactional
    public void evaluateJobApplication(Integer userId, int totalApplications, boolean hasGoldBadge) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.APPLY_JOB, totalApplications);

        if (hasGoldBadge) {
            evaluate(user, ChallengeType.APPLY_WITH_GOLD, 1);
        }
    }

    /**
     * Call when an application status changes to ACCEPTED.
     * Evaluates GET_ACCEPTED.
     */
    @Transactional
    public void evaluateAcceptance(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;
        evaluate(user, ChallengeType.GET_ACCEPTED, 1);
    }

    // ── XP ECONOMY ───────────────────────────────────────────────────────────

    /**
     * Call after every store purchase.
     * Evaluates USE_XP_STORE, SPEND_XP.
     */
    @Transactional
    public void evaluateStorePurchase(Integer userId, int totalXpSpent) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.USE_XP_STORE, 1);
        evaluate(user, ChallengeType.SPEND_XP, totalXpSpent);
    }

    // ── META ─────────────────────────────────────────────────────────────────

    /**
     * Call after awarding XP (inside awardXp).
     * Evaluates REACH_XP, COMPLETE_CHALLENGE.
     */
    @Transactional
    public void evaluateMeta(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;

        // REACH_XP: current balance
        evaluate(user, ChallengeType.REACH_XP, user.getXpBalance());

        // COMPLETE_CHALLENGE: how many challenges completed so far
        long completed = userChallengeRepository.countByUserIdAndStatus(userId, ChallengeStatus.COMPLETED);
        evaluate(user, ChallengeType.COMPLETE_CHALLENGE, (int) completed);
    }

    // ── CORE ENGINE ──────────────────────────────────────────────────────────

    /**
     * Core evaluation method.
     * Finds all active challenges of the given type, updates progress,
     * and awards XP when conditionValue is reached.
     */
    private void evaluate(User user, ChallengeType type, int progress) {
        List<Challenge> challenges = challengeRepository.findByTypeAndIsActiveTrue(type);

        for (Challenge challenge : challenges) {

            // Skip time-boxed challenges that are not currently active
            LocalDateTime now = LocalDateTime.now();
            if (challenge.getStartDate() != null && now.isBefore(challenge.getStartDate())) continue;
            if (challenge.getEndDate() != null && now.isAfter(challenge.getEndDate())) continue;

            UserChallenge uc = userChallengeRepository
                    .findByUserIdAndChallengeId(user.getId(), challenge.getId())
                    .orElseGet(() -> {
                        UserChallenge newUc = new UserChallenge();
                        newUc.setUser(user);
                        newUc.setChallenge(challenge);
                        newUc.setCurrentProgress(0);
                        newUc.setStartDate(now);
                        newUc.setStatus(ChallengeStatus.IN_PROGRESS);
                        return newUc;
                    });

            // Skip non-repeatable completed challenges
            if (uc.getStatus() == ChallengeStatus.COMPLETED && !challenge.getIsRepeatable()) continue;

            uc.setCurrentProgress(progress);

            if (progress >= challenge.getConditionValue()) {
                boolean wasAlreadyCompleted = uc.getStatus() == ChallengeStatus.COMPLETED;
                uc.setStatus(ChallengeStatus.COMPLETED);
                uc.setCompletedAt(now);
                userChallengeRepository.save(uc);

                // Only award XP on first completion (or every completion if repeatable)
                if (!wasAlreadyCompleted || challenge.getIsRepeatable()) {
                    awardXp(user, challenge.getXpReward(), TransactionType.CHALLENGE, challenge.getId());
                    evaluateMeta(user.getId()); // check REACH_XP and COMPLETE_CHALLENGE
                }
            } else {
                userChallengeRepository.save(uc);
            }
        }
    }

    // ── XP HELPERS ───────────────────────────────────────────────────────────

    @Transactional
    public void awardXp(User user, int amount, TransactionType type, Integer referenceId) {
        user.setXpBalance(user.getXpBalance() + amount);
        userRepository.save(user);

        XPTransaction tx = new XPTransaction();
        tx.setUser(user);
        tx.setAmount(amount);
        tx.setSourceType(type);
        tx.setReferenceId(referenceId);
        xpTransactionRepository.save(tx);
        log.info("Awarded {} XP to user {} for {} ref={}", amount, user.getId(), type, referenceId);
    }

    @Transactional
    public void deductXp(User user, int amount, TransactionType type, Integer referenceId) {
        if (user.getXpBalance() < amount) {
            throw new com.example.xpandbackend.exception.InsufficientXpException(
                    "Insufficient XP. Required: " + amount + ", available: " + user.getXpBalance());
        }
        user.setXpBalance(user.getXpBalance() - amount);
        userRepository.save(user);

        XPTransaction tx = new XPTransaction();
        tx.setUser(user);
        tx.setAmount(-amount);
        tx.setSourceType(type);
        tx.setReferenceId(referenceId);
        xpTransactionRepository.save(tx);
        log.info("Deducted {} XP from user {} for {} ref={}", amount, user.getId(), type, referenceId);
    }

    private User findUser(Integer userId) {
        return userRepository.findById(userId).orElse(null);
    }
}