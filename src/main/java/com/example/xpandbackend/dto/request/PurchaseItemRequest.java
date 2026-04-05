package com.example.xpandbackend.dto.request;
import lombok.Data;
@Data
public class PurchaseItemRequest {
    private Integer itemId;
    private Integer associatedJobId; // nullable for readiness report; not needed for priority slots
    private Integer slotRank;        // 1, 2, or 3 — required when itemType is PRIORITY_SLOT
}