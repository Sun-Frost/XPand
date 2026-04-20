package com.example.xpandbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterCompanyRequest {

    @NotBlank(message = "Email is required.")
    private String email;

    @NotBlank(message = "Password is required.")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$",
            message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
    )
    private String password;

    @NotBlank(message = "Company name is required.")
    private String companyName;

    @NotBlank(message = "Description is required.")
    private String description;

    @NotBlank(message = "Website URL is required.")
    private String websiteUrl;

    @NotBlank(message = "Industry is required.")
    private String industry;

    @NotBlank(message = "Location is required.")
    private String location;
}
