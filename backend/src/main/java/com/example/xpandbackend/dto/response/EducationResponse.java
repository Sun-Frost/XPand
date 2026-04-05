package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDate;
@Data
public class EducationResponse {
    private Integer id;
    private String institutionName;
    private String degree;
    private String fieldOfStudy;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
}
