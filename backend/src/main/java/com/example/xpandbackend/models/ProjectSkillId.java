package com.example.xpandbackend.models;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectSkillId implements Serializable {
    private Integer project;
    private Integer skill;
}
