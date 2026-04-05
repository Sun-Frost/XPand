package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.JobStatus;
import com.example.xpandbackend.models.Enums.JobType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
@Data
public class JobPostingResponse {
    private Integer id;
    private Integer companyId;
    private String companyName;
    private String title;
    private String description;
    private String location;
    private JobType jobType;
    private String salaryRange;
    private LocalDateTime deadline;
    private JobStatus status;
    private List<JobSkillResponse> requiredSkills;
}
