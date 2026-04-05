package com.example.xpandbackend.dto.response;

import com.example.xpandbackend.models.Enums.ChallengeType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChallengeResponse {
    private Integer id;
    private String title;
    private String description;
    private ChallengeType type;
    private Integer conditionValue;
    private Integer xpReward;
    private Boolean isActive;
    private Boolean isRepeatable;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}