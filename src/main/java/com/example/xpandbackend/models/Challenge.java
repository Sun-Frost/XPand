package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.ChallengeType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "challenge")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Challenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "challenge_id")
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChallengeType type;

    /**
     * The threshold required to complete this challenge.
     * Examples:
     *   VERIFY_SKILL       → 1  (verify at least 1 skill)
     *   APPLY_JOB          → 5  (apply to 5 jobs)
     *   STREAK_DAYS        → 7  (7-day login streak)
     *   REACH_XP           → 500
     *   MULTI_SKILL_PROGRESS → 3 (skills in 3 different categories)
     */
    @Column(nullable = false)
    private Integer conditionValue;

    @Column(nullable = false)
    private Integer xpReward;

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(nullable = false)
    private Boolean isRepeatable = false;

    // Optional time-boxing for seasonal / event challenges
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}