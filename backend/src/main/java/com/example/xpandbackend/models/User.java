package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Represents a job seeker on the XPand platform.
 * <p>
 * Users can register via email/password (LOCAL) or Google OAuth (GOOGLE).
 * OAuth users will have a null {@code passwordHash} and a populated {@code providerId}.
 * Email verification is required for LOCAL users before they can log in.
 * </p>
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer id;

    @Column(nullable = false, unique = true)
    private String email;

    /** Null for Google OAuth users who have never set a password. */
    @Column(name = "password_hash")
    private String passwordHash;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String country;
    private String city;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private String profilePicture;
    private String professionalTitle;

    @Column(columnDefinition = "TEXT")
    private String aboutMe;

    @Column(nullable = false)
    private Integer xpBalance = 0;

    // ── Login streak tracking (used by challenge evaluation) ──────────────────

    @Column
    private LocalDateTime lastLoginDate;

    @Column(columnDefinition = "integer default 0")
    private Integer loginStreakDays = 0;

    @Column(columnDefinition = "integer default 0")
    private Integer loginsThisWeek = 0;

    // ── Email verification ────────────────────────────────────────────────────

    /** True once the user submits the correct 6-digit verification code. */
    @Column(nullable = false)
    private boolean emailVerified = false;

    /**
     * 6-digit numeric code (stored as String to preserve leading zeros).
     * Sent at registration and on resend. Cleared after successful verification
     * and reused as a password-reset code when the forgot-password flow is triggered.
     */
    @Column
    private String verificationCode;

    // ── OAuth ─────────────────────────────────────────────────────────────────

    /**
     * Authentication provider: {@code "LOCAL"} for email/password,
     * {@code "GOOGLE"} for OAuth. Stored as a string so new providers
     * can be added without a DB migration.
     */
    @Column(nullable = false)
    private String provider = "LOCAL";

    /** Google's unique user identifier (the {@code sub} claim). Null for LOCAL users. */
    @Column
    private String providerId;

    // ─────────────────────────────────────────────────────────────────────────

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}