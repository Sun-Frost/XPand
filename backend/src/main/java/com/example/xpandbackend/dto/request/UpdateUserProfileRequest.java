package com.example.xpandbackend.dto.request;
import lombok.Data;
@Data
public class UpdateUserProfileRequest {
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
}
