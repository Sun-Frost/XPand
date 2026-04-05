package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Data
public class ProjectResponse {
    private Integer id;
    private String title;
    private String description;
    private String technologiesUsed;
    private String projectUrl;
    private String githubUrl;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private List<SkillResponse> skills;
}
