package com.example.xpandbackend.dto.request;

import lombok.Data;
import java.util.List;

/**
 * Sent by the frontend after every answer to fetch the next adaptive question.
 * Contains the full Q&A history so Gemini can avoid repetition and escalate/de-escalate.
 */
@Data
public class NextQuestionRequest {

    private Integer purchaseId;

    /** 0-based index of the question that was just answered. */
    private Integer answeredIndex;

    /** Total number of questions planned for this session (e.g. 5). */
    private Integer totalQuestions;

    /** The latest sentiment label from face-api ("happy","neutral","nervous","angry","confident","unknown") */
    private String sentimentLabel;

    /** 0.0–1.0 confidence of the sentiment reading. */
    private Double sentimentConfidence;

    /** Full history of this session so far (already-answered rounds). */
    private List<QARound> history;

    @Data
    public static class QARound {
        /** The question that was asked (could be technical or personal). */
        private String question;

        /** "technical" or "personal" — set by the AI when it generated this question. */
        private String questionType;

        /** Candidate's answer text. */
        private String answer;

        /** Quality assessed by Claude on the frontend: "weak", "moderate", "strong". */
        private String answerQuality;

        /** Sentiment at time of submission. */
        private String sentiment;
    }
}