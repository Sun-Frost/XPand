package com.example.xpandbackend.models;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobSkillRequirementId implements Serializable {
    private Integer jobPosting;
    private Integer skill;
}
