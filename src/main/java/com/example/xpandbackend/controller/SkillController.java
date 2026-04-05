package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.SubmitTestRequest;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.SkillVerificationService;
import com.example.xpandbackend.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class SkillController {

    private final SkillVerificationService skillVerificationService;
    private final SkillRepository skillRepository;

    // Public: list active skills
    @GetMapping("/api/skills")
    public ResponseEntity<List<SkillResponse>> getActiveSkills() {
        List<SkillResponse> skills = skillRepository.findByIsActive(true).stream()
                .map(s -> {
                    SkillResponse r = new SkillResponse();
                    r.setId(s.getId());
                    r.setName(s.getName());
                    r.setCategory(s.getCategory());
                    r.setIsActive(s.getIsActive());
                    return r;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(skills);
    }

    // User: start a skill test (returns questions)
    @GetMapping("/api/user/skills/{skillId}/test")
    public ResponseEntity<List<QuestionResponse>> startTest(@AuthenticationPrincipal AuthenticatedUser principal,
                                                            @PathVariable Integer skillId) {
        return ResponseEntity.ok(skillVerificationService.startTest(principal.getId(), skillId));
    }

    // User: submit test answers
    @PostMapping("/api/user/skills/{skillId}/test")
    public ResponseEntity<TestAttemptResponse> submitTest(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @PathVariable Integer skillId,
                                                          @RequestBody SubmitTestRequest request) {
        return ResponseEntity.ok(skillVerificationService.submitTest(principal.getId(), skillId, request));
    }

    // User: view own skill verifications / badges
    @GetMapping("/api/user/skills/verifications")
    public ResponseEntity<List<UserSkillVerificationResponse>> getVerifications(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(skillVerificationService.getUserVerifications(principal.getId()));
    }

    // User: view test history
    @GetMapping("/api/user/skills/history")
    public ResponseEntity<List<TestAttemptResponse>> getTestHistory(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(skillVerificationService.getUserTestHistory(principal.getId()));
    }
}
