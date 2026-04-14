package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
import com.example.xpandbackend.dto.response.MockInterviewResponse;
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
     * Requirement 3.1: Start Interview
     * Added @RequestBody so the user can send their photo for sentiment analysis
     */
    @PostMapping("/interview/start/{purchaseId}")
    public ResponseEntity<MockInterviewResponse> startInterview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId,
            @RequestBody(required = false) SubmitInterviewAnswersRequest request) {

        // Extract image info from request if provided, otherwise pass null
        String base64 = (request != null) ? request.getBase64Image() : null;
        String mime = (request != null) ? request.getMimeType() : null;

        return ResponseEntity.ok(geminiService.startMockInterview(principal.getId(), purchaseId, base64, mime));
    }

    @PostMapping("/interview/submit")
    public ResponseEntity<MockInterviewResponse> submitAnswers(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody SubmitInterviewAnswersRequest request) {
        return ResponseEntity.ok(geminiService.submitInterviewAnswers(principal.getId(), request));
    }

    @GetMapping("/interview/{purchaseId}")
    public ResponseEntity<MockInterviewResponse> getInterview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {
        return ResponseEntity.ok(geminiService.getInterview(principal.getId(), purchaseId));
    }

    @PostMapping("/report/{purchaseId}")
    public ResponseEntity<ReadinessReportResponse> generateReport(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {
        return ResponseEntity.ok(geminiService.generateReadinessReport(principal.getId(), purchaseId));
    }

    @GetMapping("/report/{purchaseId}")
    public ResponseEntity<ReadinessReportResponse> getReport(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer purchaseId) {
        return ResponseEntity.ok(geminiService.getReport(principal.getId(), purchaseId));
    }
}




















//package com.example.xpandbackend.controller;
//
//import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
//import com.example.xpandbackend.dto.response.MockInterviewResponse;
//import com.example.xpandbackend.dto.response.ReadinessReportResponse;
//import com.example.xpandbackend.security.AuthenticatedUser;
//import com.example.xpandbackend.service.GeminiService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.core.annotation.AuthenticationPrincipal;
//import org.springframework.web.bind.annotation.*;
//
//@RestController
//@RequestMapping("/api/user/ai")
//@RequiredArgsConstructor
//public class AIController {
//
//    private final GeminiService geminiService;
//
//    @PostMapping("/interview/start/{purchaseId}")
//    public ResponseEntity<MockInterviewResponse> startInterview(@AuthenticationPrincipal AuthenticatedUser principal,
//                                                                @PathVariable Integer purchaseId) {
//        return ResponseEntity.ok(geminiService.startMockInterview(principal.getId(), purchaseId));
//    }
//
//    // controller/AIController.java
//    @PostMapping("/interview/submit")
//    public ResponseEntity<MockInterviewResponse> submitAnswers(
//            @AuthenticationPrincipal AuthenticatedUser principal,
//            @RequestBody SubmitInterviewAnswersRequest request) {
//        // Just pass the whole request object to the service
//        return ResponseEntity.ok(geminiService.submitInterviewAnswers(principal.getId(), request));
//    }
//
////    @PostMapping("/interview/submit")
////    public ResponseEntity<MockInterviewResponse> submitAnswers(@AuthenticationPrincipal AuthenticatedUser principal,
////                                                               @RequestBody SubmitInterviewAnswersRequest request) {
////        return ResponseEntity.ok(geminiService.submitInterviewAnswers(principal.getId(), request));
////    }
//
//    @GetMapping("/interview/{purchaseId}")
//    public ResponseEntity<MockInterviewResponse> getInterview(@AuthenticationPrincipal AuthenticatedUser principal,
//                                                              @PathVariable Integer purchaseId) {
//        return ResponseEntity.ok(geminiService.getInterview(principal.getId(), purchaseId));
//    }
//
//    @PostMapping("/report/{purchaseId}")
//    public ResponseEntity<ReadinessReportResponse> generateReport(@AuthenticationPrincipal AuthenticatedUser principal,
//                                                                   @PathVariable Integer purchaseId) {
//        return ResponseEntity.ok(geminiService.generateReadinessReport(principal.getId(), purchaseId));
//    }
//
//    @GetMapping("/report/{purchaseId}")
//    public ResponseEntity<ReadinessReportResponse> getReport(@AuthenticationPrincipal AuthenticatedUser principal,
//                                                              @PathVariable Integer purchaseId) {
//        return ResponseEntity.ok(geminiService.getReport(principal.getId(), purchaseId));
//    }
//}
