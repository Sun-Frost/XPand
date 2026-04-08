package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.ItemType;
import com.example.xpandbackend.dto.request.NextQuestionRequest;
import com.example.xpandbackend.dto.request.SubmitInterviewAnswersRequest;
import com.example.xpandbackend.dto.response.MockInterviewResponse;
import com.example.xpandbackend.dto.response.NextQuestionResponse;
import com.example.xpandbackend.dto.response.ReadinessReportResponse;
import com.example.xpandbackend.exception.*;
import com.example.xpandbackend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final UserPurchaseRepository          userPurchaseRepository;
    private final MockInterviewRepository         mockInterviewRepository;
    private final ReadinessReportRepository       readinessReportRepository;
    private final UserSkillVerificationRepository verificationRepository;
    private final JobSkillRequirementRepository   jobSkillRequirementRepository;
    private final WorkExperienceRepository        workExperienceRepository;
    private final EducationRepository             educationRepository;
    private final ProjectRepository               projectRepository;
    private final CertificationRepository         certificationRepository;
    private final WebClient.Builder               webClientBuilder;
    private final ObjectMapper objectMapper;
    // ─────────────────────────────────────────────────────────────────────────
    // START INTERVIEW
    // Builds enriched profile context, returns session record.
    // The questionsText field is set to a JSON string representing the FIRST
    // question only; subsequent questions arrive via /next-question.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public MockInterviewResponse startMockInterview(Integer userId, Integer purchaseId,
                                                    String base64Image, String mimeType) {

        UserPurchase purchase = getPurchaseAndValidate(userId, purchaseId, ItemType.MOCK_INTERVIEW);
        User user     = purchase.getUser();
        JobPosting job = purchase.getAssociatedJob();

        String profileContext = buildRichProfileContext(userId, user, job);

        // Determine initial tone hint from image if provided
        String toneHint = (base64Image != null)
                ? "An image of the candidate is attached. Briefly assess their visual demeanour "
                + "(nervous, confident, relaxed…) and let that influence your opening tone."
                : "No image provided — start with a neutral, welcoming tone.";

        String prompt =
                "You are an expert interviewer conducting a real job interview. "
                        + "You will ask " + TOTAL_QUESTIONS + " questions across the session, "
                        + "mixing TECHNICAL questions (based on the required skills and job) "
                        + "with PERSONAL questions (based on the candidate's background, experience, projects, and about-me). "
                        + "Aim for roughly 60% technical and 40% personal.\n\n"
                        + "CANDIDATE PROFILE:\n" + profileContext + "\n\n"
                        + toneHint + "\n\n"
                        + "RIGHT NOW: Generate only the FIRST question.\n\n"
                        + "Respond with ONLY valid JSON — no markdown fences, no extra text:\n"
                        + "{\n"
                        + "  \"question\": \"<the question text>\",\n"
                        + "  \"questionType\": \"technical\" | \"personal\",\n"
                        + "  \"tone\": \"good_cop\" | \"bad_cop\" | \"neutral\",\n"
                        + "  \"feedbackOnPrevious\": null\n"
                        + "}";

        String rawJson = callGeminiApi(prompt, base64Image, mimeType);
        String cleanJson = stripJsonFences(rawJson);

        // Store the raw JSON as questionsText so the session is resumable
        MockInterview interview = new MockInterview();
        interview.setPurchase(purchase);
        interview.setQuestionsText(cleanJson);
        mockInterviewRepository.save(interview);
        userPurchaseRepository.save(purchase);

        return mapToInterviewResponse(interview);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEXT QUESTION  (called after each answer)
    // ─────────────────────────────────────────────────────────────────────────

    public NextQuestionResponse getNextQuestion(Integer userId, NextQuestionRequest req) {

        UserPurchase purchase = getPurchaseAndValidateForRead(userId, req.getPurchaseId());
        User user     = purchase.getUser();
        JobPosting job = purchase.getAssociatedJob();

        String profileContext = buildRichProfileContext(userId, user, job);

        // Build the answered-so-far summary
        StringBuilder historySb = new StringBuilder();
        if (req.getHistory() != null) {
            for (int i = 0; i < req.getHistory().size(); i++) {
                NextQuestionRequest.QARound r = req.getHistory().get(i);
                historySb.append("Q").append(i + 1)
                        .append(" [").append(r.getQuestionType()).append("]: ")
                        .append(r.getQuestion()).append("\n")
                        .append("  Answer quality: ").append(r.getAnswerQuality())
                        .append(" | Sentiment: ").append(r.getSentiment()).append("\n")
                        .append("  Answer excerpt: \"")
                        .append(truncate(r.getAnswer(), 200)).append("\"\n\n");
            }
        }

        int nextNumber   = (req.getAnsweredIndex() != null ? req.getAnsweredIndex() : 0) + 2; // human-readable
        int total        = (req.getTotalQuestions() != null ? req.getTotalQuestions() : TOTAL_QUESTIONS);
        boolean isLast   = (nextNumber == total);

        String sentimentLabel      = nvl(req.getSentimentLabel(), "neutral");
        double sentimentConfidence = req.getSentimentConfidence() != null ? req.getSentimentConfidence() : 0.5;

        // Count already-asked types to balance the mix
        long techCount = req.getHistory() == null ? 0 :
                req.getHistory().stream().filter(r -> "technical".equalsIgnoreCase(r.getQuestionType())).count();
        long persCount = req.getHistory() == null ? 0 :
                req.getHistory().stream().filter(r -> "personal".equalsIgnoreCase(r.getQuestionType())).count();

        String typeGuidance;
        if (techCount >= Math.ceil(total * 0.6)) {
            typeGuidance = "You have asked enough technical questions. This MUST be a PERSONAL question.";
        } else if (persCount >= Math.floor(total * 0.4)) {
            typeGuidance = "You have asked enough personal questions. This MUST be a TECHNICAL question.";
        } else {
            typeGuidance = "Choose the question type (technical or personal) that best fits the flow.";
        }

        String toneGuidance = buildToneGuidance(sentimentLabel, sentimentConfidence, req.getHistory());

        String prompt =
                "You are an adaptive interviewer mid-session.\n\n"
                        + "CANDIDATE PROFILE:\n" + profileContext + "\n\n"
                        + "SESSION SO FAR (" + req.getAnsweredIndex() + " answered, " + total + " total):\n"
                        + (historySb.length() > 0 ? historySb.toString() : "No questions answered yet.\n")
                        + "LATEST SENTIMENT: " + sentimentLabel
                        + " (" + Math.round(sentimentConfidence * 100) + "% confidence)\n\n"
                        + "TONE DIRECTIVE:\n" + toneGuidance + "\n\n"
                        + "QUESTION TYPE DIRECTIVE:\n" + typeGuidance + "\n\n"
                        + "CONSTRAINTS:\n"
                        + "- Do NOT repeat or paraphrase any previous question.\n"
                        + "- If this is a personal question, anchor it to a SPECIFIC detail from the candidate's profile "
                        + "(a real project, employer, degree, or skill they listed).\n"
                        + "- If this is a technical question, target a skill gap or a required skill for the job.\n"
                        + "- feedbackOnPrevious: 1–2 sentences reacting to the LAST answer in the chosen tone. "
                        + "Be specific — reference what they actually said. Do not be generic.\n\n"
                        + "Generate question " + nextNumber + " of " + total + ".\n\n"
                        + "Respond with ONLY valid JSON — no markdown fences, no extra text:\n"
                        + "{\n"
                        + "  \"question\": \"<question text>\",\n"
                        + "  \"questionType\": \"technical\" | \"personal\",\n"
                        + "  \"tone\": \"good_cop\" | \"bad_cop\" | \"neutral\",\n"
                        + "  \"feedbackOnPrevious\": \"<1-2 sentence comment on the previous answer>\",\n"
                        + "  \"isLastQuestion\": " + isLast + "\n"
                        + "}";

        String rawJson   = callGeminiApi(prompt, null, null);
        String cleanJson = stripJsonFences(rawJson);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(cleanJson, Map.class);
            NextQuestionResponse resp = new NextQuestionResponse();
            resp.setQuestion((String) parsed.get("question"));
            resp.setQuestionType((String) parsed.getOrDefault("questionType", "technical"));
            resp.setTone((String) parsed.getOrDefault("tone", "neutral"));
            resp.setFeedbackOnPrevious((String) parsed.get("feedbackOnPrevious"));
            resp.setLastQuestion(Boolean.TRUE.equals(parsed.get("isLastQuestion")));
            return resp;
        } catch (Exception e) {
            log.error("Failed to parse next-question JSON: {}", cleanJson, e);
            // Graceful fallback — never crash the interview
            NextQuestionResponse fallback = new NextQuestionResponse();
            fallback.setQuestion(cleanJson); // raw text as question
            fallback.setQuestionType("technical");
            fallback.setTone("neutral");
            fallback.setLastQuestion(isLast);
            return fallback;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUBMIT (final evaluation)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public MockInterviewResponse submitInterviewAnswers(Integer userId, SubmitInterviewAnswersRequest request) {

        UserPurchase purchase = getPurchaseAndValidate(userId, request.getPurchaseId(), ItemType.MOCK_INTERVIEW);

        MockInterview interview = mockInterviewRepository.findByPurchaseId(request.getPurchaseId())
                .orElseThrow(() -> new ResourceNotFoundException("Interview record not found."));

        interview.setUserAnswersText(request.getUserAnswersText());

        // Build sentiment journey summary for the prompt
        StringBuilder sentimentSb = new StringBuilder();
        if (request.getSentimentHistory() != null && !request.getSentimentHistory().isEmpty()) {
            sentimentSb.append("PER-ANSWER SENTIMENT JOURNEY:\n");
            for (int i = 0; i < request.getSentimentHistory().size(); i++) {
                SubmitInterviewAnswersRequest.AnswerSentimentEntry e = request.getSentimentHistory().get(i);
                sentimentSb.append("  Q").append(i + 1)
                        .append(" [").append(e.getQuestionType()).append("]")
                        .append(" — sentiment: ").append(e.getSentiment())
                        .append(", quality: ").append(e.getAnswerQuality())
                        .append(", interviewer tone was: ").append(e.getTone())
                        .append("\n");
            }
            sentimentSb.append("\n");
        }

        String feedbackPrompt =
                "You are writing the final evaluation for a completed mock interview.\n\n"
                        + "QUESTIONS AND ANSWERS:\n" + interview.getQuestionsText()
                        + "\n\nCANDIDATE ANSWERS:\n" + request.getUserAnswersText() + "\n\n"
                        + sentimentSb
                        + "Write a structured final report with these sections:\n"
                        + "1. **Overall Impression** — 2–3 sentences.\n"
                        + "2. **Technical Answers** — strengths and gaps.\n"
                        + "3. **Personal / Behavioural Answers** — communication style, self-awareness.\n"
                        + "4. **Sentiment & Confidence Arc** — how the candidate's emotional state evolved "
                        + "and how it affected their answers. Be specific about which questions triggered "
                        + "nervousness or confidence.\n"
                        + "5. **Top 3 Action Items** — concrete, prioritised improvements.\n"
                        + "6. **Score** — a single line: 'Overall readiness score: X/100' where X reflects "
                        + "both answer quality and interview presence.\n\n"
                        + "Be direct, honest, and constructive. 350–500 words.";

        String feedback = callGeminiApi(feedbackPrompt, request.getBase64Image(), request.getMimeType());
        interview.setAiFeedbackText(feedback);

        purchase.setIsUsed(true);
        mockInterviewRepository.save(interview);
        userPurchaseRepository.save(purchase);

        return mapToInterviewResponse(interview);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READINESS REPORT
    // ─────────────────────────────────────────────────────────────────────────

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

        String content = callGeminiApi(prompt, null, null);

        ReadinessReport report = new ReadinessReport();
        report.setPurchase(purchase);
        report.setReportContent(content);
        readinessReportRepository.save(report);

        purchase.setIsUsed(true);
        userPurchaseRepository.save(purchase);

        return mapToReadinessResponse(report);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ-ONLY GETTERS
    // ─────────────────────────────────────────────────────────────────────────

    public MockInterviewResponse getInterview(Integer userId, Integer purchaseId) {
        MockInterview interview = mockInterviewRepository.findByPurchaseId(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found."));
        if (!interview.getPurchase().getUser().getId().equals(userId))
            throw new ForbiddenException("Access denied.");
        return mapToInterviewResponse(interview);
    }

    public ReadinessReportResponse getReport(Integer userId, Integer purchaseId) {
        ReadinessReport report = readinessReportRepository.findByPurchaseId(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));
        if (!report.getPurchase().getUser().getId().equals(userId))
            throw new ForbiddenException("Access denied.");
        return mapToReadinessResponse(report);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMPT HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private static final int TOTAL_QUESTIONS = 5;

    /**
     * Builds a rich, multi-section profile string including work history,
     * education, projects, certifications, and about-me — giving Gemini
     * enough material to ask genuine personal questions.
     */
    private String buildRichProfileContext(Integer userId, User user, JobPosting job) {
        StringBuilder sb = new StringBuilder();

        sb.append("=== CANDIDATE PROFILE ===\n");
        sb.append("Name: ").append(user.getFirstName()).append(" ").append(user.getLastName()).append("\n");
        if (user.getProfessionalTitle() != null)
            sb.append("Title: ").append(user.getProfessionalTitle()).append("\n");
        if (user.getAboutMe() != null && !user.getAboutMe().isBlank())
            sb.append("About: ").append(user.getAboutMe()).append("\n");

        // Verified skills
        List<UserSkillVerification> skills = verificationRepository.findVerifiedByUserId(userId);
        if (!skills.isEmpty()) {
            sb.append("Verified Skills: ");
            sb.append(skills.stream()
                    .map(v -> v.getSkill().getName() + " (" + v.getCurrentBadge() + ")")
                    .collect(Collectors.joining(", ")));
            sb.append("\n");
        }

        // Work experience
        List<WorkExperience> workExps = workExperienceRepository.findByUserId(userId);
        if (!workExps.isEmpty()) {
            sb.append("\nWORK EXPERIENCE:\n");
            for (WorkExperience w : workExps) {
                sb.append("  - ").append(w.getJobTitle()).append(" at ").append(w.getCompanyName());
                if (w.getStartDate() != null) sb.append(" (").append(w.getStartDate());
                if (w.getEndDate() != null) sb.append(" → ").append(w.getEndDate());
                else if (w.getStartDate() != null) sb.append(" → present");
                if (w.getStartDate() != null) sb.append(")");
                sb.append("\n");
                if (w.getDescription() != null && !w.getDescription().isBlank())
                    sb.append("    ").append(truncate(w.getDescription(), 180)).append("\n");
            }
        }

        // Education
        List<Education> educations = educationRepository.findByUserId(userId);
        if (!educations.isEmpty()) {
            sb.append("\nEDUCATION:\n");
            for (Education e : educations) {
                sb.append("  - ").append(e.getDegree()).append(" in ").append(e.getFieldOfStudy())
                        .append(" — ").append(e.getInstitutionName());
                if (e.getEndDate() != null) sb.append(" (").append(e.getEndDate()).append(")");
                sb.append("\n");
            }
        }

        // Projects
        List<Project> projects = projectRepository.findByUserId(userId);
        if (!projects.isEmpty()) {
            sb.append("\nPROJECTS:\n");
            for (Project p : projects) {
                sb.append("  - ").append(p.getTitle());
                if (p.getTechnologiesUsed() != null && !p.getTechnologiesUsed().isBlank())
                    sb.append(" [").append(p.getTechnologiesUsed()).append("]");
                sb.append("\n");
                if (p.getDescription() != null && !p.getDescription().isBlank())
                    sb.append("    ").append(truncate(p.getDescription(), 160)).append("\n");
            }
        }

        // Certifications
        List<Certification> certs = certificationRepository.findByUserId(userId);
        if (!certs.isEmpty()) {
            sb.append("\nCERTIFICATIONS:\n");
            for (Certification c : certs) {
                sb.append("  - ").append(c.getName()).append(" (").append(c.getIssuingOrganization()).append(")");
                if (c.getIssueDate() != null) sb.append(" — ").append(c.getIssueDate());
                sb.append("\n");
            }
        }

        // Target job
        if (job != null) {
            sb.append("\n=== TARGET JOB ===\n");
            sb.append("Title: ").append(job.getTitle()).append("\n");
            if (job.getDescription() != null)
                sb.append("Description: ").append(truncate(job.getDescription(), 300)).append("\n");
            List<JobSkillRequirement> reqs = jobSkillRequirementRepository.findByJobPostingId(job.getId());
            if (!reqs.isEmpty()) {
                sb.append("Required Skills: ");
                sb.append(reqs.stream()
                        .map(r -> r.getSkill().getName() + " (" + r.getImportance() + ")")
                        .collect(Collectors.joining(", ")));
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    /**
     * Decides the tone directive to inject into the next-question prompt
     * based on the latest sentiment and the trajectory of previous answers.
     */
    private String buildToneGuidance(String sentimentLabel, double confidence,
                                     List<NextQuestionRequest.QARound> history) {

        // Count consecutive nervous rounds
        int consecutiveNervous = 0;
        if (history != null) {
            for (int i = history.size() - 1; i >= 0; i--) {
                if ("nervous".equalsIgnoreCase(history.get(i).getSentiment())) consecutiveNervous++;
                else break;
            }
        }

        // Last answer quality (for escalation decisions)
        String lastQuality = (history != null && !history.isEmpty())
                ? history.get(history.size() - 1).getAnswerQuality()
                : "moderate";

        String tone;
        String rationale;

        switch (sentimentLabel.toLowerCase()) {
            case "nervous":
                tone      = "good_cop";
                rationale = consecutiveNervous >= 2
                        ? "The candidate has been nervous for " + consecutiveNervous
                        + " consecutive rounds. Be especially warm and encouraging. "
                        + "Acknowledge their effort explicitly before the next question."
                        : "The candidate appears nervous. Use a supportive, gentle tone. "
                        + "Ask the question in a way that makes it feel approachable.";
                break;

            case "confident":
                if ("strong".equals(lastQuality)) {
                    tone      = "bad_cop";
                    rationale = "Candidate is confident AND answered strongly. "
                            + "Push harder — challenge assumptions, add constraints, "
                            + "or ask a deliberately tricky follow-up angle.";
                } else {
                    tone      = "bad_cop";
                    rationale = "Candidate looks confident. Be direct and high-expectation. "
                            + "Don't soften the question.";
                }
                break;

            case "happy":
                tone      = "strong".equals(lastQuality) ? "bad_cop" : "neutral";
                rationale = "Candidate is happy and engaged. "
                        + ("bad_cop".equals(tone)
                        ? "They answered well — raise the bar."
                        : "Keep the positive energy — maintain a neutral, professional tone.");
                break;

            case "angry":
                tone      = "good_cop";
                rationale = "Candidate shows frustration. De-escalate — be calm, "
                        + "patient, and non-confrontational. Ask a slightly easier question.";
                break;

            default: // neutral, unknown
                tone      = "strong".equals(lastQuality) ? "bad_cop" : "neutral";
                rationale = "Neutral sentiment. "
                        + ("bad_cop".equals(tone)
                        ? "Previous answer was strong — increase difficulty slightly."
                        : "Maintain a standard professional tone.");
                break;
        }

        return "USE TONE: " + tone.toUpperCase().replace("_", " ") + "\n"
                + "REASON: " + rationale + "\n"
                + "- good_cop: warm, encouraging, acknowledge strengths, ask gently.\n"
                + "- bad_cop: direct, challenging, probe edge cases, high-expectation.\n"
                + "- neutral: professional, matter-of-fact, neither warm nor harsh.";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI API WRAPPER
    // ─────────────────────────────────────────────────────────────────────────

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

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", parts)));

        try {
            Map<String, Object> response = client.post()
                    .uri(uriBuilder -> uriBuilder.queryParam("key", geminiApiKey).build())
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(
                            status -> status.is4xxClientError() || status.is5xxServerError(),
                            res -> res.bodyToMono(String.class)
                                    .map(err -> new RuntimeException(
                                            "Gemini API error " + res.statusCode().value() + ": " + err))
                    )
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(90));

            if (response == null) throw new RuntimeException("Gemini returned an empty response.");
            return extractTextFromResponse(response);

        } catch (RuntimeException e) {
            log.error("Gemini API call failed: {}", e.getMessage());
            throw e;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromResponse(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty())
                throw new RuntimeException("Gemini response has no candidates. Full response: " + response);
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

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private UserPurchase getPurchaseAndValidate(Integer userId, Integer purchaseId, ItemType expectedType) {
        UserPurchase purchase = userPurchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase record not found."));
        if (!purchase.getUser().getId().equals(userId))
            throw new ForbiddenException("You do not have permission to access this purchase.");
        if (Boolean.TRUE.equals(purchase.getIsUsed()))
            throw new BadRequestException("This purchase has already been consumed.");
        if (!purchase.getItem().getItemType().equals(expectedType))
            throw new BadRequestException("Invalid purchase type for this action.");
        return purchase;
    }

    /**
     * Used by getNextQuestion — purchase may already be "used" mid-session
     * (we set it used on final submit), so we only check ownership + type here.
     */
    private UserPurchase getPurchaseAndValidateForRead(Integer userId, Integer purchaseId) {
        UserPurchase purchase = userPurchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase record not found."));
        if (!purchase.getUser().getId().equals(userId))
            throw new ForbiddenException("You do not have permission to access this purchase.");
        return purchase;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAPPING HELPERS
    // ─────────────────────────────────────────────────────────────────────────

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

    private ReadinessReportResponse mapToReadinessResponse(ReadinessReport report) {
        ReadinessReportResponse r = new ReadinessReportResponse();
        r.setId(report.getId());
        r.setPurchaseId(report.getPurchase().getId());
        r.setReportContent(report.getReportContent());
        r.setGeneratedAt(report.getGeneratedAt());
        return r;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────────────────

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static String nvl(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s;
    }

    /** Strips ```json ... ``` fences that Gemini sometimes adds despite instructions. */
    private static String stripJsonFences(String raw) {
        if (raw == null) return "{}";
        String s = raw.strip();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```[a-zA-Z]*\\s*", "");
            s = s.replaceAll("\\s*```$", "");
        }
        return s.strip();
    }
}