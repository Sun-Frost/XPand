package com.example.xpandbackend.dto.request;
import lombok.Data;
import java.time.LocalDate;
@Data
public class WorkExperienceRequest {
    private String jobTitle;
    private String companyName;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
}
