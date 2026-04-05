package com.example.xpandbackend.dto.request;
import lombok.Data;
@Data
public class ApplyJobRequest {
    private Integer jobId;
    private Integer priorityPurchaseId; // nullable if no priority slot
}
