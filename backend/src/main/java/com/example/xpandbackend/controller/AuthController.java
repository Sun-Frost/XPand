package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.AuthResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ── Registration ──────────────────────────────────────────────────────────

    @PostMapping("/user/register")
    public ResponseEntity<AuthResponse> registerUser(@RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(authService.registerUser(request));
    }

    @PostMapping("/company/register")
    public ResponseEntity<AuthResponse> registerCompany(@RequestBody RegisterCompanyRequest request) {
        return ResponseEntity.ok(authService.registerCompany(request));
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/user/login")
    public ResponseEntity<AuthResponse> loginUser(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.loginUser(request));
    }

    @PostMapping("/company/login")
    public ResponseEntity<AuthResponse> loginCompany(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.loginCompany(request));
    }

    @PostMapping("/admin/login")
    public ResponseEntity<AuthResponse> loginAdmin(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.loginAdmin(request));
    }

    // ── Password ──────────────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok("If the email exists, a reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok("Password reset successfully.");
    }

    @PostMapping("/user/change-password")
    public ResponseEntity<String> changeUserPassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody ChangePasswordRequest request) {
        authService.changeUserPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }

    @PostMapping("/company/change-password")
    public ResponseEntity<String> changeCompanyPassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody ChangePasswordRequest request) {
        authService.changeCompanyPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }

    // ── Email verification ────────────────────────────────────────────────────

    /**
     * Verifies a user or company email using the 6-digit code they received.
     *
     * POST /api/auth/verify
     * Body: { "email": "user@example.com", "code": "482910" }
     *
     * Returns 200 on success, 400 if the code is wrong or the email is unknown.
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestBody VerifyCodeRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now log in."));
    }

    /**
     * Generates a fresh 6-digit code and resends the verification email.
     * Always returns 200 — safe to call even with an unknown email (prevents enumeration).
     *
     * POST /api/auth/resend-verification
     * Body: { "email": "user@example.com" }
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @RequestBody ResendVerificationRequest request) {
        authService.resendVerificationEmail(request);
        return ResponseEntity.ok(Map.of(
                "message", "If your email exists and is unverified, a new code has been sent."));
    }
}
