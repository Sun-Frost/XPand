package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.AuthResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.AuthService;
import jakarta.validation.Valid;
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
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(authService.registerUser(request));
    }

    @PostMapping("/company/register")
    public ResponseEntity<AuthResponse> registerCompany(@Valid @RequestBody RegisterCompanyRequest request) {
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

    // ── Forgot / reset password ───────────────────────────────────────────────

    /**
     * Step 1 — user supplies their email.
     * Generates a 6-digit code, stores it in verificationCode, and emails it.
     * Always returns 200 regardless of whether the email exists (prevents enumeration).
     *
     * POST /api/auth/forgot-password
     * Body: { "email": "user@example.com" }
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(Map.of(
                "message", "If that email is registered, a 6-digit reset code has been sent."));
    }

    /**
     * Step 2 — user supplies email + 6-digit code to verify it is correct
     * BEFORE being allowed to set a new password.
     *
     * Returns 200 on success, 400 with { "message": "..." } on bad/expired code.
     *
     * POST /api/auth/verify-reset-code
     * Body: { "email": "user@example.com", "code": "482910" }
     */
    @PostMapping("/verify-reset-code")
    public ResponseEntity<Map<String, String>> verifyResetCode(
            @Valid @RequestBody VerifyResetCodeRequest request) {
        authService.verifyResetCode(request);
        return ResponseEntity.ok(Map.of("message", "Code verified. You may now set a new password."));
    }

    /**
     * Step 3 — user supplies email + 6-digit code + new password.
     * Re-validates the code (idempotent, prevents replay if user goes back)
     * and sets the new password.
     *
     * POST /api/auth/reset-password
     * Body: { "email": "user@example.com", "code": "482910", "newPassword": "..." }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }

    // ── Change password (authenticated) ──────────────────────────────────────

    @PostMapping("/user/change-password")
    public ResponseEntity<String> changeUserPassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changeUserPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }

    @PostMapping("/company/change-password")
    public ResponseEntity<String> changeCompanyPassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changeCompanyPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }

    // ── Email verification ────────────────────────────────────────────────────

    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestBody VerifyCodeRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now log in."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @RequestBody ResendVerificationRequest request) {
        authService.resendVerificationEmail(request);
        return ResponseEntity.ok(Map.of(
                "message", "If your email exists and is unverified, a new code has been sent."));
    }
}
