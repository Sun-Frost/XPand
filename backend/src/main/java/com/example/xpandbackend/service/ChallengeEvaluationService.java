package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.BadgeLevel;
import com.example.xpandbackend.models.Enums.ChallengeStatus;
import com.example.xpandbackend.models.Enums.ChallengeType;
import com.example.xpandbackend.models.Enums.TransactionType;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Central engine for evaluating and completing gamification challenges.
 *
 * <h3>How it works</h3>
 * Other services call one of the public {@code evaluate*()} methods after a
 * qualifying event occurs (e.g. a skill test is passed, a job is applied to).
 * Each method delegates to the private {@link #evaluate(User, ChallengeType, int)}
 * core which:
 * <ol>
 *   <li>Looks up all active challenges of the given type.</li>
 *   <li>Creates or updates the user's {@link UserChallenge} progress row.</li>
 *   <li>Awards XP and triggers a meta-evaluation when the condition is met.</li>
 * </ol>
 *
 * <h3>XP flow</h3>
 * {@link #awardXp} and {@link #deductXp} are the only places that mutate
 * {@code user.xpBalance} — all other services call these methods rather than
 * touching the balance directly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChallengeEvaluationService {

    private final ChallengeRepository challengeRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final UserRepository userRepository;
    private final XPTransactionRepository xpTransactionRepository;
    private final UserSkillVerificationRepository verificationRepository;

    // ── Public evaluation entry points ────────────────────────────────────────

    /**
     * Evaluates profile-related challenges after a profile mutation.
     * <p>
     * Pass {@code -1} for any count you do not want evaluated. This prevents
     * a certification add from accidentally completing a project challenge
     * because the user already has qualifying data in place.
     *
     * @param userId              the user who triggered the update
     * @param certificationCount  current total certifications, or {@code -1} to skip
     * @param projectCount        current total projects, or {@code -1} to skip
     * @param isProfileComplete   {@code true} to evaluate {@code COMPLETE_PROFILE}
     */
    @Transactional
    public void evaluateProfileUpdate(Integer userId,
                                      int certificationCount,
                                      int projectCount,
                                      boolean isProfileComplete) {
        User user = findUser(userId);
        if (user == null) return;

        if (certificationCount >= 0)
            evaluate(user, ChallengeType.ADD_CERTIFICATION, certificationCount);

        if (projectCount >= 0)
            evaluate(user, ChallengeType.ADD_PROJECT, projectCount);

        if (isProfileComplete)
            evaluate(user, ChallengeType.COMPLETE_PROFILE, 1);
    }

    /**
     * Evaluates skill-progression challenges after a successful test submission.
     * Covers: {@code VERIFY_SKILL}, {@code EARN_BADGE}, {@code EARN_GOLD_BADGE},
     * and {@code MULTI_SKILL_PROGRESS}.
     */
    @Transactional
    public void evaluateSkillExpansion(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;

        List<UserSkillVerification> verified = verificationRepository.findVerifiedByUserId(userId);

        evaluate(user, ChallengeType.VERIFY_SKILL, verified.size());

        long badgeCount = verified.stream()
                .filter(v -> v.getCurrentBadge() != null)
                .count();
        evaluate(user, ChallengeType.EARN_BADGE, (int) badgeCount);

        long goldCount = verified.stream()
                .filter(v -> v.getCurrentBadge() == BadgeLevel.GOLD)
                .count();
        evaluate(user, ChallengeType.EARN_GOLD_BADGE, (int) goldCount);

        long distinctCategories = verificationRepository.countDistinctCategoriesByUserId(userId);
        evaluate(user, ChallengeType.MULTI_SKILL_PROGRESS, (int) distinctCategories);
    }

    /**
     * Evaluates login-retention challenges on every new-day login.
     * Covers: {@code DAILY_LOGIN}, {@code WEEKLY_ACTIVITY}, {@code STREAK_DAYS}.
     *
     * @param currentStreakDays consecutive daily login count including today
     * @param loginsThisWeek    number of distinct days logged in during the current ISO week
     */
    @Transactional
    public void evaluateLogin(Integer userId, int currentStreakDays, int loginsThisWeek) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.DAILY_LOGIN, 1);
        evaluate(user, ChallengeType.WEEKLY_ACTIVITY, loginsThisWeek);
        evaluate(user, ChallengeType.STREAK_DAYS, currentStreakDays);
    }

    /**
     * Evaluates job-interaction challenges after a user submits an application.
     * Covers: {@code APPLY_JOB}, {@code APPLY_WITH_GOLD}.
     *
     * @param totalApplications cumulative application count for the user
     * @param hasGoldBadge      whether the user currently holds at least one GOLD badge
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
     * Evaluates {@code GET_ACCEPTED} when an application is moved to SHORTLISTED.
     */
    @Transactional
    public void evaluateAcceptance(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;
        evaluate(user, ChallengeType.GET_ACCEPTED, 1);
    }

    /**
     * Evaluates store-economy challenges after any successful XP purchase.
     * Covers: {@code USE_XP_STORE}, {@code SPEND_XP}.
     *
     * @param totalXpSpent cumulative XP spent across all store purchases
     */
    @Transactional
    public void evaluateStorePurchase(Integer userId, int totalXpSpent) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.USE_XP_STORE, 1);
        evaluate(user, ChallengeType.SPEND_XP, totalXpSpent);
    }

    /**
     * Evaluates meta-challenges after any XP award.
     * Covers: {@code REACH_XP} (current balance), {@code COMPLETE_CHALLENGE} (completed count).
     * Called automatically by the core engine whenever XP is awarded.
     */
    @Transactional
    public void evaluateMeta(Integer userId) {
        User user = findUser(userId);
        if (user == null) return;

        evaluate(user, ChallengeType.REACH_XP, user.getXpBalance());

        long completed = userChallengeRepository.countByUserIdAndStatus(userId, ChallengeStatus.COMPLETED);
        evaluate(user, ChallengeType.COMPLETE_CHALLENGE, (int) completed);
    }

    // ── Core evaluation engine ────────────────────────────────────────────────

    /**
     * Core evaluation loop for a single challenge type.
     * Finds all active challenges of {@code type}, creates or updates the user's
     * progress row, and awards XP on first completion (or every completion for
     * repeatable challenges).
     */
    private void evaluate(User user, ChallengeType type, int progress) {
        List<Challenge> challenges = challengeRepository.findByTypeAndIsActiveTrue(type);

        for (Challenge challenge : challenges) {

            LocalDateTime now = LocalDateTime.now();
            if (challenge.getStartDate() != null && now.isBefore(challenge.getStartDate())) continue;
            if (challenge.getEndDate()   != null && now.isAfter(challenge.getEndDate()))   continue;

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

            if (uc.getStatus() == ChallengeStatus.COMPLETED && !challenge.getIsRepeatable()) continue;

            uc.setCurrentProgress(progress);

            if (progress >= challenge.getConditionValue()) {
                boolean wasAlreadyCompleted = uc.getStatus() == ChallengeStatus.COMPLETED;
                uc.setStatus(ChallengeStatus.COMPLETED);
                uc.setCompletedAt(now);
                userChallengeRepository.save(uc);

                if (!wasAlreadyCompleted || challenge.getIsRepeatable()) {
                    awardXp(user, challenge.getXpReward(), TransactionType.CHALLENGE, challenge.getId());
                    evaluateMeta(user.getId());
                }
            } else {
                userChallengeRepository.save(uc);
            }
        }
    }

    // ── XP helpers ────────────────────────────────────────────────────────────

    /**
     * Credits {@code amount} XP to the user and records the transaction.
     * This is the single place where XP is added to a user's balance.
     */
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

    /**
     * Debits {@code amount} XP from the user and records the transaction as a negative amount.
     * Throws {@link com.example.xpandbackend.exception.InsufficientXpException} if the
     * user's balance is lower than {@code amount}.
     */
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