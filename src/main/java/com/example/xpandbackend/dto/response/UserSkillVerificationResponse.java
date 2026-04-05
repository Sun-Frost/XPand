package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.BadgeLevel;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class UserSkillVerificationResponse {
    private Integer verificationId;
    private Integer skillId;
    private String skillName;
    private String category;
    private BadgeLevel currentBadge;
    private Integer attemptCount;
    private Boolean isLocked;
    private LocalDateTime lockExpiry;
    private LocalDateTime verifiedDate;
}
