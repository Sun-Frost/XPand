package com.example.xpandbackend.controller;

import com.example.xpandbackend.models.Enums.ApplicationStatus;
import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    // Public
    @GetMapping("/api/jobs")
    public ResponseEntity<List<JobPostingResponse>> getActiveJobs() {
        return ResponseEntity.ok(jobService.getActiveJobs());
    }

    @GetMapping("/api/jobs/{jobId}")
    public ResponseEntity<JobPostingResponse> getJob(@PathVariable Integer jobId) {
        return ResponseEntity.ok(jobService.getJobById(jobId));
    }

    @GetMapping("/api/jobs/{jobId}/priority-slots")
    public ResponseEntity<Map<String, Long>> getPrioritySlotInfo(@PathVariable Integer jobId) {
        long taken = jobService.getActivePrioritySlotCount(jobId);
        return ResponseEntity.ok(Map.of(
                "taken",     taken,
                "total",     3L,
                "available", Math.max(0L, 3L - taken)
        ));
    }

    // Company
    @GetMapping("/api/company/jobs")
    public ResponseEntity<List<JobPostingResponse>> getCompanyJobs(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(jobService.getCompanyJobs(principal.getId()));
    }

    @PostMapping("/api/company/jobs")
    public ResponseEntity<JobPostingResponse> createJob(@AuthenticationPrincipal AuthenticatedUser principal,
                                                        @RequestBody CreateJobRequest request) {
        return ResponseEntity.ok(jobService.createJob(principal.getId(), request));
    }

    @PutMapping("/api/company/jobs/{jobId}")
    public ResponseEntity<JobPostingResponse> updateJob(@AuthenticationPrincipal AuthenticatedUser principal,
                                                        @PathVariable Integer jobId,
                                                        @RequestBody CreateJobRequest request) {
        return ResponseEntity.ok(jobService.updateJob(principal.getId(), jobId, request));
    }

    @DeleteMapping("/api/company/jobs/{jobId}")
    public ResponseEntity<Void> deleteJob(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @PathVariable Integer jobId) {
        jobService.deleteJob(principal.getId(), jobId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/company/jobs/{jobId}/applications")
    public ResponseEntity<List<ApplicationResponse>> getJobApplications(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer jobId) {
        return ResponseEntity.ok(jobService.getJobApplications(principal.getId(), jobId));
    }

    @PatchMapping("/api/company/applications/{applicationId}/status")
    public ResponseEntity<ApplicationResponse> updateApplicationStatus(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer applicationId,
            @RequestParam ApplicationStatus status) {
        return ResponseEntity.ok(jobService.updateApplicationStatus(principal.getId(), applicationId, status));
    }

    // User
    @PostMapping("/api/user/applications")
    public ResponseEntity<ApplicationResponse> applyToJob(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @RequestBody ApplyJobRequest request) {
        return ResponseEntity.ok(jobService.applyToJob(principal.getId(), request));
    }

    @GetMapping("/api/user/applications")
    public ResponseEntity<List<ApplicationResponse>> getUserApplications(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(jobService.getUserApplications(principal.getId()));
    }

    @DeleteMapping("/api/user/applications/{applicationId}")
    public ResponseEntity<Void> withdrawApplication(@AuthenticationPrincipal AuthenticatedUser principal,
                                                    @PathVariable Integer applicationId) {
        jobService.withdrawApplication(principal.getId(), applicationId);
        return ResponseEntity.noContent().build();
    }
}