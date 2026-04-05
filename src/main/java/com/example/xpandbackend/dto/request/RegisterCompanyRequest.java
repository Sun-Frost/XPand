package com.example.xpandbackend.dto.request;
import lombok.Data;
@Data
public class RegisterCompanyRequest {
    private String email;
    private String password;
    private String companyName;
    private String description;
    private String websiteUrl;
    private String industry;
    private String location;
}
