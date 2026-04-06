package com.example.xpandbackend.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class DashboardResponse {

    // User basics
    private Integer userId;
    private String firstName;
    private String lastName;
    private String email;
    private String professionalTitle;
    private String profilePicture;
    private String country;
    private Integer xpBalance;
    private String createdAt;

    // XP / Level
    private Integer xpGainedThisWeek;
    private Integer level;
    private Integer xpToNextLevel;
    private Integer xpForCurrentLevel;

    // Badge stats
    private Integer totalBadges;
    private Integer goldBadges;
    private Integer silverBadges;
    private Integer bronzeBadges;

    // Activity stats
    private Integer activeChallenges;
    private Integer completedChallenges;
    private Integer verifiedSkills;
    private Integer totalApplications;
    private Integer pendingApplications;
    private Integer acceptedApplications;

    // Lists
    private List<TopSkillItem> topSkills;
    private List<ActivityItem> recentActivity;
    private List<MarketSkillItem> topMarketSkills;
    private List<String> missingSkills;
    private List<String> recommendedSkills;

    @Data
    public static class TopSkillItem {
        private Integer skillId;
        private String skillName;
        private String category;
        private String badge;           // "GOLD" | "SILVER" | "BRONZE"
        private Integer attemptCount;
    }

    @Data
    public static class ActivityItem {
        private String type;            // "XP_GAIN" | "XP_SPEND" | "APPLICATION" | "BADGE"
        private String label;
        private String detail;
        private Integer amount;
        private String timestamp;       // ISO string
    }

    @Data
    public static class MarketSkillItem {
        private String skillName;
        private String category;
        private Long jobCount;
        private Boolean userHasIt;
    }
}