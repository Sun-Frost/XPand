package com.example.xpandbackend.dto.request;

import lombok.Data;
import java.util.List;

/**
 * Sent when the candidate finishes all questions and submits for final evaluation.
 * Includes the full per-answer sentiment history so Gemini can produce a
 * sentiment-aware final feedback report.
 */
@Data
public class SubmitInterviewAnswersRequest {

    private Integer purchaseId;

    /** Combined answers string: "Q1: ...\n\nQ2: ..." */
    private String userAnswersText;

    /** Optional snapshot photo for Gemini vision (can be null). */
    private String base64Image;
    private String mimeType;

    /**
     * Per-answer sentiment + quality summary used to enrich the final feedback prompt.
     * Each entry corresponds to one answered question in order.
     */
    private List<AnswerSentimentEntry> sentimentHistory;

    @Data
    public static class AnswerSentimentEntry {
        private String question;
        private String questionType;   // "technical" | "personal"
        private String sentiment;      // "happy" | "neutral" | "nervous" | "angry" | "confident"
        private String answerQuality;  // "weak" | "moderate" | "strong"
        private String tone;           // "good_cop" | "bad_cop" | "neutral"
    }
}