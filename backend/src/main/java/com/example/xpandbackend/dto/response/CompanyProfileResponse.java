package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class CompanyProfileResponse {
    private Integer id;
    private String email;
    private String companyName;
    private String description;
    private String websiteUrl;
    private String industry;
    private String location;
    private Boolean isApproved;
    private LocalDateTime createdAt;
}
