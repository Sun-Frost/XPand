package com.example.xpandbackend.dto.request;
import lombok.Data;

// dto/request/SubmitInterviewAnswersRequest.java
@Data
public class SubmitInterviewAnswersRequest {
    private Integer purchaseId;
    private String userAnswersText;
    private String base64Image; // New: The image data (without the "data:image/png;base64," prefix)
    private String mimeType;    // New: e.g., "image/jpeg" or "image/png"
}

//@Data
//public class SubmitInterviewAnswersRequest {
//    private Integer purchaseId;
//    private String userAnswersText;
//}
