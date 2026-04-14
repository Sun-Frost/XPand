package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.TransactionType;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class XPTransactionResponse {
    private Integer id;
    private Integer amount;
    private TransactionType sourceType;
    private Integer referenceId;
    private LocalDateTime createdAt;
}
