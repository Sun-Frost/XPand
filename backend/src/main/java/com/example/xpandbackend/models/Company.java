package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "company")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "company_id")
    private Integer id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String companyName;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String websiteUrl;
    private String industry;
    private String location;

    @Column(nullable = false)
    private Boolean isApproved = false;

    // ── Email verification ────────────────────────────────────────────────────
    /** True once the company submits the correct 6-digit verification code. */
    @Column(nullable = false)
    private boolean emailVerified = false;

    /**
     * 6-digit numeric code (stored as String to preserve leading zeros) sent to
     * the company's email at registration and on resend.  Cleared after verification.
     */
    @Column
    private String verificationCode;

    // ── Auth provider (LOCAL only for companies; no OAuth flow for companies) ─
    @Column(nullable = false)
    private String provider = "LOCAL";

    // ─────────────────────────────────────────────────────────────────────────

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
