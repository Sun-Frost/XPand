package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    // UserSkillVerification.java, Application.java, UserPurchase.java,
// Education.java, WorkExperience.java, Certification.java, Project.java
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private StoreItem item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "associated_job_id")
    private JobPosting associatedJob;

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
