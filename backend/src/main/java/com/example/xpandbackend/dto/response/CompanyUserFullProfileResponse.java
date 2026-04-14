package com.example.xpandbackend.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class CompanyUserFullProfileResponse {
    private CompanyViewUserProfileResponse profile;
    private List<EducationResponse> educations;
    private List<WorkExperienceResponse> workExperiences;
    private List<ProjectResponse> projects;
    private List<CertificationResponse> certifications;
}