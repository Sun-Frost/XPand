package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.ImportanceLevel;
import lombok.Data;
@Data
public class JobSkillResponse {
    private Integer skillId;
    private String skillName;
    private ImportanceLevel importance;
}
