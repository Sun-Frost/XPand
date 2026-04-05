package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Integer> {
    Optional<Admin> findByEmail(String email);
    boolean existsByEmail(String email);
}
