package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.UpdateCompanyProfileRequest;
import com.example.xpandbackend.dto.response.CompanyProfileResponse;
import com.example.xpandbackend.dto.response.CompanyUserFullProfileResponse;
import com.example.xpandbackend.dto.response.UserSkillVerificationResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(companyService.getProfile(principal.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                @RequestBody UpdateCompanyProfileRequest request) {
        return ResponseEntity.ok(companyService.updateProfile(principal.getId(), request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<CompanyUserFullProfileResponse> getUserFullProfileForCompany(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer userId,
            @RequestParam Integer jobId) {
        return ResponseEntity.ok(companyService.getUserFullProfileForCompany(principal.getId(), userId, jobId));
    }

    @GetMapping("/user/{userId}/skill-verifications")
    public ResponseEntity<List<UserSkillVerificationResponse>> getApplicantSkillVerifications(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer userId) {
        return ResponseEntity.ok(companyService.getApplicantSkillVerifications(principal.getId(), userId));
    }
}