package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records a user's application to a specific job posting.
 * <p>
 * An application may optionally hold a {@code prioritySlotRank} (1–3) when the
 * user redeemed a {@link UserPurchase} of type {@code PRIORITY_SLOT} at apply time.
 * Priority-ranked applications are surfaced first in the company's applicant list.
 * </p>
 */
@Entity
@Table(name = "application")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "application_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPosting job;

    /**
     * Rank of the priority slot used (1 = highest, 3 = lowest).
     * Null when the user applied without a priority slot voucher.
     */
    private Integer prioritySlotRank;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    @PrePersist
    protected void onCreate() {
        appliedAt = LocalDateTime.now();
    }
}