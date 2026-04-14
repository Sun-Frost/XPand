package com.example.xpandbackend.dto.request;
import lombok.Data;
import java.util.Map;
@Data
public class SubmitTestRequest {
    // key = questionId, value = answer (A/B/C/D)
    private Map<Integer, String> answers;
}
