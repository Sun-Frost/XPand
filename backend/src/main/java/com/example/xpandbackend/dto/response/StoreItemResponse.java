package com.example.xpandbackend.dto.response;
import com.example.xpandbackend.models.Enums.ItemType;
import lombok.Data;
@Data
public class StoreItemResponse {
    private Integer id;
    private String name;
    private String description;
    private Integer costXp;
    private ItemType itemType;
}
