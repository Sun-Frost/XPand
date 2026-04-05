package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.util.List;
@Data
public class MarketGapResponse {
    private List<SkillDemandItem> topDemandedSkills;
    private List<String> userVerifiedSkills;
    private List<String> missingSkills;
    private List<String> recommendedSkills;

    @Data
    public static class SkillDemandItem {
        private String skillName;
        private String category;
        private long jobCount;
    }
}
