package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "project_skill")
@IdClass(ProjectSkillId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectSkill {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", referencedColumnName = "project_id", nullable = false)
    private Project project;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", referencedColumnName = "skill_id", nullable = false)
    private Skill skill;
}
