package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.MockInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MockInterviewRepository extends JpaRepository<MockInterview, Integer> {
    Optional<MockInterview> findByPurchaseId(Integer purchaseId);
}
