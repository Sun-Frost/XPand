package com.example.xpandbackend.service;

import com.example.xpandbackend.models.Challenge;
import com.example.xpandbackend.models.UserChallenge;
import com.example.xpandbackend.dto.response.ChallengeResponse;
import com.example.xpandbackend.dto.response.UserChallengeResponse;
import com.example.xpandbackend.repository.ChallengeRepository;
import com.example.xpandbackend.repository.UserChallengeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChallengeService {

    private final ChallengeRepository challengeRepository;
    private final UserChallengeRepository userChallengeRepository;

    public List<ChallengeResponse> getAllChallenges() {
        return challengeRepository.findAll().stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<UserChallengeResponse> getUserChallengesProgress(Integer userId) {
        return userChallengeRepository.findByUserId(userId).stream()
                .map(this::mapToUserChallengeResponse).collect(Collectors.toList());
    }

    private ChallengeResponse mapToResponse(Challenge c) {
        ChallengeResponse r = new ChallengeResponse();
        r.setId(c.getId());
        r.setTitle(c.getTitle());
        r.setDescription(c.getDescription());
        r.setType(c.getType());                          // was getChallengeType()
        r.setConditionValue(c.getConditionValue());      // was getTargetValue()
        r.setXpReward(c.getXpReward());
        r.setIsActive(c.getIsActive());
        r.setIsRepeatable(c.getIsRepeatable());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        return r;
    }

    private UserChallengeResponse mapToUserChallengeResponse(UserChallenge uc) {
        UserChallengeResponse r = new UserChallengeResponse();
        r.setId(uc.getId());
        r.setChallengeId(uc.getChallenge().getId());
        r.setChallengeTitle(uc.getChallenge().getTitle());
        r.setXpReward(uc.getChallenge().getXpReward());
        r.setCurrentProgress(uc.getCurrentProgress());
        r.setConditionValue(uc.getChallenge().getConditionValue()); // was getTargetValue()
        r.setStartDate(uc.getStartDate());
        r.setCompletedAt(uc.getCompletedAt());
        r.setStatus(uc.getStatus());
        return r;
    }
}