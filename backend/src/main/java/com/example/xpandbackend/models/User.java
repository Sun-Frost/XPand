package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    // Nullable: Google-OAuth users have no password
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

    // ── Login tracking for challenge evaluation ───────────────────────────────
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
     * 6-digit numeric code (stored as String to preserve leading zeros) sent to
     * the user's email at registration and on resend.  Cleared after verification.
     */
    @Column
    private String verificationCode;

    // ── OAuth ─────────────────────────────────────────────────────────────────
    /**
     * Authentication provider.  LOCAL = email/password.  GOOGLE = OAuth.
     * Stored as a string so new providers can be added without a DB migration.
     */
    @Column(nullable = false)
    private String provider = "LOCAL";

    /** Google's unique user id (sub claim) — null for LOCAL users. */
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
