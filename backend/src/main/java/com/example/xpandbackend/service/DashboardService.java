package com.example.xpandbackend.service;

import com.example.xpandbackend.dto.response.DashboardResponse;
import com.example.xpandbackend.dto.response.MarketGapResponse;
import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.BadgeLevel;
import com.example.xpandbackend.models.Enums.ChallengeStatus;
import com.example.xpandbackend.models.Enums.ApplicationStatus;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final UserSkillVerificationRepository verificationRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final XPTransactionRepository xpTransactionRepository;
    private final ApplicationRepository applicationRepository;
    private final MarketGapService marketGapService;

    // XP thresholds per level (level = index, xp needed to reach that level)
    private static final int[] LEVEL_XP = {
            0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000,
            5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000
    };

    private int computeLevel(int xp) {
        int level = 0;
        for (int i = 1; i < LEVEL_XP.length; i++) {
            if (xp >= LEVEL_XP[i]) level = i;
            else break;
        }
        return level;
    }

    private int xpForCurrentLevel(int xp, int level) {
        return xp - LEVEL_XP[level];
    }

    private int xpToNextLevel(int xp, int level) {
        if (level >= LEVEL_XP.length - 1) return 0;
        return LEVEL_XP[level + 1] - xp;
    }

    public DashboardResponse getDashboard(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserSkillVerification> verifications = verificationRepository.findByUserId(userId);
        List<UserChallenge> allChallenges = userChallengeRepository.findByUserId(userId);
        List<XPTransaction> transactions = xpTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Application> applications = applicationRepository.findByUserId(userId);
        MarketGapResponse marketGap = marketGapService.getMarketGapForUser(userId);

        DashboardResponse res = new DashboardResponse();

        // ── User info ─────────────────────────────────────────────
        res.setUserId(user.getId());
        res.setFirstName(user.getFirstName());
        res.setLastName(user.getLastName());
        res.setEmail(user.getEmail());
        res.setProfessionalTitle(user.getProfessionalTitle());
        res.setProfilePicture(user.getProfilePicture());
        res.setCountry(user.getCountry());
        res.setXpBalance(user.getXpBalance() != null ? user.getXpBalance() : 0);
        res.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);

        // ── XP / Level ────────────────────────────────────────────
        int xp = res.getXpBalance();
        int level = computeLevel(xp);
        res.setLevel(level);
        res.setXpForCurrentLevel(xpForCurrentLevel(xp, level));
        res.setXpToNextLevel(xpToNextLevel(xp, level));

        // ── XP gained this week ───────────────────────────────────
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        int xpThisWeek = transactions.stream()
                .filter(t -> t.getCreatedAt().isAfter(weekAgo) && t.getAmount() > 0)
                .mapToInt(XPTransaction::getAmount)
                .sum();
        res.setXpGainedThisWeek(xpThisWeek);

        // ── Badge stats ───────────────────────────────────────────
        int gold = 0, silver = 0, bronze = 0;
        for (UserSkillVerification v : verifications) {
            if (v.getCurrentBadge() == BadgeLevel.GOLD)        gold++;
            else if (v.getCurrentBadge() == BadgeLevel.SILVER) silver++;
            else if (v.getCurrentBadge() == BadgeLevel.BRONZE) bronze++;
        }
        res.setTotalBadges(gold + silver + bronze);
        res.setGoldBadges(gold);
        res.setSilverBadges(silver);
        res.setBronzeBadges(bronze);
        res.setVerifiedSkills(verifications.size());

        // ── Challenge stats ───────────────────────────────────────
        long active    = allChallenges.stream().filter(c -> c.getStatus() == ChallengeStatus.IN_PROGRESS).count();
        long completed = allChallenges.stream().filter(c -> c.getStatus() == ChallengeStatus.COMPLETED).count();
        res.setActiveChallenges((int) active);
        res.setCompletedChallenges((int) completed);

        // ── Application stats ─────────────────────────────────────
        res.setTotalApplications(applications.size());
        res.setPendingApplications((int) applications.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.PENDING).count());
        res.setAcceptedApplications((int) applications.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.WITHDRAWN).count());

        // ── Top skills (up to 5, sorted by badge level desc) ──────
        List<DashboardResponse.TopSkillItem> topSkills = verifications.stream()
                .filter(v -> v.getCurrentBadge() != null)
                .sorted(Comparator.comparingInt((UserSkillVerification v) ->
                        v.getCurrentBadge().ordinal()).reversed())
                .limit(5)
                .map(v -> {
                    DashboardResponse.TopSkillItem item = new DashboardResponse.TopSkillItem();
                    item.setSkillId(v.getSkill().getId());
                    item.setSkillName(v.getSkill().getName());
                    item.setCategory(v.getSkill().getCategory());
                    item.setBadge(v.getCurrentBadge().name());
                    item.setAttemptCount(v.getAttemptCount());
                    return item;
                })
                .toList();
        res.setTopSkills(topSkills);

        // ── Market skills (from MarketGapService) ─────────────────
        List<String> userSkillNames = verifications.stream()
                .map(v -> v.getSkill().getName())
                .toList();
        List<DashboardResponse.MarketSkillItem> topMarketSkills = marketGap.getTopDemandedSkills().stream()
                .limit(8)
                .map(s -> {
                    DashboardResponse.MarketSkillItem item = new DashboardResponse.MarketSkillItem();
                    item.setSkillName(s.getSkillName());
                    item.setCategory(s.getCategory());
                    item.setJobCount(s.getJobCount());
                    item.setUserHasIt(userSkillNames.contains(s.getSkillName()));
                    return item;
                })
                .toList();
        res.setTopMarketSkills(topMarketSkills);
        res.setMissingSkills(marketGap.getMissingSkills());
        res.setRecommendedSkills(marketGap.getRecommendedSkills());

        // ── Recent activity (last 5 XP transactions) ──────────────
        List<DashboardResponse.ActivityItem> recentActivity = transactions.stream()
                .limit(5)
                .map(t -> {
                    DashboardResponse.ActivityItem item = new DashboardResponse.ActivityItem();
                    item.setType(t.getAmount() > 0 ? "XP_GAIN" : "XP_SPEND");
                    item.setLabel((t.getAmount() > 0 ? "+" : "") + t.getAmount() + " XP");
                    item.setDetail(t.getSourceType().name());
                    item.setAmount(t.getAmount());
                    item.setTimestamp(t.getCreatedAt().toString());
                    return item;
                })
                .toList();
        res.setRecentActivity(recentActivity);

        return res;
    }
}