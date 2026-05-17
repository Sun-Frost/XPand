package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.SlotRank;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records an XP store purchase made by a user.
 * <p>
 * Three item types are supported:
 * <ul>
 *   <li>{@code MOCK_INTERVIEW} – must be linked to a specific job at purchase time;
 *       consumed when the interview is submitted.</li>
 *   <li>{@code READINESS_REPORT} – consumed when the report is generated.</li>
 *   <li>{@code PRIORITY_SLOT} – purchased as a voucher (no job needed at purchase time)
 *       and redeemed during job application. {@code slotRank} indicates which position
 *       (FIRST / SECOND / THIRD) the voucher is for.</li>
 * </ul>
 * {@code isUsed} is set to {@code true} the moment the purchase is consumed so it
 * cannot be redeemed a second time.
 * </p>
 */
@Entity
@Table(name = "user_purchase")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchase_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private StoreItem item;

    /** Required for MOCK_INTERVIEW purchases; null for all other types. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "associated_job_id")
    private JobPosting associatedJob;

    /**
     * Priority slot rank (FIRST / SECOND / THIRD). Only populated for
     * {@code PRIORITY_SLOT} purchases; null for all other item types.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "slot_rank")
    private SlotRank slotRank;

    @Column(nullable = false)
    private Boolean isUsed = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime purchasedAt;

    @OneToOne(mappedBy = "purchase", cascade = CascadeType.ALL)
    private MockInterview mockInterview;

    @OneToOne(mappedBy = "purchase", cascade = CascadeType.ALL)
    private ReadinessReport readinessReport;

    @PrePersist
    protected void onCreate() {
        purchasedAt = LocalDateTime.now();
    }
}