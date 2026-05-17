package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.BadgeLevel;
import com.example.xpandbackend.dto.request.SubmitTestRequest;
import com.example.xpandbackend.dto.response.QuestionResponse;
import com.example.xpandbackend.dto.response.TestAttemptResponse;
import com.example.xpandbackend.dto.response.UserSkillVerificationResponse;
import com.example.xpandbackend.exception.BadRequestException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Manages skill test delivery and scoring.
 *
 * <h3>Test structure</h3>
 * Each test draws 5 EASY, 5 MEDIUM, and 5 HARD questions at random (15 total).
 * Questions are shuffled before delivery so the order differs each time.
 *
 * <h3>Scoring and badges</h3>
 * <ul>
 *   <li>Score ≥ 28 → GOLD badge (no further attempts allowed for this skill)</li>
 *   <li>Score ≥ 24 → SILVER badge</li>
 *   <li>Score ≥ 18 → BRONZE badge</li>
 *   <li>Score &lt; 18 → no badge awarded, attempt is still consumed</li>
 * </ul>
 * A user's badge is only upgraded, never downgraded. GOLD is permanent.
 *
 * <h3>Attempt limits and locking</h3>
 * A user may attempt each skill up to 3 times per month. After 3 attempts the
 * verification record is locked for 1 month. The lock is released automatically
 * on the next {@link #startTest} call after the expiry timestamp.
 */
@Service
@RequiredArgsConstructor
public class SkillVerificationService {

    private static final int EASY_COUNT   = 5;
    private static final int MEDIUM_COUNT = 5;
    private static final int HARD_COUNT   = 5;
    private static final int MAX_ATTEMPTS = 3;
    private static final int BRONZE_MIN   = 18;
    private static final int SILVER_MIN   = 24;
    private static final int GOLD_MIN     = 28;

    private final SkillRepository skillRepository;
    private final QuestionRepository questionRepository;
    private final UserSkillVerificationRepository verificationRepository;
    private final TestAttemptRepository testAttemptRepository;
    private final TestAttemptQuestionRepository testAttemptQuestionRepository;
    private final UserRepository userRepository;
    private final ChallengeEvaluationService challengeEvaluationService;

    /**
     * Validates eligibility and returns a shuffled set of 15 questions for the test.
     * Throws if the skill is inactive, the user already holds GOLD, or the
     * verification record is locked and the lock has not yet expired.
     */
    public List<QuestionResponse> startTest(Integer userId, Integer skillId) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        if (!skill.getIsActive()) throw new BadRequestException("This skill is not active.");

        UserSkillVerification verification = verificationRepository
                .findByUserIdAndSkillId(userId, skillId)
                .stream().findFirst().orElse(null);

        if (verification != null) {
            if (BadgeLevel.GOLD.equals(verification.getCurrentBadge())) {
                throw new BadRequestException(
                        "You have already earned a Gold badge for this skill. No further attempts are needed.");
            }

            if (verification.getIsLocked()) {
                if (verification.getLockExpiry() != null
                        && LocalDateTime.now().isAfter(verification.getLockExpiry())) {
                    // Lock period has expired — reset for a new monthly window
                    verification.setIsLocked(false);
                    verification.setAttemptCount(0);
                    verification.setLockExpiry(null);
                    verificationRepository.save(verification);
                } else {
                    throw new BadRequestException(
                            "Skill is locked. Try again after: " + verification.getLockExpiry());
                }
            }

            if (verification.getAttemptCount() >= MAX_ATTEMPTS) {
                throw new BadRequestException("Maximum attempts reached. Skill is locked.");
            }
        }

        List<Question> easy   = questionRepository.findRandomBySkillAndDifficulty(skillId, "EASY",   EASY_COUNT);
        List<Question> medium = questionRepository.findRandomBySkillAndDifficulty(skillId, "MEDIUM", MEDIUM_COUNT);
        List<Question> hard   = questionRepository.findRandomBySkillAndDifficulty(skillId, "HARD",   HARD_COUNT);

        List<Question> all = new ArrayList<>();
        all.addAll(easy);
        all.addAll(medium);
        all.addAll(hard);
        Collections.shuffle(all);

        return all.stream().map(this::mapToQuestionResponse).collect(Collectors.toList());
    }

    /**
     * Scores the submitted answers, persists the attempt, updates the verification
     * record (badge and lock status), and triggers challenge evaluation.
     * Returns the full per-question breakdown so the frontend can show a result screen.
     */
    @Transactional
    public TestAttemptResponse submitTest(Integer userId, Integer skillId, SubmitTestRequest request) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        UserSkillVerification verification = verificationRepository
                .findByUserIdAndSkillId(userId, skillId)
                .stream().findFirst().orElseGet(() -> {
                    UserSkillVerification v = new UserSkillVerification();
                    v.setUser(user);
                    v.setSkill(skill);
                    v.setAttemptCount(0);
                    v.setIsLocked(false);
                    return v;
                });

        if (verification.getIsLocked()) {
            if (verification.getLockExpiry() != null
                    && LocalDateTime.now().isBefore(verification.getLockExpiry())) {
                throw new BadRequestException("Skill is locked.");
            }
        }

        int totalScore  = 0;
        int correctCount = 0;

        TestAttempt attempt = new TestAttempt();
        attempt.setUser(user);
        attempt.setSkill(skill);

        List<TestAttemptQuestion> attemptQuestions = new ArrayList<>();
        List<TestAttemptResponse.QuestionResult> questionResults = new ArrayList<>();

        for (Map.Entry<Integer, String> entry : request.getAnswers().entrySet()) {
            Question q = questionRepository.findById(entry.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Question not found: " + entry.getKey()));

            boolean correct = q.getCorrectAnswer().equalsIgnoreCase(entry.getValue());
            if (correct) {
                totalScore += q.getPoints();
                correctCount++;
            }

            TestAttemptQuestion taq = new TestAttemptQuestion();
            taq.setTestAttempt(attempt);
            taq.setQuestion(q);
            taq.setUserAnswer(entry.getValue());
            taq.setIsCorrect(correct);
            attemptQuestions.add(taq);

            TestAttemptResponse.QuestionResult qr = new TestAttemptResponse.QuestionResult();
            qr.setQuestionId(q.getId());
            qr.setQuestionText(q.getQuestionText());
            qr.setOptionA(q.getOptionA());
            qr.setOptionB(q.getOptionB());
            qr.setOptionC(q.getOptionC());
            qr.setOptionD(q.getOptionD());
            qr.setDifficultyLevel(q.getDifficultyLevel());
            qr.setPoints(q.getPoints());
            qr.setUserAnswer(entry.getValue());
            qr.setCorrectAnswer(q.getCorrectAnswer());
            qr.setIsCorrect(correct);
            questionResults.add(qr);
        }

        BadgeLevel badge = determineBadge(totalScore);
        attempt.setScore(totalScore);
        attempt.setBadgeAwarded(badge);
        testAttemptRepository.save(attempt);
        testAttemptQuestionRepository.saveAll(attemptQuestions);

        verification.setAttemptCount(verification.getAttemptCount() + 1);
        verification.setLastAttemptDate(LocalDateTime.now());

        // Only upgrade the badge — never downgrade
        if (badge != null) {
            if (verification.getCurrentBadge() == null
                    || badge.ordinal() > verification.getCurrentBadge().ordinal()) {
                verification.setCurrentBadge(badge);
                verification.setVerifiedDate(LocalDateTime.now());
            }
        }

        // Lock after MAX_ATTEMPTS regardless of badge outcome
        if (verification.getAttemptCount() >= MAX_ATTEMPTS) {
            verification.setIsLocked(true);
            verification.setLockExpiry(LocalDateTime.now().plusMonths(1));
        }

        verificationRepository.save(verification);
        challengeEvaluationService.evaluateSkillExpansion(userId);

        TestAttemptResponse response = new TestAttemptResponse();
        response.setAttemptId(attempt.getId());
        response.setSkillId(skillId);
        response.setSkillName(skill.getName());
        response.setScore(totalScore);
        response.setBadgeAwarded(badge);
        response.setCreatedAt(attempt.getCreatedAt());
        response.setCorrectCount(correctCount);
        response.setTotalQuestions(attemptQuestions.size());
        response.setQuestionResults(questionResults);
        return response;
    }

    /** Returns all verification records for the user (including attempts with no badge). */
    public List<UserSkillVerificationResponse> getUserVerifications(Integer userId) {
        return verificationRepository.findByUserId(userId).stream()
                .map(this::mapToVerificationResponse).collect(Collectors.toList());
    }

    /** Returns a summary of all past test attempts for the user (no per-question breakdown). */
    public List<TestAttemptResponse> getUserTestHistory(Integer userId) {
        return testAttemptRepository.findByUserId(userId).stream()
                .map(a -> {
                    TestAttemptResponse r = new TestAttemptResponse();
                    r.setAttemptId(a.getId());
                    r.setSkillId(a.getSkill().getId());
                    r.setSkillName(a.getSkill().getName());
                    r.setScore(a.getScore());
                    r.setBadgeAwarded(a.getBadgeAwarded());
                    r.setCreatedAt(a.getCreatedAt());
                    return r;
                }).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Returns the badge level for a given score, or {@code null} if below BRONZE. */
    private BadgeLevel determineBadge(int score) {
        if (score >= GOLD_MIN)   return BadgeLevel.GOLD;
        if (score >= SILVER_MIN) return BadgeLevel.SILVER;
        if (score >= BRONZE_MIN) return BadgeLevel.BRONZE;
        return null;
    }

    private QuestionResponse mapToQuestionResponse(Question q) {
        QuestionResponse r = new QuestionResponse();
        r.setId(q.getId());
        r.setQuestionText(q.getQuestionText());
        r.setOptionA(q.getOptionA());
        r.setOptionB(q.getOptionB());
        r.setOptionC(q.getOptionC());
        r.setOptionD(q.getOptionD());
        r.setDifficultyLevel(q.getDifficultyLevel());
        r.setPoints(q.getPoints());
        return r;
    }

    private UserSkillVerificationResponse mapToVerificationResponse(UserSkillVerification v) {
        UserSkillVerificationResponse r = new UserSkillVerificationResponse();
        r.setVerificationId(v.getId());
        r.setSkillId(v.getSkill().getId());
        r.setSkillName(v.getSkill().getName());
        r.setCategory(v.getSkill().getCategory());
        r.setCurrentBadge(v.getCurrentBadge());
        r.setAttemptCount(v.getAttemptCount());
        r.setIsLocked(v.getIsLocked());
        r.setLockExpiry(v.getLockExpiry());
        r.setVerifiedDate(v.getVerifiedDate());
        return r;
    }
}