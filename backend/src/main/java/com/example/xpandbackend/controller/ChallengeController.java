package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.response.ChallengeResponse;
import com.example.xpandbackend.dto.response.UserChallengeResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.ChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user/challenges")
@RequiredArgsConstructor
public class ChallengeController {

    private final ChallengeService challengeService;

    @GetMapping
    public ResponseEntity<List<ChallengeResponse>> getAllChallenges() {
        return ResponseEntity.ok(challengeService.getAllChallenges());
    }

    @GetMapping("/progress")
    public ResponseEntity<List<UserChallengeResponse>> getUserProgress(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(challengeService.getUserChallengesProgress(principal.getId()));
    }
}
