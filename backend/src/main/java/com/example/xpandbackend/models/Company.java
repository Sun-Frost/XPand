package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Represents a hiring company on the XPand platform.
 * <p>
 * Companies must be email-verified and admin-approved before they can post jobs
 * or view applicant CVs. Only LOCAL (email/password) registration is supported
 * for companies — there is no OAuth flow for company accounts.
 * </p>
 */
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

    /** Set to {@code true} by an admin after reviewing the company registration. */
    @Column(nullable = false)
    private Boolean isApproved = false;

    // ── Email verification ────────────────────────────────────────────────────

    /** True once the company submits the correct 6-digit verification code. */
    @Column(nullable = false)
    private boolean emailVerified = false;

    /**
     * 6-digit numeric code (stored as String to preserve leading zeros).
     * Sent at registration and on resend. Cleared after successful verification
     * and reused as a password-reset code when the forgot-password flow is triggered.
     */
    @Column
    private String verificationCode;

    // ── Auth provider ─────────────────────────────────────────────────────────

    /** Always {@code "LOCAL"} for companies. Stored as a string for future extensibility. */
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