package com.example.xpandbackend.dto.request;
import com.example.xpandbackend.models.Enums.JobType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
@Data
public class CreateJobRequest {
    private String title;
    private String description;
    private String location;
    private JobType jobType;
    private String salaryRange;
    private LocalDateTime deadline;
    private List<JobSkillRequest> skills;
}
