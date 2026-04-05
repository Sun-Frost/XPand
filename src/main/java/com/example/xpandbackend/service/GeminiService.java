package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.ItemType;
import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
import com.example.xpandbackend.dto.response.MockInterviewResponse;
import com.example.xpandbackend.dto.response.ReadinessReportResponse;
import com.example.xpandbackend.exception.*;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final UserPurchaseRepository userPurchaseRepository;
    private final MockInterviewRepository mockInterviewRepository;
    private final ReadinessReportRepository readinessReportRepository;
    private final UserSkillVerificationRepository verificationRepository;
    private final JobSkillRequirementRepository jobSkillRequirementRepository;
    private final WebClient.Builder webClientBuilder;

    /**
     * Requirement 3.1: Starts a mock interview.
     * Incorporates image-based sentiment analysis if a photo is provided.
     */
    @Transactional
    public MockInterviewResponse startMockInterview(Integer userId, Integer purchaseId, String base64Image, String mimeType) {
        UserPurchase purchase = getPurchaseAndValidate(userId, purchaseId, ItemType.MOCK_INTERVIEW);
        User user = purchase.getUser();
        JobPosting job = purchase.getAssociatedJob();

        String context = buildInterviewContext(user, job);

        // System Prompt to enforce the "Realistic Interviewer" persona
        String prompt = "CONTEXT:\n" + context + "\n\n"
                + "TASK: You are an expert technical interviewer at a top tech firm. "
                + "Generate the first 5 structured interview questions. "
                + "IMPORTANT: Look at the provided image of the candidate. Analyze their sentiment (nervous, confident, happy, etc.). "
                + "If they look nervous, start with a warmer, more encouraging tone. If they look confident, be more direct. "
                + "Acknowledge their visual vibe subtly in your opening sentence to make it realistic.";

        String aiResponse = callGeminiApi(prompt, base64Image, mimeType);

        MockInterview interview = new MockInterview();
        interview.setPurchase(purchase);
        interview.setQuestionsText(aiResponse);
        mockInterviewRepository.save(interview);

//        purchase.setIsUsed(true);
        userPurchaseRepository.save(purchase);

        return mapToInterviewResponse(interview);
    }

    @Transactional
    public MockInterviewResponse submitInterviewAnswers(Integer userId, SubmitInterviewAnswersRequest request) {
        UserPurchase purchase = getPurchaseAndValidate(userId, request.getPurchaseId(), ItemType.MOCK_INTERVIEW);
        getPurchaseAndValidate(userId, request.getPurchaseId(), ItemType.MOCK_INTERVIEW);

        MockInterview interview = mockInterviewRepository.findByPurchaseId(request.getPurchaseId())
                .orElseThrow(() -> new ResourceNotFoundException("Interview record not found."));

        interview.setUserAnswersText(request.getUserAnswersText());

        String feedbackPrompt = "Evaluate these answers based on the previous questions:\n"
                + "QUESTIONS: " + interview.getQuestionsText() + "\n"
                + "ANSWERS: " + request.getUserAnswersText() + "\n\n"
                + "Also, look at the candidate's photo attached. Provide feedback not just on content, "
                + "but on their perceived confidence and 'interview presence' based on the image.";

        String feedback = callGeminiApi(feedbackPrompt, request.getBase64Image(), request.getMimeType());
        interview.setAiFeedbackText(feedback);

        purchase.setIsUsed(true);
        mockInterviewRepository.save(interview);

        return mapToInterviewResponse(interview);
    }

    /**
     * Requirement 3.1: Generate Readiness Report (Text-only)
     */
    @Transactional
    public ReadinessReportResponse generateReadinessReport(Integer userId, Integer purchaseId) {
        UserPurchase purchase = getPurchaseAndValidate(userId, purchaseId, ItemType.READINESS_REPORT);
        User user = purchase.getUser();

        String skillsSummary = verificationRepository.findVerifiedByUserId(userId).stream()
                .map(v -> v.getSkill().getName() + " (" + v.getCurrentBadge() + ")")
                .collect(Collectors.joining(", "));

        String prompt = "Generate a professional career readiness report for " + user.getFirstName() + ".\n"
                + "Verified Skills: " + (skillsSummary.isEmpty() ? "None" : skillsSummary) + "\n"
                + "Provide: 1) Strengths 2) Skill gaps 3) Recommendations 4) Score (0-100).";

        String content = callGeminiApi(prompt, null, null); // Text only

        ReadinessReport report = new ReadinessReport();
        report.setPurchase(purchase);
        report.setReportContent(content);
        readinessReportRepository.save(report);

        purchase.setIsUsed(true);
        userPurchaseRepository.save(purchase);

        return mapToReadinessResponse(report);
    }

    /**
     * Core API Wrapper: Handles both Text and Multimodal (Image) requests.
     * Uses a 90-second block timeout so Gemini has time to respond.
     * Throws RuntimeException on any API error so callers get a real 500.
     */
    private String callGeminiApi(String prompt, String base64Image, String mimeType) {
        WebClient client = webClientBuilder.baseUrl(geminiApiUrl).build();

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));

        if (base64Image != null && mimeType != null) {
            parts.add(Map.of("inline_data", Map.of(
                    "mime_type", mimeType,
                    "data", base64Image
            )));
        }

        Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", parts)));

        try {
            Map<String, Object> response = client.post()
                    .uri(uriBuilder -> uriBuilder.queryParam("key", geminiApiKey).build())
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(
                            status -> status.is4xxClientError() || status.is5xxServerError(),
                            res -> res.bodyToMono(String.class)
                                    .map(errBody -> new RuntimeException(
                                            "Gemini API error " + res.statusCode().value() + ": " + errBody))
                    )
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(90)); // Gemini can be slow — allow up to 90s

            if (response == null) {
                throw new RuntimeException("Gemini returned an empty response.");
            }
            return extractTextFromResponse(response);
        } catch (RuntimeException e) {
            log.error("Gemini API call failed: {}", e.getMessage());
            throw e; // re-throw so the controller returns a real 500
        }
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromResponse(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Gemini response has no candidates. Full response: " + response);
            }
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");
            if (text == null) throw new RuntimeException("Gemini response text is null.");
            return text;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    /**
     * Validates that the purchase exists, belongs to the user,
     * hasn't been used yet, and matches the expected feature type.
     */
    private UserPurchase getPurchaseAndValidate(Integer userId, Integer purchaseId, ItemType expectedType) {
        UserPurchase purchase = userPurchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase record not found."));

        // Security check: Does this purchase belong to the person asking?
        if (!purchase.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You do not have permission to access this purchase.");
        }

        // Business Rule: XP purchases are one-time use
        if (Boolean.TRUE.equals(purchase.getIsUsed())) {
            throw new BadRequestException("This purchase has already been consumed.");
        }

        // Domain check: Ensure they aren't using a "Report" XP-token for an "Interview"
        if (!purchase.getItem().getItemType().equals(expectedType)) {
            throw new BadRequestException("Invalid purchase type for this action.");
        }

        return purchase;
    }

    /**
     * Maps the Entity to a Response DTO for the Controller
     */
    private MockInterviewResponse mapToInterviewResponse(MockInterview interview) {
        MockInterviewResponse r = new MockInterviewResponse();
        r.setId(interview.getId());
        r.setPurchaseId(interview.getPurchase().getId());
        r.setQuestionsText(interview.getQuestionsText());
        r.setUserAnswersText(interview.getUserAnswersText());
        r.setAiFeedbackText(interview.getAiFeedbackText());
        r.setCreatedAt(interview.getCreatedAt());
        return r;
    }

    /**
     * Maps the Readiness Report Entity to a Response DTO
     */
    private ReadinessReportResponse mapToReadinessResponse(ReadinessReport report) {
        ReadinessReportResponse r = new ReadinessReportResponse();
        r.setId(report.getId());
        r.setPurchaseId(report.getPurchase().getId());
        r.setReportContent(report.getReportContent());
        r.setGeneratedAt(report.getGeneratedAt());
        return r;
    }

    /**
     * Builds the string context used by Gemini to generate relevant questions
     */
    private String buildInterviewContext(User user, JobPosting job) {
        StringBuilder sb = new StringBuilder();
        sb.append("Candidate Name: ").append(user.getFirstName()).append(" ").append(user.getLastName()).append("\n");

        if (user.getProfessionalTitle() != null) {
            sb.append("Current Title: ").append(user.getProfessionalTitle()).append("\n");
        }

        if (job != null) {
            sb.append("Applying for Job: ").append(job.getTitle()).append("\n");
            sb.append("Job Description: ").append(job.getDescription()).append("\n");

            List<JobSkillRequirement> reqs = jobSkillRequirementRepository.findByJobPostingId(job.getId());
            String skills = reqs.stream()
                    .map(r -> r.getSkill().getName())
                    .collect(Collectors.joining(", "));
            sb.append("Required Skills: ").append(skills);
        }
        return sb.toString();
    }

    /**
     * Requirement 3.1: Retrieve an existing interview record
     */
    public MockInterviewResponse getInterview(Integer userId, Integer purchaseId) {
        MockInterview interview = mockInterviewRepository.findByPurchaseId(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found."));

        // Security check
        if (!interview.getPurchase().getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied.");
        }

        return mapToInterviewResponse(interview);
    }

    /**
     * Requirement 3.1: Retrieve an existing readiness report
     */
    public ReadinessReportResponse getReport(Integer userId, Integer purchaseId) {
        ReadinessReport report = readinessReportRepository.findByPurchaseId(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));

        // Security check
        if (!report.getPurchase().getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied.");
        }

        return mapToReadinessResponse(report);
    }
}




















//package com.example.xpandbackend.service;
//
//import com.example.xpandbackend.models.*;
//import com.example.xpandbackend.models.Enums.ItemType;
//import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
//import com.example.xpandbackend.dto.response.MockInterviewResponse;
//import com.example.xpandbackend.dto.response.ReadinessReportResponse;
//import com.example.xpandbackend.exception.*;
//import com.example.xpandbackend.repository.*;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//import org.springframework.web.reactive.function.client.WebClient;
//
//import java.util.*;
//import java.util.stream.Collectors;
//
//@Service
//@RequiredArgsConstructor
//@Slf4j
//public class GeminiService {
//
//    @Value("${gemini.api.key}")
//    private String geminiApiKey;
//
//    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent}")
//    private String geminiApiUrl;
//
//    private final UserPurchaseRepository userPurchaseRepository;
//    private final MockInterviewRepository mockInterviewRepository;
//    private final ReadinessReportRepository readinessReportRepository;
//    private final UserRepository userRepository;
//    private final UserSkillVerificationRepository verificationRepository;
//    private final JobSkillRequirementRepository jobSkillRequirementRepository;
//    private final WebClient.Builder webClientBuilder;
//
//    @Transactional
//    public MockInterviewResponse startMockInterview(Integer userId, Integer purchaseId) {
//        UserPurchase purchase = getPurchaseAndValidate(userId, purchaseId, ItemType.MOCK_INTERVIEW);
//
//        User user = purchase.getUser();
//        JobPosting job = purchase.getAssociatedJob();
//
//        // Build context
//        String context = buildInterviewContext(user, job);
//        String prompt = "You are an expert technical interviewer. Generate 5 structured interview questions for the following context. "
//                + "Include 3 technical questions based on the required skills and 2 behavioral questions. "
//                + "Format each question clearly numbered.\n\n" + context;
//
//        String questions = callGeminiApi(prompt);
//
//        MockInterview interview = new MockInterview();
//        interview.setPurchase(purchase);
//        interview.setQuestionsText(questions);
//        mockInterviewRepository.save(interview);
//
//        purchase.setIsUsed(true);
//        userPurchaseRepository.save(purchase);
//
//        return mapToInterviewResponse(interview);
//    }
//
//    @Transactional
//    public MockInterviewResponse submitInterviewAnswers(Integer userId, SubmitInterviewAnswersRequest request) {
//        UserPurchase purchase = userPurchaseRepository.findById(request.getPurchaseId())
//                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found."));
//        if (!purchase.getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
//
//        MockInterview interview = mockInterviewRepository.findByPurchaseId(request.getPurchaseId())
//                .orElseThrow(() -> new ResourceNotFoundException("Interview not found."));
//
//        interview.setUserAnswersText(request.getUserAnswersText());
//
//        String feedbackPrompt = "You are an expert technical interviewer. Evaluate the following interview answers and provide structured feedback.\n\n"
//                + "QUESTIONS:\n" + interview.getQuestionsText()
//                + "\n\nCANDIDATE ANSWERS:\n" + request.getUserAnswersText()
//                + "\n\nProvide detailed feedback on each answer, highlighting strengths and areas for improvement. End with an overall assessment.";
//
//        String feedback = callGeminiApi(feedbackPrompt);
//        interview.setAiFeedbackText(feedback);
//        mockInterviewRepository.save(interview);
//
//        return mapToInterviewResponse(interview);
//    }
//
//    @Transactional
//    public ReadinessReportResponse generateReadinessReport(Integer userId, Integer purchaseId) {
//        UserPurchase purchase = getPurchaseAndValidate(userId, purchaseId, ItemType.READINESS_REPORT);
//        User user = purchase.getUser();
//
//        List<UserSkillVerification> verifications = verificationRepository.findVerifiedByUserId(userId);
//        String skillsSummary = verifications.stream()
//                .map(v -> v.getSkill().getName() + " (" + v.getCurrentBadge() + ")")
//                .collect(Collectors.joining(", "));
//
//        String prompt = "You are a career development expert. Generate a comprehensive readiness report for a job seeker.\n\n"
//                + "Profile: " + user.getFirstName() + " " + user.getLastName()
//                + "\nProfessional Title: " + (user.getProfessionalTitle() != null ? user.getProfessionalTitle() : "Not specified")
//                + "\nVerified Skills: " + (skillsSummary.isEmpty() ? "None yet" : skillsSummary)
//                + "\n\nProvide: 1) Strengths analysis 2) Skill gaps 3) Recommended next steps 4) Career readiness score out of 100";
//
//        String content = callGeminiApi(prompt);
//
//        ReadinessReport report = new ReadinessReport();
//        report.setPurchase(purchase);
//        report.setReportContent(content);
//        readinessReportRepository.save(report);
//
//        purchase.setIsUsed(true);
//        userPurchaseRepository.save(purchase);
//
//        ReadinessReportResponse r = new ReadinessReportResponse();
//        r.setId(report.getId());
//        r.setPurchaseId(purchaseId);
//        r.setReportContent(content);
//        r.setGeneratedAt(report.getGeneratedAt());
//        return r;
//    }
//
//    public MockInterviewResponse getInterview(Integer userId, Integer purchaseId) {
//        MockInterview interview = mockInterviewRepository.findByPurchaseId(purchaseId)
//                .orElseThrow(() -> new ResourceNotFoundException("Interview not found."));
//        if (!interview.getPurchase().getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
//        return mapToInterviewResponse(interview);
//    }
//
//    public ReadinessReportResponse getReport(Integer userId, Integer purchaseId) {
//        ReadinessReport report = readinessReportRepository.findByPurchaseId(purchaseId)
//                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));
//        if (!report.getPurchase().getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
//        ReadinessReportResponse r = new ReadinessReportResponse();
//        r.setId(report.getId());
//        r.setPurchaseId(purchaseId);
//        r.setReportContent(report.getReportContent());
//        r.setGeneratedAt(report.getGeneratedAt());
//        return r;
//    }
//
//    private UserPurchase getPurchaseAndValidate(Integer userId, Integer purchaseId, ItemType expectedType) {
//        UserPurchase purchase = userPurchaseRepository.findById(purchaseId)
//                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found."));
//        if (!purchase.getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
//        if (purchase.getIsUsed()) throw new BadRequestException("This purchase has already been used.");
//        if (!purchase.getItem().getItemType().equals(expectedType)) {
//            throw new BadRequestException("Invalid purchase type.");
//        }
//        return purchase;
//    }
//
//    private String buildInterviewContext(User user, JobPosting job) {
//        StringBuilder sb = new StringBuilder();
//        sb.append("Candidate: ").append(user.getFirstName()).append(" ").append(user.getLastName()).append("\n");
//        if (user.getProfessionalTitle() != null) sb.append("Title: ").append(user.getProfessionalTitle()).append("\n");
//
//        List<UserSkillVerification> skills = verificationRepository.findVerifiedByUserId(user.getId());
//        if (!skills.isEmpty()) {
//            sb.append("Verified Skills: ");
//            sb.append(skills.stream().map(v -> v.getSkill().getName() + " (" + v.getCurrentBadge() + ")")
//                    .collect(Collectors.joining(", "))).append("\n");
//        }
//
//        if (job != null) {
//            sb.append("Job Title: ").append(job.getTitle()).append("\n");
//            sb.append("Job Description: ").append(job.getDescription()).append("\n");
//            List<JobSkillRequirement> reqs = jobSkillRequirementRepository.findByJobPostingId(job.getId());
//            sb.append("Required Skills: ").append(reqs.stream()
//                    .map(r -> r.getSkill().getName() + " (" + r.getImportance() + ")")
//                    .collect(Collectors.joining(", ")));
//        }
//        return sb.toString();
//    }
//
//    @SuppressWarnings("unchecked")
//    private String callGeminiApi(String prompt) {
//        try {
//            WebClient client = webClientBuilder.baseUrl(geminiApiUrl).build();
//
//            Map<String, Object> body = Map.of(
//                    "contents", List.of(Map.of(
//                            "parts", List.of(Map.of("text", prompt))
//                    ))
//            );
//
//            Map<String, Object> response = client.post()
//                    .uri(uriBuilder -> uriBuilder.queryParam("key", geminiApiKey).build())
//                    .bodyValue(body)
//                    .retrieve()
//                    .bodyToMono(Map.class)
//                    .block();
//
//            if (response != null) {
//                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
//                if (candidates != null && !candidates.isEmpty()) {
//                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
//                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
//                    if (parts != null && !parts.isEmpty()) {
//                        return (String) parts.get(0).get("text");
//                    }
//                }
//            }
//        } catch (Exception e) {
//            log.error("Gemini API call failed: {}", e.getMessage());
//        }
//        return "AI service is temporarily unavailable. Please try again later.";
//    }
//
//    private MockInterviewResponse mapToInterviewResponse(MockInterview interview) {
//        MockInterviewResponse r = new MockInterviewResponse();
//        r.setId(interview.getId());
//        r.setPurchaseId(interview.getPurchase().getId());
//        r.setQuestionsText(interview.getQuestionsText());
//        r.setUserAnswersText(interview.getUserAnswersText());
//        r.setAiFeedbackText(interview.getAiFeedbackText());
//        r.setCreatedAt(interview.getCreatedAt());
//        return r;
//    }
//}