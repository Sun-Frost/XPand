package com.example.xpandbackend.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CompanyViewUserProfileResponse {
    private Integer id;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String country;
    private String city;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private String profilePicture;
    private String professionalTitle;
    private String aboutMe;
    private LocalDateTime createdAt;
    private Integer xpBalance;
}