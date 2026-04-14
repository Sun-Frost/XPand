package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.DifficultyLevel;
import lombok.Data;
@Data
public class QuestionResponse {
    private Integer id;
    private String questionText;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private DifficultyLevel difficultyLevel;
    private Integer points;
}
