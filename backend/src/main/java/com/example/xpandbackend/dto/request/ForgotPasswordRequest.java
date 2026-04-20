package com.example.xpandbackend.dto.request;

import lombok.Data;

/** Body for POST /api/auth/forgot-password — just the email to look up. */
@Data
public class ForgotPasswordRequest {
    private String email;
}
