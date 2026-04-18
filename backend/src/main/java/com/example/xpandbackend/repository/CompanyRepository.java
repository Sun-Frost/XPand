package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Integer> {
    Optional<Company> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Company> findByIsApproved(Boolean isApproved);

    // Used by the email-verification endpoint
    Optional<Company> findByVerificationCode(String verificationCode);

    // Case-insensitive lookup — used by verifyEmail and resendVerification
    // so that "HR@Company.com" (stored) is found even when the submitted
    // email has been lowercased to "hr@company.com".
    Optional<Company> findByEmailIgnoreCase(String email);
}
