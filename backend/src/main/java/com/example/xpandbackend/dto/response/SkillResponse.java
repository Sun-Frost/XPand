package com.example.xpandbackend.dto.response;
import lombok.Data;
@Data
public class SkillResponse {
    private Integer id;
    private String name;
    private String category;
    private Boolean isActive;
}
