package com.example.xpandbackend.dto.response;

import com.example.xpandbackend.models.Enums.ChallengeStatus;
import com.example.xpandbackend.models.Enums.ChallengeType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserChallengeResponse {
    private Integer id;
    private Integer challengeId;
    private String challengeTitle;
    private ChallengeType type;
    private Integer xpReward;
    private Integer currentProgress;
    private Integer conditionValue;      // was targetValue
    private LocalDateTime startDate;
    private LocalDateTime completedAt;
    private ChallengeStatus status;
}