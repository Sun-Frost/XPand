package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                                             @RequestBody UpdateUserProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(principal.getId(), request));
    }

    // -------- Education --------
    @GetMapping("/education")
    public ResponseEntity<List<EducationResponse>> getEducations(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(userService.getEducations(principal.getId()));
    }

    @PostMapping("/education")
    public ResponseEntity<EducationResponse> addEducation(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @RequestBody EducationRequest request) {
        return ResponseEntity.ok(userService.addEducation(principal.getId(), request));
    }

    @PutMapping("/education/{id}")
    public ResponseEntity<EducationResponse> updateEducation(@AuthenticationPrincipal AuthenticatedUser principal,
                                                             @PathVariable Integer id,
                                                             @RequestBody EducationRequest request) {
        return ResponseEntity.ok(userService.updateEducation(principal.getId(), id, request));
    }

    @DeleteMapping("/education/{id}")
    public ResponseEntity<Void> deleteEducation(@AuthenticationPrincipal AuthenticatedUser principal,
                                                @PathVariable Integer id) {
        userService.deleteEducation(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    // -------- Work Experience --------
    @GetMapping("/work-experience")
    public ResponseEntity<List<WorkExperienceResponse>> getWorkExperiences(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(userService.getWorkExperiences(principal.getId()));
    }

    @PostMapping("/work-experience")
    public ResponseEntity<WorkExperienceResponse> addWorkExperience(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                     @RequestBody WorkExperienceRequest request) {
        return ResponseEntity.ok(userService.addWorkExperience(principal.getId(), request));
    }

    @PutMapping("/work-experience/{id}")
    public ResponseEntity<WorkExperienceResponse> updateWorkExperience(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                        @PathVariable Integer id,
                                                                        @RequestBody WorkExperienceRequest request) {
        return ResponseEntity.ok(userService.updateWorkExperience(principal.getId(), id, request));
    }

    @DeleteMapping("/work-experience/{id}")
    public ResponseEntity<Void> deleteWorkExperience(@AuthenticationPrincipal AuthenticatedUser principal,
                                                      @PathVariable Integer id) {
        userService.deleteWorkExperience(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    // -------- Certifications --------
    @GetMapping("/certifications")
    public ResponseEntity<List<CertificationResponse>> getCertifications(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(userService.getCertifications(principal.getId()));
    }

    @PostMapping("/certifications")
    public ResponseEntity<CertificationResponse> addCertification(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                   @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(userService.addCertification(principal.getId(), request));
    }

    @PutMapping("/certifications/{id}")
    public ResponseEntity<CertificationResponse> updateCertification(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                      @PathVariable Integer id,
                                                                      @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(userService.updateCertification(principal.getId(), id, request));
    }

    @DeleteMapping("/certifications/{id}")
    public ResponseEntity<Void> deleteCertification(@AuthenticationPrincipal AuthenticatedUser principal,
                                                     @PathVariable Integer id) {
        userService.deleteCertification(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    // -------- Projects --------
    @GetMapping("/projects")
    public ResponseEntity<List<ProjectResponse>> getProjects(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(userService.getProjects(principal.getId()));
    }

    @PostMapping("/projects")
    public ResponseEntity<ProjectResponse> addProject(@AuthenticationPrincipal AuthenticatedUser principal,
                                                      @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(userService.addProject(principal.getId(), request));
    }

    @PutMapping("/projects/{id}")
    public ResponseEntity<ProjectResponse> updateProject(@AuthenticationPrincipal AuthenticatedUser principal,
                                                         @PathVariable Integer id,
                                                         @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(userService.updateProject(principal.getId(), id, request));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Void> deleteProject(@AuthenticationPrincipal AuthenticatedUser principal,
                                              @PathVariable Integer id) {
        userService.deleteProject(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
