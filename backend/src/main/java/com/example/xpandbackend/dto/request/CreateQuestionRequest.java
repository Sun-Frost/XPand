package com.example.xpandbackend.dto.request;
import com.example.xpandbackend.models.Enums.DifficultyLevel;
import lombok.Data;
@Data
public class CreateQuestionRequest {
    private Integer skillId;
    private DifficultyLevel difficultyLevel;
    private String questionText;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer;
    private Integer points;
}
