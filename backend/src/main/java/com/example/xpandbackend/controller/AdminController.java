package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // -------- Users --------
    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PatchMapping("/users/{userId}/suspend")
    public ResponseEntity<String> suspendUser(@PathVariable Integer userId) {
        adminService.suspendUser(userId);
        return ResponseEntity.ok("User suspended.");
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    // -------- Companies --------
    @GetMapping("/companies")
    public ResponseEntity<List<CompanyProfileResponse>> getAllCompanies() {
        return ResponseEntity.ok(adminService.getAllCompanies());
    }

    @GetMapping("/companies/pending")
    public ResponseEntity<List<CompanyProfileResponse>> getPendingCompanies() {
        return ResponseEntity.ok(adminService.getPendingCompanies());
    }

    @PatchMapping("/companies/{companyId}/approve")
    public ResponseEntity<CompanyProfileResponse> approveCompany(@PathVariable Integer companyId) {
        return ResponseEntity.ok(adminService.approveCompany(companyId));
    }

    @PatchMapping("/companies/{companyId}/suspend")
    public ResponseEntity<String> suspendCompany(@PathVariable Integer companyId) {
        adminService.suspendCompany(companyId);
        return ResponseEntity.ok("Company suspended.");
    }

    @DeleteMapping("/companies/{companyId}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Integer companyId) {
        adminService.deleteCompany(companyId);
        return ResponseEntity.noContent().build();
    }

    // -------- Skills --------
    @GetMapping("/skills")
    public ResponseEntity<List<SkillResponse>> getAllSkills() {
        return ResponseEntity.ok(adminService.getAllSkills());
    }

    @PostMapping("/skills")
    public ResponseEntity<SkillResponse> createSkill(@RequestBody CreateSkillRequest request) {
        return ResponseEntity.ok(adminService.createSkill(request));
    }

    @PutMapping("/skills/{skillId}")
    public ResponseEntity<SkillResponse> updateSkill(@PathVariable Integer skillId,
                                                     @RequestBody CreateSkillRequest request) {
        return ResponseEntity.ok(adminService.updateSkill(skillId, request));
    }

    @PatchMapping("/skills/{skillId}/deactivate")
    public ResponseEntity<String> deactivateSkill(@PathVariable Integer skillId) {
        adminService.deactivateSkill(skillId);
        return ResponseEntity.ok("Skill deactivated.");
    }

    @PatchMapping("/skills/{skillId}/activate")
    public ResponseEntity<String> activateSkill(@PathVariable Integer skillId) {
        adminService.activateSkill(skillId);
        return ResponseEntity.ok("Skill activated.");
    }

    // -------- Questions --------
    @PostMapping("/questions")
    public ResponseEntity<String> createQuestion(@RequestBody CreateQuestionRequest request) {
        adminService.createQuestion(request);
        return ResponseEntity.ok("Question created.");
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Integer questionId) {
        adminService.deleteQuestion(questionId);
        return ResponseEntity.noContent().build();
    }

    // -------- Challenges --------
    @GetMapping("/challenges")
    public ResponseEntity<List<ChallengeResponse>> getAllChallenges() {
        return ResponseEntity.ok(adminService.getAllChallenges());
    }

    @PostMapping("/challenges")
    public ResponseEntity<ChallengeResponse> createChallenge(@RequestBody CreateChallengeRequest request) {
        return ResponseEntity.ok(adminService.createChallenge(request));
    }

    @PutMapping("/challenges/{challengeId}")
    public ResponseEntity<ChallengeResponse> updateChallenge(@PathVariable Integer challengeId,
                                                              @RequestBody CreateChallengeRequest request) {
        return ResponseEntity.ok(adminService.updateChallenge(challengeId, request));
    }

    @DeleteMapping("/challenges/{challengeId}")
    public ResponseEntity<Void> deleteChallenge(@PathVariable Integer challengeId) {
        adminService.deleteChallenge(challengeId);
        return ResponseEntity.noContent().build();
    }

    // -------- Store Items --------
    @GetMapping("/store-items")
    public ResponseEntity<List<StoreItemResponse>> getAllStoreItems() {
        return ResponseEntity.ok(adminService.getAllStoreItems());
    }

    @PostMapping("/store-items")
    public ResponseEntity<StoreItemResponse> createStoreItem(@RequestBody CreateStoreItemRequest request) {
        return ResponseEntity.ok(adminService.createStoreItem(request));
    }

    @PutMapping("/store-items/{itemId}")
    public ResponseEntity<StoreItemResponse> updateStoreItem(@PathVariable Integer itemId,
                                                              @RequestBody CreateStoreItemRequest request) {
        return ResponseEntity.ok(adminService.updateStoreItem(itemId, request));
    }

    @DeleteMapping("/store-items/{itemId}")
    public ResponseEntity<Void> deleteStoreItem(@PathVariable Integer itemId) {
        adminService.deleteStoreItem(itemId);
        return ResponseEntity.noContent().build();
    }
}
