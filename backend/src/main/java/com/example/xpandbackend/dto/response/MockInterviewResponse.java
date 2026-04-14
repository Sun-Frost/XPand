package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class MockInterviewResponse {
    private Integer id;
    private Integer purchaseId;
    private String questionsText;
    private String userAnswersText;
    private String aiFeedbackText;
    private LocalDateTime createdAt;
}
