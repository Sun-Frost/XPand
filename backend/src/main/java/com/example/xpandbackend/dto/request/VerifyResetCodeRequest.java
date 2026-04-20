package com.example.xpandbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Body for POST /api/auth/verify-reset-code.
 *
 * Lets the frontend validate the 6-digit code BEFORE showing the
 * "set new password" form, so the user never reaches that step with
 * a bad code.
 */
@Data
public class VerifyResetCodeRequest {

    @NotBlank(message = "Email is required.")
    private String email;

    @NotBlank(message = "Reset code is required.")
    private String code;
}
