package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.NextQuestionRequest;
import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
import com.example.xpandbackend.dto.response.MockInterviewResponse;
import com.example.xpandbackend.dto.response.NextQuestionResponse;
import com.example.xpandbackend.dto.response.ReadinessReportResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.GeminiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/ai")
@RequiredArgsConstructor
public class AIController {

    private final GeminiService geminiService;

    /**
     * Starts the interview session.
     * Builds full candidate profile context and returns the very first question
     * (JSON: { question, questionType, tone, feedbackOnPrevious, isLastQuestion }).
     * An optional snapshot image can be included to seed the initial tone.
     */
    @PostMapping("/interview/start/{purchaseId}")
    public ResponseEntity<MockInterviewResponse> startInterview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId,
            @RequestBody(required = false) SubmitInterviewAnswersRequest request) {

        String base64 = (request != null) ? request.getBase64Image() : null;
        String mime   = (request != null) ? request.getMimeType()    : null;

        return ResponseEntity.ok(
                geminiService.startMockInterview(principal.getId(), purchaseId, base64, mime));
    }

    /**
     * NEW — Adaptive next-question endpoint.
     * Called after every answer. Returns the next question tailored to:
     *   - candidate profile (embedded in purchase/job context on the backend)
     *   - full Q&A history sent by the client
     *   - latest sentiment label + confidence
     * Response shape: NextQuestionResponse (question, questionType, tone, feedbackOnPrevious, isLastQuestion)
     */
    @PostMapping("/interview/next-question")
    public ResponseEntity<NextQuestionResponse> getNextQuestion(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody NextQuestionRequest request) {

        return ResponseEntity.ok(
                geminiService.getNextQuestion(principal.getId(), request));
    }

    /**
     * Final submission — saves combined answers + generates full AI feedback.
     * sentimentHistory in the body enriches the final evaluation prompt.
     */
    @PostMapping("/interview/submit")
    public ResponseEntity<MockInterviewResponse> submitAnswers(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody SubmitInterviewAnswersRequest request) {

        return ResponseEntity.ok(
                geminiService.submitInterviewAnswers(principal.getId(), request));
    }

    @GetMapping("/interview/{purchaseId}")
    public ResponseEntity<MockInterviewResponse> getInterview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {

        return ResponseEntity.ok(
                geminiService.getInterview(principal.getId(), purchaseId));
    }

    @PostMapping("/report/{purchaseId}")
    public ResponseEntity<ReadinessReportResponse> generateReport(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {

        return ResponseEntity.ok(
                geminiService.generateReadinessReport(principal.getId(), purchaseId));
    }

    @GetMapping("/report/{purchaseId}")
    public ResponseEntity<ReadinessReportResponse> getReport(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {

        return ResponseEntity.ok(
                geminiService.getReport(principal.getId(), purchaseId));
    }
}