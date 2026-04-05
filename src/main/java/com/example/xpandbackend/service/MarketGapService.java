package com.example.xpandbackend.service;

import com.example.xpandbackend.models.JobSkillRequirement;
import com.example.xpandbackend.dto.response.MarketGapResponse;
import com.example.xpandbackend.repository.JobSkillRequirementRepository;
import com.example.xpandbackend.repository.JobPostingRepository;
import com.example.xpandbackend.repository.UserSkillVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketGapService {

    private final JobPostingRepository jobPostingRepository;
    private final JobSkillRequirementRepository jobSkillRequirementRepository;
    private final UserSkillVerificationRepository verificationRepository;

    public MarketGapResponse getMarketGapForUser(Integer userId) {
        // Get all active job skill demands
        List<Integer> activeJobIds = jobPostingRepository.findActiveJobs(LocalDateTime.now())
                .stream().map(j -> j.getId()).collect(Collectors.toList());

        Map<String, Long> skillDemandMap = new LinkedHashMap<>();
        Map<String, String> skillCategoryMap = new HashMap<>();

        for (Integer jobId : activeJobIds) {
            List<JobSkillRequirement> reqs = jobSkillRequirementRepository.findByJobPostingId(jobId);
            for (JobSkillRequirement req : reqs) {
                String skillName = req.getSkill().getName();
                skillDemandMap.merge(skillName, 1L, Long::sum);
                skillCategoryMap.put(skillName, req.getSkill().getCategory());
            }
        }

        // Top demanded skills (top 10)
        List<MarketGapResponse.SkillDemandItem> topDemanded = skillDemandMap.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    MarketGapResponse.SkillDemandItem item = new MarketGapResponse.SkillDemandItem();
                    item.setSkillName(e.getKey());
                    item.setCategory(skillCategoryMap.get(e.getKey()));
                    item.setJobCount(e.getValue());
                    return item;
                })
                .collect(Collectors.toList());

        // User verified skills
        List<String> userSkills = verificationRepository.findVerifiedByUserId(userId).stream()
                .map(v -> v.getSkill().getName())
                .collect(Collectors.toList());

        // Missing skills = top demanded that user doesn't have
        List<String> missing = topDemanded.stream()
                .map(MarketGapResponse.SkillDemandItem::getSkillName)
                .filter(name -> !userSkills.contains(name))
                .collect(Collectors.toList());

        // Recommend top 5 missing skills
        List<String> recommended = missing.stream().limit(5).collect(Collectors.toList());

        MarketGapResponse response = new MarketGapResponse();
        response.setTopDemandedSkills(topDemanded);
        response.setUserVerifiedSkills(userSkills);
        response.setMissingSkills(missing);
        response.setRecommendedSkills(recommended);
        return response;
    }

    public MarketGapResponse getGlobalMarketGap() {
        List<Integer> activeJobIds = jobPostingRepository.findActiveJobs(LocalDateTime.now())
                .stream().map(j -> j.getId()).collect(Collectors.toList());

        Map<String, Long> skillDemandMap = new LinkedHashMap<>();
        Map<String, String> skillCategoryMap = new HashMap<>();

        for (Integer jobId : activeJobIds) {
            List<JobSkillRequirement> reqs = jobSkillRequirementRepository.findByJobPostingId(jobId);
            for (JobSkillRequirement req : reqs) {
                String skillName = req.getSkill().getName();
                skillDemandMap.merge(skillName, 1L, Long::sum);
                skillCategoryMap.put(skillName, req.getSkill().getCategory());
            }
        }

        List<MarketGapResponse.SkillDemandItem> topDemanded = skillDemandMap.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(20)
                .map(e -> {
                    MarketGapResponse.SkillDemandItem item = new MarketGapResponse.SkillDemandItem();
                    item.setSkillName(e.getKey());
                    item.setCategory(skillCategoryMap.get(e.getKey()));
                    item.setJobCount(e.getValue());
                    return item;
                })
                .collect(Collectors.toList());

        MarketGapResponse response = new MarketGapResponse();
        response.setTopDemandedSkills(topDemanded);
        response.setUserVerifiedSkills(Collections.emptyList());
        response.setMissingSkills(Collections.emptyList());
        response.setRecommendedSkills(Collections.emptyList());
        return response;
    }
}
