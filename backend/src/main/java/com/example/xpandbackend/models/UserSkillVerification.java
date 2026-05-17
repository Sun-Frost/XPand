package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.BadgeLevel;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Tracks a user's verification status and badge level for a specific skill.
 * <p>
 * One row per (user, skill) pair (enforced by a unique constraint). A user may
 * attempt the skill test up to three times per month. After three attempts the
 * record is locked until {@code lockExpiry}, at which point {@code attemptCount}
 * resets and a new monthly window begins.
 * </p>
 * <ul>
 *   <li>Score ≥ 28 → GOLD badge (permanently verified; no further attempts allowed)</li>
 *   <li>Score ≥ 24 → SILVER badge</li>
 *   <li>Score ≥ 18 → BRONZE badge</li>
 *   <li>Score &lt; 18 → no badge awarded for that attempt</li>
 * </ul>
 */
@Entity
@Table(
        name = "user_skill_verification",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_user_skill_verification",
                columnNames = {"user_id", "skill_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSkillVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "verification_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    /** The highest badge the user has earned for this skill. Null if no badge yet. */
    @Enumerated(EnumType.STRING)
    private BadgeLevel currentBadge;

    /** Total number of test attempts in the current monthly window. Resets on unlock. */
    @Column(nullable = false)
    private Integer attemptCount = 0;

    /** True when the user has used all three attempts and the monthly cooldown is active. */
    @Column(nullable = false)
    private Boolean isLocked = false;

    /** Timestamp when the lock expires and a new monthly window begins. */
    private LocalDateTime lockExpiry;

    /** Timestamp of the first attempt that produced a badge (or the most recent upgrade). */
    private LocalDateTime verifiedDate;

    private LocalDateTime lastAttemptDate;
}