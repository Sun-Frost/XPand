package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records a single XP credit or debit for a user.
 * <p>
 * Positive {@code amount} values are credits (e.g. challenge rewards).
 * Negative values are debits (e.g. store purchases).
 * {@code referenceId} points to the entity that caused the transaction
 * (challenge ID or store item ID depending on {@code sourceType}).
 * </p>
 */
@Entity
@Table(name = "xp_transaction")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class XPTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    /** Positive for credits, negative for debits. */
    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private TransactionType sourceType;

    /** ID of the challenge or store item that triggered this transaction. */
    private Integer referenceId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}