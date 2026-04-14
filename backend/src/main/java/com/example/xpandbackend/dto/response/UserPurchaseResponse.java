package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.ItemType;
import com.example.xpandbackend.models.Enums.SlotRank;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class UserPurchaseResponse {
    private Integer id;
    private Integer itemId;
    private String itemName;
    private ItemType itemType;
    private SlotRank slotRank;
    private Integer associatedJobId;
    private String associatedJobTitle;
    private Boolean isUsed;
    private LocalDateTime purchasedAt;
}
