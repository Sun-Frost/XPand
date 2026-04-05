package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "readiness_report")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReadinessReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id", referencedColumnName = "purchase_id", nullable = false)
    private UserPurchase purchase;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reportContent;

    @Column(nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
    }
}
