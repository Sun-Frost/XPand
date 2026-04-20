package com.example.xpandbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterUserRequest {

    @NotBlank(message = "Email is required.")
    private String email;

    /**
     * Must be at least 8 characters and contain:
     *   - at least one uppercase letter
     *   - at least one lowercase letter
     *   - at least one digit
     *   - at least one special character
     */
    @NotBlank(message = "Password is required.")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$",
            message = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
    )
    private String password;

    @NotBlank(message = "First name is required.")
    private String firstName;

    @NotBlank(message = "Last name is required.")
    private String lastName;

    private String phoneNumber;
    private String country;
    private String city;
}
