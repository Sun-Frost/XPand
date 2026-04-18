package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // Used by the email-verification endpoint
    Optional<User> findByVerificationCode(String verificationCode);

    // Case-insensitive lookup — used by verifyEmail and resendVerification
    // so that "User@Example.com" (stored) is found even when the submitted
    // email has been lowercased to "user@example.com".
    Optional<User> findByEmailIgnoreCase(String email);
}
