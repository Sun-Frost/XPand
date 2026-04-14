package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.ImportanceLevel;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "job_skill_requirement")
@IdClass(JobSkillRequirementId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobSkillRequirement {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", referencedColumnName = "job_id", nullable = false)
    private JobPosting jobPosting;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", referencedColumnName = "skill_id", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ImportanceLevel importance;
}
