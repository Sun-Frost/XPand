package com.example.xpandbackend.dto.request;
import com.example.xpandbackend.models.Enums.ImportanceLevel;
import lombok.Data;
@Data
public class JobSkillRequest {
    private Integer skillId;
    private ImportanceLevel importance;
}
