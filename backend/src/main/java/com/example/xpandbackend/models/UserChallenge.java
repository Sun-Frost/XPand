package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.ChallengeStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Tracks a user's progress on a specific {@link Challenge}.
 * <p>
 * One row per (user, challenge) pair. {@code currentProgress} is updated every
 * time a qualifying event occurs (e.g. a skill test passed, a job applied to).
 * When {@code currentProgress} reaches {@code challenge.conditionValue} the status
 * transitions to {@code COMPLETED} and XP is awarded.
 * </p>
 * For repeatable challenges the row stays but is reset so progress can accumulate again.
 */
@Entity
@Table(name = "user_challenge")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_challenge_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Challenge challenge;

    @Column(nullable = false)
    private Integer currentProgress = 0;

    @Column(nullable = false)
    private LocalDateTime startDate;

    /** Set when the challenge transitions to {@code COMPLETED}. */
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChallengeStatus status = ChallengeStatus.IN_PROGRESS;
}