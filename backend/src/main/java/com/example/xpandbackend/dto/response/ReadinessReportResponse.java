package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class ReadinessReportResponse {
    private Integer id;
    private Integer purchaseId;
    private String reportContent;
    private LocalDateTime generatedAt;
}
