package com.example.xpandbackend.dto.response;

import com.example.xpandbackend.models.Enums.BadgeLevel;
import com.example.xpandbackend.models.Enums.DifficultyLevel;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TestAttemptResponse {
    private Integer attemptId;
    private Integer skillId;
    private String skillName;
    private Integer score;
    private BadgeLevel badgeAwarded;
    private LocalDateTime createdAt;

    // Added fields for frontend result page
    private Integer correctCount;
    private Integer totalQuestions;

    @Data
    public static class QuestionResult {
        private Integer questionId;
        private String questionText;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private DifficultyLevel difficultyLevel;
        private Integer points;
        private String userAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
    }

    private List<QuestionResult> questionResults;
}