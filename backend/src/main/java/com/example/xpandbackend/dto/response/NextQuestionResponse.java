package com.example.xpandbackend.dto.response;

import lombok.Data;

/**
 * Response for the /interview/next-question endpoint.
 * The frontend uses this to render the next question card and optional
 * inline feedback on the previous answer.
 */
@Data
public class NextQuestionResponse {

    /** The next question text to display. Null if the session is finished. */
    private String question;

    /** "technical" or "personal" — used to style the question card. */
    private String questionType;

    /** Tone the AI chose: "good_cop", "bad_cop", or "neutral". */
    private String tone;

    /**
     * Optional 1–2 sentence comment on the previous answer, reflecting the tone.
     * Null for the very first question (no prior answer to comment on).
     */
    private String feedbackOnPrevious;

    /** True when this is the last question (answeredIndex + 1 == totalQuestions - 1). */
    private boolean isLastQuestion;
}