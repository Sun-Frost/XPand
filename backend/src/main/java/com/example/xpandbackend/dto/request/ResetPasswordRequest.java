package com.example.xpandbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Body for POST /api/auth/reset-password — email + verified code + new password.
 */
@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Email is required.")
    private String email;

    @NotBlank(message = "Reset code is required.")
    private String code;

    @NotBlank(message = "New password is required.")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$",
            message = "Password must be at least 8 characters and include an uppercase letter, " +
                    "a lowercase letter, a number, and a special character."
    )
    private String newPassword;
}
