package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDate;
@Data
public class WorkExperienceResponse {
    private Integer id;
    private String jobTitle;
    private String companyName;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
}
