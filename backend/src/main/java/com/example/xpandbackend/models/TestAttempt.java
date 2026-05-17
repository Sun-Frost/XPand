package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.BadgeLevel;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * Records a single skill test attempt by a user.
 * <p>
 * The per-question breakdown is stored in {@link TestAttemptQuestion} rows.
 * {@code badgeAwarded} will be null when the score did not reach the BRONZE threshold.
 * </p>
 */
@Entity
@Table(name = "test_attempt")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Skill skill;

    @Column(nullable = false)
    private Integer score;

    /** Null when the score did not meet the BRONZE minimum (18 points). */
    @Enumerated(EnumType.STRING)
    private BadgeLevel badgeAwarded;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "testAttempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<TestAttemptQuestion> attemptQuestions;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}