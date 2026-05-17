package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records a skill the user self-reported knowing during registration (step 3 of onboarding).
 * <p>
 * This is distinct from {@link UserSkillVerification} — a row here means
 * "the user claimed this skill", not that it has been tested or verified.
 * The Skills Library reads these rows to show a nudge popup prompting the user
 * to take the verification test for each unverified onboarding skill.
 * </p>
 */
@Entity
@Table(
        name = "user_onboarding_skill",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "skill_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOnboardingSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}