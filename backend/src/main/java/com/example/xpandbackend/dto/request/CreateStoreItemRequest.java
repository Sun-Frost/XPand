package com.example.xpandbackend.dto.request;
import com.example.xpandbackend.models.Enums.ItemType;
import lombok.Data;
@Data
public class CreateStoreItemRequest {
    private String name;
    private String description;
    private Integer costXp;
    private ItemType itemType;
}
