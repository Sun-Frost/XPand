package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.ApplicationStatus;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class ApplicationResponse {
    private Integer id;
    private Integer userId;
    private String userFullName;
    private Integer jobId;
    private String jobTitle;
    private Integer prioritySlotRank;
    private ApplicationStatus status;
    private LocalDateTime appliedAt;
}
