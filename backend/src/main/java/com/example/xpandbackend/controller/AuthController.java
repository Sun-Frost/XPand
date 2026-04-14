package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.AuthResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/user/register")
    public ResponseEntity<AuthResponse> registerUser(@RequestBody RegisterUserRequest request) {
        return ResponseEntity.ok(authService.registerUser(request));
    }

    @PostMapping("/company/register")
    public ResponseEntity<AuthResponse> registerCompany(@RequestBody RegisterCompanyRequest request) {
        return ResponseEntity.ok(authService.registerCompany(request));
    }

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
    public ResponseEntity<String> changeUserPassword(@AuthenticationPrincipal AuthenticatedUser principal,
                                                     @RequestBody ChangePasswordRequest request) {
        authService.changeUserPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }

    @PostMapping("/company/change-password")
    public ResponseEntity<String> changeCompanyPassword(@AuthenticationPrincipal AuthenticatedUser principal,
                                                        @RequestBody ChangePasswordRequest request) {
        authService.changeCompanyPassword(principal.getId(), request);
        return ResponseEntity.ok("Password changed successfully.");
    }
}
