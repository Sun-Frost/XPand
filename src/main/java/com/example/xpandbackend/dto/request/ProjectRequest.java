package com.example.xpandbackend.dto.request;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
@Data
public class ProjectRequest {
    private String title;
    private String description;
    private String technologiesUsed;
    private String projectUrl;
    private String githubUrl;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> skillIds;
}
