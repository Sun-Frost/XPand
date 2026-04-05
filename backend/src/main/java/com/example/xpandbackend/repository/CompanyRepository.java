package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Integer> {
    Optional<Company> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Company> findByIsApproved(Boolean isApproved);
}
